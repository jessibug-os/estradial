import { useState, useEffect } from 'react';
import { Dose, ESTRADIOL_ESTERS } from '../data/estradiolEsters';
import { PROGESTERONE_ROUTES } from '../data/progesteroneRoutes';
import { EstradiolMedication } from '../types/medication';
import { formatNumber } from '../utils/formatters';
import { useDebouncedInput } from '../hooks/useDebounce';
import { parsePositiveInteger } from '../utils/validation';
import PresetsMenu from './PresetsMenu';
import ResetConfirmation from './ResetConfirmation';
import DoseEditor from './DoseEditor';
import TimelineGrid from './TimelineGrid';
import { COLORS, TYPOGRAPHY, SPACING, BUTTON_STYLES, INPUT_STYLES, mergeStyles } from '../constants/styles';

interface VisualTimelineProps {
  doses: Dose[];
  onDosesChange: (doses: Dose[]) => void;
  viewDays: number;
  onViewDaysChange: (days: number) => void;
  repeatSchedule: boolean;
  onRepeatScheduleChange: (repeat: boolean) => void;
  steadyState: boolean;
  onSteadyStateChange: (steadyState: boolean) => void;
  esterConcentrations: Record<string, number>;
  onOptimizeModeChange: (mode: boolean) => void;
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
  esterConcentrations,
  onOptimizeModeChange
}) => {
  const [selectedDoseIndex, setSelectedDoseIndex] = useState<number | null>(null);
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
  const [previousViewDays, setPreviousViewDays] = useState(viewDays);

  // Auto-remove injections beyond schedule length when it's reduced
  useEffect(() => {
    if (viewDays < previousViewDays && doses.length > 0) {
      const dosesOutOfRange = doses.filter(d => d.day >= viewDays);
      if (dosesOutOfRange.length > 0) {
        const newDoses = doses.filter(d => d.day < viewDays);
        onDosesChange(newDoses);
        // Clear selection if the selected dose was removed
        if (selectedDoseIndex !== null && selectedDoseIndex >= newDoses.length) {
          setSelectedDoseIndex(null);
        }
      }
    }
    setPreviousViewDays(viewDays);
  }, [viewDays, doses, previousViewDays, selectedDoseIndex, onDosesChange]);

  // Default to Estradiol valerate for new injections
  const DEFAULT_ESTER = ESTRADIOL_ESTERS[1] || ESTRADIOL_ESTERS[0]!;

  const addOrUpdateDose = (day: number, dose: number = 6, ester: EstradiolMedication = DEFAULT_ESTER) => {
    const existingIndex = doses.findIndex(d => d.day === day);
    let newDoses = [...doses];

    if (existingIndex >= 0) {
      // Update existing dose
      newDoses[existingIndex] = { day, dose, medication: ester };
    } else {
      // Add new dose
      newDoses.push({ day, dose, medication: ester });
      newDoses.sort((a, b) => a.day - b.day);
    }

    onDosesChange(newDoses);
  };

  const addAnotherDoseToDay = (day: number) => {
    // Add a new progesterone dose to the same day
    const defaultProgesterone = PROGESTERONE_ROUTES[0]!; // Default to oral progesterone
    const newDoses = [...doses, { day, dose: 100, medication: defaultProgesterone }];
    newDoses.sort((a, b) => a.day - b.day);
    onDosesChange(newDoses);
  };

  const removeDose = (index: number) => {
    if (index < 0 || index >= doses.length) return;
    const newDoses = doses.filter((_, i) => i !== index);
    onDosesChange(newDoses);
    setSelectedDoseIndex(null);
  };

  const updateDoseAmount = (index: number, newDose: number) => {
    if (index < 0 || index >= doses.length) return;
    const newDoses = [...doses];
    newDoses[index] = { ...newDoses[index]!, dose: newDose };
    onDosesChange(newDoses);
  };

  const updateDoseMedication = (index: number, medicationName: string) => {
    if (index < 0 || index >= doses.length) return;

    // Find medication in either estradiol esters or progesterone routes
    const allMedications = [...ESTRADIOL_ESTERS, ...PROGESTERONE_ROUTES];
    const medication = allMedications.find(m => m.name === medicationName);
    if (!medication) return;

    const newDoses = [...doses];
    newDoses[index] = { ...newDoses[index]!, medication };
    onDosesChange(newDoses);
  };

  const handleDoseClick = (day: number) => {
    // When clicking on empty space in a day cell, select first dose on that day
    const dosesOnDay = doses.map((d, idx) => ({ dose: d, index: idx })).filter(({ dose }) => dose.day === day);
    if (dosesOnDay.length > 0) {
      setSelectedDoseIndex(dosesOnDay[0]!.index);
    }
  };

  const handlePillClick = (index: number) => {
    // Directly select the clicked pill
    setSelectedDoseIndex(index);
  };

  // Get the selected dose by index
  const selectedDoseData = selectedDoseIndex !== null && selectedDoseIndex < doses.length ? doses[selectedDoseIndex]! : null;

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
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: SPACING['3xl'] }}>
      <div>
        <div style={{
          marginBottom: SPACING.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.gray600 }}>
              <strong style={{ color: COLORS.gray700 }}>{doses.length} injection{doses.length !== 1 ? 's' : ''}</strong>
              {getDosageDisplayText()}
            </div>
            <div style={{ display: 'flex', gap: SPACING.md }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => onOptimizeModeChange(true)}
                  style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.small, BUTTON_STYLES.primary)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.primary}
                >
                  Optimize
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                  style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.small, {
                    backgroundColor: COLORS.gray600,
                    color: COLORS.white
                  })}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.gray700}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORS.gray600}
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
                    setSelectedDoseIndex(null);
                  }}
                />
              </div>
              {doses.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowResetModal(true)}
                  style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.small, {
                    padding: `${SPACING.xs} ${SPACING.md}`,
                    color: COLORS.danger,
                    backgroundColor: 'transparent',
                    border: `1px solid ${COLORS.danger}`,
                    transition: 'all 0.15s ease'
                  })}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = COLORS.danger;
                    e.currentTarget.style.color = COLORS.white;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = COLORS.danger;
                  }}
                >
                  Reset
                </button>

                <ResetConfirmation
                  isOpen={showResetModal}
                  onClose={() => setShowResetModal(false)}
                  onConfirm={() => {
                    onDosesChange([]);
                    setSelectedDoseIndex(null);
                  }}
                  doseCount={doses.length}
                />
              </div>
              )}
            </div>
          </div>


          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.gray600 }}>
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
                style={mergeStyles(INPUT_STYLES.base, INPUT_STYLES.number, {
                  padding: `${SPACING.xs} ${SPACING.sm}`,
                  fontSize: TYPOGRAPHY.fontSize.base
                })}
              />
              <span style={{ fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.gray600 }}>days</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              <label style={{ fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.gray600, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={repeatSchedule}
                  onChange={(e) => onRepeatScheduleChange(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    marginRight: SPACING.xs,
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: TYPOGRAPHY.fontSize.base }}>Repeat</span>
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
              <label
                style={{
                  fontSize: TYPOGRAPHY.fontSize.base,
                  color: repeatSchedule ? COLORS.gray600 : COLORS.gray500,
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
                    marginRight: SPACING.xs,
                    cursor: repeatSchedule ? 'pointer' : 'not-allowed'
                  }}
                />
                <span style={{ fontSize: TYPOGRAPHY.fontSize.base }}>Steady State</span>
              </label>
            </div>
          </div>
        </div>
        <TimelineGrid
          doses={doses}
          viewDays={viewDays}
          selectedDose={selectedDoseData?.day ?? null}
          selectedDoseIndex={selectedDoseIndex}
          esterConcentrations={esterConcentrations}
          defaultEster={DEFAULT_ESTER}
          onDoseClick={handleDoseClick}
          onPillClick={handlePillClick}
          onDoseAdd={addOrUpdateDose}
        />
      </div>

      <DoseEditor
        selectedDoseData={selectedDoseData}
        selectedDoseIndex={selectedDoseIndex}
        dosesOnSameDay={selectedDoseData ? doses.filter(d => d.day === selectedDoseData.day).length : 0}
        onUpdateDoseMedication={updateDoseMedication}
        onUpdateDoseAmount={updateDoseAmount}
        onRemoveDose={removeDose}
        onAddAnotherDose={addAnotherDoseToDay}
        onClose={() => setSelectedDoseIndex(null)}
      />
    </div>
  );
};

export default VisualTimeline;