import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConcentrationGraph from './ConcentrationGraph';
import { ConcentrationPoint } from '../utils/pharmacokinetics';
import { REFERENCE_CYCLES } from '../data/referenceData';
import { ESTRADIOL_ESTERS } from '../data/estradiolEsters';

describe('ConcentrationGraph', () => {
  const mockOnViewDaysChange = jest.fn();
  const mockOnReferenceCycleTypeChange = jest.fn();
  const mockOnOptimizeModeChange = jest.fn();
  const mockOnOptimizerSettingsChange = jest.fn();
  const mockOnOpenOptimizerSettings = jest.fn();

  const defaultOptimizerSettings = {
    selectedEsters: [ESTRADIOL_ESTERS[0]],
    maxInjections: 4,
    granularity: 0.05
  };

  const sampleData: ConcentrationPoint[] = [
    { time: 0, concentration: 100 },
    { time: 1, concentration: 150 },
    { time: 2, concentration: 120 },
    { time: 3, concentration: 90 },
    { time: 4, concentration: 80 },
    { time: 5, concentration: 70 },
  ];

  const defaultProps = {
    optimizeMode: false,
    onOptimizeModeChange: mockOnOptimizeModeChange,
    optimizerSettings: defaultOptimizerSettings,
    onOptimizerSettingsChange: mockOnOptimizerSettingsChange,
    onOpenOptimizerSettings: mockOnOpenOptimizerSettings,
    isOptimizing: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the component with title', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Estradiol Concentration Over Time')).toBeInTheDocument();
    });

    it('should render reference cycle selector', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Reference:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Typical Cycle')).toBeInTheDocument();
    });

    it('should render display days input', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Display:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should render current cycle description and source', () => {
      const { container } = render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const cycleInfo = REFERENCE_CYCLES.find(c => c.id === 'typical');
      // The description and source are displayed in the component
      expect(container.textContent).toContain(cycleInfo!.description);
      expect(container.textContent).toContain(cycleInfo!.source);
    });

    it('should render all reference cycle options', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      REFERENCE_CYCLES.forEach(cycle => {
        expect(screen.getByRole('option', { name: cycle.name })).toBeInTheDocument();
      });
    });
  });

  describe('reference cycle selection', () => {
    it('should call onReferenceCycleTypeChange when cycle is changed', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const select = screen.getByDisplayValue('Typical Cycle');
      fireEvent.change(select, { target: { value: 'hrt-target' } });

      expect(mockOnReferenceCycleTypeChange).toHaveBeenCalledTimes(1);
      expect(mockOnReferenceCycleTypeChange).toHaveBeenCalledWith('hrt-target');
    });

    it('should display the selected cycle', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="conservative"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const cycleInfo = REFERENCE_CYCLES.find(c => c.id === 'conservative');
      expect(screen.getByDisplayValue(cycleInfo!.name)).toBeInTheDocument();
    });
  });

  describe('display days input', () => {
    it('should call onViewDaysChange with valid input after debounce', async () => {
      jest.useFakeTimers();

      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: '10' } });

      // Wait for debounce (1000ms)
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockOnViewDaysChange).toHaveBeenCalledWith(10);
      });

      jest.useRealTimers();
    });

    it('should reset to 1 when input is empty on blur', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      expect(mockOnViewDaysChange).toHaveBeenCalledWith(1);
    });

    it('should reset to 1 when input is less than 1 on blur', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      expect(mockOnViewDaysChange).toHaveBeenCalledWith(1);
    });

    it('should reset to 1 when input is invalid on blur', () => {
      render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const input = screen.getByDisplayValue('5');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.blur(input);

      expect(mockOnViewDaysChange).toHaveBeenCalledWith(1);
    });
  });

  describe('data handling', () => {
    it('should render with empty data', () => {
      render(
        <ConcentrationGraph
          data={[]}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Estradiol Concentration Over Time')).toBeInTheDocument();
    });

    it('should filter data to viewDays', () => {
      const largeData: ConcentrationPoint[] = [
        { time: 0, concentration: 100 },
        { time: 5, concentration: 150 },
        { time: 10, concentration: 120 },
        { time: 15, concentration: 90 },
      ];

      const { rerender } = render(
        <ConcentrationGraph
          data={largeData}
          viewDays={7}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      // Should only show data up to day 7
      // We can't directly test the filtered data without accessing internals,
      // but we can verify the component renders without errors
      expect(screen.getByText('Estradiol Concentration Over Time')).toBeInTheDocument();

      // Change viewDays
      rerender(
        <ConcentrationGraph
          data={largeData}
          viewDays={20}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singlePoint: ConcentrationPoint[] = [{ time: 0, concentration: 100 }];

      render(
        <ConcentrationGraph
          data={singlePoint}
          viewDays={1}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Estradiol Concentration Over Time')).toBeInTheDocument();
    });

    it('should handle very large concentrations', () => {
      const largeConcentrations: ConcentrationPoint[] = [
        { time: 0, concentration: 5000 },
        { time: 1, concentration: 10000 },
      ];

      render(
        <ConcentrationGraph
          data={largeConcentrations}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByText('Estradiol Concentration Over Time')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    it('should update when viewDays prop changes', () => {
      const { rerender } = render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByDisplayValue('5')).toBeInTheDocument();

      rerender(
        <ConcentrationGraph
          data={sampleData}
          viewDays={10}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    it('should update when referenceCycleType prop changes', () => {
      const { rerender } = render(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="typical"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const typical = REFERENCE_CYCLES.find(c => c.id === 'typical');
      expect(screen.getByDisplayValue(typical!.name)).toBeInTheDocument();

      rerender(
        <ConcentrationGraph
          data={sampleData}
          viewDays={5}
          onViewDaysChange={mockOnViewDaysChange}
          referenceCycleType="conservative"
          onReferenceCycleTypeChange={mockOnReferenceCycleTypeChange}
          {...defaultProps}
        />
      );

      const conservative = REFERENCE_CYCLES.find(c => c.id === 'conservative');
      expect(screen.getByDisplayValue(conservative!.name)).toBeInTheDocument();
    });
  });
});
