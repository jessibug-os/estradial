import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VisualTimeline from './VisualTimeline';
import { Dose, ESTRADIOL_ESTERS } from '../data/estradiolEsters';

describe('VisualTimeline', () => {
  const mockOnDosesChange = jest.fn();
  const mockOnViewDaysChange = jest.fn();
  const mockOnRepeatScheduleChange = jest.fn();
  const mockOnSteadyStateChange = jest.fn();
  const mockOnOptimizeModeChange = jest.fn();
  const mockEsterConcentrations = {
    'Estradiol cypionate': 40,
    'Estradiol valerate': 40,
    'Estradiol enanthate': 40,
    'Estradiol undecylate': 40
  };

  const defaultProps = {
    doses: [] as Dose[],
    onDosesChange: mockOnDosesChange,
    viewDays: 28,
    onViewDaysChange: mockOnViewDaysChange,
    repeatSchedule: false,
    onRepeatScheduleChange: mockOnRepeatScheduleChange,
    steadyState: false,
    onSteadyStateChange: mockOnSteadyStateChange,
    esterConcentrations: mockEsterConcentrations,
    onOptimizeModeChange: mockOnOptimizeModeChange
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Timeline rendering', () => {
    it('renders empty timeline with correct number of days', () => {
      render(<VisualTimeline {...defaultProps} />);
      
      // Should show "0 injections"
      expect(screen.getByText(/0 injection/i)).toBeInTheDocument();
    });

    it('displays injection count correctly', () => {
      const EV = ESTRADIOL_ESTERS[1]!; // Estradiol valerate
      const doses: Dose[] = [
        { day: 0, dose: 5, medication: EV },
        { day: 7, dose: 5, medication: EV }
      ];
      
      render(<VisualTimeline {...defaultProps} doses={doses} />);
      
      expect(screen.getByText(/2 injections/i)).toBeInTheDocument();
    });

    it('shows singular "injection" for single dose', () => {
      const doses: Dose[] = [
        { day: 0, dose: 5, medication: ESTRADIOL_ESTERS[1]! }
      ];

      render(<VisualTimeline {...defaultProps} doses={doses} />);

      expect(screen.getByText('1 injection')).toBeInTheDocument();
    });
  });

  describe('Schedule controls', () => {
    it('renders schedule length input with correct value', () => {
      render(<VisualTimeline {...defaultProps} viewDays={28} />);

      // Find schedule input by looking for input near "Schedule:" text
      const scheduleText = screen.getByText(/schedule:/i);
      const input = scheduleText.parentElement?.querySelector('input[type="number"]') as HTMLInputElement;
      expect(input).toHaveValue(28);
    });

    it('calls onViewDaysChange when schedule input changes', async () => {
      render(<VisualTimeline {...defaultProps} />);

      const scheduleText = screen.getByText(/schedule:/i);
      const input = scheduleText.parentElement?.querySelector('input[type="number"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '14' } });

      // Wait for debounce
      await waitFor(() => {
        expect(mockOnViewDaysChange).toHaveBeenCalledWith(14);
      }, { timeout: 2000 });
    });

    it('resets invalid schedule input to 1 on blur', () => {
      render(<VisualTimeline {...defaultProps} />);

      const scheduleText = screen.getByText(/schedule:/i);
      const input = scheduleText.parentElement?.querySelector('input[type="number"]') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '0' } });
      fireEvent.blur(input);

      expect(mockOnViewDaysChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Repeat and Steady State toggles', () => {
    it('renders repeat checkbox', () => {
      render(<VisualTimeline {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /repeat/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('calls onRepeatScheduleChange when repeat is toggled', () => {
      render(<VisualTimeline {...defaultProps} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /repeat/i });
      fireEvent.click(checkbox);
      
      expect(mockOnRepeatScheduleChange).toHaveBeenCalledWith(true);
    });

    it('renders steady state checkbox as disabled when repeat is off', () => {
      render(<VisualTimeline {...defaultProps} repeatSchedule={false} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /steady state/i });
      expect(checkbox).toBeDisabled();
    });

    it('enables steady state checkbox when repeat is on', () => {
      render(<VisualTimeline {...defaultProps} repeatSchedule={true} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /steady state/i });
      expect(checkbox).not.toBeDisabled();
    });

    it('calls onSteadyStateChange when steady state is toggled', () => {
      render(<VisualTimeline {...defaultProps} repeatSchedule={true} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /steady state/i });
      fireEvent.click(checkbox);
      
      expect(mockOnSteadyStateChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Action buttons', () => {
    it('renders Optimize button', () => {
      render(<VisualTimeline {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /optimize/i })).toBeInTheDocument();
    });

    it('renders Preset button', () => {
      render(<VisualTimeline {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /preset/i })).toBeInTheDocument();
    });

    it('shows Reset button only when doses exist', () => {
      const { rerender } = render(<VisualTimeline {...defaultProps} doses={[]} />);

      const buttons = screen.queryAllByRole('button');
      const resetButtons = buttons.filter(btn => btn.textContent === 'Reset');
      expect(resetButtons).toHaveLength(0);

      const doses: Dose[] = [
        { day: 0, dose: 5, medication: ESTRADIOL_ESTERS[1]! }
      ];
      rerender(<VisualTimeline {...defaultProps} doses={doses} />);

      const buttonsAfter = screen.queryAllByRole('button');
      const resetButtonsAfter = buttonsAfter.filter(btn => btn.textContent === 'Reset');
      expect(resetButtonsAfter).toHaveLength(1);
    });
  });

  describe('Dosage display', () => {
    it('shows total mg for non-repeated schedules', () => {
      const doses: Dose[] = [
        { day: 0, dose: 5, medication: ESTRADIOL_ESTERS[1]! },
        { day: 7, dose: 3, medication: ESTRADIOL_ESTERS[1]! }
      ];
      
      render(<VisualTimeline {...defaultProps} doses={doses} repeatSchedule={false} />);
      
      expect(screen.getByText(/8mg total/i)).toBeInTheDocument();
    });

    it('shows average weekly dose for repeated schedules', () => {
      const doses: Dose[] = [
        { day: 0, dose: 5, medication: ESTRADIOL_ESTERS[1]! },
        { day: 14, dose: 5, medication: ESTRADIOL_ESTERS[1]! }
      ];
      
      render(<VisualTimeline {...defaultProps} doses={doses} viewDays={28} repeatSchedule={true} />);
      
      // 10mg total / 28 days * 7 = 2.5mg/week
      expect(screen.getByText(/2.5mg avg\/week/i)).toBeInTheDocument();
    });
  });

  describe('DoseEditor integration', () => {
    it('renders schedule controls', () => {
      render(<VisualTimeline {...defaultProps} />);

      // Should render schedule controls when no dose is selected
      expect(screen.getByText(/Schedule:/i)).toBeInTheDocument();
    });
  });

  describe('Auto-removal of out-of-range doses', () => {
    it('removes doses beyond schedule length when length is reduced', () => {
      const doses: Dose[] = [
        { day: 0, dose: 5, medication: ESTRADIOL_ESTERS[1]! },
        { day: 20, dose: 5, medication: ESTRADIOL_ESTERS[1]! }
      ];
      
      const { rerender } = render(<VisualTimeline {...defaultProps} doses={doses} viewDays={28} />);
      
      // Reduce schedule length to 14 days
      rerender(<VisualTimeline {...defaultProps} doses={doses} viewDays={14} />);
      
      // Should call onDosesChange to remove day 20
      expect(mockOnDosesChange).toHaveBeenCalledWith([doses[0]]);
    });
  });
});
