import { useState, useEffect } from 'react';
import './App.css';
import { DEFAULT_DOSES, Dose } from './data/estradiolEsters';
import {
  calculateTotalConcentration,
  generateTimePoints,
  ConcentrationPoint
} from './utils/pharmacokinetics';
import VisualTimeline from './components/VisualTimeline';
import ConcentrationGraph from './components/ConcentrationGraph';

function App() {
  const [doses, setDoses] = useState<Dose[]>(DEFAULT_DOSES);
  const [concentrationData, setConcentrationData] = useState<ConcentrationPoint[]>([]);
  const [scheduleLength, setScheduleLength] = useState(90);
  const [graphDisplayDays, setGraphDisplayDays] = useState(100);
  const [repeatSchedule, setRepeatSchedule] = useState(false);

  useEffect(() => {
    // Create the dose array for calculation, repeating if needed
    let dosesForCalculation = doses;

    if (repeatSchedule && doses.length > 0) {
      const repeatedDoses: Dose[] = [];
      const cycleLength = scheduleLength;
      const numCycles = Math.ceil(graphDisplayDays / cycleLength);

      for (let cycle = 0; cycle < numCycles; cycle++) {
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
    setConcentrationData(data);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule]);

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1>Estradiol Ester Pharmacokinetic Calculator</h1>
        <p>Calculate and visualize estradiol concentration over time based on injection schedule</p>
      </header>

      <VisualTimeline
        doses={doses}
        onDosesChange={setDoses}
        viewDays={scheduleLength}
        onViewDaysChange={setScheduleLength}
        repeatSchedule={repeatSchedule}
        onRepeatScheduleChange={setRepeatSchedule}
      />
      <ConcentrationGraph
        data={concentrationData}
        viewDays={graphDisplayDays}
        onViewDaysChange={setGraphDisplayDays}
      />

      <footer style={{ marginTop: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>
        <p>
          This calculator implements the pharmacokinetic model: 
          c(t) = (dose × D / 5) × k1 × k2 × [exponential terms] for day &lt; t &lt; day + 100
        </p>
        <p>
          Results are for educational purposes only and should not be used for medical decisions.
        </p>
      </footer>
    </div>
  );
}

export default App;
