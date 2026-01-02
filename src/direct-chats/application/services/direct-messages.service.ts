import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DirectMessageRepository } from '../../domain/repositories/direct-message.repository';
import { DirectMessage, DirectMessageProps, Reaction } from '../../domain/entities/direct-message.entity';
import { DirectChatsService } from './direct-chats.service';
import { CreateDirectMessageDto } from '../dtos/create-direct-message.dto';
import { UpdateDirectMessageDto } from '../dtos/update-direct-message.dto';
import { UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';

@Injectable()
export class DirectMessagesService {
  private readonly logger = new Logger(DirectMessagesService.name);

  constructor(
    private readonly directMessageRepository: DirectMessageRepository,
    private readonly directChatsService: DirectChatsService,
  ) {}

  async createMessage(
    userId: string,
    userName: string,
    chatId: string,
    dto: CreateDirectMessageDto,
  ): Promise<DirectMessage> {
    this.logger.debug(`User ${userId} creating message in chat ${chatId}`);
    const chat = await this.directChatsService.validateChatAccess(userId, chatId);
    if (chat.status !== 'active') {
      throw new BadRequestException('Cannot send messages in a pending chat');
    }
    const message = DirectMessage.create({
      chatId,
      senderId: userId,
      senderName: userName,
      content: dto.content,
      imageUrl: dto.imageUrl,
    });
    await this.directMessageRepository.save(message);
    await this.directChatsService.updateLastMessage(chatId, dto.content, userId);
    return message;
  }

  async getMessages(userId: string, chatId: string): Promise<DirectMessageProps[]> {
    this.logger.debug(`Getting messages for chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const messages = await this.directMessageRepository.findByChatId(chatId);
    return messages.map(message => ({
      ...message.toJSON(),
      isEditable: message.senderId === userId,
    }));
  }

  async updateMessage(
    userId: string,
    chatId: string,
    messageId: string,
    dto: UpdateDirectMessageDto,
  ): Promise<DirectMessage> {
    this.logger.debug(`User ${userId} updating message ${messageId} in chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const message = await this.directMessageRepository.findById(chatId, messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (!message.isOwnedBy(userId)) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    const updatedMessage = message.update({
      content: dto.content,
      imageUrl: dto.imageUrl,
    });
    await this.directMessageRepository.update(updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(userId: string, chatId: string, messageId: string): Promise<void> {
    this.logger.debug(`User ${userId} deleting message ${messageId} in chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const message = await this.directMessageRepository.findById(chatId, messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (!message.isOwnedBy(userId)) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    await this.directMessageRepository.delete(chatId, messageId);
  }

  async updateReaction(
    userId: string,
    chatId: string,
    messageId: string,
    dto: UpdateMessageReactionDto,
  ): Promise<DirectMessage> {
    this.logger.debug(`User ${userId} updating reaction on message ${messageId} in chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const message = await this.directMessageRepository.findById(chatId, messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    const reactions = message.reactions || [];
    const existingReactionIndex = reactions.findIndex(
      r => r.userId === userId && r.type === dto.type,
    );
    let updatedReactions: Reaction[];
    if (existingReactionIndex >= 0) {
      updatedReactions = reactions.filter((_, index) => index !== existingReactionIndex);
    } else {
      const userReactionIndex = reactions.findIndex(r => r.userId === userId);
      if (userReactionIndex >= 0) {
        updatedReactions = reactions.map((r, index) =>
          index === userReactionIndex ? { userId, type: dto.type } : r,
        );
      } else {
        updatedReactions = [...reactions, { userId, type: dto.type }];
      }
    }
    const updatedMessage = message.update({ reactions: updatedReactions });
    await this.directMessageRepository.update(updatedMessage);
    return updatedMessage;
  }
}


