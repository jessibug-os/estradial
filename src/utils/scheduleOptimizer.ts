import { Dose, EstradiolEster } from '../data/estradiolEsters';
import { calculateTotalConcentration, generateTimePoints } from './pharmacokinetics';
import { generateReferenceCycle, ReferenceCycleType } from '../data/referenceData';
import { PHARMACOKINETICS } from '../constants/pharmacokinetics';

export interface OptimizationParams {
  availableEsters: EstradiolEster[];
  scheduleLength: number;
  referenceCycleType: ReferenceCycleType;
  steadyState?: boolean;
  granularity?: number;
  maxDosePerInjection?: number;
  minDosePerInjection?: number;
  maxInjectionsPerCycle?: number;
}

export interface OptimizationResult {
  doses: Dose[];
  score: number; // Lower is better (mean squared error)
  iterations: number;
}

export type ProgressCallback = (progress: number, currentScore: number, iteration: number) => void;

/**
 * Calculate mean squared error between generated schedule and reference cycle
 */
function calculateMSE(
  doses: Dose[],
  referenceData: { day: number; estradiol: number }[],
  scheduleLength: number,
  steadyState: boolean = false
): number {
  // If steady state, prepend cycles before day 0
  let dosesForCalc = doses;
  if (steadyState) {
    const preCycles: Dose[] = [];
    for (let cycle = PHARMACOKINETICS.STEADY_STATE_START_CYCLE; cycle < 0; cycle++) {
      doses.forEach(dose => {
        preCycles.push({
          ...dose,
          day: dose.day + (cycle * scheduleLength)
        });
      });
    }
    dosesForCalc = [...preCycles, ...doses];
  }

  const timePoints = generateTimePoints(scheduleLength, PHARMACOKINETICS.TIME_POINT_STEP);
  const generated = calculateTotalConcentration(dosesForCalc, timePoints).filter(p => p.time >= 0);

  let sumSquaredError = 0;
  let count = 0;

  for (let day = 0; day < scheduleLength; day++) {
    const refPoint = referenceData.find(r => r.day === day);
    if (!refPoint) continue;

    // Sample multiple times per day for better accuracy
    const samples = [0, 0.25, 0.5, 0.75];
    for (const offset of samples) {
      const time = day + offset;
      const genPoint = generated.find(g => Math.abs(g.time - time) < 0.1);
      if (!genPoint) continue;

      const error = genPoint.concentration - refPoint.estradiol;
      sumSquaredError += error * error;
      count++;
    }
  }

  return count > 0 ? sumSquaredError / count : Infinity;
}


/**
 * Generate candidate injection days based on schedule length
 */
function generateCandidateDays(scheduleLength: number, maxInjections: number): number[] {
  const days: number[] = [];
  const step = Math.max(1, Math.floor(scheduleLength / maxInjections));

  for (let day = 0; day < scheduleLength; day += step) {
    days.push(day);
  }

  return days;
}

/**
 * Optimize injection schedule using iterative improvement
 */
