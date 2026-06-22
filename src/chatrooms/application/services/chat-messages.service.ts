import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { removeUndefined } from '../../../firebase/firebase-mapper.util';
import { ChatMessage, ChatMessageProps } from '../../domain/entities/chat-message.entity';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import { UpdateChatMessageReactionDto } from '../dtos/update-message-reaction.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { UsersService } from '../../../users/users.service';
import { UserType } from '../../../users/enums/user-type.enum';

interface ErrorDetails {
  operation: string;
  chatroomId: string;
  [key: string]: unknown;
}

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);
  private readonly collection = 'chatrooms';
  private readonly messagesCollection = 'messages';

  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
  ) {}

  private toPlainObject(entity: ChatMessage): Record<string, unknown> {
    const { id, isEditable, ...data } = entity.toJSON();
    return removeUndefined(data);
  }

  private toEntityProps(data: Record<string, unknown>, id: string): ChatMessageProps {
    return {
      id,
      senderId: data.senderId as string,
      senderName: data.senderName as string,
      content: data.content as string,
      isEditable: data.isEditable !== undefined ? (data.isEditable as boolean) : false,
      reactions: data.reactions as ChatMessageProps['reactions'],
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
      editedAt: data.editedAt as string | undefined,
      editedByAdmin: data.editedByAdmin as boolean | undefined,
    };
  }

  private async findAllMessages(chatroomId: string, limit?: number): Promise<ChatMessage[]> {
    this.logger.debug(`Attempting to find messages for chatroom ${chatroomId}`);
    const db = this.firebaseService.getFirestore();
    const chatroomRef = db.collection(this.collection).doc(chatroomId);
    const chatroomDoc = await chatroomRef.get();
    if (!chatroomDoc.exists) {
      this.logger.error(`Chatroom ${chatroomId} does not exist`);
      throw new Error(`Chatroom ${chatroomId} does not exist`);
    }
    const messagesRef = chatroomRef.collection(this.messagesCollection);
    let query = messagesRef.orderBy('createdAt', 'desc');
    if (limit) {
      query = query.limit(limit);
    }
    const snapshot = await query.get();
    this.logger.debug(`Found ${snapshot.docs.length} messages for chatroom ${chatroomId}`);
    return snapshot.docs.map(doc =>
      ChatMessage.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async findMessageById(chatroomId: string, id: string): Promise<ChatMessage | null> {
    this.logger.debug(`Attempting to find message ${id} in chatroom ${chatroomId}`);
    const db = this.firebaseService.getFirestore();
    const chatroomRef = db.collection(this.collection).doc(chatroomId);
    const chatroomDoc = await chatroomRef.get();
    if (!chatroomDoc.exists) {
      this.logger.error(`Chatroom ${chatroomId} does not exist`);
      return null;
    }
    const doc = await chatroomRef.collection(this.messagesCollection).doc(id).get();
    if (!doc.exists) {
      this.logger.debug(`Message ${id} not found in chatroom ${chatroomId}`);
      return null;
    }
    return ChatMessage.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id));
  }

  private async createMessageInFirestore(
    chatroomId: string,
    data: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ChatMessage> {
    this.logger.debug(`Attempting to create message in chatroom ${chatroomId}`);
    const db = this.firebaseService.getFirestore();
    const chatroomRef = db.collection(this.collection).doc(chatroomId);
    const chatroomDoc = await chatroomRef.get();
    if (!chatroomDoc.exists) {
      this.logger.error(`Chatroom ${chatroomId} does not exist`);
      throw new Error(`Chatroom ${chatroomId} does not exist`);
    }
    const message = ChatMessage.create(data);
    const plainData = this.toPlainObject(message);
    await chatroomRef.collection(this.messagesCollection).doc(message.id).set(plainData);
    this.logger.debug(`Successfully created message ${message.id} in chatroom ${chatroomId}`);
    return message;
  }

  private async updateMessageInFirestore(
    chatroomId: string,
    id: string,
    data: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`Attempting to update message ${id} in chatroom ${chatroomId}`);
    const db = this.firebaseService.getFirestore();
    const chatroomRef = db.collection(this.collection).doc(chatroomId);
    const chatroomDoc = await chatroomRef.get();
    if (!chatroomDoc.exists) {
      this.logger.error(`Chatroom ${chatroomId} does not exist`);
      return null;
    }
    const existing = await this.findMessageById(chatroomId, id);
    if (!existing) {
      this.logger.debug(`Message ${id} not found in chatroom ${chatroomId}`);
      return null;
    }
    const updated = existing.update(data);
    const plainData = this.toPlainObject(updated);
    await chatroomRef.collection(this.messagesCollection).doc(id).update(plainData);
    this.logger.debug(`Successfully updated message ${id} in chatroom ${chatroomId}`);
    return updated;
  }

  private async deleteMessageFromFirestore(chatroomId: string, id: string): Promise<void> {
    this.logger.debug(`Attempting to delete message ${id} from chatroom ${chatroomId}`);
    const db = this.firebaseService.getFirestore();
    const chatroomRef = db.collection(this.collection).doc(chatroomId);
    const chatroomDoc = await chatroomRef.get();
    if (!chatroomDoc.exists) {
      this.logger.error(`Chatroom ${chatroomId} does not exist`);
      throw new Error(`Chatroom ${chatroomId} does not exist`);
    }
    await chatroomRef.collection(this.messagesCollection).doc(id).delete();
    this.logger.debug(`Successfully deleted message ${id} from chatroom ${chatroomId}`);
  }

  private async addReactionInFirestore(
    chatroomId: string,
    id: string,
    userId: string,
    reaction: UpdateChatMessageReactionDto,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`Attempting to add reaction to message ${id} in chatroom ${chatroomId}`);
    const message = await this.findMessageById(chatroomId, id);
    if (!message) {
      this.logger.debug(`Message ${id} not found in chatroom ${chatroomId}`);
      return null;
    }
    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(r => r.userId === userId);
    if (existingIndex >= 0) {
      reactions[existingIndex] = { userId, type: reaction.type };
    } else {
      reactions.push({ userId, type: reaction.type });
    }
    return this.updateMessageInFirestore(chatroomId, id, { reactions });
  }

  private async removeReactionFromFirestore(
    chatroomId: string,
    id: string,
    userId: string,
  ): Promise<ChatMessage | null> {
    this.logger.debug(`Attempting to remove reaction from message ${id} in chatroom ${chatroomId}`);
    const message = await this.findMessageById(chatroomId, id);
    if (!message || !message.reactions) {
      this.logger.debug(`Message ${id} not found or has no reactions in chatroom ${chatroomId}`);
      return null;
    }
    const reactions = message.reactions.filter(r => r.userId !== userId);
    return this.updateMessageInFirestore(chatroomId, id, { reactions });
  }

  private handleError(error: Error & { code?: string; path?: string }, details: ErrorDetails): never {
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
      const messages = await this.findAllMessages(chatroomId, limit);
      const enrichedMessages = await Promise.all(
        messages.map(message => this.enrichWithIsEditable(message, currentUserId)),
      );
      return enrichedMessages;
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
        operation: 'findAll',
        chatroomId,
        limit,
      });
    }
  }

  async findOne(chatroomId: string, id: string, currentUserId?: string): Promise<ChatMessage> {
    try {
      this.logger.log(`Getting message with id: ${id}`);
      const message = await this.findMessageById(chatroomId, id);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, currentUserId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
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
      const message = await this.createMessageInFirestore(chatroomId, messageData);
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
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
        const existingMessage = await this.findMessageById(chatroomId, id);
        if (!existingMessage) {
          throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
        }
        const isSuperAdmin = await this.isSuperAdmin(currentUserId);
        if (existingMessage.senderId !== currentUserId && !isSuperAdmin) {
          throw new BadRequestException('Sie können nur Ihre eigenen Nachrichten bearbeiten');
        }
      }
      const message = await this.updateMessageInFirestore(chatroomId, id, data);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return this.enrichWithIsEditable(message, currentUserId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
        operation: 'update',
        chatroomId,
        messageId: id,
      });
    }
  }

  async delete(chatroomId: string, id: string): Promise<void> {
    try {
      this.logger.log(`Deleting message with id: ${id}`);
      await this.deleteMessageFromFirestore(chatroomId, id);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
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
      this.handleError(error as Error & { code?: string; path?: string }, {
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
    reaction: UpdateChatMessageReactionDto,
  ): Promise<ChatMessage> {
    try {
      this.logger.log(`Adding reaction to message with id: ${id}`);
      const message = await this.addReactionInFirestore(chatroomId, id, userId, reaction);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
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
      const message = await this.removeReactionFromFirestore(chatroomId, id, userId);
      if (!message) {
        throw new NotFoundException(`Nachricht mit ID ${id} nicht gefunden`);
      }
      return await this.enrichWithIsEditable(message, userId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
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
      const message = await this.updateMessageInFirestore(chatroomId, messageId, {
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
      this.handleError(error as Error & { code?: string; path?: string }, {
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
      this.logger.error(`Error checking super admin status for user ${userId}: ${(error as Error).message}`);
      return false;
    }
  }

  async adminRemove(chatroomId: string, messageId: string): Promise<void> {
    try {
      this.logger.debug(`Admin deleting message ${messageId} from chatroom ${chatroomId}`);
      await this.deleteMessageFromFirestore(chatroomId, messageId);
    } catch (error) {
      this.handleError(error as Error & { code?: string; path?: string }, {
        operation: 'adminRemove',
        chatroomId,
        messageId,
      });
    }
  }
}
