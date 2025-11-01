export interface ReferencePoint {
  day: number;
  estradiol: number;
}

export const CIS_WOMEN_CYCLE: ReferencePoint[] = [
  { day: 1, estradiol: 50 },    // Early follicular
  { day: 3, estradiol: 45 },    // Early follicular
  { day: 5, estradiol: 55 },    // Mid follicular
  { day: 7, estradiol: 75 },    // Mid follicular
  { day: 9, estradiol: 95 },    // Late follicular
  { day: 11, estradiol: 150 },  // Pre-ovulatory
  { day: 13, estradiol: 250 },  // Pre-ovulatory peak
  { day: 14, estradiol: 350 },  // Ovulation peak
  { day: 15, estradiol: 200 },  // Post-ovulatory
  { day: 17, estradiol: 120 },  // Early luteal
  { day: 19, estradiol: 130 },  // Mid luteal
  { day: 21, estradiol: 140 },  // Mid luteal
  { day: 23, estradiol: 120 },  // Late luteal
  { day: 25, estradiol: 90 },   // Late luteal
  { day: 27, estradiol: 60 },   // Pre-menstrual
  { day: 28, estradiol: 50 },   // Pre-menstrual
];

export function generateReferenceCycle(totalDays: number): ReferencePoint[] {
  const cycleLength = 28;
  const referenceData: ReferencePoint[] = [];
  
  for (let day = 0; day <= totalDays; day++) {
    const cycleDay = (day % cycleLength) + 1;
    const closestPoint = CIS_WOMEN_CYCLE.reduce((prev, curr) => 
      Math.abs(curr.day - cycleDay) < Math.abs(prev.day - cycleDay) ? curr : prev
    );
    
    referenceData.push({
      day,
      estradiol: closestPoint.estradiol
    });
  }
  
  return referenceData;
}