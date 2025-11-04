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

interface ConcentrationGraphProps {
  data: ConcentrationPoint[];
  viewDays: number;
  onViewDaysChange: (days: number) => void;
  referenceCycleType: ReferenceCycleType;
  onReferenceCycleTypeChange: (type: ReferenceCycleType) => void;
  optimizeMode: boolean;
  onOptimizeModeChange: (mode: boolean) => void;
  optimizerSettings: {
    selectedEsters: any[];
    maxInjections: number;
    granularity: number;
  };
  onOptimizerSettingsChange: (settings: any) => void;
  onOpenOptimizerSettings: () => void;
  isOptimizing: boolean;
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
  isOptimizing
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

  const formatTooltip = (value: any, name: string) => {
    if (name === 'concentration') {
      const numValue = parseFloat(value);
      return [`${formatNumber(numValue)} pg/mL`, 'Estradiol Ester'];
    } else if (name === 'reference') {
      const numValue = parseFloat(value);
      return [`${formatNumber(numValue)} pg/mL`, currentCycleInfo?.name || 'Reference Cycle'];
    }
    return [value, name];
  };

  const formatYAxisTick = (value: number) => {
    return formatNumber(value).toString();
  };

  // Generate reference cycle data
  const referenceData = generateReferenceCycle(viewDays, referenceCycleType);

  // Filter and combine data for the chart based on viewDays
  const filteredData = data.filter(point => point.time <= viewDays);
  const combinedData = filteredData.map((point) => {
    // Find the reference value for this specific day
    const referencePoint = referenceData.find(r => r.day === Math.floor(point.time));

    return {
      time: point.time,
      concentration: point.concentration,
      reference: referencePoint?.estradiol || null
    };
  });

  // Generate sensible X-axis tick intervals
  const generateXTicks = (maxDays: number) => {
    let interval: number;
    if (maxDays <= 30) interval = 5;
    else if (maxDays <= 150) interval = 10;
    else if (maxDays <= 300) interval = 20;
    else interval = 30;

    const ticks = [];
    for (let i = 0; i <= maxDays; i += interval) {
      ticks.push(i);
    }
    // Always include the last day if it's not already there
    if (ticks[ticks.length - 1] !== maxDays) {
      ticks.push(maxDays);
    }
    return ticks;
  };

  // Generate Y-axis ticks based on max value in data
  const generateYTicks = () => {
    const maxConcentration = Math.max(
      ...filteredData.map(d => d.concentration),
      ...combinedData.map(d => d.reference || 0)
    );

    // Round up to nearest 50
    const maxY = Math.ceil(maxConcentration / 50) * 50;

    // Generate ticks every 50 up to maxY
    const ticks = [];
    for (let i = 0; i <= maxY; i += 50) {
      ticks.push(i);
    }

    // Ensure we have at least a few ticks
    if (ticks.length < 3) {
      return [0, 50, 100, 150, 200, 250, 300];
    }

    return ticks;
  };

  return (
    <div style={{ marginTop: SPACING['3xl'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg, flexWrap: 'wrap' as const, gap: SPACING.lg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg }}>
          <h3 style={{ margin: 0 }}>Estradiol Concentration Over Time</h3>

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
              <span>Optimize: {optimizerSettings.maxInjections} injections</span>
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
              Injection Count:
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
              {isOptimizing ? (
                <span style={{ color: COLORS.primary, fontStyle: 'italic' }}>Optimizing...</span>
              ) : (
                <>Esters: {optimizerSettings.selectedEsters.map(e => e.name).join(', ')} • Granularity: {optimizerSettings.granularity} mL</>
              )}
            </div>
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
            right: 30,
            left: 20,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            label={{ value: 'Time (days)', position: 'insideBottom' }}
            ticks={generateXTicks(viewDays)}
            domain={[0, viewDays]}
          />
          <YAxis
            tickFormatter={formatYAxisTick}
            label={{ value: 'Concentration (pg/mL)', angle: -90, position: 'insideLeft' }}
            domain={[0, 'auto']}
            ticks={generateYTicks()}
          />
          <Tooltip
            formatter={formatTooltip}
            labelFormatter={(value) => `Day ${parseFloat(parseFloat(value).toFixed(1))}`}
          />
          <Legend />

          <Line
            type="monotone"
            dataKey="concentration"
            stroke={COLORS.chartPrimary}
            strokeWidth={2}
            dot={false}
            name="Estradiol Ester"
          />
          <Line
            type="monotone"
            dataKey="reference"
            stroke={COLORS.chartReference}
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name={currentCycleInfo?.name || "Reference Cycle"}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConcentrationGraph;