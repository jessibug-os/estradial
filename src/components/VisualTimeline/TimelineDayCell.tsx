import React, { useEffect, useRef } from 'react';
import { Dose } from '../../data/estradiolEsters';
import { formatNumber } from '../../utils/formatters';
import { getEsterColor } from '../../constants/colors';
import { parsePositiveFloat } from '../../utils/validation';

interface TimelineDayCellProps {
  day: number;
  dose: Dose | null;
  isSelected: boolean;
  isEditing: boolean;
  editingValue: string;
  onSelect: () => void;
  onAdd: () => void;
  onEditStart: () => void;
  onEditEnd: () => void;
  onUpdateDose: (day: number, dose: number) => void;
  onEditingValueChange: (value: string) => void;
  onInputFocus?: (element: HTMLInputElement) => void;
}

export const TimelineDayCell: React.FC<TimelineDayCellProps> = ({
  day,
  dose,
  isSelected,
  isEditing,
  editingValue,
  onSelect,
  onAdd,
  onEditStart,
  onEditEnd,
  onUpdateDose,
  onEditingValueChange,
  onInputFocus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (onInputFocus && inputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (inputRef.current) {
          onInputFocus(inputRef.current);
        }
      }, 10);
    }
  }, [isEditing, onInputFocus]);

  if (dose) {
    const backgroundColor = getEsterColor(dose.ester.name);

    return (
      <div
        onClick={onSelect}
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
          overflow: 'hidden',
        }}
        title={`Day ${day}: ${formatNumber(dose.dose)}mg (${dose.ester.name})`}
      >
          <input
          ref={inputRef}
          type="text"
          value={isEditing ? editingValue : formatNumber(dose.dose)}
          onChange={(e) => {
            onEditingValueChange(e.target.value);
          }}
          onFocus={onEditStart}
          onBlur={() => {
            const newDose = parsePositiveFloat(editingValue, 0);
            if (newDose !== null) {
              onUpdateDose(day, newDose);
            }
            onEditEnd();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const newDose = parsePositiveFloat(editingValue, 0);
              if (newDose !== null) {
                onUpdateDose(day, newDose);
              }
              onEditEnd();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              onEditEnd();
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
            cursor: 'pointer',
          }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={onAdd}
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
        transition: 'all 0.15s ease',
      }}
      title={`Day ${day}: Click to add injection`}
    >
      {day % 7 === 0 ? day : ''}
    </div>
  );
};

