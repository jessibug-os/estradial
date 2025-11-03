import { useState, useEffect, useRef } from 'react';
import { Dose, ESTRADIOL_ESTERS, EstradiolEster } from '../data/estradiolEsters';
import { ReferenceCycleType } from '../data/referenceData';
import { formatNumber } from '../utils/formatters';
import { getEsterColor } from '../constants/colors';
import { useDebouncedInput } from '../hooks/useDebounce';
import { parsePositiveInteger, parsePositiveFloat } from '../utils/validation';
import OptimizerModal from './OptimizerModal';
import PresetsMenu from './PresetsMenu';
import ResetConfirmation from './ResetConfirmation';
import DoseEditor from './DoseEditor';

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
  esterConcentrations: Record<string, number>;
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
  esterConcentrations
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
  const [previousViewDays, setPreviousViewDays] = useState(viewDays);
  const [editingDose, setEditingDose] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

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
  const DEFAULT_ESTER = ESTRADIOL_ESTERS[1] || ESTRADIOL_ESTERS[0]!;

  const addOrUpdateDose = (day: number, dose: number = 6, ester: EstradiolEster = DEFAULT_ESTER) => {
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
    const dose = doseData?.dose || null;
    const hasInjection = dose !== null;
    const isSelected = selectedDose === day;
    const isEditing = editingDose === day;

    if (hasInjection && doseData) {
      const backgroundColor = getEsterColor(doseData.ester.name);
      const concentration = esterConcentrations[doseData.ester.name] || 40;
      const volumeMl = dose / concentration;

      return (
        <div
          key={day}
          onClick={() => {
            setSelectedDose(isSelected ? null : day);
          }}
          className="testcell"
          style={{
            width: '100%',
            aspectRatio: '1',
            backgroundColor,
            border: isSelected ? '2px solid #7952b3' : '1px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            color: 'white',
            fontWeight: '600',
            position: 'relative',
            transition: 'all 0.15s ease',
            boxShadow: `0 1px 2px ${backgroundColor}66`,
            overflow: 'hidden'
          }}
          title={`Day ${day}: ${formatNumber(dose)}mg = ${formatNumber(volumeMl, 3)}mL (${doseData.ester.name})`}
        >
          <input
            ref={(el) => { inputRefs.current[day] = el; }}
            type="text"
            value={isEditing ? editingValue : formatNumber(dose)}
            onChange={(e) => {
              setEditingValue(e.target.value);
            }}
            onFocus={(e) => {
              setEditingDose(day);
              setEditingValue(dose?.toString() || '');
              e.target.select();
            }}
            onBlur={() => {
              const newDose = parsePositiveFloat(editingValue, 0);
              if (newDose !== null) {
                updateDoseAmount(day, newDose);
              }
              setEditingDose(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const newDose = parsePositiveFloat(editingValue, 0);
                if (newDose !== null) {
                  updateDoseAmount(day, newDose);
                }
                setEditingDose(null);
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setEditingDose(null);
                e.currentTarget.blur();
              }
            }}
            readOnly={!isEditing}
            style={{
              width: '4ch',
              minWidth: '4ch',
              maxWidth: '4ch',
              border: 'none',
              background: 'transparent',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              color: 'white',
              padding: '0',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          {/* Volume display in corner */}
          <div
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '3px',
              fontSize: '9px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.85)',
              pointerEvents: 'none',
              textShadow: '0 0 2px rgba(0,0,0,0.3)'
            }}
          >
            {formatNumber(volumeMl, 3)}mL
          </div>
        </div>
      );
    }

    return (
      <div
        key={day}
        onClick={() => {
          addOrUpdateDose(day);
          // Select this dose for the side panel and enter editing mode
          setSelectedDose(day);
          setEditingDose(day);
          setEditingValue('6');
          setTimeout(() => {
            inputRefs.current[day]?.focus();
            inputRefs.current[day]?.select();
          }, 10);
        }}
        style={{
          width: '100%',
          aspectRatio: '1',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          color: '#6c757d',
          fontWeight: '400',
          position: 'relative',
          transition: 'all 0.15s ease'
        }}
        title={`Day ${day}: Click to add injection`}
      >
        {day % 7 === 0 ? day : ''}
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

  const selectedDoseData = selectedDose !== null ? (doses.find(d => d.day === selectedDose) ?? null) : null;

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
                <PresetsMenu
                  isOpen={showPresetsMenu}
                  onClose={() => setShowPresetsMenu(false)}
                  onSelectPreset={(doses, scheduleLength, repeat) => {
                    onDosesChange(doses);
                    onViewDaysChange(scheduleLength);
                    onRepeatScheduleChange(repeat);
                    setSelectedDose(null);
                  }}
                />
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

                <ResetConfirmation
                  isOpen={showResetModal}
                  onClose={() => setShowResetModal(false)}
                  onConfirm={() => {
                    onDosesChange([]);
                    setSelectedDose(null);
                  }}
                  doseCount={doses.length}
                />
              </div>
              )}
            </div>
          </div>


          {/* AI Optimizer Modal */}
          <OptimizerModal
            isOpen={showOptimizerModal}
            onClose={() => setShowOptimizerModal(false)}
            viewDays={viewDays}
            referenceCycleType={referenceCycleType}
            esterConcentrations={esterConcentrations}
            onOptimizedSchedule={(doses) => onDosesChange(doses)}
            onEnableRepeat={() => onRepeatScheduleChange(true)}
            onEnableSteadyState={() => onSteadyStateChange(true)}
          />

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

      <DoseEditor
        selectedDoseData={selectedDoseData}
        onUpdateDoseEster={updateDoseEster}
        onUpdateDoseAmount={updateDoseAmount}
        onRemoveDose={removeDose}
        onClose={() => setSelectedDose(null)}
      />
    </div>
  );
};

export default VisualTimeline;