export interface ReferencePoint {
  day: number;
  estradiol: number;
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
export const CIS_WOMEN_CYCLE: ReferencePoint[] = [
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

export function generateReferenceCycle(totalDays: number): ReferencePoint[] {
  const cycleLength = 29;
  const referenceData: ReferencePoint[] = [];

  for (let day = 0; day <= totalDays; day++) {
    const cycleDay = (day % cycleLength) + 1;
    const referencePoint = CIS_WOMEN_CYCLE.find(p => p.day === cycleDay);

    if (referencePoint) {
      referenceData.push({
        day,
        estradiol: referencePoint.estradiol
      });
    } else {
      // Fallback interpolation if exact day not found
      const closestPoint = CIS_WOMEN_CYCLE.reduce((prev, curr) =>
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
