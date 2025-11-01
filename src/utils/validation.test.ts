import { parsePositiveInteger, parsePositiveFloat, clamp } from './validation';

describe('parsePositiveInteger', () => {
  describe('basic functionality', () => {
    it('should parse valid positive integers', () => {
      expect(parsePositiveInteger('1')).toBe(1);
      expect(parsePositiveInteger('42')).toBe(42);
      expect(parsePositiveInteger('100')).toBe(100);
    });

    it('should return null for invalid inputs', () => {
      expect(parsePositiveInteger('abc')).toBeNull();
      expect(parsePositiveInteger('')).toBeNull();
      expect(parsePositiveInteger('12.5')).toBe(12); // parseInt truncates
    });

    it('should return null for negative numbers', () => {
      expect(parsePositiveInteger('-5')).toBeNull();
      expect(parsePositiveInteger('-1')).toBeNull();
    });

    it('should return null for zero with default min', () => {
      expect(parsePositiveInteger('0')).toBeNull();
    });
  });

  describe('with custom min', () => {
    it('should respect custom minimum value', () => {
      expect(parsePositiveInteger('5', 10)).toBeNull();
      expect(parsePositiveInteger('10', 10)).toBe(10);
      expect(parsePositiveInteger('15', 10)).toBe(15);
    });

    it('should allow zero when min is 0', () => {
      expect(parsePositiveInteger('0', 0)).toBe(0);
      expect(parsePositiveInteger('5', 0)).toBe(5);
    });
  });

  describe('with custom max', () => {
    it('should respect custom maximum value', () => {
      expect(parsePositiveInteger('100', 1, 50)).toBeNull();
      expect(parsePositiveInteger('50', 1, 50)).toBe(50);
      expect(parsePositiveInteger('25', 1, 50)).toBe(25);
    });
  });

  describe('with both min and max', () => {
    it('should validate within range', () => {
      expect(parsePositiveInteger('5', 10, 20)).toBeNull();
      expect(parsePositiveInteger('10', 10, 20)).toBe(10);
      expect(parsePositiveInteger('15', 10, 20)).toBe(15);
      expect(parsePositiveInteger('20', 10, 20)).toBe(20);
      expect(parsePositiveInteger('25', 10, 20)).toBeNull();
    });
  });
});

describe('parsePositiveFloat', () => {
  describe('basic functionality', () => {
    it('should parse valid positive floats', () => {
      expect(parsePositiveFloat('1.5')).toBe(1.5);
      expect(parsePositiveFloat('42.75')).toBe(42.75);
      expect(parsePositiveFloat('0.001')).toBe(0.001);
    });

    it('should parse integers as floats', () => {
      expect(parsePositiveFloat('1')).toBe(1);
      expect(parsePositiveFloat('100')).toBe(100);
    });

    it('should return null for invalid inputs', () => {
      expect(parsePositiveFloat('abc')).toBeNull();
      expect(parsePositiveFloat('')).toBeNull();
    });

    it('should return null for negative numbers', () => {
      expect(parsePositiveFloat('-5.5')).toBeNull();
      expect(parsePositiveFloat('-1')).toBeNull();
    });
  });

  describe('with custom min', () => {
    it('should respect custom minimum value', () => {
      expect(parsePositiveFloat('5.0', 10)).toBeNull();
      expect(parsePositiveFloat('9.99', 10)).toBeNull();
      expect(parsePositiveFloat('10.0', 10)).toBe(10.0);
      expect(parsePositiveFloat('15.5', 10)).toBe(15.5);
    });

    it('should allow exact minimum value', () => {
      // This tests the bug fix: changing <= to <
      expect(parsePositiveFloat('0', 0)).toBe(0);
      expect(parsePositiveFloat('5.5', 5.5)).toBe(5.5);
    });

    it('should reject values below minimum', () => {
      expect(parsePositiveFloat('4.99', 5)).toBeNull();
      expect(parsePositiveFloat('0', 0.1)).toBeNull();
    });
  });

  describe('with custom max', () => {
    it('should respect custom maximum value', () => {
      expect(parsePositiveFloat('100.0', 0, 50)).toBeNull();
      expect(parsePositiveFloat('50.1', 0, 50)).toBeNull();
      expect(parsePositiveFloat('50.0', 0, 50)).toBe(50.0);
      expect(parsePositiveFloat('25.5', 0, 50)).toBe(25.5);
    });
  });

  describe('with both min and max', () => {
    it('should validate within range', () => {
      expect(parsePositiveFloat('5.0', 10, 20)).toBeNull();
      expect(parsePositiveFloat('9.99', 10, 20)).toBeNull();
      expect(parsePositiveFloat('10.0', 10, 20)).toBe(10.0);
      expect(parsePositiveFloat('15.5', 10, 20)).toBe(15.5);
      expect(parsePositiveFloat('20.0', 10, 20)).toBe(20.0);
      expect(parsePositiveFloat('20.01', 10, 20)).toBeNull();
      expect(parsePositiveFloat('25.0', 10, 20)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very small numbers', () => {
      expect(parsePositiveFloat('0.0001', 0)).toBe(0.0001);
      expect(parsePositiveFloat('1e-10', 0)).toBe(1e-10);
    });

    it('should handle scientific notation', () => {
      expect(parsePositiveFloat('1e5', 0)).toBe(100000);
      expect(parsePositiveFloat('1.5e2', 0)).toBe(150);
    });

    it('should handle leading/trailing whitespace', () => {
      expect(parsePositiveFloat(' 5.5 ')).toBe(5.5);
      expect(parsePositiveFloat('  10  ')).toBe(10);
    });
  });
});

describe('clamp', () => {
  it('should clamp values to minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(-100, -50, 50)).toBe(-50);
  });

  it('should clamp values to maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(100, -50, 50)).toBe(50);
  });

  it('should not modify values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(-25, -50, 50)).toBe(-25);
  });

  it('should handle floating point values', () => {
    expect(clamp(5.7, 0, 10)).toBe(5.7);
    expect(clamp(-0.5, 0, 10)).toBe(0);
    expect(clamp(10.1, 0, 10)).toBe(10);
  });

  it('should handle equal min and max', () => {
    expect(clamp(5, 10, 10)).toBe(10);
    expect(clamp(15, 10, 10)).toBe(10);
    expect(clamp(10, 10, 10)).toBe(10);
  });
});
