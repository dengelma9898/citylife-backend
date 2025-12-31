import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { UsersService } from '../../../users/users.service';
import { CHAT_MESSAGE_REPOSITORY } from '../../domain/repositories/chat-message.repository';
import { ChatMessageRepository } from '../../domain/repositories/chat-message.repository';
import { UserType } from '../../../users/enums/user-type.enum';

interface ErrorDetails {
  operation: string;
  chatroomId: string;
  [key: string]: any;
}

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly chatMessageRepository: ChatMessageRepository,
  ) {}

  private handleError(error: any, details: ErrorDetails): never {
    const errorDetails = {
      ...details,
      errorMessage: error.message,
      code: error.code,
      path: error.path,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    this.logger.error('Detailed error information:', JSON.stringify(errorDetails, null, 2));

    if (error.code === 'permission-denied') {
      throw new Error(
        `Berechtigungsfehler bei ${details.operation}: ${JSON.stringify(errorDetails)}`,
      );
    }

    throw error;
  }

  async findAll(
    chatroomId: string,
    limit: number = 50,
    currentUserId?: string,
  ): Promise<ChatMessage[]> {
    try {
      this.logger.log(`Getting all messages for chatroom: ${chatroomId}`);
      const messages = await this.chatMessageRepository.findAll(chatroomId, limit);
      const enrichedMessages = await Promise.all(
        messages.map(message => this.enrichWithIsEditable(message, currentUserId)),
      );
      return enrichedMessages;
    } catch (error) {
      this.handleError(error, {
        operation: 'findAll',
        chatroomId,
        limit,
      });
    }
  }

  async findOne(chatroomId: string, id: string, currentUserId?: string): Promise<ChatMessage> {
    try {
      this.logger.log(`Getting message with id: ${id}`);
      const message = await this.chatMessageRepository.findById(chatroomId, id);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, currentUserId);
    } catch (error) {
      this.handleError(error, {
        operation: 'findOne',
        chatroomId,
        messageId: id,
      });
    }
  }

  async create(chatroomId: string, userId: string, data: CreateMessageDto): Promise<ChatMessage> {
    try {
      this.logger.log('Creating new message');
      this.logger.debug(`Creating message in chatroom ${chatroomId}`);

      const userData = await this.usersService.getById(userId);
      if (!userData || 'businessIds' in userData || !userData.name) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      const senderName = userData.name;
      const messageData = ChatMessage.create({
        content: data.content,
        senderId: userId,
        senderName: senderName,
        reactions: [],
      });
      const message = await this.chatMessageRepository.create(chatroomId, messageData);
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error, {
        operation: 'create',
        chatroomId,
        userId,
      });
    }
  }

  async update(
    chatroomId: string,
    id: string,
    data: UpdateMessageDto,
    currentUserId?: string,
  ): Promise<ChatMessage> {
    try {
      this.logger.log(`Updating message with id: ${id}`);

      if (currentUserId) {
        const existingMessage = await this.chatMessageRepository.findById(chatroomId, id);
        if (!existingMessage) {
          throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
        }

        const isSuperAdmin = await this.isSuperAdmin(currentUserId);
        if (existingMessage.senderId !== currentUserId && !isSuperAdmin) {
          throw new BadRequestException('Sie können nur Ihre eigenen Nachrichten bearbeiten');
        }
      }

      const message = await this.chatMessageRepository.update(chatroomId, id, data);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return this.enrichWithIsEditable(message, currentUserId);
    } catch (error) {
      this.handleError(error, {
        operation: 'update',
        chatroomId,
        messageId: id,
      });
    }
  }

  async delete(chatroomId: string, id: string): Promise<void> {
    try {
      this.logger.log(`Deleting message with id: ${id}`);
      await this.chatMessageRepository.delete(chatroomId, id);
    } catch (error) {
      this.handleError(error, {
        operation: 'delete',
        chatroomId,
        messageId: id,
      });
    }
  }

  async remove(chatroomId: string, messageId: string, userId: string): Promise<void> {
    try {
      this.logger.debug(`Deleting message ${messageId} from chatroom ${chatroomId}`);
      const message = await this.findOne(chatroomId, messageId, userId);

      const isSuperAdmin = await this.isSuperAdmin(userId);
      if (message.senderId !== userId && !isSuperAdmin) {
        throw new BadRequestException('Sie können nur Ihre eigenen Nachrichten löschen');
      }

      await this.delete(chatroomId, messageId);
    } catch (error) {
      this.handleError(error, {
        operation: 'remove',
        chatroomId,
        messageId,
        userId,
      });
    }
  }

  async addReaction(
    chatroomId: string,
    id: string,
    userId: string,
    reaction: UpdateMessageReactionDto,
  ): Promise<ChatMessage> {
    try {
      this.logger.log(`Adding reaction to message with id: ${id}`);
      const message = await this.chatMessageRepository.addReaction(
        chatroomId,
        id,
        userId,
        reaction,
      );
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error, {
        operation: 'addReaction',
        chatroomId,
        messageId: id,
        userId,
      });
    }
  }

  async removeReaction(chatroomId: string, id: string, userId: string): Promise<ChatMessage> {
    try {
      this.logger.log(`Removing reaction from message with id: ${id}`);
      const message = await this.chatMessageRepository.removeReaction(chatroomId, id, userId);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error, {
        operation: 'removeReaction',
        chatroomId,
        messageId: id,
        userId,
      });
    }
  }

  async adminUpdate(
    chatroomId: string,
    messageId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<ChatMessage> {
    try {
      this.logger.debug(`Admin updating message ${messageId} in chatroom ${chatroomId}`);

      const message = await this.chatMessageRepository.update(chatroomId, messageId, {
        content: updateMessageDto.content,
        updatedAt: DateTimeUtils.getBerlinTime(),
        editedAt: DateTimeUtils.getBerlinTime(),
        editedByAdmin: true,
      });

      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${messageId} nicht gefunden`);
      }

      return await this.enrichWithIsEditable(message, undefined);
    } catch (error) {
      this.handleError(error, {
        operation: 'adminUpdate',
        chatroomId,
        messageId,
      });
    }
  }

  private async enrichWithIsEditable(
    message: ChatMessage,
    currentUserId?: string,
  ): Promise<ChatMessage> {
    if (currentUserId === undefined) {
      return ChatMessage.fromProps({
        ...message.toJSON(),
        isEditable: false,
      });
    }

    const isOwner = message.senderId === currentUserId;
    const isSuperAdmin = await this.isSuperAdmin(currentUserId);
    const isEditable = isOwner || isSuperAdmin;

    return ChatMessage.fromProps({
      ...message.toJSON(),
      isEditable,
    });
  }

  private async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const userData = await this.usersService.getById(userId);
      if (!userData) {
        return false;
      }
      if ('businessIds' in userData) {
        return false;
      }
      return userData.userType === UserType.SUPER_ADMIN;
    } catch (error) {
      this.logger.error(`Error checking super admin status for user ${userId}: ${error.message}`);
      return false;
    }
  }

  async adminRemove(chatroomId: string, messageId: string): Promise<void> {
    try {
      this.logger.debug(`Admin deleting message ${messageId} from chatroom ${chatroomId}`);
      await this.chatMessageRepository.delete(chatroomId, messageId);
    } catch (error) {
      this.handleError(error, {
        operation: 'adminRemove',
        chatroomId,
        messageId,
      });
    }
  }
}
