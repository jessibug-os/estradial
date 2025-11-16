import { Dose } from '../data/estradiolEsters';
import { AnyMedication, isProgesteroneMedication, isEstradiolMedication, EstradiolMedication } from '../types/medication';
import { calculateTotalConcentration, generateTimePoints, ConcentrationPoint } from './pharmacokinetics';
import { generateReferenceCycle, ReferenceCycleType } from '../data/referenceData';
import { PHARMACOKINETICS } from '../constants/pharmacokinetics';

const OPTIMIZATION_CONSTANTS = {
  DEFAULT_ESTRADIOL_STARTING_VOLUME_ML: 0.15,
  MAX_DOSE_ADJUSTMENT_STEPS: 10,
  MAX_ORAL_VAGINAL_PROGESTERONE_PER_DAY: 4,
  PROGRESS_CONVERGENCE_RATE: 10,
  MAX_DISPLAYED_PROGRESS_UNTIL_COMPLETE: 95,
  SAMPLES_PER_DAY: 4,
  TIME_POINT_TOLERANCE: 0.1,
  MIN_IMPROVEMENT_THRESHOLD: 0.0001,
  NO_IMPROVEMENT_ITERATIONS_LIMIT: 3,
  ADAPTIVE_GRANULARITY_ENABLED: true,
  INITIAL_GRANULARITY_MULTIPLIER: 4,
  GRANULARITY_REFINEMENT_TRIGGER: 2,
  MIN_GRANULARITY_MULTIPLIER: 1,
  BEAM_SEARCH_ENABLED: true,
  BEAM_WIDTH: 3,
  SIMULATED_ANNEALING_ENABLED: false,
  INITIAL_TEMPERATURE: 1.0,
  COOLING_RATE: 0.95,
  MIN_TEMPERATURE: 0.01,
  SIMPLICITY_WEIGHT: 0.02,
  DOSE_COMPLEXITY_WEIGHT: 0.001,
  PREFER_FEWER_MEDICATIONS: false,
  MEDICATION_VARIETY_PENALTY: 0.0,
} as const;

export interface OptimizationParams {
  availableEsters: AnyMedication[];
  scheduleLength: number;
  referenceCycleType: ReferenceCycleType;
  steadyState?: boolean;
  granularity?: number; // In mL
  maxDosePerInjection?: number;
  minDosePerInjection?: number;
  maxInjectionsPerCycle?: number;
  esterConcentrations: Record<string, number>;
  progesteroneDoses?: number[];
  optimizeForAccuracyOnly?: boolean;
}

export interface OptimizationResult {
  doses: Dose[];
  score: number;
  iterations: number;
}

export type ProgressCallback = (progress: number, currentScore: number, iteration: number) => void;

interface OptimizationState {
  currentDoses: Dose[];
  currentScore: number;
  iterations: number;
  noImprovementCount: number;
  bestScoreThisRun: number;
  bestDosesThisRun: Dose[];
  currentGranularityMultiplier: number;
  iterationsSinceRefinement: number;
}

function createConcentrationLookup(
  points: ConcentrationPoint[]
): Map<number, ConcentrationPoint> {
  const lookup = new Map<number, ConcentrationPoint>();
  for (const point of points) {
    const key = Math.round(point.time * 100) / 100;
    lookup.set(key, point);
  }
  return lookup;
}

const mseCache = new Map<string, number>();

function hashDoses(doses: Dose[]): string {
  return doses
    .map(d => `${d.day}:${d.medication.name}:${d.dose.toFixed(3)}`)
    .sort()
    .join('|');
}

function getConcentrationAtTime(
  time: number,
  lookup: Map<number, ConcentrationPoint>,
  allPoints: ConcentrationPoint[]
): ConcentrationPoint | null {
  const roundedTime = Math.round(time * 100) / 100;
  const exact = lookup.get(roundedTime);
  if (exact) return exact;

  for (const point of allPoints) {
    if (Math.abs(point.time - time) < OPTIMIZATION_CONSTANTS.TIME_POINT_TOLERANCE) {
      return point;
    }
  }

  return null;
}

