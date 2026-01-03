import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DirectChatSettingsService } from '../services/direct-chat-settings.service';

@Injectable()
export class DirectChatEnabledGuard implements CanActivate {
  constructor(private readonly directChatSettingsService: DirectChatSettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isEnabled = await this.directChatSettingsService.isFeatureEnabled();
    if (!isEnabled) {
      throw new ServiceUnavailableException('Direct chat feature is currently disabled');
    }
    return true;
  }
}