export async function optimizeSchedule(
  params: OptimizationParams,
  onProgress?: ProgressCallback
): Promise<OptimizationResult> {
  const {
    availableEsters,
    scheduleLength,
    referenceCycleType,
    steadyState = false,
    granularity = 0.1,
    maxDosePerInjection = 10,
    minDosePerInjection = 0.1,
    maxInjectionsPerCycle = 10
  } = params;

  if (availableEsters.length === 0) {
    throw new Error('At least one ester must be available');
  }

  // Get reference cycle data
  const referenceData = generateReferenceCycle(scheduleLength, referenceCycleType);

  // Start with a reasonable initial schedule
  const candidateDays = generateCandidateDays(scheduleLength, maxInjectionsPerCycle);
  const primaryEster = availableEsters[0]; // Start with first available ester

  // Initialize with evenly distributed doses
  // Round starting dose to granularity
  const roundingFactor = 1 / granularity;
  const startingDose = Math.round(2 * roundingFactor) / roundingFactor;
  let currentDoses: Dose[] = candidateDays.map(day => ({
    day,
    dose: startingDose,
    ester: primaryEster
  }));

  let currentScore = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);
  let iterations = 0;
  let learningRate = 0.5;

  console.log(`Starting optimization with maxInjectionsPerCycle=${maxInjectionsPerCycle}, initial doses: ${currentDoses.length}`);

  // Optimization loop - run until no improvement found
  while (true) {
    iterations++;
    let improved = false;

    console.log(`Iteration ${iterations}, current score: ${currentScore.toFixed(2)}, doses: ${currentDoses.map(d => `${d.dose.toFixed(2)}mg ${d.ester.name}`).join(', ')}`);

    // Report progress and yield to event loop for UI updates
    if (onProgress) {
      // Progress estimation: most optimizations complete in 10-50 iterations
      // Use a logarithmic scale to show fast initial progress that slows down
      const estimatedProgress = Math.min(95, Math.round((1 - Math.exp(-iterations / 10)) * 100));
      onProgress(estimatedProgress, currentScore, iterations);
    }
    // Yield to event loop every iteration to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 0));

    // Try removing injections if we're over the limit
    // Only remove ONE dose per iteration to avoid cascading removals
    if (currentDoses.length > maxInjectionsPerCycle) {
      console.log(`  Over limit (${currentDoses.length} > ${maxInjectionsPerCycle}), removing best dose to remove...`);
      let bestRemovalScore = Infinity;
      let bestRemovalIndex = -1;

      // Find the BEST single dose to remove
      for (let i = currentDoses.length - 1; i >= 0; i--) {
        const withoutDose = currentDoses.filter((_, idx) => idx !== i);
        if (withoutDose.length === 0) continue;

        const scoreWithout = calculateMSE(withoutDose, referenceData, scheduleLength, steadyState);
        if (scoreWithout < bestRemovalScore) {
          bestRemovalScore = scoreWithout;
          bestRemovalIndex = i;
        }
      }

      // Apply the best removal found
      if (bestRemovalIndex >= 0) {
        console.log(`  ✓ Removing dose ${bestRemovalIndex}: score ${currentScore.toFixed(2)} -> ${bestRemovalScore.toFixed(2)}`);
        currentDoses = currentDoses.filter((_, idx) => idx !== bestRemovalIndex);
        currentScore = bestRemovalScore;
        improved = true;
      }
    }

    // Try adjusting each dose
    for (let i = 0; i < currentDoses.length; i++) {
      const originalDose = currentDoses[i].dose;
      let bestDose = originalDose;
      let bestScore = currentScore; // This is the score with originalDose

      // Try increasing dose by granularity increments - test all possibilities
      for (let numSteps = 1; numSteps <= 10; numSteps++) {
        const testDose = Math.min(maxDosePerInjection, originalDose + (granularity * numSteps));

        if (testDose === originalDose) break; // Hit max dose

        currentDoses[i].dose = testDose;
        const newScore = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);

        if (newScore < bestScore) {
          bestScore = newScore;
          bestDose = testDose;
          improved = true;
          console.log(`  Dose ${i}: found better by increasing to ${testDose.toFixed(2)}mg, score ${newScore.toFixed(2)}`);
        }
      }

      // Reset to original before testing decreases
      currentDoses[i].dose = originalDose;

      // Try decreasing dose by granularity increments - test all possibilities
      for (let numSteps = 1; numSteps <= 10; numSteps++) {
        const testDose = Math.max(minDosePerInjection, originalDose - (granularity * numSteps));

        if (testDose === originalDose) break; // Hit min dose

        currentDoses[i].dose = testDose;
        const newScore = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);

        if (newScore < bestScore) {
          bestScore = newScore;
          bestDose = testDose;
          improved = true;
          console.log(`  Dose ${i}: found better by decreasing to ${testDose.toFixed(2)}mg, score ${newScore.toFixed(2)}`);
        }
      }

      // Set to best found
      currentDoses[i].dose = bestDose;
      currentScore = bestScore;
    }

    // Try different esters if multiple available
    if (availableEsters.length > 1) {
      for (let i = 0; i < currentDoses.length; i++) {
        const originalEster = currentDoses[i].ester;
        let bestEster = originalEster;
        let bestEsterScore = currentScore;

        for (const ester of availableEsters) {
          if (ester.name === originalEster.name) continue;

          currentDoses[i].ester = ester;
          const newScore = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);

          if (newScore < bestEsterScore) {
            bestEsterScore = newScore;
            bestEster = ester;
            improved = true;
            console.log(`  Dose ${i}: found better ester ${ester.name}, score ${newScore.toFixed(2)}`);
          }
        }

        // Apply best ester found
        currentDoses[i].ester = bestEster;
        currentScore = bestEsterScore;
      }
    }

    // Early stopping if no improvement
    if (!improved) {
      console.log(`Optimizer stopping at iteration ${iterations}, final score: ${currentScore}, doses: ${currentDoses.length}`);
      break;
    }

    // Reduce learning rate over time for fine-tuning
    if (iterations % 50 === 0 && learningRate > 0.05) {
      learningRate *= 0.8;
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress(100, currentScore, iterations);
  }

  // Remove very small doses
  currentDoses = currentDoses.filter(d => d.dose >= minDosePerInjection);

  // Doses are already at the correct granularity from optimization
  // Recalculate final score (always report MSE, not the penalized score)
  const finalScore = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);

  return {
    doses: currentDoses,
    score: finalScore,
    iterations
  };
}
