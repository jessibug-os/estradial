import { useState } from 'react';
import { Dose, ESTRADIOL_ESTERS, EstradiolEster } from '../data/estradiolEsters';
import { optimizeSchedule } from '../utils/scheduleOptimizer';
import { ReferenceCycleType } from '../data/referenceData';
import { formatNumber } from '../utils/formatters';
import { useDebouncedInput } from '../hooks/useDebounce';
import { parsePositiveInteger } from '../utils/validation';
import ErrorBoundary from './ErrorBoundary';
import { OPTIMIZER_DEFAULTS, Z_INDEX } from '../constants/defaults';

interface OptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewDays: number;
  referenceCycleType: ReferenceCycleType;
  esterConcentrations: Record<string, number>;
  onOptimizedSchedule: (doses: Dose[]) => void;
  onEnableRepeat: () => void;
  onEnableSteadyState: () => void;
}

const OptimizerModal: React.FC<OptimizerModalProps> = ({
  isOpen,
  onClose,
  viewDays,
  referenceCycleType,
  esterConcentrations,
  onOptimizedSchedule,
  onEnableRepeat,
  onEnableSteadyState
}) => {
  // Default to Estradiol valerate for optimizer
  const DEFAULT_OPTIMIZER_ESTER = ESTRADIOL_ESTERS[1] || ESTRADIOL_ESTERS[0]!;
  const [selectedEsters, setSelectedEsters] = useState<EstradiolEster[]>([DEFAULT_OPTIMIZER_ESTER]);
  const [maxInjections, setMaxInjections] = useState<number>(OPTIMIZER_DEFAULTS.DEFAULT_MAX_INJECTIONS);
  const [maxInjectionsInput, setMaxInjectionsInput] = useDebouncedInput(
    OPTIMIZER_DEFAULTS.DEFAULT_MAX_INJECTIONS.toString(),
    (value) => {
      const numValue = parsePositiveInteger(value, 1);
      if (numValue !== null && numValue !== maxInjections) {
        setMaxInjections(numValue);
      }
    },
    500
  );
  const [granularity, setGranularity] = useState<number>(OPTIMIZER_DEFAULTS.DEFAULT_GRANULARITY_ML);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [optimizationScore, setOptimizationScore] = useState(0);

  if (!isOpen) return null;

  return (
    <ErrorBoundary
      fallback={
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
            zIndex: Z_INDEX.MODAL_ELEVATED,
            maxWidth: '400px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Optimizer Error</h3>
          <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '16px' }}>
            The schedule optimizer encountered an error. Please try different settings or close and try again.
          </p>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#b794f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Close
          </button>
        </div>
      }
    >
      <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: Z_INDEX.MODAL_CONTENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
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
          zIndex: Z_INDEX.MODAL_ELEVATED,
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
            Volume Granularity (minimum volume increment):
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="range"
              min="0.01"
              max="0.1"
              step="0.01"
              value={granularity}
              onChange={(e) => setGranularity(Math.round(parseFloat(e.target.value) * 100) / 100)}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0.01"
              max="0.1"
              step="0.01"
              value={formatNumber(granularity, 3)}
              onChange={(e) => setGranularity(Math.round(parseFloat(e.target.value) * 100) / 100 || 0.05)}
              style={{
                width: '70px',
                padding: '6px 8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
            <span style={{ fontSize: '13px', color: '#6c757d', minWidth: '30px' }}>mL</span>
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>
            {granularity <= 0.025 ? 'Very fine adjustments (slower, for precision)' :
             granularity <= 0.05 ? 'Fine adjustments (balanced)' :
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
            onClick={onClose}
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
                    maxDosePerInjection: OPTIMIZER_DEFAULTS.MAX_DOSE_PER_INJECTION,
                    minDosePerInjection: OPTIMIZER_DEFAULTS.MIN_DOSE_PER_INJECTION,
                    maxInjectionsPerCycle: maxInjections,
                    esterConcentrations
                  },
                  (progress, score) => {
                    setOptimizationProgress(Math.round(progress));
                    setOptimizationScore(score);
                  }
                );

                onOptimizedSchedule(result.doses);
                onEnableRepeat(); // Enable repeat mode for optimized schedules
                onEnableSteadyState(); // Enable steady state for optimized schedules
                onClose();
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
    </ErrorBoundary>
  );
};

export default OptimizerModal;
