export interface ReferencePoint {
  day: number;
  estradiol: number;
}

export type ReferenceCycleType = 'typical' | 'hrt-target' | 'conservative' | 'high-physiological';

export interface ReferenceCycleInfo {
  id: ReferenceCycleType;
  name: string;
  description: string;
  source: string;
  sourceUrl?: string;
  cycleLength: number; // Length of the reference cycle in days (e.g., 29 for menstrual cycle)
  data: ReferencePoint[];
}

// Based on research: "Extensive monitoring of the natural menstrual cycle using the serum biomarkers
// estradiol, luteinizing hormone and progesterone" (PMC8042396)
// Study standardized cycles to 29 days with ovulation at day 15
// Values converted from pmol/L to pg/mL (÷ 3.67)
//
// Median values by sub-phase:
// - Early follicular: 125 pmol/L = 34 pg/mL
// - Intermediate follicular: 172 pmol/L = 47 pg/mL
// - Late follicular: 464 pmol/L = 126 pg/mL
// - Ovulation: 817 pmol/L = 223 pg/mL
// - Early luteal: 390 pmol/L = 106 pg/mL
// - Intermediate luteal: 505 pmol/L = 138 pg/mL
// - Late luteal: 396 pmol/L = 108 pg/mL
const TYPICAL_CYCLE_DATA: ReferencePoint[] = [
  // Early follicular phase (days 1-5)
  { day: 1, estradiol: 34 },
  { day: 2, estradiol: 36 },
  { day: 3, estradiol: 38 },
  { day: 4, estradiol: 42 },
  { day: 5, estradiol: 45 },

  // Intermediate follicular phase (days 6-10)
  { day: 6, estradiol: 47 },
  { day: 7, estradiol: 50 },
  { day: 8, estradiol: 55 },
  { day: 9, estradiol: 65 },
  { day: 10, estradiol: 85 },

  // Late follicular phase (days 11-14)
  { day: 11, estradiol: 110 },
  { day: 12, estradiol: 126 },
  { day: 13, estradiol: 175 },
  { day: 14, estradiol: 210 },

  // Ovulation (day 15)
  { day: 15, estradiol: 223 },

  // Early luteal phase (days 16-18)
  { day: 16, estradiol: 200 },
  { day: 17, estradiol: 150 },
  { day: 18, estradiol: 106 },

  // Intermediate luteal phase (days 19-25)
  { day: 19, estradiol: 100 },
  { day: 20, estradiol: 115 },
  { day: 21, estradiol: 125 },
  { day: 22, estradiol: 138 },
  { day: 23, estradiol: 135 },
  { day: 24, estradiol: 125 },
  { day: 25, estradiol: 115 },

  // Late luteal phase (days 26-29)
  { day: 26, estradiol: 108 },
  { day: 27, estradiol: 85 },
  { day: 28, estradiol: 55 },
  { day: 29, estradiol: 40 },
];

// HRT Target Ranges based on Transfeminine Science equivalent dosing guide
// Source: https://transfemscience.org/articles/e2-equivalent-doses/
const HRT_TARGET_DATA: ReferencePoint[] = [
  // Follicular phase equivalent (~50 pg/mL) - days 1-10
  { day: 1, estradiol: 50 },
  { day: 2, estradiol: 50 },
  { day: 3, estradiol: 52 },
  { day: 4, estradiol: 55 },
  { day: 5, estradiol: 58 },
  { day: 6, estradiol: 62 },
  { day: 7, estradiol: 68 },
  { day: 8, estradiol: 75 },
  { day: 9, estradiol: 85 },
  { day: 10, estradiol: 100 },

  // Late follicular/pre-ovulation (~100-200 pg/mL) - days 11-14
  { day: 11, estradiol: 125 },
  { day: 12, estradiol: 150 },
  { day: 13, estradiol: 200 },
  { day: 14, estradiol: 250 },

  // Ovulation equivalent (~300 pg/mL) - day 15
  { day: 15, estradiol: 300 },

  // Early luteal (~200 pg/mL) - days 16-18
  { day: 16, estradiol: 250 },
  { day: 17, estradiol: 200 },
  { day: 18, estradiol: 200 },

  // Luteal phase equivalent (~200 pg/mL) - days 19-25
  { day: 19, estradiol: 200 },
  { day: 20, estradiol: 200 },
  { day: 21, estradiol: 200 },
  { day: 22, estradiol: 200 },
  { day: 23, estradiol: 195 },
  { day: 24, estradiol: 180 },
  { day: 25, estradiol: 160 },

  // Late luteal/return to follicular - days 26-29
  { day: 26, estradiol: 130 },
  { day: 27, estradiol: 100 },
  { day: 28, estradiol: 70 },
  { day: 29, estradiol: 55 },
];

