import { BadRequestException, PipeTransform } from '@nestjs/common';
import { FeatureFlag } from '../domain/enums/feature-flag.enum';

/** Validates the `:flag` route parameter against the known feature flags. */
export class ParseFeatureFlagPipe implements PipeTransform<string, FeatureFlag> {
  transform(value: string): FeatureFlag {
    const flag = Object.values(FeatureFlag).find(candidate => candidate === value);
    if (flag === undefined) {
      throw new BadRequestException(
        `Unknown feature flag "${value}". Known flags: ${Object.values(FeatureFlag).join(', ')}`,
      );
    }
    return flag;
  }
}