function calculateMSE(
  doses: Dose[],
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean = false
): number {
  const cacheKey = `${hashDoses(doses)}:${scheduleLength}:${steadyState}`;
  const cached = mseCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
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
  const allGenerated = calculateTotalConcentration(dosesForCalc, timePoints);
  const generated = allGenerated.filter(p => p.time >= 0);

  // Create lookup for faster access
  const lookup = createConcentrationLookup(generated);

  // Pre-compute sample offsets
  const sampleOffsets = Array.from(
    { length: OPTIMIZATION_CONSTANTS.SAMPLES_PER_DAY },
    (_, i) => i / OPTIMIZATION_CONSTANTS.SAMPLES_PER_DAY
  );

  // Calculate separate MSE for estradiol and progesterone
  let estradiolSumSquaredError = 0;
  let estradiolCount = 0;
  let progesteroneSumSquaredError = 0;
  let progesteroneCount = 0;

  // Pre-filter reference data for this schedule length
  const relevantRefData = referenceData.filter(r => r.day >= 0 && r.day < scheduleLength);

  for (const refPoint of relevantRefData) {
    for (const offset of sampleOffsets) {
      const time = refPoint.day + offset;
      const genPoint = getConcentrationAtTime(time, lookup, generated);
      if (!genPoint) continue;

      // Calculate error for estradiol (normalized by reference value to make scale-independent)
      const estradiolError = (genPoint.estradiolConcentration - refPoint.estradiol) / (refPoint.estradiol || 1);
      estradiolSumSquaredError += estradiolError * estradiolError;
      estradiolCount++;

      // Calculate error for progesterone if reference data includes it
      if (refPoint.progesterone !== undefined && refPoint.progesterone > 0) {
        const progesteroneError = (genPoint.progesteroneConcentration - refPoint.progesterone) / refPoint.progesterone;
        progesteroneSumSquaredError += progesteroneError * progesteroneError;
        progesteroneCount++;
      }
    }
  }

  // Calculate normalized MSE for each hormone separately
  const estradiolMSE = estradiolCount > 0 ? estradiolSumSquaredError / estradiolCount : 0;
  const progesteroneMSE = progesteroneCount > 0 ? progesteroneSumSquaredError / progesteroneCount : 0;

  // Combine with equal weighting (or return estradiol-only if no progesterone data)
  const result = progesteroneCount > 0
    ? (estradiolMSE + progesteroneMSE) / 2
    : estradiolMSE;

  // Cache the result
  mseCache.set(cacheKey, result);

  return result;
}


/**
 * Calculate multi-objective score that balances accuracy with simplicity
 * Lower score is better
 * @param doses - Current dose schedule
 * @param mseScore - Mean squared error (accuracy metric)
 * @param accuracyOnly - If true, return only MSE (no simplicity penalties)
 */
function calculateMultiObjectiveScore(
  doses: Dose[],
  mseScore: number,
  accuracyOnly: boolean = false
): number {
  // If optimizing for accuracy only (Find Best Fit), return pure MSE
  if (accuracyOnly) {
    return mseScore;
  }

  // Start with base MSE (accuracy)
  let totalScore = mseScore;

  // Penalize number of estradiol injections (simplicity)
  const estradiolCount = doses.filter(d => isEstradiolMedication(d.medication)).length;
  const simplicitPenalty = estradiolCount * OPTIMIZATION_CONSTANTS.SIMPLICITY_WEIGHT;
  totalScore += simplicitPenalty;

  // Penalize dose variety (prefer consistent dosing)
  const uniqueDoses = new Set(doses.map(d => Math.round(d.dose * 100) / 100)).size;
  const doseComplexityPenalty = uniqueDoses * OPTIMIZATION_CONSTANTS.DOSE_COMPLEXITY_WEIGHT;
  totalScore += doseComplexityPenalty;

  // Penalize medication variety (prefer fewer different medications)
  if (OPTIMIZATION_CONSTANTS.PREFER_FEWER_MEDICATIONS) {
    const uniqueMedications = new Set(doses.map(d => d.medication.name)).size;
    const medicationPenalty = uniqueMedications * OPTIMIZATION_CONSTANTS.MEDICATION_VARIETY_PENALTY;
    totalScore += medicationPenalty;
  }

  return totalScore;
}

/**
 * Consolidate duplicate medications on the same day by combining doses
 * This ensures we never have two doses of the same medication on one day
 */
function consolidateDuplicateMedications(doses: Dose[]): Dose[] {
  const consolidatedMap = new Map<string, Dose>();

  for (const dose of doses) {
    // Create a unique key for day + medication
    const key = `${dose.day}-${dose.medication.name}`;

    if (consolidatedMap.has(key)) {
      // Merge with existing dose
      const existing = consolidatedMap.get(key)!;
      consolidatedMap.set(key, {
        ...existing,
        dose: existing.dose + dose.dose
      });
    } else {
      // First occurrence of this medication on this day
      consolidatedMap.set(key, { ...dose });
    }
  }

  return Array.from(consolidatedMap.values()).sort((a, b) => a.day - b.day);
}

/**
 * Check if a day already has rectal progesterone
 */
function hasRectalProgesteroneOnDay(doses: Dose[], day: number, excludeIndex?: number): boolean {
  return doses.some((d, idx) =>
    d.day === day &&
    idx !== excludeIndex &&
    isProgesteroneMedication(d.medication) &&
    'route' in d.medication &&
    d.medication.route === 'rectal'
  );
}

/**
 * Count oral/vaginal progesterone doses on a specific day
 */
function countOralVaginalProgesteroneOnDay(doses: Dose[], day: number): number {
  return doses.filter(d =>
    d.day === day &&
    isProgesteroneMedication(d.medication) &&
    'route' in d.medication &&
    (d.medication.route === 'oral' || d.medication.route === 'vaginal')
  ).length;
}

/**
 * Check if adding a medication to a day would violate constraints
 */
