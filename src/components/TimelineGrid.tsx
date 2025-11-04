import { useState, useRef } from 'react';
import { Dose } from '../data/estradiolEsters';
import { EstradiolMedication } from '../types/medication';
import { formatNumber } from '../utils/formatters';
import { getEsterColor } from '../constants/colors';
import { parsePositiveFloat } from '../utils/validation';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants/styles';

interface TimelineGridProps {
  doses: Dose[];
  viewDays: number;
  selectedDose: number | null;
  esterConcentrations: Record<string, number>;
  defaultEster: EstradiolMedication;
  onDoseClick: (day: number) => void;
  onDoseAdd: (day: number, dose: number, ester: EstradiolMedication) => void;
  onDoseUpdate: (day: number, newDose: number) => void;
}

const TimelineGrid: React.FC<TimelineGridProps> = ({
  doses,
  viewDays,
  selectedDose,
  esterConcentrations,
  defaultEster,
  onDoseClick,
  onDoseAdd,
  onDoseUpdate
}) => {
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [editingDose, setEditingDose] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const renderTimelineDay = (day: number) => {
    const dosesOnDay = doses.filter(d => d.day === day);
    const hasInjections = dosesOnDay.length > 0;
    const isSelected = selectedDose === day;

    if (hasInjections) {
      return (
        <div
          key={day}
          onClick={() => onDoseClick(day)}
          className="testcell"
          style={{
            width: '100%',
            aspectRatio: '1',
            minHeight: '0',
            backgroundColor: COLORS.white,
            border: isSelected ? `2px solid ${COLORS.primaryHover}` : `1px solid ${COLORS.gray300}`,
            borderRadius: BORDER_RADIUS.sm,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            padding: '3px',
            position: 'relative' as const,
            transition: 'all 0.15s ease',
            overflow: 'hidden'
          }}
          title={`Day ${day}: ${dosesOnDay.length} medication${dosesOnDay.length > 1 ? 's' : ''}`}
        >
          {/* Day number in top-left corner */}
          {day % 7 === 0 && (
            <div
              style={{
                position: 'absolute' as const,
                top: '2px',
                left: '3px',
                fontSize: TYPOGRAPHY.fontSize.xs,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
                color: COLORS.gray500,
                pointerEvents: 'none' as const
              }}
            >
              {day}
            </div>
          )}

          {/* Render each medication as a pill */}
          {dosesOnDay.map((doseData, index) => {
            const medication = doseData.medication || doseData.ester; // Backward compatibility
            const medicationName = medication?.name || 'Unknown';
            const backgroundColor = getEsterColor(medicationName);
            const concentration = esterConcentrations[medicationName] || 40;
            const volumeMl = doseData.dose / concentration;
            const isEditing = editingDose === day;

            return (
              <div
                key={index}
                style={{
                  backgroundColor,
                  borderRadius: '8px',
                  padding: '1px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.white,
                  boxShadow: `0 1px 2px ${backgroundColor}66`,
                  minHeight: '16px',
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0
                }}
                title={`${formatNumber(doseData.dose)}mg = ${formatNumber(volumeMl, 3)}mL (${medicationName})`}
              >
                <input
                  ref={(el) => {
                    if (index === 0) inputRefs.current[day] = el;
                  }}
                  type="text"
                  value={isEditing && index === 0 ? editingValue : formatNumber(doseData.dose)}
                  onChange={(e) => {
                    if (index === 0) setEditingValue(e.target.value);
                  }}
                  onFocus={(e) => {
                    if (index === 0) {
                      setEditingDose(day);
                      setEditingValue(doseData.dose?.toString() || '');
                      e.target.select();
                    }
                  }}
                  onBlur={() => {
                    if (index === 0) {
                      const newDose = parsePositiveFloat(editingValue, 0);
                      if (newDose !== null) {
                        onDoseUpdate(day, newDose);
                      }
                      setEditingDose(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (index === 0) {
                      if (e.key === 'Enter') {
                        const newDose = parsePositiveFloat(editingValue, 0);
                        if (newDose !== null) {
                          onDoseUpdate(day, newDose);
                        }
                        setEditingDose(null);
                        e.currentTarget.blur();
                      } else if (e.key === 'Escape') {
                        setEditingDose(null);
                        e.currentTarget.blur();
                      }
                    }
                  }}
                  readOnly={!isEditing || index !== 0}
                  style={{
                    width: '2.5ch',
                    minWidth: '2.5ch',
                    maxWidth: '2.5ch',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'center' as const,
                    fontSize: '10px',
                    fontWeight: TYPOGRAPHY.fontWeight.semibold,
                    color: COLORS.white,
                    padding: '0',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '10px', marginLeft: '1px' }}>mg</span>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div
        key={day}
        onClick={() => {
          onDoseAdd(day, 6, defaultEster);
          // Select this dose and enter editing mode
          onDoseClick(day);
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
          backgroundColor: COLORS.gray50,
          border: `1px solid ${COLORS.gray300}`,
          borderRadius: BORDER_RADIUS.sm,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: TYPOGRAPHY.fontSize.base,
          color: COLORS.gray600,
          fontWeight: TYPOGRAPHY.fontWeight.normal,
          position: 'relative' as const,
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
        <div key={week} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: SPACING.sm, marginBottom: SPACING.sm }}>
          {weekDays}
        </div>
      );
    }
    return weeks;
  };

  return (
    <div className="hide-scrollbar" style={{
      border: `2px solid ${COLORS.gray300}`,
      borderRadius: BORDER_RADIUS.sm,
      backgroundColor: COLORS.white,
      height: '400px',
      overflowY: 'auto' as const,
      padding: SPACING.xl,
      scrollbarWidth: 'none', // Firefox
      msOverflowStyle: 'none' // IE/Edge
    }}>
      {renderWeeks()}
    </div>
  );
};

export default TimelineGrid;