// Conservative Range (5th percentile from PMC8042396)
const CONSERVATIVE_CYCLE_DATA: ReferencePoint[] = [
  // Early follicular - 75.5 pmol/L = 21 pg/mL
  { day: 1, estradiol: 21 },
  { day: 2, estradiol: 22 },
  { day: 3, estradiol: 23 },
  { day: 4, estradiol: 24 },
  { day: 5, estradiol: 25 },

  // Intermediate follicular - 95.6 pmol/L = 26 pg/mL
  { day: 6, estradiol: 26 },
  { day: 7, estradiol: 28 },
  { day: 8, estradiol: 32 },
  { day: 9, estradiol: 40 },
  { day: 10, estradiol: 45 },

  // Late follicular - 182 pmol/L = 50 pg/mL
  { day: 11, estradiol: 50 },
  { day: 12, estradiol: 52 },
  { day: 13, estradiol: 55 },
  { day: 14, estradiol: 58 },

  // Ovulation - 222 pmol/L = 60 pg/mL
  { day: 15, estradiol: 60 },

  // Early luteal - 188 pmol/L = 51 pg/mL
  { day: 16, estradiol: 58 },
  { day: 17, estradiol: 54 },
  { day: 18, estradiol: 51 },

  // Intermediate luteal - 244 pmol/L = 66 pg/mL
  { day: 19, estradiol: 52 },
  { day: 20, estradiol: 58 },
  { day: 21, estradiol: 62 },
  { day: 22, estradiol: 66 },
  { day: 23, estradiol: 64 },
  { day: 24, estradiol: 60 },
  { day: 25, estradiol: 56 },

  // Late luteal - 111 pmol/L = 30 pg/mL
  { day: 26, estradiol: 48 },
  { day: 27, estradiol: 38 },
  { day: 28, estradiol: 30 },
  { day: 29, estradiol: 24 },
];

// High Physiological Range (95th percentile from PMC8042396)
const HIGH_PHYSIOLOGICAL_DATA: ReferencePoint[] = [
  // Early follicular - 231 pmol/L = 63 pg/mL
  { day: 1, estradiol: 63 },
  { day: 2, estradiol: 65 },
  { day: 3, estradiol: 68 },
  { day: 4, estradiol: 72 },
  { day: 5, estradiol: 75 },

  // Intermediate follicular - 294 pmol/L = 80 pg/mL
  { day: 6, estradiol: 80 },
  { day: 7, estradiol: 85 },
  { day: 8, estradiol: 95 },
  { day: 9, estradiol: 120 },
  { day: 10, estradiol: 180 },

  // Late follicular - 858 pmol/L = 234 pg/mL
  { day: 11, estradiol: 234 },
  { day: 12, estradiol: 280 },
  { day: 13, estradiol: 400 },
  { day: 14, estradiol: 480 },

  // Ovulation - 2212 pmol/L = 603 pg/mL
  { day: 15, estradiol: 603 },

  // Early luteal - 658 pmol/L = 179 pg/mL
  { day: 16, estradiol: 450 },
  { day: 17, estradiol: 280 },
  { day: 18, estradiol: 179 },

  // Intermediate luteal - 1123 pmol/L = 306 pg/mL
  { day: 19, estradiol: 165 },
  { day: 20, estradiol: 220 },
  { day: 21, estradiol: 270 },
  { day: 22, estradiol: 306 },
  { day: 23, estradiol: 295 },
  { day: 24, estradiol: 260 },
  { day: 25, estradiol: 220 },

  // Late luteal - 815 pmol/L = 222 pg/mL
  { day: 26, estradiol: 200 },
  { day: 27, estradiol: 150 },
  { day: 28, estradiol: 100 },
  { day: 29, estradiol: 75 },
];

// All available reference cycles
export const REFERENCE_CYCLES: ReferenceCycleInfo[] = [
  {
    id: 'typical',
    name: 'Typical Cycle',
    description: 'Median levels from 23 cis women (PMC8042396)',
    source: 'PMC8042396',
    sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8042396/',
    cycleLength: 29,
    data: TYPICAL_CYCLE_DATA
  },
  {
    id: 'hrt-target',
    name: 'HRT Target Ranges',
    description: 'Natural cycle equivalent targets for HRT',
    source: 'Transfeminine Science',
    sourceUrl: 'https://transfemscience.org/articles/e2-equivalent-doses/',
    cycleLength: 29,
    data: HRT_TARGET_DATA
  },
  {
    id: 'conservative',
    name: 'Conservative Range',
    description: 'Lower bound (5th percentile) of natural variation',
    source: 'PMC8042396',
    sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8042396/',
    cycleLength: 29,
    data: CONSERVATIVE_CYCLE_DATA
  },
  {
    id: 'high-physiological',
    name: 'High Physiological',
    description: 'Upper bound (95th percentile) of natural variation',
    source: 'PMC8042396',
    sourceUrl: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8042396/',
    cycleLength: 29,
    data: HIGH_PHYSIOLOGICAL_DATA
  }
];

// Legacy export for backwards compatibility
export const CIS_WOMEN_CYCLE = TYPICAL_CYCLE_DATA;

export function generateReferenceCycle(
  totalDays: number,
  cycleType: ReferenceCycleType = 'typical'
): ReferencePoint[] {
  const cycleInfo = REFERENCE_CYCLES.find(c => c.id === cycleType);
  if (!cycleInfo) {
    throw new Error(`Unknown cycle type: ${cycleType}`);
  }

  const cycleData = cycleInfo.data;
  const cycleLength = 29;
  const referenceData: ReferencePoint[] = [];

  for (let day = 0; day <= totalDays; day++) {
    const cycleDay = (day % cycleLength) + 1;
    const referencePoint = cycleData.find(p => p.day === cycleDay);

    if (referencePoint) {
      referenceData.push({
        day,
        estradiol: referencePoint.estradiol
      });
    } else {
      // Fallback interpolation if exact day not found
      const closestPoint = cycleData.reduce((prev, curr) =>
        Math.abs(curr.day - cycleDay) < Math.abs(prev.day - cycleDay) ? curr : prev
      );

      referenceData.push({
        day,
        estradiol: closestPoint.estradiol
      });
    }
  }

  return referenceData;
}