function canAddMedicationToDay(
  medication: AnyMedication,
  day: number,
  currentDoses: Dose[],
  maxInjectionsPerCycle: number
): boolean {
  const dosesOnDay = currentDoses.filter(d => d.day === day);
  const medicationsOnDay = dosesOnDay.map(d => d.medication.name);

  // For estradiol: only one injection of each type per day
  if (isEstradiolMedication(medication) && medicationsOnDay.includes(medication.name)) {
    return false;
  }

  // Check estradiol injection limit (only for estradiol)
  if (isEstradiolMedication(medication)) {
    const totalEstradiolCount = currentDoses.filter(d => isEstradiolMedication(d.medication)).length;
    if (totalEstradiolCount >= maxInjectionsPerCycle) {
      return false;
    }
  }

  // For progesterone: check route-specific constraints
  if (isProgesteroneMedication(medication) && 'route' in medication) {
    if (medication.route === 'rectal') {
      // Rectal: only one per day (can't use multiple suppositories)
      if (hasRectalProgesteroneOnDay(currentDoses, day)) {
        return false;
      }
    } else if (medication.route === 'oral' || medication.route === 'vaginal') {
      // Oral and vaginal: limit to max per day
      const count = countOralVaginalProgesteroneOnDay(currentDoses, day);
      if (count >= OPTIMIZATION_CONSTANTS.MAX_ORAL_VAGINAL_PROGESTERONE_PER_DAY) {
        return false;
      }
      // IMPORTANT: Allow adding same medication multiple times to same day
      // They will be consolidated later (e.g., 2x 100mg → 200mg)
    }
  }

  return true;
}

/**
 * Generate candidate injection days evenly distributed across schedule length
 * Ensures exactly maxInjections days are generated
 */
function generateCandidateDays(scheduleLength: number, maxInjections: number): number[] {
  const days: number[] = [];

  // If only one injection, place it at day 0
  if (maxInjections === 1) {
    return [0];
  }

  // Distribute injections evenly across the schedule
  const step = scheduleLength / maxInjections;

  for (let i = 0; i < maxInjections; i++) {
    // Round to nearest day, ensuring we don't exceed scheduleLength
    const day = Math.min(Math.round(i * step), scheduleLength - 1);
    if (!days.includes(day)) {
      days.push(day);
    }
  }

  return days;
}

/**
 * Initialization strategies for multi-start optimization
 */
enum InitStrategy {
  PEAK_DAYS = 'peak_days',        // Place at reference curve peaks (current default)
  EVEN_DISTRIBUTION = 'even',      // Evenly distributed
  FRONT_LOADED = 'front',          // Concentrated early in cycle
  BACK_LOADED = 'back',            // Concentrated late in cycle
  RANDOM = 'random'                // Random placement
}

/**
 * Generate initial injection days using different strategies
 */
function generateInitialDays(
  strategy: InitStrategy,
  scheduleLength: number,
  maxInjections: number,
  referenceData: { day: number; estradiol: number; progesterone?: number }[]
): number[] {
  switch (strategy) {
    case InitStrategy.PEAK_DAYS: {
      const peakDays = referenceData
        .filter(r => r.day >= 0 && r.day < scheduleLength)
        .sort((a, b) => b.estradiol - a.estradiol)
        .slice(0, maxInjections)
        .map(r => Math.floor(r.day))
        .sort((a, b) => a - b);

      return peakDays.length >= maxInjections
        ? peakDays
        : generateCandidateDays(scheduleLength, maxInjections);
    }

    case InitStrategy.EVEN_DISTRIBUTION:
      return generateCandidateDays(scheduleLength, maxInjections);

    case InitStrategy.FRONT_LOADED: {
      // Concentrate 70% of injections in first third of cycle
      const days: number[] = [];
      const firstThird = Math.floor(scheduleLength / 3);
      const frontLoadCount = Math.ceil(maxInjections * 0.7);
      const remainingCount = maxInjections - frontLoadCount;

      // Front-loaded portion
      for (let i = 0; i < frontLoadCount; i++) {
        const day = Math.floor((i / frontLoadCount) * firstThird);
        days.push(day);
      }

      // Remaining spread across rest
      for (let i = 0; i < remainingCount; i++) {
        const day = firstThird + Math.floor((i / remainingCount) * (scheduleLength - firstThird));
        days.push(day);
      }

      return [...new Set(days)].sort((a, b) => a - b).slice(0, maxInjections);
    }

    case InitStrategy.BACK_LOADED: {
      // Concentrate 70% of injections in last third of cycle
      const days: number[] = [];
      const lastThirdStart = Math.floor((scheduleLength * 2) / 3);
      const backLoadCount = Math.ceil(maxInjections * 0.7);
      const remainingCount = maxInjections - backLoadCount;

      // Remaining spread across first part
      for (let i = 0; i < remainingCount; i++) {
        const day = Math.floor((i / remainingCount) * lastThirdStart);
        days.push(day);
      }

      // Back-loaded portion
      for (let i = 0; i < backLoadCount; i++) {
        const day = lastThirdStart + Math.floor((i / backLoadCount) * (scheduleLength - lastThirdStart));
        days.push(day);
      }

      return [...new Set(days)].sort((a, b) => a - b).slice(0, maxInjections);
    }

    case InitStrategy.RANDOM: {
      const days: number[] = [];
      while (days.length < maxInjections) {
        const day = Math.floor(Math.random() * scheduleLength);
        if (!days.includes(day)) {
          days.push(day);
        }
      }
      return days.sort((a, b) => a - b);
    }

    default:
      return generateCandidateDays(scheduleLength, maxInjections);
  }
}

