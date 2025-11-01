import { useState, useEffect } from 'react';
import './App.css';
import { Dose } from './data/estradiolEsters';
import {
  calculateTotalConcentration,
  generateTimePoints,
  ConcentrationPoint
} from './utils/pharmacokinetics';
import { ReferenceCycleType } from './data/referenceData';
import { encodeSchedule, decodeSchedule, decodeLegacySchedule } from './utils/urlEncoding';
import VisualTimeline from './components/VisualTimeline';
import ConcentrationGraph from './components/ConcentrationGraph';

function App() {
  // Load from URL or use defaults
  const loadFromURL = (): {
    doses: Dose[],
    scheduleLength: number,
    graphDays: number,
    repeat: boolean,
    cycleType: ReferenceCycleType
  } => {
    const params = new URLSearchParams(window.location.search);
    const scheduleData = params.get('s');

    if (scheduleData) {
      // Try new compact format first
      let decoded = decodeSchedule(scheduleData);

      // Fall back to legacy format for backwards compatibility
      if (!decoded) {
        decoded = decodeLegacySchedule(scheduleData);
      }

      if (decoded) {
        return decoded;
      }
    }

    return {
      doses: [],
      scheduleLength: 29,
      graphDays: 90,
      repeat: true,
      cycleType: 'typical'
    };
  };

  const initial = loadFromURL();
  const [doses, setDoses] = useState<Dose[]>(initial.doses);
  const [concentrationData, setConcentrationData] = useState<ConcentrationPoint[]>([]);
  const [scheduleLength, setScheduleLength] = useState(initial.scheduleLength);
  const [graphDisplayDays, setGraphDisplayDays] = useState(initial.graphDays);
  const [repeatSchedule, setRepeatSchedule] = useState(initial.repeat);
  const [steadyState, setSteadyState] = useState(false);
  const [referenceCycleType, setReferenceCycleType] = useState<ReferenceCycleType>(initial.cycleType);

  // Update URL when schedule changes
  useEffect(() => {
    const encoded = encodeSchedule({
      doses,
      scheduleLength,
      graphDays: graphDisplayDays,
      repeat: repeatSchedule,
      cycleType: referenceCycleType
    });

    const newURL = `${window.location.pathname}?s=${encoded}`;
    window.history.replaceState({}, '', newURL);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule, referenceCycleType]);

  useEffect(() => {
    // Create the dose array for calculation, repeating if needed
    let dosesForCalculation = doses;

    if (repeatSchedule && doses.length > 0) {
      const repeatedDoses: Dose[] = [];
      const cycleLength = scheduleLength;

      // If steady state, add cycles BEFORE day 0 to build up residual levels
      const startCycle = steadyState ? -3 : 0; // 3 cycles before to reach steady state
      const numCycles = Math.ceil(graphDisplayDays / cycleLength) + (steadyState ? 3 : 0);

      for (let cycle = startCycle; cycle < numCycles; cycle++) {
        doses.forEach(dose => {
          repeatedDoses.push({
            ...dose,
            day: dose.day + (cycle * cycleLength)
          });
        });
      }

      dosesForCalculation = repeatedDoses.filter(d => d.day <= graphDisplayDays);
    }

    const timePoints = generateTimePoints(graphDisplayDays + 100, 0.5);
    const data = calculateTotalConcentration(dosesForCalculation, timePoints);

    // Filter to only show data from day 0 onwards
    const filteredData = data.filter(point => point.time >= 0);
    setConcentrationData(filteredData);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule, steadyState]);

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          <img src={process.env.PUBLIC_URL + '/favicon.png'} alt="Shimeji mascot" style={{ width: '48px', height: '48px' }} />
          <h1 style={{ margin: 0 }}>Estradiol Ester Pharmacokinetic Calculator</h1>
        </div>
        <p style={{ marginTop: '10px' }}>Calculate and visualize estradiol concentration over time based on injection schedule</p>
      </header>

      <VisualTimeline
        doses={doses}
        onDosesChange={setDoses}
        viewDays={scheduleLength}
        onViewDaysChange={setScheduleLength}
        repeatSchedule={repeatSchedule}
        onRepeatScheduleChange={setRepeatSchedule}
        steadyState={steadyState}
        onSteadyStateChange={setSteadyState}
        referenceCycleType={referenceCycleType}
      />
      <ConcentrationGraph
        data={concentrationData}
        viewDays={graphDisplayDays}
        onViewDaysChange={setGraphDisplayDays}
        referenceCycleType={referenceCycleType}
        onReferenceCycleTypeChange={setReferenceCycleType}
      />

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
        <p>
          This calculator implements the pharmacokinetic model: 
          c(t) = (dose × D / 5) × k1 × k2 × [exponential terms] for day &lt; t &lt; day + 100
        </p>
        <p>
          Results are for educational purposes only and should not be used for medical decisions. This is a model. Get bloodwork for real levels. Consult your healthcare provider.
        </p>
      </footer>
    </div>
  );
}

export default App;
