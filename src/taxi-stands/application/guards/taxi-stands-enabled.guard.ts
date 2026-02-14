import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TaxiStandsFeatureService } from '../services/taxi-stands-feature.service';

@Injectable()
export class TaxiStandsEnabledGuard implements CanActivate {
  constructor(private readonly taxiStandsFeatureService: TaxiStandsFeatureService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = await this.taxiStandsFeatureService.isFeatureActive();
    if (!isEnabled) {
      throw new ServiceUnavailableException('Taxi stands feature is currently disabled');
    }
    return true;
  }
}
