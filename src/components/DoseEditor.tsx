import { Dose, ESTRADIOL_ESTERS } from '../data/estradiolEsters';
import { PROGESTERONE_ROUTES } from '../data/progesteroneRoutes';
import { formatNumber } from '../utils/formatters';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS, BUTTON_STYLES, INPUT_STYLES, mergeStyles } from '../constants/styles';

interface DoseEditorProps {
  selectedDoseData: Dose | null;
  selectedDoseIndex: number | null;
  dosesOnSameDay: number;
  onUpdateDoseMedication: (index: number, medicationName: string) => void;
  onUpdateDoseAmount: (index: number, newDose: number) => void;
  onRemoveDose: (index: number) => void;
  onClose: () => void;
  isPopover?: boolean;
}

const DoseEditor: React.FC<DoseEditorProps> = ({
  selectedDoseData,
  selectedDoseIndex,
  dosesOnSameDay,
  onUpdateDoseMedication,
  onUpdateDoseAmount,
  onRemoveDose,
  onClose,
  isPopover = false
}) => {
  const popoverStyle = isPopover ? {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    width: '400px',
    maxWidth: '90vw'
  } : {};

  return (
    <>
      {isPopover && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 999
          }}
        />
      )}
      <div style={{
        padding: SPACING.xl,
        backgroundColor: COLORS.white,
        border: `1px solid ${COLORS.gray400}`,
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: SHADOWS.lg,
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        ...popoverStyle
      }}>
        {selectedDoseData && selectedDoseIndex !== null ? (
        <>
          <h4 style={{ margin: `0 0 ${SPACING['2xl']} 0`, fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold }}>
            Edit Injection - Day {selectedDoseData.day}
            {dosesOnSameDay > 1 && <span style={{ fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.gray600, marginLeft: SPACING.sm }}>({dosesOnSameDay} medications on this day)</span>}
          </h4>

          <div style={{ marginBottom: SPACING['2xl'] }}>
            <label style={{ display: 'block', marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontSize: TYPOGRAPHY.fontSize.md }}>Medication:</label>
            <select
              value={(selectedDoseData.medication || selectedDoseData.ester)?.name}
              onChange={(e) => onUpdateDoseMedication(selectedDoseIndex, e.target.value)}
              style={{
                width: '100%',
                padding: SPACING.md,
                border: `1px solid ${COLORS.gray400}`,
                borderRadius: BORDER_RADIUS.sm,
                fontSize: TYPOGRAPHY.fontSize.md,
                backgroundColor: COLORS.white
              }}
            >
              <optgroup label="Estradiol Esters">
                {ESTRADIOL_ESTERS.map((ester) => (
                  <option key={ester.name} value={ester.name}>
                    {ester.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Progesterone">
                {PROGESTERONE_ROUTES.map((prog) => (
                  <option key={prog.name} value={prog.name}>
                    {prog.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ marginBottom: SPACING['2xl'] }}>
            <label style={{ display: 'block', marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, fontSize: TYPOGRAPHY.fontSize.md }}>Dose (mg):</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.md }}>
              <input
                type="number"
                value={formatNumber(selectedDoseData.dose)}
                onChange={(e) => onUpdateDoseAmount(selectedDoseIndex, parseFloat(e.target.value) || 0)}
                step="0.1"
                min="0"
                max="20"
                style={mergeStyles(INPUT_STYLES.base, INPUT_STYLES.numberLarge)}
              />
              <span style={{ color: COLORS.gray600, fontSize: TYPOGRAPHY.fontSize.md }}>mg</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <button
              onClick={onClose}
              style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.primary, {
                borderRadius: BORDER_RADIUS.md,
                flex: 1
              })}
            >
              Done
            </button>
            <button
              onClick={() => onRemoveDose(selectedDoseIndex)}
              style={mergeStyles(BUTTON_STYLES.base, BUTTON_STYLES.danger, {
                borderRadius: BORDER_RADIUS.md,
                flex: 1
              })}
            >
              Remove
            </button>
          </div>
        </>
      ) : null}
      </div>
    </>
  );
};

export default DoseEditor;