/**
 * Try to remove a single estradiol dose to meet injection limit
 * Returns updated state if improvement found
 * Uses multi-objective scoring to balance accuracy and simplicity
 */
function tryRemoveEstradiolDose(
  state: OptimizationState,
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean,
  maxInjectionsPerCycle: number,
  accuracyOnly: boolean
): { doses: Dose[]; score: number; improved: boolean } {
  const estradiolDoseCount = state.currentDoses.filter(d => isEstradiolMedication(d.medication)).length;

  if (estradiolDoseCount <= maxInjectionsPerCycle) {
    return { doses: state.currentDoses, score: state.currentScore, improved: false };
  }

  let bestRemovalScore = Infinity;
  let bestRemovalIndex = -1;

  // Find the BEST single ESTRADIOL dose to remove (using multi-objective score)
  for (let i = state.currentDoses.length - 1; i >= 0; i--) {
    if (!isEstradiolMedication(state.currentDoses[i]!.medication)) continue;

    const withoutDose = state.currentDoses.filter((_, idx) => idx !== i);
    if (withoutDose.length === 0) continue;

    const mse = calculateMSE(withoutDose, referenceData, scheduleLength, steadyState);
    const multiObjScore = calculateMultiObjectiveScore(withoutDose, mse, accuracyOnly);

    if (multiObjScore < bestRemovalScore) {
      bestRemovalScore = multiObjScore;
      bestRemovalIndex = i;
    }
  }

  if (bestRemovalIndex >= 0) {
    return {
      doses: state.currentDoses.filter((_, idx) => idx !== bestRemovalIndex),
      score: bestRemovalScore,
      improved: true
    };
  }

  return { doses: state.currentDoses, score: state.currentScore, improved: false };
}

/**
 * Try adjusting doses for all current medications
 * Returns updated state if any improvements found
 * Uses adaptive granularity based on optimization state
 */
function tryAdjustDoses(
  state: OptimizationState,
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean,
  params: OptimizationParams,
  accuracyOnly: boolean
): { doses: Dose[]; score: number; improved: boolean } {
  const {
    granularity = 0.05,
    maxDosePerInjection = 10,
    minDosePerInjection = 0.1,
    esterConcentrations,
    progesteroneDoses = [100, 200]
  } = params;

  // Apply adaptive granularity multiplier
  const effectiveGranularity = granularity * state.currentGranularityMultiplier;

  let currentDoses = [...state.currentDoses];
  let currentScore = state.currentScore;
  let anyImprovement = false;

  for (let i = 0; i < currentDoses.length; i++) {
    const dose = currentDoses[i]!;
    const originalDose = dose.dose;
    const medication = dose.medication;

    let bestDose = originalDose;
    let bestScore = currentScore;

    // Handle progesterone with discrete doses
    if (isProgesteroneMedication(medication)) {
      for (const testDose of progesteroneDoses) {
        if (testDose === originalDose) continue;
        if (testDose > maxDosePerInjection || testDose < minDosePerInjection) continue;

        currentDoses[i]!.dose = testDose;
        const mse = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);
        const newScore = calculateMultiObjectiveScore(currentDoses, mse, accuracyOnly);

        if (newScore < bestScore) {
          bestScore = newScore;
          bestDose = testDose;
          anyImprovement = true;
        }
      }
    } else {
      // Estradiol: use volume-based dosing with adaptive granularity
      const concentration = esterConcentrations[medication.name] || 40;
      const originalVolumeMl = originalDose / concentration;

      // Try increasing volume
      for (let numSteps = 1; numSteps <= OPTIMIZATION_CONSTANTS.MAX_DOSE_ADJUSTMENT_STEPS; numSteps++) {
        const testVolumeMl = originalVolumeMl + (effectiveGranularity * numSteps);
        const testDose = testVolumeMl * concentration;

        if (testDose > maxDosePerInjection) break;

        currentDoses[i]!.dose = testDose;
        const mse = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);
        const newScore = calculateMultiObjectiveScore(currentDoses, mse, accuracyOnly);

        if (newScore < bestScore) {
          bestScore = newScore;
          bestDose = testDose;
          anyImprovement = true;
        }
      }

      // Reset and try decreasing
      currentDoses[i]!.dose = originalDose;

      for (let numSteps = 1; numSteps <= OPTIMIZATION_CONSTANTS.MAX_DOSE_ADJUSTMENT_STEPS; numSteps++) {
        const testVolumeMl = Math.max(0.01, originalVolumeMl - (effectiveGranularity * numSteps));
        const testDose = testVolumeMl * concentration;

        if (testDose < minDosePerInjection) break;

        currentDoses[i]!.dose = testDose;
        const mse = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);
        const newScore = calculateMultiObjectiveScore(currentDoses, mse, accuracyOnly);

        if (newScore < bestScore) {
          bestScore = newScore;
          bestDose = testDose;
          anyImprovement = true;
        }
      }
    }

    currentDoses[i]!.dose = bestDose;
    currentScore = bestScore;
  }

  return { doses: currentDoses, score: currentScore, improved: anyImprovement };
}

/**
 * Calculate effective half-life for an estradiol medication
 * Uses k2 (elimination rate) as approximation: t_half ≈ ln(2)/k2
 */
