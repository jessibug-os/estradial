import React, { useState, useEffect } from 'react';
import { Dose, ESTRADIOL_ESTERS } from '../data/estradiolEsters';

interface VisualTimelineProps {
  doses: Dose[];
  onDosesChange: (doses: Dose[]) => void;
  viewDays: number;
  onViewDaysChange: (days: number) => void;
  repeatSchedule: boolean;
  onRepeatScheduleChange: (repeat: boolean) => void;
  maxDays?: number;
}

const VisualTimeline: React.FC<VisualTimelineProps> = ({
  doses,
  onDosesChange,
  viewDays,
  onViewDaysChange,
  repeatSchedule,
  onRepeatScheduleChange,
  maxDays = 120
}) => {
  const [selectedDose, setSelectedDose] = useState<number | null>(null);
  const [scheduleInputValue, setScheduleInputValue] = useState(viewDays.toString());
  const [showResetModal, setShowResetModal] = useState(false);
  const [previousViewDays, setPreviousViewDays] = useState(viewDays);

  // Sync local input state with prop changes
  useEffect(() => {
    setScheduleInputValue(viewDays.toString());
  }, [viewDays]);

  // Debounce schedule length changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const numValue = parseInt(scheduleInputValue);
      if (!isNaN(numValue) && numValue >= 1 && numValue !== viewDays) {
        onViewDaysChange(numValue);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [scheduleInputValue, viewDays, onViewDaysChange]);

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

  const getDoseAtDay = (day: number): number | null => {
    const dose = doses.find(d => d.day === day);
    return dose ? dose.dose : null;
  };

  const renderTimelineDay = (day: number) => {
    const dose = getDoseAtDay(day);
    const hasInjection = dose !== null;
    const isSelected = selectedDose === day;

    return (
      <div
        key={day}
        onClick={() => {
          if (hasInjection) {
            setSelectedDose(isSelected ? null : day);
          } else {
            addOrUpdateDose(day);
          }
        }}
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: hasInjection ? '#007bff' : '#f8f9fa',
          border: isSelected ? '2px solid #ffc107' : '1px solid #dee2e6',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          color: hasInjection ? 'white' : '#6c757d',
          fontWeight: hasInjection ? '600' : '400',
          position: 'relative',
          transition: 'all 0.15s ease',
          boxShadow: hasInjection ? '0 1px 2px rgba(0,123,255,0.3)' : 'none'
        }}
        title={hasInjection ? `Day ${day}: ${dose}mg` : `Day ${day}: Click to add injection`}
      >
        {hasInjection ? dose?.toFixed(1) : day % 7 === 0 ? day : ''}
      </div>
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
              <strong style={{ color: '#495057' }}>{doses.length} injections</strong>
              {doses.length > 0 && ` (${Math.min(...doses.map(d => d.day))}-${Math.max(...doses.map(d => d.day))}d)`}
            </div>
            {doses.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowResetModal(true)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '12px',
                    color: '#dc3545',
                    backgroundColor: 'transparent',
                    border: '1px solid #dc3545',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc3545';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#dc3545';
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
                            backgroundColor: '#dc3545',
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
                  if (val === '' || parseInt(val) < 1 || isNaN(parseInt(val))) {
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
          </div>
        </div>
        <div style={{
          border: '2px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          height: '400px',
          overflowY: 'auto',
          padding: '12px'
        }}>
          {renderWeeks()}
        </div>
      </div>

      <div style={{
        padding: '20px',
        backgroundColor: selectedDoseData ? '#fff3cd' : '#ffffff',
        border: `1px solid ${selectedDoseData ? '#ffeaa7' : '#dee2e6'}`,
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        height: '400px',
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
                  value={selectedDoseData.dose}
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

            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#495057' }}>Pharmacokinetic Parameters:</div>
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
                  backgroundColor: '#6c757d',
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
                  backgroundColor: '#dc3545',
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