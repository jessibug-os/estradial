import { render, screen, fireEvent } from '@testing-library/react';
import DoseEditor from './DoseEditor';
import { ESTRADIOL_ESTERS } from '../data/estradiolEsters';

describe('DoseEditor', () => {
  const mockOnUpdateDoseEster = jest.fn();
  const mockOnUpdateDoseAmount = jest.fn();
  const mockOnRemoveDose = jest.fn();
  const mockOnClose = jest.fn();

  const testDose = {
    day: 5,
    dose: 6,
    ester: ESTRADIOL_ESTERS[1]! // Estradiol valerate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no dose is selected', () => {
    it('should render instructions', () => {
      render(
        <DoseEditor
          selectedDoseData={null}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Click on any day in the calendar/)).toBeInTheDocument();
      expect(screen.getByText(/Each injection can use a different estradiol ester/)).toBeInTheDocument();
    });

    it('should not render editing UI when no dose is selected', () => {
      render(
        <DoseEditor
          selectedDoseData={null}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText(/Edit Injection/)).not.toBeInTheDocument();
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
      expect(screen.queryByText('Remove')).not.toBeInTheDocument();
    });
  });

  describe('when a dose is selected', () => {
    it('should render editing UI with correct day number', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Edit Injection - Day 5')).toBeInTheDocument();
    });

    it('should render ester dropdown with all esters', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const select = screen.getByDisplayValue(testDose.ester.name);
      expect(select).toBeInTheDocument();

      // Check that all esters are available as options
      ESTRADIOL_ESTERS.forEach(ester => {
        expect(screen.getByRole('option', { name: ester.name })).toBeInTheDocument();
      });
    });

    it('should call onUpdateDoseEster when ester is changed', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const select = screen.getByDisplayValue(testDose.ester.name);
      fireEvent.change(select, { target: { value: 'Estradiol cypionate' } });

      expect(mockOnUpdateDoseEster).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateDoseEster).toHaveBeenCalledWith(5, 'Estradiol cypionate');
    });

    it('should render dose input with correct value', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByDisplayValue('6');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should call onUpdateDoseAmount when dose is changed', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByDisplayValue('6');
      fireEvent.change(input, { target: { value: '8' } });

      expect(mockOnUpdateDoseAmount).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateDoseAmount).toHaveBeenCalledWith(5, 8);
    });

    it('should handle invalid dose input (empty string becomes 0)', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByDisplayValue('6');
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnUpdateDoseAmount).toHaveBeenCalledWith(5, 0);
    });

    it('should display pharmacokinetic parameters', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Pharmacokinetic Parameters:')).toBeInTheDocument();
      expect(screen.getByText('D:')).toBeInTheDocument();
      expect(screen.getByText('k1:')).toBeInTheDocument();
      expect(screen.getByText('k2:')).toBeInTheDocument();
      expect(screen.getByText('k3:')).toBeInTheDocument();
    });

    it('should call onClose when Done button is clicked', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const doneButton = screen.getByText('Done');
      fireEvent.click(doneButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onRemoveDose when Remove button is clicked', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      expect(mockOnRemoveDose).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveDose).toHaveBeenCalledWith(5);
    });

    it('should display dose amount with proper formatting', () => {
      const doseWithDecimal = {
        day: 3,
        dose: 4.5,
        ester: ESTRADIOL_ESTERS[1]!
      };

      render(
        <DoseEditor
          selectedDoseData={doseWithDecimal}
          onUpdateDoseEster={mockOnUpdateDoseEster}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByDisplayValue('4.5')).toBeInTheDocument();
    });
  });
});
