import { DirectChat } from '../entities/direct-chat.entity';

export abstract class DirectChatRepository {
  abstract findById(id: string): Promise<DirectChat | null>;
  abstract findByUserId(userId: string): Promise<DirectChat[]>;
  abstract findPendingByInvitedUserId(userId: string): Promise<DirectChat[]>;
  abstract findExistingChat(userId1: string, userId2: string): Promise<DirectChat | null>;
  abstract save(chat: DirectChat): Promise<DirectChat>;
  abstract update(chat: DirectChat): Promise<DirectChat>;
  abstract delete(id: string): Promise<void>;
}
