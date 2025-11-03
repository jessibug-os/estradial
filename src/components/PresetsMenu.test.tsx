import { render, screen, fireEvent } from '@testing-library/react';
import PresetsMenu from './PresetsMenu';
import { PRESETS } from '../data/presets';

describe('PresetsMenu', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectPreset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <PresetsMenu
        isOpen={false}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render all presets when isOpen is true', () => {
    render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    // Check that all presets are rendered
    PRESETS.forEach(preset => {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
      expect(screen.getByText(preset.description)).toBeInTheDocument();
    });
  });

  it('should call onSelectPreset with correct params when preset is clicked', () => {
    render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    const firstPreset = PRESETS[0]!;
    const presetButton = screen.getByText(firstPreset.name);
    fireEvent.click(presetButton);

    expect(mockOnSelectPreset).toHaveBeenCalledTimes(1);
    expect(mockOnSelectPreset).toHaveBeenCalledWith(
      firstPreset.doses,
      firstPreset.scheduleLength,
      firstPreset.repeat ?? true
    );
  });

  it('should call onClose when preset is selected', () => {
    render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    const firstPreset = PRESETS[0]!;
    const presetButton = screen.getByText(firstPreset.name);
    fireEvent.click(presetButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking the backdrop', () => {
    const { container } = render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    // The backdrop is the first child div
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle presets with repeat=false correctly', () => {
    render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    // Find the frontload preset which has repeat: false
    const frontloadPreset = PRESETS.find(p => p.id === 'frontload')!;
    const presetButton = screen.getByText(frontloadPreset.name);
    fireEvent.click(presetButton);

    expect(mockOnSelectPreset).toHaveBeenCalledWith(
      frontloadPreset.doses,
      frontloadPreset.scheduleLength,
      false // Should pass false, not default to true
    );
  });

  it('should default repeat to true when not specified', () => {
    render(
      <PresetsMenu
        isOpen={true}
        onClose={mockOnClose}
        onSelectPreset={mockOnSelectPreset}
      />
    );

    // Find a preset without explicit repeat value
    const presetWithoutRepeat = PRESETS.find(p => p.repeat === undefined);

    if (presetWithoutRepeat) {
      const presetButton = screen.getByText(presetWithoutRepeat.name);
      fireEvent.click(presetButton);

      expect(mockOnSelectPreset).toHaveBeenCalledWith(
        presetWithoutRepeat.doses,
        presetWithoutRepeat.scheduleLength,
        true // Should default to true
      );
    }
  });
});
