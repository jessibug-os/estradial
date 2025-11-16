import { useState, useEffect, useRef } from 'react';
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
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, BUTTON_STYLES, INPUT_STYLES, MODAL_STYLES, mergeStyles } from './constants/styles';
import VisualTimeline from './components/VisualTimeline';
import ConcentrationGraph from './components/ConcentrationGraph';
import OptimizerModal from './components/OptimizerModal';
import { optimizeSchedule } from './utils/scheduleOptimizer';
import { AnyMedication, isProgesteroneMedication } from './types/medication';
import { PROGESTERONE_ROUTES } from './data/progesteroneRoutes';

const STORAGE_KEYS = {
  OPTIMIZER_SETTINGS: 'optimizerSettings',
  ESTER_CONCENTRATIONS: 'esterConcentrations'
};

function loadOptimizerSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OPTIMIZER_SETTINGS);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    const allMedications = [...ESTRADIOL_ESTERS, ...PROGESTERONE_ROUTES];
    const selectedEsters = (parsed.selectedMedicationNames || [])
      .map((name: string) => allMedications.find(m => m.name === name))
      .filter(Boolean) as AnyMedication[];

    return {
      selectedEsters: selectedEsters.length > 0 ? selectedEsters : [ESTRADIOL_ESTERS[1] || ESTRADIOL_ESTERS[0]!],
      maxInjections: parsed.maxInjections || 4,
      granularity: parsed.granularity || 0.05,
      progesteroneDoses: parsed.progesteroneDoses || [100, 200]
    };
  } catch (e) {
    console.error('Failed to load optimizer settings from localStorage:', e);
    return null;
  }
}

function saveOptimizerSettings(settings: {
  selectedEsters: AnyMedication[];
  maxInjections: number;
  granularity: number;
  progesteroneDoses: number[];
}) {
  try {
    const toStore = {
      selectedMedicationNames: settings.selectedEsters.map(m => m.name),
      maxInjections: settings.maxInjections,
      granularity: settings.granularity,
      progesteroneDoses: settings.progesteroneDoses
    };
    localStorage.setItem(STORAGE_KEYS.OPTIMIZER_SETTINGS, JSON.stringify(toStore));
  } catch (e) {
    console.error('Failed to save optimizer settings to localStorage:', e);
  }
}

function loadEsterConcentrations(): Record<string, number> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ESTER_CONCENTRATIONS);
    if (!stored) return DEFAULT_ESTER_CONCENTRATIONS;

    const parsed = JSON.parse(stored);
    return { ...DEFAULT_ESTER_CONCENTRATIONS, ...parsed };
  } catch (e) {
    console.error('Failed to load ester concentrations from localStorage:', e);
    return DEFAULT_ESTER_CONCENTRATIONS;
  }
}

function saveEsterConcentrations(concentrations: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEYS.ESTER_CONCENTRATIONS, JSON.stringify(concentrations));
  } catch (e) {
    console.error('Failed to save ester concentrations to localStorage:', e);
  }
}

