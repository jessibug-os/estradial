import { useState, useEffect, useRef } from 'react';

/**
 * Hook for debouncing input values with a controlled input pattern.
 * Manages local input state, syncs with prop changes, and debounces onChange callbacks.
 *
 * @param initialValue - The initial value for the input
 * @param onChange - Callback function called with the debounced value
 * @param delay - Debounce delay in milliseconds (default: 1000)
 * @returns Tuple of [inputValue, setInputValue]
 */
export const useDebouncedInput = <T,>(
  initialValue: T,
  onChange: (value: T) => void,
  delay: number = 1000
): [T, (value: T) => void] => {
  const [inputValue, setInputValue] = useState<T>(initialValue);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue !== initialValue) {
        onChangeRef.current(inputValue);
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [inputValue, delay, initialValue]);

  return [inputValue, setInputValue];
};

