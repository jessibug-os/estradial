import { Dose } from '../data/estradiolEsters';
import { PRESETS } from '../data/presets';
import { Z_INDEX } from '../constants/defaults';

interface PresetsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (doses: Dose[], scheduleLength: number, repeat: boolean) => void;
}

const PresetsMenu: React.FC<PresetsMenuProps> = ({ isOpen, onClose, onSelectPreset }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: Z_INDEX.MODAL_BACKDROP
        }}
        onClick={onClose}
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
          zIndex: Z_INDEX.MODAL_CONTENT,
          minWidth: '280px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}
      >
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => {
              onSelectPreset(preset.doses, preset.scheduleLength, preset.repeat ?? true);
              onClose();
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
  );
};

export default PresetsMenu;
