import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import validator from 'validator';
import { normalizeHttpUrlSpaces } from './normalize-http-url-spaces';

@ValidatorConstraint({ name: 'isHttpUrlAllowingSpacesInPath', async: false })
export class IsHttpUrlAllowingSpacesInPathConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return false;
    }
    const normalized = normalizeHttpUrlSpaces(trimmed);
    if (normalized.length > 2500) {
      return false;
    }
    return validator.isURL(normalized, {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
    });
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a URL address`;
  }
}
