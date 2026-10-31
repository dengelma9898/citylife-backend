import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Requires at least one of `suitableForToddlers` / `suitableForSchoolKids` to be true. */
@ValidatorConstraint({ name: 'atLeastOneAgeGroup', async: false })
export class AtLeastOneAgeGroupConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const profile = args.object as {
      suitableForToddlers?: unknown;
      suitableForSchoolKids?: unknown;
    };
    return profile.suitableForToddlers === true || profile.suitableForSchoolKids === true;
  }

  defaultMessage(): string {
    return 'At least one of suitableForToddlers or suitableForSchoolKids must be true';
  }
}
