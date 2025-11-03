import { Z_INDEX } from '../constants/defaults';

interface ResetConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  doseCount: number;
}

const ResetConfirmation: React.FC<ResetConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  doseCount
}) => {
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
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: '280px',
          zIndex: Z_INDEX.MODAL_CONTENT,
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
          This will remove all {doseCount} injection{doseCount !== 1 ? 's' : ''}.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
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
              onConfirm();
              onClose();
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
  );
};

export default ResetConfirmation;
