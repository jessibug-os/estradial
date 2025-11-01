/**
 * Validate and parse a positive integer string
 */
export const parsePositiveInteger: (value: string, min?: number, max?: number) => number | null = (
  value,
  min = 1,
  max
) => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    return null;
  }
  return num;
};

/**
 * Validate and parse a positive float string
 */
export const parsePositiveFloat: (value: string, min?: number, max?: number) => number | null = (
  value,
  min = 0,
  max
) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || (max !== undefined && num > max)) {
    return null;
  }
  return num;
};

/**
 * Clamp a number between min and max
 */
export const clamp: (value: number, min: number, max: number) => number = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

