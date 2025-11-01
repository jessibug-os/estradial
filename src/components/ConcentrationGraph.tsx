import React, { useState, useEffect } from 'react';
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
import { generateReferenceCycle } from '../data/referenceData';

interface ConcentrationGraphProps {
  data: ConcentrationPoint[];
  viewDays: number;
  onViewDaysChange: (days: number) => void;
}

const ConcentrationGraph: React.FC<ConcentrationGraphProps> = ({ data, viewDays, onViewDaysChange }) => {
  const [graphInputValue, setGraphInputValue] = useState(viewDays.toString());

  // Sync local input state with prop changes
  useEffect(() => {
    setGraphInputValue(viewDays.toString());
  }, [viewDays]);

  // Debounce graph display days changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const numValue = parseInt(graphInputValue);
      if (!isNaN(numValue) && numValue >= 1 && numValue !== viewDays) {
        onViewDaysChange(numValue);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [graphInputValue, viewDays, onViewDaysChange]);

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return Math.round(value / 50) * 50;
    } else if (value >= 100) {
      return Math.round(value / 10) * 10;
    } else if (value >= 10) {
      return Math.round(value);
    } else {
      return Math.round(value * 10) / 10;
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'concentration') {
      const numValue = parseFloat(value);
      return [`${formatNumber(numValue)} pg/mL`, 'Estradiol Ester'];
    } else if (name === 'reference') {
      const numValue = parseFloat(value);
      return [`${formatNumber(numValue)} pg/mL`, 'Cis Women Cycle'];
    }
    return [value, name];
  };

  const formatYAxisTick = (value: number) => {
    return formatNumber(value).toString();
  };

  // Generate reference cycle data
  const referenceData = generateReferenceCycle(viewDays);

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
    <div style={{ marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0 }}>Estradiol Concentration Over Time</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#6c757d' }}>
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
            style={{
              width: '60px',
              padding: '4px 6px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
          <span style={{ fontSize: '13px', color: '#6c757d' }}>days</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={combinedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            label={{ value: 'Time (days)', position: 'insideBottom', offset: -10 }}
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
            labelFormatter={(value) => `Day ${value}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="concentration"
            stroke="#b794f6"
            strokeWidth={2}
            dot={false}
            name="Estradiol Ester"
          />
          <Line 
            type="monotone" 
            dataKey="reference" 
            stroke="#ff7300" 
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="Cis Women Cycle"
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <p>
          <strong>Peak ester concentration (displayed range):</strong> {formatNumber(Math.max(...filteredData.map(d => d.concentration)))} pg/mL
        </p>
        <p>
          <strong>Cis women cycle range:</strong> 45-350 pg/mL (typical follicular-ovulatory range)
        </p>
        <p>
          <strong>Displayed time range:</strong> {filteredData[0]?.time || 0} - {viewDays} days
        </p>
      </div>
    </div>
  );
};

export default ConcentrationGraph;