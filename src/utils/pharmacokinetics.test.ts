import {
  calculateConcentration,
  calculateTotalConcentration,
  generateTimePoints,
} from './pharmacokinetics';
import { ESTRADIOL_ESTERS } from '../data/estradiolEsters';
import { PHARMACOKINETICS } from '../constants/pharmacokinetics';

describe('generateTimePoints', () => {
  it('should generate time points with default step', () => {
    const points = generateTimePoints(5);
    expect(points).toContain(0);
    expect(points).toContain(2.5);
    expect(points).toContain(5);
    expect(points.length).toBe(11); // 0, 0.5, 1, 1.5, ..., 5
  });

  it('should generate time points with custom step', () => {
    const points = generateTimePoints(10, 1);
    expect(points).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should generate single point for maxDays = 0', () => {
    const points = generateTimePoints(0, 0.5);
    expect(points).toEqual([0]);
  });

  it('should handle fractional steps correctly', () => {
    const points = generateTimePoints(2, 0.5);
    expect(points).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});

describe('calculateConcentration', () => {
  const EV = ESTRADIOL_ESTERS[1]; // Estradiol valerate
  const EC = ESTRADIOL_ESTERS[2]; // Estradiol cypionate

  describe('basic calculation', () => {
    it('should return 0 before injection day', () => {
      const concentration = calculateConcentration(0, 1, 5, EV);
      expect(concentration).toBe(0);
    });

    it('should return 0 after effect duration', () => {
      const concentration = calculateConcentration(
        1 + PHARMACOKINETICS.ESTER_EFFECT_DURATION_DAYS + 1,
        1,
        5,
        EV
      );
      expect(concentration).toBe(0);
    });

    it('should return positive value during active period', () => {
      const concentration = calculateConcentration(2, 1, 5, EV);
      expect(concentration).toBeGreaterThan(0);
    });

    it('should return non-negative concentration', () => {
      // Test various time points
      for (let t = 0; t <= 50; t += 5) {
        const concentration = calculateConcentration(t, 0, 5, EV);
        expect(concentration).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('dose relationship', () => {
    it('should scale linearly with dose', () => {
      const conc1 = calculateConcentration(5, 0, 5, EV);
      const conc2 = calculateConcentration(5, 0, 10, EV);

      expect(conc2).toBeCloseTo(conc1 * 2, 5);
    });

    it('should return 0 for zero dose', () => {
      const concentration = calculateConcentration(5, 0, 0, EV);
      expect(concentration).toBe(0);
    });
  });

  describe('ester comparison', () => {
    it('should produce different curves for different esters', () => {
      const concEV = calculateConcentration(5, 0, 5, EV);
      const concEC = calculateConcentration(5, 0, 5, EC);

      expect(concEV).not.toBe(concEC);
    });

    it('should work with all available esters', () => {
      ESTRADIOL_ESTERS.forEach(ester => {
        const concentration = calculateConcentration(5, 0, 5, ester);
        expect(concentration).toBeGreaterThan(0);
        expect(Number.isFinite(concentration)).toBe(true);
      });
    });
  });

  describe('pharmacokinetic model properties', () => {
    it('should have peak concentration after injection', () => {
      const concentrations: number[] = [];
      for (let t = 0; t <= 20; t += 0.5) {
        concentrations.push(calculateConcentration(t, 0, 5, EV));
      }

      const peak = Math.max(...concentrations);
      const injectionConc = concentrations[0];

      expect(peak).toBeGreaterThan(injectionConc);
    });

    it('should eventually decline from peak', () => {
      // Find peak
      let peakTime = 0;
      let peakConc = 0;
      for (let t = 0; t <= 20; t += 0.1) {
        const conc = calculateConcentration(t, 0, 5, EV);
        if (conc > peakConc) {
          peakConc = conc;
          peakTime = t;
        }
      }

      // Check that concentration declines after peak
      const laterConc = calculateConcentration(peakTime + 10, 0, 5, EV);
      expect(laterConc).toBeLessThan(peakConc);
    });

    it('should handle injection at non-zero day', () => {
      const conc1 = calculateConcentration(10, 5, 5, EV);
      const conc2 = calculateConcentration(5, 0, 5, EV);

      // Same time delta should give same concentration
      expect(conc1).toBeCloseTo(conc2, 10);
    });
  });
});

describe('calculateTotalConcentration', () => {
  const EV = ESTRADIOL_ESTERS[1];

  describe('single dose', () => {
    it('should handle single dose correctly', () => {
      const doses = [{ day: 0, dose: 5, ester: EV }];
      const timePoints = [0, 1, 2, 3, 4, 5];

      const result = calculateTotalConcentration(doses, timePoints);

      expect(result).toHaveLength(timePoints.length);
      result.forEach((point, i) => {
        expect(point.time).toBe(timePoints[i]);
        expect(point.concentration).toBeGreaterThanOrEqual(0);
      });
    });

    it('should match single calculateConcentration for single dose', () => {
      const doses = [{ day: 0, dose: 5, ester: EV }];
      const timePoints = [0, 1, 2, 3, 4, 5];

      const result = calculateTotalConcentration(doses, timePoints);

      result.forEach(point => {
        const expected = calculateConcentration(point.time, 0, 5, EV);
        expect(point.concentration).toBeCloseTo(expected, 10);
      });
    });
  });

  describe('multiple doses', () => {
    it('should sum concentrations from multiple doses', () => {
      const doses = [
        { day: 0, dose: 5, ester: EV },
        { day: 3, dose: 5, ester: EV },
      ];
      const timePoints = [4];

      const result = calculateTotalConcentration(doses, timePoints);

      const conc1 = calculateConcentration(4, 0, 5, EV);
      const conc2 = calculateConcentration(4, 3, 5, EV);
      const expected = conc1 + conc2;

      expect(result[0].concentration).toBeCloseTo(expected, 10);
    });

    it('should handle doses with different esters', () => {
      const EC = ESTRADIOL_ESTERS[2];
      const doses = [
        { day: 0, dose: 5, ester: EV },
        { day: 3, dose: 5, ester: EC },
      ];
      const timePoints = [4];

      const result = calculateTotalConcentration(doses, timePoints);

      expect(result[0].concentration).toBeGreaterThan(0);
      expect(Number.isFinite(result[0].concentration)).toBe(true);
    });

    it('should handle empty doses array', () => {
      const doses: typeof ESTRADIOL_ESTERS extends Array<infer T>
        ? Array<{ day: number; dose: number; ester: T }>
        : never = [];
      const timePoints = [0, 1, 2];

      const result = calculateTotalConcentration(doses, timePoints);

      result.forEach(point => {
        expect(point.concentration).toBe(0);
      });
    });
  });

  describe('steady state simulation', () => {
    it('should show buildup from repeated doses', () => {
      const doses = [
        { day: 0, dose: 5, ester: EV },
        { day: 7, dose: 5, ester: EV },
        { day: 14, dose: 5, ester: EV },
      ];
      const timePoints = generateTimePoints(21, 1);

      const result = calculateTotalConcentration(doses, timePoints);

      // Concentration at day 14 should be higher than day 7 (due to buildup)
      const conc7 = result.find(p => p.time === 7)?.concentration || 0;
      const conc14 = result.find(p => p.time === 14)?.concentration || 0;

      expect(conc14).toBeGreaterThan(conc7);
    });

    it('should maintain non-negative concentrations with many doses', () => {
      const doses = [];
      for (let day = 0; day < 100; day += 7) {
        doses.push({ day, dose: 5, ester: EV });
      }

      const timePoints = generateTimePoints(100, 1);
      const result = calculateTotalConcentration(doses, timePoints);

      result.forEach(point => {
        expect(point.concentration).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(point.concentration)).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very large doses', () => {
      const doses = [{ day: 0, dose: 100, ester: EV }];
      const timePoints = [1];

      const result = calculateTotalConcentration(doses, timePoints);

      expect(result[0].concentration).toBeGreaterThan(0);
      expect(Number.isFinite(result[0].concentration)).toBe(true);
    });

    it('should handle very small doses', () => {
      const doses = [{ day: 0, dose: 0.01, ester: EV }];
      const timePoints = [1];

      const result = calculateTotalConcentration(doses, timePoints);

      expect(result[0].concentration).toBeGreaterThan(0);
      expect(result[0].concentration).toBeLessThan(1);
    });

    it('should handle doses far apart in time', () => {
      const doses = [
        { day: 0, dose: 5, ester: EV },
        { day: 1000, dose: 5, ester: EV },
      ];
      const timePoints = [500, 1001];

      const result = calculateTotalConcentration(doses, timePoints);

      // At t=500, only first dose contributes (should be ~0)
      expect(result[0].concentration).toBeLessThan(1);

      // At t=1001, second dose should contribute
      expect(result[1].concentration).toBeGreaterThan(0);
    });
  });
});
