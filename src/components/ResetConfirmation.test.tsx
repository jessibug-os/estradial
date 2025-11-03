import { render, screen, fireEvent } from '@testing-library/react';
import ResetConfirmation from './ResetConfirmation';

describe('ResetConfirmation', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ResetConfirmation
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={5}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={5}
      />
    );

    expect(screen.getByText('Clear all injections?')).toBeInTheDocument();
    expect(screen.getByText(/This will remove all 5 injections/)).toBeInTheDocument();
  });

  it('should display singular "injection" for doseCount=1', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={1}
      />
    );

    expect(screen.getByText(/This will remove all 1 injection\./)).toBeInTheDocument();
  });

  it('should display plural "injections" for doseCount>1', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={3}
      />
    );

    expect(screen.getByText(/This will remove all 3 injections\./)).toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={5}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should call onConfirm and onClose when Clear All button is clicked', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={5}
      />
    );

    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking the backdrop', () => {
    const { container } = render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={5}
      />
    );

    // The backdrop is the first child div
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should display 0 injections correctly', () => {
    render(
      <ResetConfirmation
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        doseCount={0}
      />
    );

    expect(screen.getByText(/This will remove all 0 injections\./)).toBeInTheDocument();
  });
});
