import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EasterEggHuntService } from '../services/easter-egg-hunt.service';

@Injectable()
export class EasterEggHuntEnabledGuard implements CanActivate {
  constructor(private readonly easterEggHuntService: EasterEggHuntService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = await this.easterEggHuntService.isFeatureActive();
    if (!isEnabled) {
      throw new ServiceUnavailableException('Easter egg hunt feature is currently disabled');
    }
    return true;
  }
}
