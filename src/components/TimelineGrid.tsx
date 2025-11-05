import { Dose } from '../data/estradiolEsters';
import { EstradiolMedication } from '../types/medication';
import { formatNumber } from '../utils/formatters';
import { getEsterColor } from '../constants/colors';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../constants/styles';

interface TimelineGridProps {
  doses: Dose[];
  viewDays: number;
  selectedDose: number | null;
  selectedDoseIndex: number | null;
  esterConcentrations: Record<string, number>;
  defaultEster: EstradiolMedication;
  onDoseClick: (day: number) => void;
  onPillClick: (index: number) => void;
  onDoseAdd: (day: number, dose: number, ester: EstradiolMedication) => void;
  onAddAnotherDose: (day: number) => void;
}

const TimelineGrid: React.FC<TimelineGridProps> = ({
  doses,
  viewDays,
  selectedDose,
  selectedDoseIndex,
  esterConcentrations,
  defaultEster,
  onDoseClick,
  onPillClick,
  onDoseAdd,
  onAddAnotherDose
}) => {

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
            maxHeight: '100%',
            backgroundColor: COLORS.white,
            border: `2px solid ${isSelected ? COLORS.primaryHover : COLORS.gray300}`,
            borderRadius: BORDER_RADIUS.sm,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '4px',
            position: 'relative' as const,
            transition: 'all 0.15s ease',
            overflow: 'hidden',
            boxSizing: 'border-box' as const
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

          {/* Plus button in top-right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddAnotherDose(day);
            }}
            style={{
              position: 'absolute' as const,
              top: '2px',
              right: '2px',
              width: '16px',
              height: '16px',
              borderRadius: '3px',
              border: `1px solid ${COLORS.primary}`,
              backgroundColor: COLORS.white,
              color: COLORS.primary,
              fontSize: '12px',
              lineHeight: '1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.primary;
              e.currentTarget.style.color = COLORS.white;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.white;
              e.currentTarget.style.color = COLORS.primary;
            }}
            title="Add another medication to this day"
          >
            +
          </button>

          {/* Render each medication as a pill */}
          {dosesOnDay.map((doseData) => {
            // Find global index of this dose
            const globalIndex = doses.findIndex(d => d === doseData);
            const medication = doseData.medication || doseData.ester; // Backward compatibility
            const medicationName = medication?.name || 'Unknown';
            const backgroundColor = getEsterColor(medicationName);
            const concentration = esterConcentrations[medicationName] || 40;
            const volumeMl = doseData.dose / concentration;
            const isSelected = selectedDoseIndex === globalIndex;

            // Get abbreviated name (first letter of each word, max 3 chars)
            const abbreviatedName = medicationName
              .split(' ')
              .map(word => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 3);

            return (
              <div
                key={globalIndex}
                onClick={(e) => {
                  e.stopPropagation();
                  onPillClick(globalIndex);
                }}
                style={{
                  backgroundColor,
                  borderRadius: '8px',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: TYPOGRAPHY.fontWeight.semibold,
                  color: COLORS.white,
                  boxShadow: isSelected ? `0 0 0 2px ${COLORS.primaryHover}` : `0 1px 2px ${backgroundColor}66`,
                  minHeight: '22px',
                  maxHeight: '22px',
                  width: 'calc(100% - 4px)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isSelected ? 1 : 0.95
                }}
                title={`${medicationName}: ${formatNumber(doseData.dose)}mg = ${formatNumber(volumeMl, 3)}mL @ ${concentration}mg/mL`}
                onMouseOver={(e) => {
                  if (!isSelected) e.currentTarget.style.opacity = '1';
                }}
                onMouseOut={(e) => {
                  if (!isSelected) e.currentTarget.style.opacity = '0.95';
                }}
              >
                <span style={{ fontSize: '10px', opacity: 0.9 }}>{abbreviatedName}</span>
                <span style={{ fontSize: '11px' }}>{formatNumber(doseData.dose)}mg</span>
                <span style={{ fontSize: '9px', opacity: 0.85 }}>({formatNumber(volumeMl, 2)}mL)</span>
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
          // Select the newly added dose
          onDoseClick(day);
        }}
        style={{
          width: '100%',
          aspectRatio: '1',
          minHeight: '0',
          maxHeight: '100%',
          backgroundColor: COLORS.gray50,
          border: `2px solid ${COLORS.gray300}`,
          borderRadius: BORDER_RADIUS.sm,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: TYPOGRAPHY.fontSize.base,
          color: COLORS.gray600,
          fontWeight: TYPOGRAPHY.fontWeight.normal,
          position: 'relative' as const,
          transition: 'all 0.15s ease',
          boxSizing: 'border-box' as const
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
