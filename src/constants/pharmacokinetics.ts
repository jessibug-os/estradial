/**
 * Pharmacokinetic model constants
 */
export const PHARMACOKINETICS = {
  /** Maximum days an ester continues to affect concentration after injection */
  ESTER_EFFECT_DURATION_DAYS: 100,
  
  /** Time step for generating concentration data points */
  TIME_POINT_STEP: 0.5,
  
  /** Number of cycles to prepend for steady-state calculations */
  STEADY_STATE_CYCLES: 3,
  
  /** Starting cycle offset for steady state (negative to prepend cycles) */
  STEADY_STATE_START_CYCLE: -3,
} as const;

/**
 * Default values for dose and schedule configuration
 */
export const DEFAULTS = {
  DEFAULT_DOSE_MG: 6,
  DEFAULT_SCHEDULE_LENGTH: 29,
  DEFAULT_GRAPH_DAYS: 90,
  DEFAULT_REPEAT: true,
  DEFAULT_CYCLE_TYPE: 'typical' as const,
} as const;