function getEstradiolHalfLife(medication: AnyMedication): number {
  if (!isEstradiolMedication(medication)) return 0;
  const med = medication as EstradiolMedication;
  return Math.log(2) / med.k2; // Half-life in days
}

/**
 * Select best ester based on gap to next injection
 * Prefers esters with half-life matching the gap duration
 */
function selectBestEstersForGap(
  gapDays: number,
  availableEsters: AnyMedication[]
): AnyMedication[] {
  const estradiolEsters = availableEsters.filter(e => isEstradiolMedication(e));
  if (estradiolEsters.length === 0) return availableEsters;

  // Sort by how well half-life matches gap
  // Ideal: half-life is 30-50% of gap (so 2-3 half-lives occur)
  const targetHalfLife = gapDays * 0.4;

  const sorted = estradiolEsters
    .map(ester => ({
      ester,
      halfLife: getEstradiolHalfLife(ester),
      score: 0
    }))
    .map(item => ({
      ...item,
      score: Math.abs(item.halfLife - targetHalfLife)
    }))
    .sort((a, b) => a.score - b.score);

  // Return top 2 candidates for the gap
  return sorted.slice(0, 2).map(s => s.ester);
}

/**
 * Try switching medications for existing doses
 * Returns updated state if any improvements found
 * OPTIMIZED: Uses pharmacokinetic-aware ester selection
 */
function trySwitchMedications(
  state: OptimizationState,
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean,
  params: OptimizationParams,
  accuracyOnly: boolean
): { doses: Dose[]; score: number; improved: boolean } {
  const {
    availableEsters,
    esterConcentrations,
    progesteroneDoses = [100, 200],
    maxDosePerInjection = 10
  } = params;

  if (availableEsters.length <= 1) {
    return { doses: state.currentDoses, score: state.currentScore, improved: false };
  }

  let currentDoses = [...state.currentDoses];
  let currentScore = state.currentScore;
  let anyImprovement = false;

  for (let i = 0; i < currentDoses.length; i++) {
    const originalEster = currentDoses[i]!.medication;
    const originalDose = currentDoses[i]!.dose;
    const currentDay = currentDoses[i]!.day;

    let bestEster = originalEster;
    let bestDose = originalDose;
    let bestEsterScore = currentScore;

    // For estradiol: calculate gap to next injection for smart ester selection
    let candidateEsters = availableEsters;
    if (isEstradiolMedication(originalEster)) {
      const nextInjection = currentDoses
        .filter(d => d.day > currentDay && isEstradiolMedication(d.medication))
        .sort((a, b) => a.day - b.day)[0];

      const gapDays = nextInjection ? nextInjection.day - currentDay : scheduleLength - currentDay;

      // Use pharmacokinetic-aware selection
      candidateEsters = selectBestEstersForGap(gapDays, availableEsters);
    }

    for (const ester of candidateEsters) {
      if (ester.name === originalEster.name) continue;

      // Check rectal progesterone constraint
      if (isProgesteroneMedication(ester) && 'route' in ester && ester.route === 'rectal') {
        if (hasRectalProgesteroneOnDay(currentDoses, currentDay, i)) {
          continue;
        }
      }

      // Adjust dose when switching medication type
      let testDose = originalDose;
      if (isProgesteroneMedication(ester)) {
        testDose = progesteroneDoses.reduce((prev, curr) =>
          Math.abs(curr - originalDose) < Math.abs(prev - originalDose) ? curr : prev
        );
      } else if (isProgesteroneMedication(originalEster)) {
        const concentration = esterConcentrations[ester.name] || 40;
        const defaultDose = OPTIMIZATION_CONSTANTS.DEFAULT_ESTRADIOL_STARTING_VOLUME_ML * concentration;
        testDose = Math.min(defaultDose, maxDosePerInjection);
      }

      currentDoses[i]!.medication = ester;
      currentDoses[i]!.dose = testDose;
      const mse = calculateMSE(currentDoses, referenceData, scheduleLength, steadyState);
      const newScore = calculateMultiObjectiveScore(currentDoses, mse, accuracyOnly);

      if (newScore < bestEsterScore) {
        bestEsterScore = newScore;
        bestEster = ester;
        bestDose = testDose;
        anyImprovement = true;
      }
    }

    currentDoses[i]!.medication = bestEster;
    currentDoses[i]!.dose = bestDose;
    currentScore = bestEsterScore;
  }

  return { doses: currentDoses, score: currentScore, improved: anyImprovement };
}

/**
 * Get high-value candidate days based on reference curve
 * Returns days where reference concentration is above median
 */
function getHighValueDays(
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  isProgesterone: boolean = false
): Set<number> {
  const relevantData = referenceData.filter(r => r.day >= 0 && r.day < scheduleLength);
  const values = relevantData.map(r => isProgesterone ? (r.progesterone || 0) : r.estradiol);
  const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)] || 0;

  const highValueDays = new Set<number>();
  for (const refPoint of relevantData) {
    const value = isProgesterone ? (refPoint.progesterone || 0) : refPoint.estradiol;
    if (value >= median) {
      highValueDays.add(Math.floor(refPoint.day));
    }
  }

  return highValueDays;
}

