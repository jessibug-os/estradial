import { Dose } from '../data/estradiolEsters';
import { EstradiolMedication, ProgesteroneMedication, MedicationType, AnyMedication } from '../types/medication';
import { PHARMACOKINETICS } from '../constants/pharmacokinetics';

export interface ConcentrationPoint {
  time: number;
  estradiolConcentration: number;
  progesteroneConcentration: number;
  concentration?: number;
}

export function calculateConcentration(
  t: number,
  day: number,
  dose: number,
  ester: EstradiolMedication
): number {
  if (t < day || t > day + PHARMACOKINETICS.ESTER_EFFECT_DURATION_DAYS) {
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

/**
 * Calculate progesterone concentration using one-compartment model
 * C(t) = (F * Dose * ka) / (Vd * (ka - ke)) * (e^(-ke*t) - e^(-ka*t))
 *
 * @param t - Current time (days)
 * @param day - Day of dose administration
 * @param dose - Dose amount (mg)
 * @param medication - Progesterone medication with PK parameters
 * @returns Concentration in ng/mL
 */
export function calculateProgesteroneConcentration(
  t: number,
  day: number,
  dose: number,
  medication: ProgesteroneMedication
): number {
  if (t < day) return 0;

  const deltaT = (t - day) * 24; // Convert days to hours
  const { bioavailability, absorptionRate, eliminationRate, volumeOfDistribution } = medication;

  const F = bioavailability;
  const ka = absorptionRate; // 1/hour
  const ke = eliminationRate; // 1/hour
  const Vd = volumeOfDistribution;

  if (Math.abs(ka - ke) < 1e-10) {
    const concentration = (F * dose * ka * deltaT / Vd) * Math.exp(-ke * deltaT);
    return Math.max(0, concentration);
  }

  const concentration = (F * dose * ka) / (Vd * (ka - ke)) *
    (Math.exp(-ke * deltaT) - Math.exp(-ka * deltaT));

  return Math.max(0, concentration);
}

/**
 * Generic medication concentration calculator that handles both E and P
 */
export function calculateMedicationConcentration(
  t: number,
  day: number,
  dose: number,
  medication: AnyMedication
): number {
  if (medication.type === MedicationType.ESTRADIOL) {
    return calculateConcentration(t, day, dose, medication as EstradiolMedication);
  } else if (medication.type === MedicationType.PROGESTERONE) {
    return calculateProgesteroneConcentration(t, day, dose, medication as ProgesteroneMedication);
  }
  return 0;
}

export function calculateTotalConcentration(
  doses: Dose[],
  timePoints: number[]
): ConcentrationPoint[] {
  return timePoints.map(t => {
    const estradiolTotal = doses.reduce((sum, { day, dose, medication, ester }) => {
      const med = medication || (ester ? { ...ester, type: MedicationType.ESTRADIOL } : null);
      if (!med) return sum;

      if (med.type === MedicationType.ESTRADIOL) {
        return sum + calculateConcentration(t, day, dose, med as EstradiolMedication);
      }
      return sum;
    }, 0);

    const progesteroneTotal = doses.reduce((sum, { day, dose, medication }) => {
      if (!medication) return sum;

      if (medication.type === MedicationType.PROGESTERONE) {
        return sum + calculateProgesteroneConcentration(t, day, dose, medication as ProgesteroneMedication);
      }
      return sum;
    }, 0);

    return {
      time: t,
      estradiolConcentration: Math.max(0, estradiolTotal),
      progesteroneConcentration: Math.max(0, progesteroneTotal),
      concentration: Math.max(0, estradiolTotal)
    };
  });
}

export function generateTimePoints(maxDays: number, step: number = PHARMACOKINETICS.TIME_POINT_STEP): number[] {
  const points: number[] = [];
  for (let t = 0; t <= maxDays; t += step) {
    points.push(t);
  }
  return points;
}