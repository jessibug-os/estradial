import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ConcentrationPoint } from '../utils/pharmacokinetics';
import { generateReferenceCycle, ReferenceCycleType, REFERENCE_CYCLES } from '../data/referenceData';
import { useDebouncedInput } from '../hooks/useDebounce';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, INPUT_STYLES, mergeStyles } from '../constants/styles';
import { AnyMedication } from '../types/medication';

interface ConcentrationGraphProps {
  data: ConcentrationPoint[];
  viewDays: number;
  onViewDaysChange: (days: number) => void;
  referenceCycleType: ReferenceCycleType;
  onReferenceCycleTypeChange: (type: ReferenceCycleType) => void;
  optimizeMode: boolean;
  onOptimizeModeChange: (mode: boolean) => void;
  optimizerSettings: {
    selectedEsters: AnyMedication[];
    maxInjections: number;
    granularity: number;
  };
  onOptimizerSettingsChange: (settings: any) => void;
  onOpenOptimizerSettings: () => void;
  isOptimizing: boolean;
  optimizeProgress: number; // 0-100 percentage
  isFindingBestFit: boolean;
  bestFitProgress: { current: number; total: number; injectionCount: number };
  onBestFit: () => void;
  onStopBestFit: () => void;
  actualInjectionCount?: number;
}

