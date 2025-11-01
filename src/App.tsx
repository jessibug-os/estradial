import { useState, useEffect } from 'react';
import './App.css';
import { DEFAULT_DOSES, Dose, ESTRADIOL_ESTERS } from './data/estradiolEsters';
import {
  calculateTotalConcentration,
  generateTimePoints,
  ConcentrationPoint
} from './utils/pharmacokinetics';
import VisualTimeline from './components/VisualTimeline';
import ConcentrationGraph from './components/ConcentrationGraph';

function App() {
  // Load from URL or use defaults
  const loadFromURL = (): { doses: Dose[], scheduleLength: number, graphDays: number, repeat: boolean } => {
    const params = new URLSearchParams(window.location.search);
    const scheduleData = params.get('s');

    if (scheduleData) {
      try {
        // Format: [[day,dose,esterIndex],...],scheduleLength,graphDays,repeat
        const decoded = JSON.parse(atob(scheduleData));
        const doses = decoded[0].map((d: any) => ({
          day: d[0],
          dose: d[1],
          ester: ESTRADIOL_ESTERS[d[2]] || ESTRADIOL_ESTERS[1]
        }));
        return {
          doses,
          scheduleLength: decoded[1] || 29,
          graphDays: decoded[2] || 90,
          repeat: decoded[3] || false
        };
      } catch (e) {
        console.error('Failed to parse URL schedule', e);
      }
    }

    return {
      doses: DEFAULT_DOSES,
      scheduleLength: 29,
      graphDays: 90,
      repeat: false
    };
  };

  const initial = loadFromURL();
  const [doses, setDoses] = useState<Dose[]>(initial.doses);
  const [concentrationData, setConcentrationData] = useState<ConcentrationPoint[]>([]);
  const [scheduleLength, setScheduleLength] = useState(initial.scheduleLength);
  const [graphDisplayDays, setGraphDisplayDays] = useState(initial.graphDays);
  const [repeatSchedule, setRepeatSchedule] = useState(initial.repeat);

  // Update URL when schedule changes
  useEffect(() => {
    // Format: [[day,dose,esterIndex],...],scheduleLength,graphDays,repeat
    const scheduleData = [
      doses.map(d => [
        d.day,
        d.dose,
        ESTRADIOL_ESTERS.findIndex(e => e.name === d.ester.name)
      ]),
      scheduleLength,
      graphDisplayDays,
      repeatSchedule
    ];

    const encoded = btoa(JSON.stringify(scheduleData));
    const newURL = `${window.location.pathname}?s=${encoded}`;
    window.history.replaceState({}, '', newURL);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule]);

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
