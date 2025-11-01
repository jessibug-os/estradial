/**
 * Ester-specific colors (lavender/purple theme)
 */
export const ESTER_COLORS: Record<string, string> = {
  'Estradiol benzoate': '#e6d5f5',          // Light lavender
  'Estradiol valerate': '#b794f6',          // Medium lavender
  'Estradiol cypionate': '#9b72cf',         // Purple lavender
  'Estradiol cypionate suspension': '#8b5fbf', // Deep lavender
  'Estradiol enanthate': '#a78bce',         // Soft purple
  'Estradiol undecylate': '#c9b1e4',        // Pale purple
  'Polyestradiol phosphate': '#7952b3',    // Rich purple
} as const;

/**
 * Default ester color (fallback)
 */
export const DEFAULT_ESTER_COLOR = '#b794f6';

/**
 * Get color for an ester by name
 */
export const getEsterColor: (esterName: string) => string = (esterName) => {
  return ESTER_COLORS[esterName] || DEFAULT_ESTER_COLOR;
};

