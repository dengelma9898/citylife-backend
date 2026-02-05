import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidMonthYear', async: false })
export class IsValidMonthYearConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (value === undefined || value === null) {
      return true; // Optional field - validation passes if not provided
    }
    if (typeof value !== 'string') {
      return false;
    }
    // Check format MM.YYYY
    const regex = /^\d{2}\.\d{4}$/;
    if (!regex.test(value)) {
      return false;
    }
    // Extract month and year
    const [monthStr, yearStr] = value.split('.');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    // Validate month is between 01-12
    if (month < 1 || month > 12) {
      return false;
    }
    // Validate year is reasonable (current year -1 to current year +10)
    const currentYear = new Date().getFullYear();
    if (year < currentYear - 1 || year > currentYear + 10) {
      return false;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'monthYear muss im Format MM.YYYY sein (z.B. "11.2024") mit gültigem Monat (01-12) und Jahr';
  }
}

export function IsValidMonthYear(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMonthYearConstraint,
    });
  };
}
