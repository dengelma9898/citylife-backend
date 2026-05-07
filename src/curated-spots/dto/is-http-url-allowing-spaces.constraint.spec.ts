import { ValidationArguments } from 'class-validator';
import { IsHttpUrlAllowingSpacesInPathConstraint } from './is-http-url-allowing-spaces.constraint';

describe('IsHttpUrlAllowingSpacesInPathConstraint', () => {
  const constraint = new IsHttpUrlAllowingSpacesInPathConstraint();

  it('accepts https URL with spaces in path', () => {
    expect(
      constraint.validate(
        'https://storage.googleapis.com/bucket/path/Video 2025 file.mp4',
        {} as ValidationArguments,
      ),
    ).toBe(true);
  });

  it('rejects invalid string', () => {
    expect(constraint.validate('not a url', {} as ValidationArguments)).toBe(false);
  });

  it('allows null', () => {
    expect(constraint.validate(null, {} as ValidationArguments)).toBe(true);
  });
});
