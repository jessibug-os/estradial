import { render, screen, fireEvent } from '@testing-library/react';
import DoseEditor from './DoseEditor';
import { ESTRADIOL_ESTERS } from '../data/estradiolEsters';

describe('DoseEditor', () => {
  const mockOnUpdateDoseMedication = jest.fn();
  const mockOnUpdateDoseAmount = jest.fn();
  const mockOnRemoveDose = jest.fn();
  const mockOnClose = jest.fn();

  const testDose = {
    day: 5,
    dose: 6,
    medication: ESTRADIOL_ESTERS[1]! // Estradiol valerate
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no dose is selected', () => {
    it('should not render anything when no dose is selected', () => {
      const { container } = render(
        <DoseEditor
          selectedDoseData={null}
          selectedDoseIndex={null}
          dosesOnSameDay={0}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      // Should render an empty div when no dose is selected
      expect(container.querySelector('h4')).not.toBeInTheDocument();
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
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
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
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const select = screen.getByDisplayValue(testDose.medication.name);
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
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const select = screen.getByDisplayValue(testDose.medication.name);
      fireEvent.change(select, { target: { value: 'Estradiol cypionate' } });

      expect(mockOnUpdateDoseMedication).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateDoseMedication).toHaveBeenCalledWith(0, 'Estradiol cypionate');
    });

    it('should render dose input with correct value', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
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
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByDisplayValue('6');
      fireEvent.change(input, { target: { value: '8' } });

      expect(mockOnUpdateDoseAmount).toHaveBeenCalledTimes(1);
      expect(mockOnUpdateDoseAmount).toHaveBeenCalledWith(0, 8);
    });

    it('should handle invalid dose input (empty string becomes 0)', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const input = screen.getByDisplayValue('6');
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnUpdateDoseAmount).toHaveBeenCalledWith(0, 0);
    });


    it('should call onClose when Done button is clicked', () => {
      render(
        <DoseEditor
          selectedDoseData={testDose}
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
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
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      expect(mockOnRemoveDose).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveDose).toHaveBeenCalledWith(0);
    });

    it('should display dose amount with proper formatting', () => {
      const doseWithDecimal = {
        day: 3,
        dose: 4.5,
        medication: ESTRADIOL_ESTERS[1]!
      };

      render(
        <DoseEditor
          selectedDoseData={doseWithDecimal}
          selectedDoseIndex={0}
          dosesOnSameDay={1}
          onUpdateDoseMedication={mockOnUpdateDoseMedication}
          onUpdateDoseAmount={mockOnUpdateDoseAmount}
          onRemoveDose={mockOnRemoveDose}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByDisplayValue('4.5')).toBeInTheDocument();
    });
  });
});
