import { DirectChatSettings } from '../entities/direct-chat-settings.entity';

export abstract class DirectChatSettingsRepository {
  abstract get(): Promise<DirectChatSettings>;
  abstract save(settings: DirectChatSettings): Promise<DirectChatSettings>;
}
