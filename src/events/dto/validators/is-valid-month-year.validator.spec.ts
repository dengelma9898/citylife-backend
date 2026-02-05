import { IsValidMonthYearConstraint } from './is-valid-month-year.validator';

describe('IsValidMonthYearConstraint', () => {
  let validator: IsValidMonthYearConstraint;

  beforeEach(() => {
    validator = new IsValidMonthYearConstraint();
  });

  describe('validate', () => {
    it('should return true for undefined (optional field)', () => {
      expect(validator.validate(undefined, {} as any)).toBe(true);
    });

    it('should return true for null (optional field)', () => {
      expect(validator.validate(null, {} as any)).toBe(true);
    });

    it('should return true for valid format MM.YYYY', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`01.${currentYear}`, {} as any)).toBe(true);
      expect(validator.validate(`06.${currentYear + 1}`, {} as any)).toBe(true);
      expect(validator.validate(`11.${currentYear - 1}`, {} as any)).toBe(true);
      expect(validator.validate(`12.${currentYear + 5}`, {} as any)).toBe(true);
    });

    it('should return false for invalid format with dash separator', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`11-${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for invalid format with slash separator', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`11/${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for YYYY-MM format', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`${currentYear}-11`, {} as any)).toBe(false);
    });

    it('should return false for text month', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`November ${currentYear}`, {} as any)).toBe(false);
      expect(validator.validate(`Nov ${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for month < 01', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`00.${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for month > 12', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`13.${currentYear}`, {} as any)).toBe(false);
      expect(validator.validate(`99.${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for year too far in the past', () => {
      const currentYear = new Date().getFullYear();
      const tooOldYear = currentYear - 2;
      expect(validator.validate(`01.${tooOldYear}`, {} as any)).toBe(false);
    });

    it('should return false for year too far in the future', () => {
      const currentYear = new Date().getFullYear();
      const tooFutureYear = currentYear + 11;
      expect(validator.validate(`01.${tooFutureYear}`, {} as any)).toBe(false);
    });

    it('should return true for year within valid range', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`01.${currentYear - 1}`, {} as any)).toBe(true);
      expect(validator.validate(`01.${currentYear}`, {} as any)).toBe(true);
      expect(validator.validate(`01.${currentYear + 5}`, {} as any)).toBe(true);
      expect(validator.validate(`01.${currentYear + 10}`, {} as any)).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(validator.validate(112024, {} as any)).toBe(false);
      expect(validator.validate({ month: 11, year: 2024 }, {} as any)).toBe(false);
      expect(validator.validate(['11', '2024'], {} as any)).toBe(false);
    });

    it('should return false for single digit month', () => {
      const currentYear = new Date().getFullYear();
      expect(validator.validate(`1.${currentYear}`, {} as any)).toBe(false);
    });

    it('should return false for 2 digit year', () => {
      expect(validator.validate('11.26', {} as any)).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return the correct error message', () => {
      const message = validator.defaultMessage({} as any);
      expect(message).toContain('MM.YYYY');
      expect(message).toContain('01-12');
    });
  });
});
