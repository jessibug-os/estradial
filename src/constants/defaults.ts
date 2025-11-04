/**
 * Default values for estradiol ester concentrations (mg/mL)
 *
 * These are common pharmaceutical concentrations for injectable estradiol esters.
 * Users can override these in the settings modal.
 */
export const DEFAULT_ESTER_CONCENTRATIONS: Record<string, number> = {
  'Estradiol benzoate': 40,
  'Estradiol valerate': 40,
  'Estradiol cypionate': 40,
  'Estradiol cypionate suspension': 5,
  'Estradiol enanthate': 40,
  'Estradiol undecylate': 80,
  'Polyestradiol phosphate': 40,
} as const;

/**
 * Default settings for the schedule optimizer
 */
export const OPTIMIZER_DEFAULTS = {
  /** Maximum dose per injection in mg */
  MAX_DOSE_PER_INJECTION: 10,

  /** Minimum dose per injection in mg */
  MIN_DOSE_PER_INJECTION: 0.1,

  /** Default volume granularity in mL (minimum increment for dose adjustments) */
  DEFAULT_GRANULARITY_ML: 0.01,

  /** Default maximum number of injections per cycle */
  DEFAULT_MAX_INJECTIONS: 7,

  /** Default starting volume for optimization in mL */
  DEFAULT_STARTING_VOLUME_ML: 0.15,
} as const;

/**
 * UI-related z-index layers for proper stacking
 */
export const Z_INDEX = {
  /** Settings gear icon */
  SETTINGS_BUTTON: 100,

  /** Modal backdrop overlay */
  MODAL_BACKDROP: 999,

  /** Modal content (above backdrop) */
  MODAL_CONTENT: 1000,

  /** Nested modal or popover (above other modals) */
  MODAL_ELEVATED: 1001,
} as const;