/**
 * Try moving injection days to better match the reference curve
 * Returns updated state if any improvements found
 * OPTIMIZED: Only tries high-value days from reference curve + local neighbors
 */
function tryMoveDays(
  state: OptimizationState,
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean,
  accuracyOnly: boolean
): { doses: Dose[]; score: number; improved: boolean } {
  let currentDoses = [...state.currentDoses];
  let currentScore = state.currentScore;
  let anyImprovement = false;

  // Pre-compute high-value days for estradiol and progesterone
  const highValueEstradiolDays = getHighValueDays(referenceData, scheduleLength, false);
  const highValueProgesteroneDays = getHighValueDays(referenceData, scheduleLength, true);

  // Try moving each dose to a different day
  for (let i = 0; i < currentDoses.length; i++) {
    const dose = currentDoses[i]!;
    const originalDay = dose.day;
    const isProg = isProgesteroneMedication(dose.medication);

    let bestDay = originalDay;
    let bestScore = currentScore;

    // Build candidate days: high-value days + local neighbors
    const highValueDays = isProg ? highValueProgesteroneDays : highValueEstradiolDays;
    const candidateDays = new Set<number>([
      ...highValueDays,
      // Local search: ±1, ±2, ±3 days from current position
      Math.max(0, originalDay - 3),
      Math.max(0, originalDay - 2),
      Math.max(0, originalDay - 1),
      Math.min(scheduleLength - 1, originalDay + 1),
      Math.min(scheduleLength - 1, originalDay + 2),
      Math.min(scheduleLength - 1, originalDay + 3)
    ]);

    // Only try candidate days (typically 10-15 instead of all 28)
    for (const newDay of candidateDays) {
      if (newDay === originalDay) continue;

      // Check if we can move to this day
      const testDoses = currentDoses.map((d, idx) =>
        idx === i ? { ...d, day: newDay } : d
      );

      const mse = calculateMSE(testDoses, referenceData, scheduleLength, steadyState);
      const newScore = calculateMultiObjectiveScore(testDoses, mse, accuracyOnly);

      if (newScore < bestScore) {
        bestScore = newScore;
        bestDay = newDay;
        anyImprovement = true;
      }
    }

    // Apply the best day for this dose
    if (bestDay !== originalDay) {
      currentDoses[i]!.day = bestDay;
      currentScore = bestScore;
    }
  }

  return { doses: currentDoses, score: currentScore, improved: anyImprovement };
}

/**
 * Try adding additional medications to the schedule
 * Returns updated state if any improvements found
 * Uses multi-objective scoring to avoid excessive complexity
 * Prioritizes days with high reference concentrations
 */
function tryAddMedications(
  state: OptimizationState,
  referenceData: { day: number; estradiol: number; progesterone?: number }[],
  scheduleLength: number,
  steadyState: boolean,
  params: OptimizationParams,
  accuracyOnly: boolean
): { doses: Dose[]; score: number; improved: boolean } {
  const {
    availableEsters,
    maxInjectionsPerCycle = 10,
    maxDosePerInjection = 10,
    esterConcentrations,
    progesteroneDoses = [100, 200]
  } = params;

  if (availableEsters.length <= 1) {
    return { doses: state.currentDoses, score: state.currentScore, improved: false };
  }

  let currentDoses = [...state.currentDoses];
  let currentScore = state.currentScore;
  let anyImprovement = false;

  // Sort days by importance for BOTH estradiol and progesterone
  // Prioritize days with high reference values for either hormone
  const daysByImportance = referenceData
    .filter(r => r.day >= 0 && r.day < scheduleLength)
    .sort((a, b) => {
      // Score = estradiol + (10 × progesterone) to balance scales
      // Progesterone is ng/mL (0-20), estradiol is pg/mL (50-300)
      const scoreA = a.estradiol + (a.progesterone || 0) * 10;
      const scoreB = b.estradiol + (b.progesterone || 0) * 10;
      return scoreB - scoreA;
    })
    .map(r => Math.floor(r.day));

  for (const day of daysByImportance) {
    for (const med of availableEsters) {
      if (!canAddMedicationToDay(med, day, currentDoses, maxInjectionsPerCycle)) {
        continue;
      }

      const concentration = esterConcentrations[med.name] || 100;
      let initialDose: number;
      if (isProgesteroneMedication(med)) {
        initialDose = progesteroneDoses[0]!;
      } else {
        // Ensure initial dose respects maxDosePerInjection
        initialDose = Math.min(
          OPTIMIZATION_CONSTANTS.DEFAULT_ESTRADIOL_STARTING_VOLUME_ML * concentration,
          maxDosePerInjection
        );
      }

      const newDose: Dose = {
        day,
        dose: initialDose,
        medication: med
      };

      const testDoses = [...currentDoses, newDose];
      const mse = calculateMSE(testDoses, referenceData, scheduleLength, steadyState);
      const newScore = calculateMultiObjectiveScore(testDoses, mse, accuracyOnly);

      if (newScore < currentScore) {
        currentDoses = testDoses;
        currentScore = newScore;
        anyImprovement = true;
      }
    }
  }

  return { doses: currentDoses, score: currentScore, improved: anyImprovement };
}

