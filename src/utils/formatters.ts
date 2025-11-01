/**
 * Format a number to a specific decimal precision without trailing zeros.
 * 
 * @example
 * formatNumber(6.00) // "6"
 * formatNumber(6.50) // "6.5"
 * formatNumber(6.57) // "6.57"
 */
export const formatNumber: (num: number, decimals?: number) => string = (num, decimals = 2) => {
  return parseFloat(num.toFixed(decimals)).toString();
};