const ConcentrationGraph: React.FC<ConcentrationGraphProps> = ({
  data,
  viewDays,
  onViewDaysChange,
  referenceCycleType,
  onReferenceCycleTypeChange,
  optimizeMode,
  onOptimizeModeChange,
  optimizerSettings,
  onOptimizerSettingsChange,
  onOpenOptimizerSettings,
  isOptimizing,
  optimizeProgress,
  isFindingBestFit,
  bestFitProgress,
  onBestFit,
  onStopBestFit,
  actualInjectionCount
}) => {
  const [graphInputValue, setGraphInputValue] = useDebouncedInput(
    viewDays.toString(),
    (value) => {
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 1 && numValue !== viewDays) {
        onViewDaysChange(numValue);
      }
    },
    1000
  );

  const formatNumber = (value: number): number => {
    if (value >= 1000) {
      return Math.round(value / 50) * 50;
    } else if (value >= 100) {
      return Math.round(value / 10) * 10;
    } else if (value >= 10) {
      return Math.round(value);
    } else {
      // Round to 1 decimal place and parse to remove floating point errors
      return parseFloat((Math.round(value * 10) / 10).toFixed(1));
    }
  };

  const currentCycleInfo = REFERENCE_CYCLES.find(c => c.id === referenceCycleType);

  const formatYAxisTick = (value: number) => {
    return formatNumber(value).toString();
  };

  // Memoize reference cycle data generation
  const referenceData = useMemo(
    () => generateReferenceCycle(viewDays, referenceCycleType),
    [viewDays, referenceCycleType]
  );

  // Memoize filtered and combined data
  const combinedData = useMemo(() => {
    const filteredData = data.filter(point => point.time <= viewDays);
    return filteredData.map((point) => {
      const referencePoint = referenceData.find(r => r.day === Math.floor(point.time));
      return {
        time: point.time,
        estradiol: point.estradiolConcentration,
        progesterone: point.progesteroneConcentration,
        estradiolReference: referencePoint?.estradiol || null,
        progesteroneReference: referencePoint?.progesterone || null
      };
    });
  }, [data, viewDays, referenceData]);

  // Memoize X-axis tick generation
  const xTicks = useMemo(() => {
    let interval: number;
    if (viewDays <= 30) interval = 5;
    else if (viewDays <= 150) interval = 10;
    else if (viewDays <= 300) interval = 20;
    else interval = 30;

    const ticks = [];
    for (let i = 0; i <= viewDays; i += interval) {
      ticks.push(i);
    }
    if (ticks[ticks.length - 1] !== viewDays) {
      ticks.push(viewDays);
    }
    return ticks;
  }, [viewDays]);

  // Memoize Y-axis ticks for estradiol (left axis)
  const estradiolYTicks = useMemo(() => {
    const maxConcentration = Math.max(
      ...combinedData.map(d => d.estradiol),
      ...combinedData.map(d => d.estradiolReference || 0)
    );

    const maxY = Math.ceil(maxConcentration / 50) * 50;
    const ticks = [];
    for (let i = 0; i <= maxY; i += 50) {
      ticks.push(i);
    }

    if (ticks.length < 3) {
      return [0, 50, 100, 150, 200, 250, 300];
    }
    return ticks;
  }, [combinedData]);

  // Memoize Y-axis ticks for progesterone (right axis)
  const progesteroneYTicks = useMemo(() => {
    const maxConcentration = Math.max(
      ...combinedData.map(d => d.progesterone),
      ...combinedData.map(d => d.progesteroneReference || 0)
    );

    const maxY = Math.ceil(maxConcentration / 5) * 5;
    const ticks = [];
    for (let i = 0; i <= maxY; i += 5) {
      ticks.push(i);
    }

    if (ticks.length < 3) {
      return [0, 5, 10, 15, 20, 25];
    }
    return ticks;
  }, [combinedData]);

  return (
    <div style={{ marginTop: SPACING['3xl'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg, flexWrap: 'wrap' as const, gap: SPACING.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
          <h3 style={{ margin: 0 }}>Hormone Concentration Over Time</h3>

          {/* Optimize Mode Badge */}
          {optimizeMode && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.sm,
              backgroundColor: COLORS.primary,
              color: COLORS.white,
              padding: `${SPACING.xs} ${SPACING.md}`,
              borderRadius: BORDER_RADIUS.sm,
              fontSize: TYPOGRAPHY.fontSize.sm
            }}>
              <span>Optimize: {actualInjectionCount ?? optimizerSettings.maxInjections} injections</span>
              <button
                onClick={() => onOptimizeModeChange(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.white,
                  cursor: 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.lg,
                  padding: 0,
                  lineHeight: 1
                }}
                title="Exit optimize mode"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.xl, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <label style={{ fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.gray600 }}>
              Reference:
            </label>
            <select
              value={referenceCycleType}
              onChange={(e) => onReferenceCycleTypeChange(e.target.value as ReferenceCycleType)}
              style={{
                padding: `${SPACING.xs} ${SPACING.sm}`,
                fontSize: TYPOGRAPHY.fontSize.base,
                borderRadius: BORDER_RADIUS.sm,
                border: `1px solid ${COLORS.gray400}`,
                backgroundColor: COLORS.white,
                cursor: 'pointer'
              }}
              title={currentCycleInfo?.description}
            >
              {REFERENCE_CYCLES.map(cycle => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
            <label style={{ fontSize: TYPOGRAPHY.fontSize.base, color: COLORS.gray600 }}>
              Display:
            </label>
            <input
              type="number"
              value={graphInputValue}
              onChange={(e) => {
                const val = e.target.value;
                setGraphInputValue(val); // Only update local state, debounce handles propagation
              }}
              onBlur={(e) => {
                const val = e.target.value;
                if (val === '' || parseInt(val) < 1 || isNaN(parseInt(val))) {
                  setGraphInputValue('1');
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
        </div>
      </div>

      {/* Optimize Mode Slider */}
      {optimizeMode && (
        <div style={{
          marginBottom: SPACING.lg,
          padding: SPACING.lg,
          backgroundColor: COLORS.gray50,
          borderRadius: BORDER_RADIUS.sm
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.lg,
            marginBottom: SPACING.md
          }}>
            <label style={{ fontSize: TYPOGRAPHY.fontSize.base, fontWeight: TYPOGRAPHY.fontWeight.semibold, minWidth: '140px' }}>
              Max Injection Count:
            </label>
            <input
              type="range"
              min="1"
              max={currentCycleInfo?.cycleLength || 29}
              value={optimizerSettings.maxInjections}
              onChange={(e) => {
                const newInjections = parseInt(e.target.value);
                onOptimizerSettingsChange({
                  ...optimizerSettings,
                  maxInjections: newInjections
                });
              }}
              disabled={isOptimizing}
              style={{ flex: 1, cursor: isOptimizing ? 'wait' : 'pointer' }}
            />
            <span style={{ fontSize: TYPOGRAPHY.fontSize.base, minWidth: '60px', textAlign: 'center' }}>
              {optimizerSettings.maxInjections}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: SPACING.lg
          }}>
            <div style={{ fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.gray600 }}>
              {isFindingBestFit ? (
                <span style={{ color: COLORS.primary, fontStyle: 'italic' }}>
                  Finding best fit... {bestFitProgress.total > 0 ? Math.round((bestFitProgress.current / bestFitProgress.total) * 100) : 0}% (testing {bestFitProgress.injectionCount} injection{bestFitProgress.injectionCount !== 1 ? 's' : ''})
                </span>
              ) : isOptimizing ? (
                <span style={{ color: COLORS.primary, fontStyle: 'italic' }}>Optimizing... {Math.round(optimizeProgress)}%</span>
              ) : (
                <>Esters: {optimizerSettings.selectedEsters.map(e => e.name).join(', ')} • Granularity: {optimizerSettings.granularity} mL</>
              )}
            </div>
            <div style={{ display: 'flex', gap: SPACING.md }}>
              <button
                onClick={isFindingBestFit ? onStopBestFit : onBestFit}
                disabled={isOptimizing && !isFindingBestFit}
                style={{
                  padding: `${SPACING.sm} ${SPACING.lg}`,
                  backgroundColor: isFindingBestFit ? '#dc2626' : (isOptimizing ? COLORS.gray300 : COLORS.primary),
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: BORDER_RADIUS.sm,
                  cursor: (isOptimizing && !isFindingBestFit) ? 'not-allowed' : 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                {isFindingBestFit ? 'Stop' : 'Run'}
              </button>
              <button
                onClick={onOpenOptimizerSettings}
                disabled={isOptimizing}
                style={{
                  padding: `${SPACING.sm} ${SPACING.lg}`,
                  backgroundColor: isOptimizing ? COLORS.gray300 : COLORS.gray600,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: BORDER_RADIUS.sm,
                  cursor: isOptimizing ? 'wait' : 'pointer',
                  fontSize: TYPOGRAPHY.fontSize.base
                }}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {currentCycleInfo && (
        <div style={{
          fontSize: TYPOGRAPHY.fontSize.sm,
          color: COLORS.gray600,
          marginBottom: SPACING.lg,
          fontStyle: 'italic'
        }}>
          {currentCycleInfo.description} — Cycle Length: {currentCycleInfo.cycleLength} days — Source: {currentCycleInfo.source}
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={combinedData}
          margin={{
            top: 20,
            right: 60,
            left: 20,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            label={{ value: 'Time (days)', position: 'insideBottom' }}
            ticks={xTicks}
            domain={[0, viewDays]}
          />
          {/* Left Y-axis for Estradiol (pg/mL) */}
          <YAxis
            yAxisId="estradiol"
            tickFormatter={formatYAxisTick}
            label={{ value: 'Estradiol (pg/mL)', angle: -90, position: 'insideLeft' }}
            domain={[0, 'auto']}
            ticks={estradiolYTicks}
          />
          {/* Right Y-axis for Progesterone (ng/mL) */}
          <YAxis
            yAxisId="progesterone"
            orientation="right"
            tickFormatter={formatYAxisTick}
            label={{ value: 'Progesterone (ng/mL)', angle: 90, position: 'insideRight' }}
            domain={[0, 'auto']}
            ticks={progesteroneYTicks}
          />
          <Tooltip
            formatter={(value, name) => {
              const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) : 0);
              const nameStr = typeof name === 'string' ? name : '';
              if (nameStr.includes('Progesterone')) {
                return [`${formatNumber(numValue)} ng/mL`, nameStr];
              }
              return [`${formatNumber(numValue)} pg/mL`, nameStr];
            }}
            labelFormatter={(value) => `Day ${parseFloat(parseFloat(value as string).toFixed(1))}`}
          />
          <Legend />

          {/* Estradiol lines (left axis) - disable animations */}
          <Line
            yAxisId="estradiol"
            type="monotone"
            dataKey="estradiol"
            stroke={COLORS.chartPrimary}
            strokeWidth={2}
            dot={false}
            name="Estradiol"
            isAnimationActive={false}
          />
          <Line
            yAxisId="estradiol"
            type="monotone"
            dataKey="estradiolReference"
            stroke={COLORS.chartReference}
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Estradiol Reference"
            isAnimationActive={false}
          />

          {/* Progesterone lines (right axis) - disable animations */}
          <Line
            yAxisId="progesterone"
            type="monotone"
            dataKey="progesterone"
            stroke="#9333ea"
            strokeWidth={2}
            dot={false}
            name="Progesterone"
            isAnimationActive={false}
          />
          <Line
            yAxisId="progesterone"
            type="monotone"
            dataKey="progesteroneReference"
            stroke="#c084fc"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Progesterone Reference"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConcentrationGraph;