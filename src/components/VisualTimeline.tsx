import React, { useState, useEffect } from 'react';
import { Dose, ESTRADIOL_ESTERS, EstradiolEster } from '../data/estradiolEsters';
import { PRESETS } from '../data/presets';
import { optimizeSchedule } from '../utils/scheduleOptimizer';
import { ReferenceCycleType } from '../data/referenceData';
import { formatNumber } from '../utils/formatters';
import { useDebouncedInput } from '../hooks/useDebounce';
import { parsePositiveInteger } from '../utils/validation';
import { TimelineDayCell } from './VisualTimeline/TimelineDayCell';

interface VisualTimelineProps {
  doses: Dose[];
  onDosesChange: (doses: Dose[]) => void;
  viewDays: number;
  onViewDaysChange: (days: number) => void;
  repeatSchedule: boolean;
  onRepeatScheduleChange: (repeat: boolean) => void;
  steadyState: boolean;
  onSteadyStateChange: (steadyState: boolean) => void;
  referenceCycleType: ReferenceCycleType;
  maxDays?: number;
}

const VisualTimeline: React.FC<VisualTimelineProps> = ({
  doses,
  onDosesChange,
  viewDays,
  onViewDaysChange,
  repeatSchedule,
  onRepeatScheduleChange,
  steadyState,
  onSteadyStateChange,
  referenceCycleType,
  maxDays = 120
}) => {
  const [selectedDose, setSelectedDose] = useState<number | null>(null);
  const [scheduleInputValue, setScheduleInputValue] = useDebouncedInput(
    viewDays.toString(),
    (value) => {
      const numValue = parsePositiveInteger(value, 1);
      if (numValue !== null && numValue !== viewDays) {
        onViewDaysChange(numValue);
      }
    },
    1000
  );
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [selectedEsters, setSelectedEsters] = useState<EstradiolEster[]>([ESTRADIOL_ESTERS[1]]);
  const [maxInjections, setMaxInjections] = useState<number>(7);
  const [maxInjectionsInput, setMaxInjectionsInput] = useDebouncedInput(
    '7',
    (value) => {
      const numValue = parsePositiveInteger(value, 1);
      if (numValue !== null && numValue !== maxInjections) {
        setMaxInjections(numValue);
      }
    },
    500
  );
  const [granularity, setGranularity] = useState<number>(0.1);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationScore, setOptimizationScore] = useState(0);
  const [previousViewDays, setPreviousViewDays] = useState(viewDays);
  const [editingDose, setEditingDose] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  // Auto-remove injections beyond schedule length when it's reduced
  useEffect(() => {
    if (viewDays < previousViewDays && doses.length > 0) {
      const dosesOutOfRange = doses.filter(d => d.day >= viewDays);
      if (dosesOutOfRange.length > 0) {
        const newDoses = doses.filter(d => d.day < viewDays);
        onDosesChange(newDoses);
        if (selectedDose !== null && selectedDose >= viewDays) {
          setSelectedDose(null);
        }
      }
    }
    setPreviousViewDays(viewDays);
  }, [viewDays, doses, previousViewDays, selectedDose, onDosesChange]);

  // Default to Estradiol valerate for new injections
  const DEFAULT_ESTER = ESTRADIOL_ESTERS[1];

  const addOrUpdateDose = (day: number, dose: number = 6, ester = DEFAULT_ESTER) => {
    const existingIndex = doses.findIndex(d => d.day === day);
    let newDoses = [...doses];

    if (existingIndex >= 0) {
      newDoses[existingIndex] = { day, dose, ester };
    } else {
      newDoses.push({ day, dose, ester });
      newDoses.sort((a, b) => a.day - b.day);
    }

    onDosesChange(newDoses);
  };

  const removeDose = (day: number) => {
    const newDoses = doses.filter(d => d.day !== day);
    onDosesChange(newDoses);
    setSelectedDose(null);
  };

  const updateDoseAmount = (day: number, newDose: number) => {
    const newDoses = doses.map(d =>
      d.day === day ? { ...d, dose: newDose } : d
    );
    onDosesChange(newDoses);
  };

  const updateDoseEster = (day: number, esterName: string) => {
    const ester = ESTRADIOL_ESTERS.find(e => e.name === esterName);
    if (!ester) return;

    const newDoses = doses.map(d =>
      d.day === day ? { ...d, ester } : d
    );
    onDosesChange(newDoses);
  };

  const renderTimelineDay = (day: number) => {
    const doseData = doses.find(d => d.day === day);
    const dose = doseData || null;
    const isSelected = selectedDose === day;
    const isEditing = editingDose === day;

    return (
      <TimelineDayCell
        key={day}
        day={day}
        dose={dose}
        isSelected={isSelected}
        isEditing={isEditing}
        editingValue={editingValue}
        onSelect={() => {
          setSelectedDose(isSelected ? null : day);
        }}
        onAdd={() => {
          addOrUpdateDose(day);
          setSelectedDose(day);
          setEditingDose(day);
          setEditingValue('6');
        }}
        onEditStart={() => {
          setEditingDose(day);
          const currentDose = doses.find(d => d.day === day);
          setEditingValue(currentDose?.dose.toString() || '');
        }}
        onEditEnd={() => {
          setEditingDose(null);
        }}
        onUpdateDose={updateDoseAmount}
        onEditingValueChange={setEditingValue}
        onInputFocus={(element) => {
          element.focus();
          element.select();
        }}
      />
    );
  };

  const renderWeeks = () => {
    const weeks = [];
    for (let week = 0; week < Math.ceil(viewDays / 7); week++) {
      const weekDays = [];
      for (let day = week * 7; day < Math.min((week + 1) * 7, viewDays); day++) {
        weekDays.push(renderTimelineDay(day));
      }
      weeks.push(
        <div key={week} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '6px' }}>
          {weekDays}
        </div>
      );
    }
    return weeks;
  };

  const selectedDoseData = selectedDose !== null ? doses.find(d => d.day === selectedDose) : null;

  // Calculate dosage display text
  const getDosageDisplayText = (): string => {
    if (doses.length === 0) return '';

    if (repeatSchedule) {
      // Calculate average weekly dose for repeated schedules
      const totalMg = doses.reduce((sum, dose) => sum + dose.dose, 0);
      const scheduleDays = viewDays;
      const avgWeeklyDose = (totalMg / scheduleDays) * 7;
      return ` (${formatNumber(avgWeeklyDose)}mg avg/week)`;
    } else {
      // Calculate total mg for non-repeated schedules
      const totalMg = doses.reduce((sum, dose) => sum + dose.dose, 0);
      return ` (${formatNumber(totalMg)}mg total)`;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      <div>
        <div style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              <strong style={{ color: '#495057' }}>{doses.length} injection{doses.length !== 1 ? 's' : ''}</strong>
              {getDosageDisplayText()}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowOptimizerModal(true)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    backgroundColor: '#b794f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#9b72cf'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#b794f6'}
                >
                  Optimize
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
                >
                  Preset
                </button>
                {showPresetsMenu && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                      }}
                      onClick={() => setShowPresetsMenu(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        minWidth: '280px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                      }}
                    >
                      {PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            onDosesChange(preset.doses);
                            onViewDaysChange(preset.scheduleLength);
                            onRepeatScheduleChange(preset.repeat ?? true);
                            setShowPresetsMenu(false);
                            setSelectedDose(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            textAlign: 'left',
                            border: 'none',
                            borderBottom: '1px solid #f0f0f0',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: '600', color: '#212529', marginBottom: '2px' }}>
                            {preset.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            {preset.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {doses.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowResetModal(true)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '12px',
                    color: '#c77a9b',
                    backgroundColor: 'transparent',
                    border: '1px solid #c77a9b',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#c77a9b';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#c77a9b';
                  }}
                >
                  Reset
                </button>

                {/* Reset Confirmation Popover */}
                {showResetModal && (
                  <>
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                      }}
                      onClick={() => setShowResetModal(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        backgroundColor: 'white',
                        padding: '16px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        width: '280px',
                        zIndex: 1000,
                        border: '1px solid #dee2e6'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Arrow */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderBottom: '6px solid #dee2e6'
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderBottom: '6px solid white'
                        }}
                      />

                      <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Clear all injections?
                      </div>
                      <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>
                        This will remove all {doses.length} injection{doses.length !== 1 ? 's' : ''}.
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setShowResetModal(false)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#f8f9fa',
                            color: '#495057',
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onDosesChange([]);
                            setSelectedDose(null);
                            setShowResetModal(false);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: '#c77a9b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          </div>

          {/* AI Optimizer Modal */}
          {showOptimizerModal && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setShowOptimizerModal(false)}
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
                  zIndex: 1001,
                  maxWidth: '500px',
                  width: '90%'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Schedule Optimizer</h3>
                <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '20px' }}>
                  Select which esters you have access to, and the optimizer will find the best injection schedule to match your selected reference cycle.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                    Injections Per Cycle:
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max={viewDays}
                      value={maxInjectionsInput}
                      onChange={(e) => setMaxInjectionsInput(e.target.value)}
                      onBlur={(e) => {
                        const val = e.target.value;
                        const parsed = parsePositiveInteger(val, 1);
                        if (parsed === null) {
                          setMaxInjectionsInput('1');
                          setMaxInjections(1);
                        }
                      }}
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#6c757d' }}>
                      injections (in {viewDays} days = {formatNumber(maxInjections / viewDays * 7)} per week)
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                    The optimizer will find the best schedule using {maxInjections} injection{maxInjections !== 1 ? 's' : ''}.
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                    Available Esters:
                  </label>
                  {ESTRADIOL_ESTERS.map((ester, index) => (
                    <label
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        marginBottom: '6px',
                        borderRadius: '4px',
                        backgroundColor: selectedEsters.includes(ester) ? '#f0e6ff' : '#f8f9fa',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEsters.includes(ester)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEsters([...selectedEsters, ester]);
                          } else {
                            setSelectedEsters(selectedEsters.filter(e => e.name !== ester.name));
                          }
                        }}
                        style={{ marginRight: '10px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>{ester.name}</span>
                    </label>
                  ))}
                </div>

                {selectedEsters.length === 0 && (
                  <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#856404' }}>
                      Please select at least one ester
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                    Dose Granularity (minimum dose increment):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={granularity}
                      onChange={(e) => setGranularity(Math.round(parseFloat(e.target.value) * 100) / 100)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="number"
                      min="0.05"
                      max="0.5"
                      step="0.05"
                      value={formatNumber(granularity)}
                      onChange={(e) => setGranularity(Math.round(parseFloat(e.target.value) * 100) / 100 || 0.1)}
                      style={{
                        width: '70px',
                        padding: '6px 8px',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#6c757d', minWidth: '30px' }}>mg</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
                    {granularity <= 0.1 ? 'Fine adjustments (slower)' :
                     granularity <= 0.25 ? 'Balanced adjustments' :
                     'Coarse adjustments (faster)'}
                  </div>
                </div>

                {isOptimizing && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#6c757d' }}>
                        Optimizing... {optimizationProgress}%
                      </span>
                      <span style={{ fontSize: '12px', color: '#999' }}>
                        Score: {formatNumber(optimizationScore)}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${optimizationProgress}%`,
                        height: '100%',
                        backgroundColor: '#b794f6',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowOptimizerModal(false)}
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
                    onClick={async () => {
                      if (selectedEsters.length === 0) return;

                      setIsOptimizing(true);
                      setOptimizationProgress(0);
                      setOptimizationScore(0);

                      // Small delay to allow UI to update
                      await new Promise(resolve => setTimeout(resolve, 50));

                      try {
                        const result = await optimizeSchedule(
                          {
                            availableEsters: selectedEsters,
                            scheduleLength: viewDays,
                            referenceCycleType,
                            steadyState: true, // Always use steady state for optimization
                            granularity,
                            maxDosePerInjection: 10,
                            minDosePerInjection: 0.1,
                            maxInjectionsPerCycle: maxInjections
                          },
                          (progress, score, iteration) => {
                            setOptimizationProgress(Math.round(progress));
                            setOptimizationScore(score);
                          }
                        );

                        onDosesChange(result.doses);
                        onRepeatScheduleChange(true); // Enable repeat mode for optimized schedules
                        onSteadyStateChange(true); // Enable steady state for optimized schedules
                        setShowOptimizerModal(false);
                        setSelectedDose(null);
                      } catch (error) {
                        console.error('Optimization failed:', error);
                        alert('Optimization failed. Please try again.');
                      } finally {
                        setIsOptimizing(false);
                        setOptimizationProgress(0);
                      }
                    }}
                    disabled={selectedEsters.length === 0 || isOptimizing}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: selectedEsters.length === 0 || isOptimizing ? '#dee2e6' : '#b794f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: selectedEsters.length === 0 || isOptimizing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {isOptimizing ? 'Optimizing...' : 'Optimize Schedule'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#6c757d' }}>
                Schedule:
              </label>
              <input
                type="number"
                value={scheduleInputValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setScheduleInputValue(val); // Only update local state, debounce handles propagation
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  const parsed = parsePositiveInteger(val, 1);
                  if (parsed === null) {
                    setScheduleInputValue('1');
                    onViewDaysChange(1);
                  }
                }}
                min="1"
                style={{
                  width: '60px',
                  padding: '4px 6px',
                  fontSize: '13px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <span style={{ fontSize: '13px', color: '#6c757d' }}>days</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#6c757d', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={repeatSchedule}
                  onChange={(e) => onRepeatScheduleChange(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '13px' }}>Repeat</span>
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label
                style={{
                  fontSize: '13px',
                  color: repeatSchedule ? '#6c757d' : '#adb5bd',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: repeatSchedule ? 'pointer' : 'not-allowed'
                }}
                title={!repeatSchedule ? 'Enable Repeat mode first' : 'Start as if schedule has already been running (eliminates initial spike)'}
              >
                <input
                  type="checkbox"
                  checked={steadyState}
                  onChange={(e) => onSteadyStateChange(e.target.checked)}
                  disabled={!repeatSchedule}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: '4px',
                    cursor: repeatSchedule ? 'pointer' : 'not-allowed'
                  }}
                />
                <span style={{ fontSize: '13px' }}>Steady State</span>
              </label>
            </div>
          </div>
        </div>
        <div className="hide-scrollbar" style={{
          border: '2px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          height: '400px',
          overflowY: 'auto',
          padding: '12px',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none' // IE/Edge
        }}>
          {renderWeeks()}
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: selectedDoseData ? '#f3eeff' : '#ffffff',
        border: `1px solid ${selectedDoseData ? '#d8c7f0' : '#dee2e6'}`,
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        height: '454px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedDoseData ? (
          <>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Edit Injection - Day {selectedDoseData.day}</h4>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Estradiol Ester:</label>
              <select
                value={selectedDoseData.ester.name}
                onChange={(e) => updateDoseEster(selectedDoseData.day, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                {ESTRADIOL_ESTERS.map((ester) => (
                  <option key={ester.name} value={ester.name}>
                    {ester.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>Dose (mg):</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  value={formatNumber(selectedDoseData.dose)}
                  onChange={(e) => updateDoseAmount(selectedDoseData.day, parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  max="20"
                  style={{
                    width: '80px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <span style={{ color: '#666', fontSize: '14px' }}>mg</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e8dff5', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#5a3d7a' }}>Pharmacokinetic Parameters:</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>D:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedDoseData.ester.D.toExponential(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>k1:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedDoseData.ester.k1.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>k2:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedDoseData.ester.k2.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>k3:</span>
                  <span style={{ fontFamily: 'monospace' }}>{selectedDoseData.ester.k3.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => setSelectedDose(null)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#8b72b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Done
              </button>
              <button
                onClick={() => removeDose(selectedDoseData.day)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#c77a9b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Instructions</h4>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6' }}>
              Click on any day in the calendar to add an injection. Click on an existing injection to edit its dose and ester type.
            </p>
            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: '1.6', marginTop: '12px' }}>
              Each injection can use a different estradiol ester with unique pharmacokinetic properties.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VisualTimeline;