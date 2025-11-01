import { EstradiolEster, Dose } from '../data/estradiolEsters';

export interface ConcentrationPoint {
  time: number;
  concentration: number;
}

export function calculateConcentration(
  t: number,
  day: number,
  dose: number,
  ester: EstradiolEster
): number {
  if (t < day || t > day + 100) {
    return 0;
  }

  const { D, k1, k2, k3 } = ester;
  const deltaT = t - day;

  const term1 = Math.exp(-deltaT * k1) / ((k1 - k2) * (k1 - k3));
  const term2 = Math.exp(-deltaT * k3) / ((k1 - k3) * (k2 - k3));
  const term3 = (Math.exp(-deltaT * k2) * (k3 - k1)) / 
                ((k1 - k2) * (k1 - k3) * (k2 - k3));

  const concentration = (dose * D / 5) * k1 * k2 * (term1 + term2 + term3);
  
  return Math.max(0, concentration);
}

export function calculateTotalConcentration(
  doses: Dose[],
  timePoints: number[]
): ConcentrationPoint[] {
  return timePoints.map(t => {
    const totalConcentration = doses.reduce((sum, { day, dose, ester }) => {
      return sum + calculateConcentration(t, day, dose, ester);
    }, 0);

    return {
      time: t,
      concentration: Math.max(0, totalConcentration)
    };
  });
}

export function generateTimePoints(maxDays: number, step: number = 0.1): number[] {
  const points: number[] = [];
  for (let t = 0; t <= maxDays; t += step) {
    points.push(t);
  }
  return points;
}