function App() {
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
      let decoded = decodeSchedule(scheduleData);

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
  const [esterConcentrations, setEsterConcentrations] = useState<Record<string, number>>(() => loadEsterConcentrations());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempEsterConcentrations, setTempEsterConcentrations] = useState(esterConcentrations);
  const [concentrationInputs, setConcentrationInputs] = useState<Record<string, string>>({});
  const [optimizeMode, setOptimizeMode] = useState(false);
  const [showOptimizerSettingsModal, setShowOptimizerSettingsModal] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeProgress, setOptimizeProgress] = useState(0);
  const [isFindingBestFit, setIsFindingBestFit] = useState(false);
  const [bestFitProgress, setBestFitProgress] = useState({ current: 0, total: 0, injectionCount: 0 });
  const [optimizerSettings, setOptimizerSettings] = useState<{
    selectedEsters: AnyMedication[];
    maxInjections: number;
    granularity: number;
    progesteroneDoses: number[];
  }>(() => {
    const loaded = loadOptimizerSettings();
    return loaded || {
      selectedEsters: [ESTRADIOL_ESTERS[1] || ESTRADIOL_ESTERS[0]!],
      maxInjections: 4,
      granularity: 0.05,
      progesteroneDoses: [100, 200]
    };
  });

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
    saveOptimizerSettings(optimizerSettings);
  }, [optimizerSettings]);

  useEffect(() => {
    saveEsterConcentrations(esterConcentrations);
  }, [esterConcentrations]);

  useEffect(() => {
    let dosesForCalculation = doses;

    if (repeatSchedule && doses.length > 0) {
      const repeatedDoses: Dose[] = [];
      const cycleLength = scheduleLength;

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

    const filteredData = data.filter(point => point.time >= 0);
    setConcentrationData(filteredData);
  }, [doses, scheduleLength, graphDisplayDays, repeatSchedule, steadyState]);

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setOptimizeProgress(0);
    try {
      const result = await optimizeSchedule(
        {
          availableEsters: optimizerSettings.selectedEsters,
          scheduleLength,
          referenceCycleType,
          steadyState: true,
          granularity: optimizerSettings.granularity,
          maxDosePerInjection: 10,
          minDosePerInjection: 0.1,
          maxInjectionsPerCycle: optimizerSettings.maxInjections,
          esterConcentrations,
          progesteroneDoses: optimizerSettings.progesteroneDoses
        },
        (progress) => {
          setOptimizeProgress(progress);
        }
      );

      setDoses(result.doses);
      setRepeatSchedule(true);
      setSteadyState(true);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please try again.');
    } finally {
      setIsOptimizing(false);
      setOptimizeProgress(0);
    }
  };

  const bestFitCancelRef = useRef(false);

  const handleStopBestFit = () => {
    bestFitCancelRef.current = true;
  };

  const handleBestFit = async () => {
    bestFitCancelRef.current = false;
    setIsFindingBestFit(true);
    setIsOptimizing(true);

    try {
      let bestScore = Infinity;
      let bestInjectionCount = optimizerSettings.maxInjections;
      let bestDoses: Dose[] = [];
      let noImprovementCount = 0;
      const EARLY_STOP_THRESHOLD = 3;

      let completedInjectionCounts = 0;
      let maxEstimatedTotal = EARLY_STOP_THRESHOLD;

      setBestFitProgress({ current: 0, total: 100, injectionCount: 0 });

      for (let injections = 1; injections <= scheduleLength; injections++) {
        if (bestFitCancelRef.current) {
          break;
        }

        if (noImprovementCount >= EARLY_STOP_THRESHOLD) {
          setBestFitProgress({ current: 100, total: 100, injectionCount: injections });
          break;
        }

        const maxRemainingCounts = EARLY_STOP_THRESHOLD - noImprovementCount;
        const estimatedTotalCounts = Math.max(
          maxEstimatedTotal,
          completedInjectionCounts + maxRemainingCounts + 1
        );
        maxEstimatedTotal = estimatedTotalCounts;

        const currentCompleted = completedInjectionCounts;
        const lockedEstimate = maxEstimatedTotal;

        const result = await optimizeSchedule(
          {
            availableEsters: optimizerSettings.selectedEsters,
            scheduleLength,
            referenceCycleType,
            steadyState: true,
            granularity: optimizerSettings.granularity,
            maxDosePerInjection: 10,
            minDosePerInjection: 0.1,
            maxInjectionsPerCycle: injections,
            esterConcentrations,
            progesteroneDoses: optimizerSettings.progesteroneDoses,
            optimizeForAccuracyOnly: true
          },
          (progress) => {
            const currentProgress = currentCompleted + (progress / 100);
            const percentComplete = Math.min(95, (currentProgress / lockedEstimate) * 100);
            setBestFitProgress({
              current: Math.round(percentComplete),
              total: 100,
              injectionCount: injections
            });
          }
        );

        completedInjectionCounts++;

        const percentComplete = Math.min(95, (completedInjectionCounts / lockedEstimate) * 100);
        setBestFitProgress({
          current: Math.round(percentComplete),
          total: 100,
          injectionCount: injections
        });

        if (result.score < bestScore) {
          bestScore = result.score;
          bestInjectionCount = injections;
          bestDoses = result.doses;
          noImprovementCount = 0;
        } else {
          noImprovementCount++;
        }
      }

      setOptimizerSettings({
        ...optimizerSettings,
        maxInjections: bestInjectionCount
      });
      setDoses(bestDoses);
      setRepeatSchedule(true);
      setSteadyState(true);

      setBestFitProgress({ current: 100, total: 100, injectionCount: bestInjectionCount });
    } catch (error) {
      console.error('Best fit failed:', error);
      alert('Best fit failed. Please try again.');
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsFindingBestFit(false);
      setIsOptimizing(false);
      setBestFitProgress({ current: 0, total: 0, injectionCount: 0 });
    }
  };

  const optimizationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousMaxInjectionsRef = useRef<number>(optimizerSettings.maxInjections);

  useEffect(() => {
    if (!optimizeMode) return;

    if (previousMaxInjectionsRef.current === optimizerSettings.maxInjections) {
      previousMaxInjectionsRef.current = optimizerSettings.maxInjections;
      return;
    }

    previousMaxInjectionsRef.current = optimizerSettings.maxInjections;

    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }

    optimizationTimeoutRef.current = setTimeout(() => {
      handleRunOptimization();
    }, 500);

    return () => {
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
      }
    };
  }, [optimizeMode, optimizerSettings.maxInjections]);

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
          top: SPACING['3xl'],
          right: SPACING['3xl'],
          padding: SPACING.md,
          fontSize: TYPOGRAPHY.fontSize['2xl'],
          backgroundColor: 'transparent',
          color: COLORS.gray600,
          border: 'none',
          borderRadius: BORDER_RADIUS.sm,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: Z_INDEX.SETTINGS_BUTTON
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = COLORS.gray700;
          e.currentTarget.style.backgroundColor = COLORS.gray50;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = COLORS.gray600;
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title="Settings"
      >
        ⚙️
      </button>

      <header style={{ marginBottom: '30px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          <a href="https://github.com/jessibug-os" target="_blank" rel="noopener noreferrer" title="Visit jessibug-os on GitHub">
            <img src={process.env.PUBLIC_URL + '/favicon.png'} alt="Shimeji mascot" style={{ width: '48px', height: '48px', cursor: 'pointer' }} />
          </a>
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
        esterConcentrations={esterConcentrations}
        onOptimizeModeChange={setOptimizeMode}
      />
      <ConcentrationGraph
        data={concentrationData}
        viewDays={graphDisplayDays}
        onViewDaysChange={setGraphDisplayDays}
        referenceCycleType={referenceCycleType}
        onReferenceCycleTypeChange={setReferenceCycleType}
        optimizeMode={optimizeMode}
        onOptimizeModeChange={setOptimizeMode}
        optimizerSettings={optimizerSettings}
        onOptimizerSettingsChange={setOptimizerSettings}
        onOpenOptimizerSettings={() => setShowOptimizerSettingsModal(true)}
        isOptimizing={isOptimizing}
        optimizeProgress={optimizeProgress}
        isFindingBestFit={isFindingBestFit}
        bestFitProgress={bestFitProgress}
        onBestFit={handleBestFit}
        onStopBestFit={handleStopBestFit}
        actualInjectionCount={doses.filter(d => !isProgesteroneMedication(d.medication)).length}
      />

      <OptimizerModal
        isOpen={showOptimizerSettingsModal}
        onClose={() => setShowOptimizerSettingsModal(false)}
        viewDays={scheduleLength}
        referenceCycleType={referenceCycleType}
        esterConcentrations={esterConcentrations}
        selectedEsters={optimizerSettings.selectedEsters}
        maxInjections={optimizerSettings.maxInjections}
        granularity={optimizerSettings.granularity}
        progesteroneDoses={optimizerSettings.progesteroneDoses}
        onSettingsChange={(selectedEsters, granularity, progesteroneDoses) => {
          setOptimizerSettings({
            ...optimizerSettings,
            selectedEsters,
            granularity,
            progesteroneDoses
          });
        }}
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
            style={mergeStyles(MODAL_STYLES.backdrop, {
              zIndex: Z_INDEX.MODAL_BACKDROP,
            })}
            onClick={() => setShowSettingsModal(false)}
          />
          <div
            style={mergeStyles(MODAL_STYLES.content, {
              zIndex: Z_INDEX.MODAL_ELEVATED,
              maxHeight: '80vh',
              overflowY: 'auto' as const,
            })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={MODAL_STYLES.title}>Vial Concentrations</h3>
            <p style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.gray600, marginBottom: SPACING['2xl'] }}>
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
                  fontSize: TYPOGRAPHY.fontSize.base,
                  fontWeight: TYPOGRAPHY.fontWeight.medium,
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
                  style={mergeStyles(INPUT_STYLES.base, INPUT_STYLES.numberLarge, {
                    padding: `${SPACING.sm} ${SPACING.md}`,
                  })}
                />
                <span style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.gray600, width: '45px' }}>mg/mL</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: SPACING.lg, marginTop: SPACING['4xl'] }}>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                }}
                style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.secondary, { flex: 1 })}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setEsterConcentrations(tempEsterConcentrations);
                  setShowSettingsModal(false);
                }}
                style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.primary, { flex: 1 })}
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
