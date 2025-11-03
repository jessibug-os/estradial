import { useState, useEffect } from 'react';
import './App.css';
import { Dose, ESTRADIOL_ESTERS } from './data/estradiolEsters';
import {
  calculateTotalConcentration,
  generateTimePoints,
  ConcentrationPoint
} from './utils/pharmacokinetics';
import { ReferenceCycleType } from './data/referenceData';
import { encodeSchedule, decodeSchedule, decodeLegacySchedule } from './utils/urlEncoding';
import { PHARMACOKINETICS, DEFAULTS } from './constants/pharmacokinetics';
import { DEFAULT_ESTER_CONCENTRATIONS, Z_INDEX } from './constants/defaults';
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
      scheduleLength: DEFAULTS.DEFAULT_SCHEDULE_LENGTH,
      graphDays: DEFAULTS.DEFAULT_GRAPH_DAYS,
      repeat: DEFAULTS.DEFAULT_REPEAT,
      cycleType: DEFAULTS.DEFAULT_CYCLE_TYPE
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
  // Map of ester name to concentration in mg/mL
  const [esterConcentrations, setEsterConcentrations] = useState<Record<string, number>>(DEFAULT_ESTER_CONCENTRATIONS);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempEsterConcentrations, setTempEsterConcentrations] = useState(esterConcentrations);
  const [concentrationInputs, setConcentrationInputs] = useState<Record<string, string>>({});

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
      const startCycle = steadyState ? PHARMACOKINETICS.STEADY_STATE_START_CYCLE : 0;
      const numCycles = Math.ceil(graphDisplayDays / cycleLength) + (steadyState ? PHARMACOKINETICS.STEADY_STATE_CYCLES : 0);

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

    const timePoints = generateTimePoints(
      graphDisplayDays + PHARMACOKINETICS.ESTER_EFFECT_DURATION_DAYS,
      PHARMACOKINETICS.TIME_POINT_STEP
    );
    const data = calculateTotalConcentration(dosesForCalculation, timePoints);

    // Filter to only show data from day 0 onwards
    const filteredData = data.filter(point => point.time >= 0);
    setConcentrationData(filteredData);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule, steadyState]);

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
      {/* Settings Gear Icon - Top Right */}
      <button
        onClick={() => {
          setTempEsterConcentrations(esterConcentrations);
          // Initialize input strings
          const inputs: Record<string, string> = {};
          ESTRADIOL_ESTERS.forEach(ester => {
            inputs[ester.name] = (esterConcentrations[ester.name] || 40).toString();
          });
          setConcentrationInputs(inputs);
          setShowSettingsModal(true);
        }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '8px',
          fontSize: '20px',
          backgroundColor: 'transparent',
          color: '#6c757d',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: Z_INDEX.SETTINGS_BUTTON
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#495057';
          e.currentTarget.style.backgroundColor = '#f8f9fa';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6c757d';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Settings"
      >
        ⚙️
      </button>

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
        esterConcentrations={esterConcentrations}
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
          c(t) = (dose × D / 5) × k1 × k2 × [exponential terms] for day &lt; t &lt; day + {PHARMACOKINETICS.ESTER_EFFECT_DURATION_DAYS}
        </p>
        <p>
          Results are for educational purposes only and should not be used for medical decisions. This is a model. Get bloodwork for real levels. Consult your healthcare provider.
        </p>
      </footer>

      {/* Settings Modal */}
      {showSettingsModal && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: Z_INDEX.MODAL_BACKDROP,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setShowSettingsModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
              zIndex: Z_INDEX.MODAL_ELEVATED,
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Vial Concentrations</h3>
            <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
              Set the concentration (mg/mL) for each estradiol ester.
            </p>

            {ESTRADIOL_ESTERS.map((ester) => (
              <div key={ester.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  flex: '1',
                  minWidth: '0'
                }}>
                  {ester.name}:
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="200"
                  step="0.1"
                  value={concentrationInputs[ester.name] || '40'}
                  onChange={(e) => {
                    // Update the input string immediately
                    setConcentrationInputs({
                      ...concentrationInputs,
                      [ester.name]: e.target.value
                    });
                  }}
                  onBlur={(e) => {
                    // Update the actual value on blur
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0 && value <= 200) {
                      setTempEsterConcentrations({
                        ...tempEsterConcentrations,
                        [ester.name]: value
                      });
                    } else {
                      // Reset to previous valid value if invalid
                      setConcentrationInputs({
                        ...concentrationInputs,
                        [ester.name]: (tempEsterConcentrations[ester.name] || 40).toString()
                      });
                    }
                  }}
                  style={{
                    width: '80px',
                    padding: '6px 8px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                <span style={{ fontSize: '12px', color: '#6c757d', width: '45px' }}>mg/mL</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  color: '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEsterConcentrations(tempEsterConcentrations);
                  setShowSettingsModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#b794f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
