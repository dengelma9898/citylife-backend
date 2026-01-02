import { DirectMessage } from '../entities/direct-message.entity';

export abstract class DirectMessageRepository {
  abstract findById(chatId: string, messageId: string): Promise<DirectMessage | null>;
  abstract findByChatId(chatId: string): Promise<DirectMessage[]>;
  abstract save(message: DirectMessage): Promise<DirectMessage>;
  abstract update(message: DirectMessage): Promise<DirectMessage>;
  abstract delete(chatId: string, messageId: string): Promise<void>;
  abstract deleteAllByChatId(chatId: string): Promise<void>;
}
