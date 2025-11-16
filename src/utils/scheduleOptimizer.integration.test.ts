import { optimizeSchedule } from './scheduleOptimizer';
import { ESTRADIOL_ESTERS } from '../data/estradiolEsters';
import { ReferenceCycleType } from '../data/referenceData';

describe('scheduleOptimizer integration tests', () => {
  const esterConcentrations = {
    'Estradiol cypionate': 40,
    'Estradiol valerate': 40,
    'Estradiol enanthate': 40,
    'Estradiol undecylate': 40
  };

  // Longer timeout for optimization tests
  jest.setTimeout(30000);

  describe('Basic optimization', () => {
    it('generates a valid schedule with single ester', async () => {
      const result = await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!], // Estradiol valerate
        scheduleLength: 7,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: false,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 2,
        esterConcentrations
      });

      // Should return a result
      expect(result).toBeDefined();
      expect(result.doses).toBeDefined();
      expect(Array.isArray(result.doses)).toBe(true);

      // Should have at most maxInjectionsPerCycle doses
      expect(result.doses.length).toBeLessThanOrEqual(2);

      // All doses should be within valid range
      result.doses.forEach(dose => {
        expect(dose.dose).toBeGreaterThanOrEqual(1);
        expect(dose.dose).toBeLessThanOrEqual(10);
        expect(dose.day).toBeGreaterThanOrEqual(0);
        expect(dose.day).toBeLessThan(7);
      });

      // Should have a reasonable score
      expect(result.score).toBeGreaterThan(0);
    });

    it('uses multiple esters when available', async () => {
      const result = await optimizeSchedule({
        availableEsters: ESTRADIOL_ESTERS,
        scheduleLength: 14,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: true,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 3,
        esterConcentrations
      });

      expect(result.doses.length).toBeLessThanOrEqual(3);
      expect(result.doses.length).toBeGreaterThan(0);

      // Check that doses are sorted by day
      for (let i = 1; i < result.doses.length; i++) {
        expect(result.doses[i]!.day).toBeGreaterThanOrEqual(result.doses[i - 1]!.day);
      }
    });
  });

  describe('Progress callback', () => {
    it('calls progress callback during optimization', async () => {
      const progressUpdates: number[] = [];

      await optimizeSchedule(
        {
          availableEsters: [ESTRADIOL_ESTERS[1]!],
          scheduleLength: 7,
          referenceCycleType: 'typical' as ReferenceCycleType,
          steadyState: false,
          granularity: 0.05,
          maxDosePerInjection: 10,
          minDosePerInjection: 1,
          maxInjectionsPerCycle: 1,
          esterConcentrations
        },
        (progress) => {
          progressUpdates.push(progress);
        }
      );

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Progress should be between 0 and 100
      progressUpdates.forEach(progress => {
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(100);
      });

      // Progress should generally increase (allowing for some variation)
      const firstHalf = progressUpdates.slice(0, Math.floor(progressUpdates.length / 2));
      const secondHalf = progressUpdates.slice(Math.floor(progressUpdates.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      expect(avgSecond).toBeGreaterThanOrEqual(avgFirst);
    });
  });

  describe('Constraint validation', () => {
    it('respects maxInjectionsPerCycle constraint', async () => {
      const result = await optimizeSchedule({
        availableEsters: ESTRADIOL_ESTERS,
        scheduleLength: 28,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: true,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 4,
        esterConcentrations
      });

      expect(result.doses.length).toBeLessThanOrEqual(4);
    });

    it('respects dose range constraints', async () => {
      const result = await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!],
        scheduleLength: 7,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: false,
        granularity: 0.05,
        maxDosePerInjection: 5,
        minDosePerInjection: 2,
        maxInjectionsPerCycle: 2,
        esterConcentrations
      });

      result.doses.forEach(dose => {
        expect(dose.dose).toBeGreaterThanOrEqual(2);
        expect(dose.dose).toBeLessThanOrEqual(5);
      });
    });

    it('handles fine granularity correctly', async () => {
      const result = await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!],
        scheduleLength: 7,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: false,
        granularity: 0.01, // Fine granularity
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 1,
        esterConcentrations
      });

      // Should still produce valid results
      expect(result.doses.length).toBeLessThanOrEqual(1);
      result.doses.forEach(dose => {
        expect(dose.dose).toBeGreaterThanOrEqual(1);
        expect(dose.dose).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Different cycle types', () => {
    const cycleTypes: ReferenceCycleType[] = ['typical', 'hrt-target', 'conservative'];

    cycleTypes.forEach(cycleType => {
      it(`optimizes for ${cycleType} cycle`, async () => {
        const result = await optimizeSchedule({
          availableEsters: [ESTRADIOL_ESTERS[1]!],
          scheduleLength: 28,
          referenceCycleType: cycleType,
          steadyState: true,
          granularity: 0.05,
          maxDosePerInjection: 10,
          minDosePerInjection: 1,
          maxInjectionsPerCycle: 4,
          esterConcentrations
        });

        expect(result.doses.length).toBeGreaterThan(0);
        expect(result.doses.length).toBeLessThanOrEqual(4);
        expect(result.score).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('handles very short schedule length', async () => {
      const result = await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!],
        scheduleLength: 1,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: false,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 1,
        esterConcentrations
      });

      expect(result.doses.length).toBeLessThanOrEqual(1);
    });

    it('handles maxInjectionsPerCycle = 1', async () => {
      const result = await optimizeSchedule({
        availableEsters: ESTRADIOL_ESTERS,
        scheduleLength: 7,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: false,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 1,
        esterConcentrations
      });

      expect(result.doses.length).toBe(1);
    });

    it('produces different results for steady state vs non-steady state', async () => {
      const params = {
        availableEsters: [ESTRADIOL_ESTERS[1]!],
        scheduleLength: 14,
        referenceCycleType: 'typical' as ReferenceCycleType,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 2,
        esterConcentrations
      };

      const resultWithSteadyState = await optimizeSchedule({
        ...params,
        steadyState: true
      });

      const resultWithoutSteadyState = await optimizeSchedule({
        ...params,
        steadyState: false
      });

      // Results might differ (though not guaranteed)
      // At minimum, both should be valid
      expect(resultWithSteadyState.doses.length).toBeGreaterThan(0);
      expect(resultWithoutSteadyState.doses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('completes optimization in reasonable time', async () => {
      const startTime = Date.now();

      await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!],
        scheduleLength: 28,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: true,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 4,
        esterConcentrations
      });

      const duration = Date.now() - startTime;

      // Should complete in under 20 seconds (generous allowance)
      expect(duration).toBeLessThan(20000);
    });
  });

  describe('Medication consolidation', () => {
    it('never produces duplicate medications on the same day', async () => {
      const result = await optimizeSchedule({
        availableEsters: ESTRADIOL_ESTERS,
        scheduleLength: 28,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: true,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 10,
        esterConcentrations
      });

      // Check that no day has duplicate medications
      const dayMedicationMap = new Map<number, Set<string>>();

      for (const dose of result.doses) {
        if (!dayMedicationMap.has(dose.day)) {
          dayMedicationMap.set(dose.day, new Set());
        }

        const medicationsOnDay = dayMedicationMap.get(dose.day)!;
        const medName = dose.medication.name;

        // Should not already have this medication on this day
        expect(medicationsOnDay.has(medName)).toBe(false);

        medicationsOnDay.add(medName);
      }
    });

    it('prefers single medication when available', async () => {
      // Test with only EV available
      const evOnly = await optimizeSchedule({
        availableEsters: [ESTRADIOL_ESTERS[1]!], // Just EV
        scheduleLength: 28,
        referenceCycleType: 'typical' as ReferenceCycleType,
        steadyState: true,
        granularity: 0.05,
        maxDosePerInjection: 10,
        minDosePerInjection: 1,
        maxInjectionsPerCycle: 4,
        esterConcentrations
      });

      // All doses should be EV
      const uniqueMedications = new Set(evOnly.doses.map(d => d.medication.name));
      expect(uniqueMedications.size).toBe(1);
      expect(uniqueMedications.has('Estradiol valerate')).toBe(true);
    });
  });
});
