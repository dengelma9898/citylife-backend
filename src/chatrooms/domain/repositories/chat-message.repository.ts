import { UpdateChatMessageReactionDto } from 'src/chatrooms/application/dtos/update-message-reaction.dto';
import { ChatMessage } from '../entities/chat-message.entity';

export const CHAT_MESSAGE_REPOSITORY = 'CHAT_MESSAGE_REPOSITORY';

export interface ChatMessageRepository {
  findAll(chatroomId: string, limit?: number): Promise<ChatMessage[]>;
  findById(chatroomId: string, id: string): Promise<ChatMessage | null>;
  create(
    chatroomId: string,
    data: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ChatMessage>;
  update(
    chatroomId: string,
    id: string,
    data: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>,
  ): Promise<ChatMessage | null>;
  delete(chatroomId: string, id: string): Promise<void>;
  findByChatroom(chatroomId: string): Promise<ChatMessage[]>;
  addReaction(
    chatroomId: string,
    id: string,
    userId: string,
    reaction: UpdateChatMessageReactionDto,
  ): Promise<ChatMessage | null>;
  removeReaction(chatroomId: string, id: string, userId: string): Promise<ChatMessage | null>;
}