/**
 * Optimize injection schedule using iterative improvement
 * Uses a greedy local search algorithm with multiple optimization phases
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
    minDosePerInjection = 0.1,
    maxDosePerInjection = 10,
    maxInjectionsPerCycle = 10,
    granularity = 0.05,
    esterConcentrations,
    progesteroneDoses = [100, 200], // Default: both doses available
    optimizeForAccuracyOnly = false // Default: balance accuracy with simplicity
  } = params;

  if (availableEsters.length === 0) {
    throw new Error('At least one ester must be available');
  }

  // Clear MSE cache for new optimization
  mseCache.clear();

  // Get reference cycle data
  const referenceData = generateReferenceCycle(scheduleLength, referenceCycleType);

  // Multi-start beam search: Try multiple initialization strategies
  const MULTI_START_STRATEGIES = [
    InitStrategy.PEAK_DAYS,          // Usually best for matching reference curves
    InitStrategy.EVEN_DISTRIBUTION,  // Good baseline
    InitStrategy.FRONT_LOADED       // Good for early follicular phase targeting
  ];

  const initialGranularityMultiplier = OPTIMIZATION_CONSTANTS.ADAPTIVE_GRANULARITY_ENABLED
    ? OPTIMIZATION_CONSTANTS.INITIAL_GRANULARITY_MULTIPLIER
    : 1;

  // Get estradiol medications to try (prioritize these for initial states)
  const estradiolMeds = availableEsters.filter(e => isEstradiolMedication(e));
  const primaryMedications = estradiolMeds.length > 0 ? estradiolMeds : availableEsters;

  // Create initial beam (multiple starting states)
  // IMPORTANT: Try DIFFERENT medications for each strategy to explore medication space
  const initialBeam: OptimizationState[] = [];

  for (let i = 0; i < MULTI_START_STRATEGIES.length; i++) {
    const strategy = MULTI_START_STRATEGIES[i]!;

    // Rotate through available medications (if we have multiple)
    const primaryEster = primaryMedications[i % primaryMedications.length]!;

    // Calculate starting dose for this medication
    let startingDose: number;
    if (isProgesteroneMedication(primaryEster)) {
      startingDose = progesteroneDoses[0]!;
    } else {
      const primaryConcentration = esterConcentrations[primaryEster.name] || 40;
      const defaultDose = OPTIMIZATION_CONSTANTS.DEFAULT_ESTRADIOL_STARTING_VOLUME_ML * primaryConcentration;
      startingDose = Math.min(defaultDose, maxDosePerInjection);
    }

    const candidateDays = generateInitialDays(
      strategy,
      scheduleLength,
      maxInjectionsPerCycle,
      referenceData
    );

    const initialDoses: Dose[] = candidateDays.map(day => ({
      day,
      dose: startingDose,
      medication: primaryEster
    }));

    const initialMSE = calculateMSE(initialDoses, referenceData, scheduleLength, steadyState);
    const initialScore = calculateMultiObjectiveScore(initialDoses, initialMSE, optimizeForAccuracyOnly);

    initialBeam.push({
      currentDoses: initialDoses,
      currentScore: initialScore,
      iterations: 0,
      noImprovementCount: 0,
      bestScoreThisRun: initialScore,
      bestDosesThisRun: [...initialDoses],
      currentGranularityMultiplier: initialGranularityMultiplier,
      iterationsSinceRefinement: 0
    });
  }

  // Sort beam by score (best first) and keep top BEAM_WIDTH
  const beam = initialBeam
    .sort((a, b) => a.currentScore - b.currentScore)
    .slice(0, OPTIMIZATION_CONSTANTS.BEAM_WIDTH);

  // Start from the best initialization (for greedy mode) or use beam (for beam search)
  let state: OptimizationState = beam[0]!;

  // Optimization loop - run until no improvement found
  while (true) {
    state.iterations++;
    const previousScore = state.currentScore;

    // Report progress and yield to event loop for UI updates
    // OPTIMIZED: Only yield every 5 iterations to reduce overhead
    if (onProgress && state.iterations % 5 === 0) {
      const estimatedProgress = Math.min(
        OPTIMIZATION_CONSTANTS.MAX_DISPLAYED_PROGRESS_UNTIL_COMPLETE,
        Math.round((1 - Math.exp(-state.iterations / OPTIMIZATION_CONSTANTS.PROGRESS_CONVERGENCE_RATE)) * 100)
      );
      onProgress(estimatedProgress, state.currentScore, state.iterations);
      // Yield to event loop every 5 iterations to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Phase 1: Remove excess estradiol doses if over limit
    const removalResult = tryRemoveEstradiolDose(
      state,
      referenceData,
      scheduleLength,
      steadyState,
      maxInjectionsPerCycle,
      optimizeForAccuracyOnly
    );
    if (removalResult.improved) {
      state.currentDoses = removalResult.doses;
      state.currentScore = removalResult.score;
    }

    // Phase 2: Adjust dosages
    const adjustResult = tryAdjustDoses(
      state,
      referenceData,
      scheduleLength,
      steadyState,
      params,
      optimizeForAccuracyOnly
    );
    if (adjustResult.improved) {
      state.currentDoses = adjustResult.doses;
      state.currentScore = adjustResult.score;
    }

    // Phase 3: Try moving injection days (most impactful for matching curves)
    const moveDaysResult = tryMoveDays(
      state,
      referenceData,
      scheduleLength,
      steadyState,
      optimizeForAccuracyOnly
    );
    if (moveDaysResult.improved) {
      state.currentDoses = moveDaysResult.doses;
      state.currentScore = moveDaysResult.score;
    }

    // Phase 4: Try switching medications
    const switchResult = trySwitchMedications(
      state,
      referenceData,
      scheduleLength,
      steadyState,
      params,
      optimizeForAccuracyOnly
    );
    if (switchResult.improved) {
      state.currentDoses = switchResult.doses;
      state.currentScore = switchResult.score;
    }

    // Phase 5: Try adding medications
    const addResult = tryAddMedications(
      state,
      referenceData,
      scheduleLength,
      steadyState,
      params,
      optimizeForAccuracyOnly
    );
    if (addResult.improved) {
      state.currentDoses = addResult.doses;
      state.currentScore = addResult.score;
    }

    // Update best solution if current is better
    if (state.currentScore < state.bestScoreThisRun) {
      state.bestScoreThisRun = state.currentScore;
      state.bestDosesThisRun = [...state.currentDoses];
    }

    // Check for convergence and adaptive granularity refinement
    const improvement = previousScore - state.currentScore;
    const hasImproved = improvement > OPTIMIZATION_CONSTANTS.MIN_IMPROVEMENT_THRESHOLD;

    if (!hasImproved) {
      state.noImprovementCount++;
      state.iterationsSinceRefinement++;

      // Adaptive granularity: refine when stuck
      if (OPTIMIZATION_CONSTANTS.ADAPTIVE_GRANULARITY_ENABLED &&
          state.iterationsSinceRefinement >= OPTIMIZATION_CONSTANTS.GRANULARITY_REFINEMENT_TRIGGER &&
          state.currentGranularityMultiplier > OPTIMIZATION_CONSTANTS.MIN_GRANULARITY_MULTIPLIER) {

        // Reduce granularity by half (get finer)
        state.currentGranularityMultiplier = Math.max(
          OPTIMIZATION_CONSTANTS.MIN_GRANULARITY_MULTIPLIER,
          state.currentGranularityMultiplier / 2
        );
        state.iterationsSinceRefinement = 0;
        state.noImprovementCount = 0; // Reset to give refined granularity a chance
      } else if (state.noImprovementCount >= OPTIMIZATION_CONSTANTS.NO_IMPROVEMENT_ITERATIONS_LIMIT) {
        break; // Converged
      }
    } else {
      state.noImprovementCount = 0; // Reset counter on improvement
      state.iterationsSinceRefinement = 0; // Reset refinement counter
    }
  }

  // Use best solution found (important for simulated annealing)
  state.currentDoses = state.bestDosesThisRun;
  state.currentScore = state.bestScoreThisRun;

  // Consolidate any duplicate medications on the same day
  state.currentDoses = consolidateDuplicateMedications(state.currentDoses);

  // Extract final state
  const iterations = state.iterations;

  // Final progress update
  if (onProgress) {
    onProgress(100, state.currentScore, iterations);
  }

  // Validate and clamp all doses to respect constraints
  let finalDoses = state.currentDoses.map(d => {
    if (isProgesteroneMedication(d.medication)) {
      // Progesterone: allow multiples of available doses (e.g., 100, 200, 300, 400mg)
      // Since you can take multiple pills per day
      // Round to nearest multiple of smallest dose
      const smallestDose = Math.min(...progesteroneDoses);
      const roundedDose = Math.round(d.dose / smallestDose) * smallestDose;

      // But for rectal, enforce single dose only
      if ('route' in d.medication && d.medication.route === 'rectal') {
        // Rectal: round to nearest available dose (can't use multiple suppositories)
        const singleDose = progesteroneDoses.reduce((prev, curr) =>
          Math.abs(curr - d.dose) < Math.abs(prev - d.dose) ? curr : prev
        );
        return { ...d, dose: singleDose };
      }

      // Oral/vaginal: allow multiples (100, 200, 300, 400mg, etc.)
      return { ...d, dose: Math.max(smallestDose, roundedDose) };
    } else {
      // Estradiol: round to granularity, then clamp to max (don't clamp to min - let filter handle that)
      const concentration = esterConcentrations[d.medication.name] || 40;
      const volumeMl = d.dose / concentration;

      // Round volume to nearest granularity step
      const roundedVolumeMl = Math.round(volumeMl / granularity) * granularity;

      // Convert back to dose in mg
      const roundedDose = roundedVolumeMl * concentration;

      // Only clamp to MAX, not MIN (let the filter below remove tiny doses)
      const clampedDose = Math.min(roundedDose, maxDosePerInjection);

      return { ...d, dose: clampedDose };
    }
  });

  // Filter out tiny doses AFTER rounding (rounding can make doses go to 0)
  finalDoses = finalDoses.filter(d => d.dose >= minDosePerInjection);

  // Recalculate final score (always report MSE, not the penalized score)
  const finalScore = calculateMSE(finalDoses, referenceData, scheduleLength, steadyState);

  return {
    doses: finalDoses,
    score: finalScore,
    iterations
  };
}
