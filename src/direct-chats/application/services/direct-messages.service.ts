import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
  Scope,
} from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import {
  DirectMessage,
  DirectMessageProps,
  Reaction,
} from '../../domain/entities/direct-message.entity';
import { DirectChatsService } from './direct-chats.service';
import { CreateDirectMessageDto } from '../dtos/create-direct-message.dto';
import { UpdateDirectMessageDto } from '../dtos/update-direct-message.dto';
import { UpdateDirectMessageReactionDto } from '../dtos/update-message-reaction.dto';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UsersService } from '../../../users/users.service';

@Injectable({ scope: Scope.REQUEST })
export class DirectMessagesService {
  private readonly logger = new Logger(DirectMessagesService.name);
  private readonly chatCollectionName = 'direct_chats';
  private readonly messagesSubCollectionName = 'messages';

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(forwardRef(() => DirectChatsService))
    private readonly directChatsService: DirectChatsService,
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  private toPlainObject(entity: DirectMessage): Omit<DirectMessageProps, 'id'> {
    return toFirestoreData(entity);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntityProps(data: any, id: string): DirectMessageProps {
    return {
      id,
      chatId: data.chatId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      imageUrl: data.imageUrl,
      isEditable: data.isEditable || false,
      reactions: data.reactions,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      editedAt: data.editedAt?.toDate?.() || data.editedAt,
    };
  }

  private getMessagesCollection(chatId: string) {
    const db = this.firebaseService.getFirestore();
    return db
      .collection(this.chatCollectionName)
      .doc(chatId)
      .collection(this.messagesSubCollectionName);
  }

  private async findById(chatId: string, messageId: string): Promise<DirectMessage | null> {
    try {
      const doc = await this.getMessagesCollection(chatId).doc(messageId).get();
      if (!doc.exists) return null;
      return DirectMessage.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding message ${messageId} in chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  private async findByChatId(chatId: string): Promise<DirectMessage[]> {
    try {
      const snapshot = await this.getMessagesCollection(chatId).orderBy('createdAt', 'asc').get();
      return snapshot.docs.map(doc =>
        DirectMessage.fromProps(this.toEntityProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding messages for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  private async save(message: DirectMessage): Promise<DirectMessage> {
    try {
      await this.getMessagesCollection(message.chatId)
        .doc(message.id)
        .set(this.toPlainObject(message));
      return message;
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
      throw error;
    }
  }

  private async update(message: DirectMessage): Promise<DirectMessage> {
    try {
      await this.getMessagesCollection(message.chatId)
        .doc(message.id)
        .update(this.toPlainObject(message));
      return message;
    } catch (error) {
      this.logger.error(`Error updating message: ${error.message}`);
      throw error;
    }
  }

  private async delete(chatId: string, messageId: string): Promise<void> {
    try {
      await this.getMessagesCollection(chatId).doc(messageId).delete();
    } catch (error) {
      this.logger.error(
        `Error deleting message ${messageId} from chat ${chatId}: ${error.message}`,
      );
      throw error;
    }
  }

  async deleteAllMessagesByChatId(chatId: string): Promise<void> {
    try {
      const db = this.firebaseService.getFirestore();
      const messagesRef = this.getMessagesCollection(chatId);
      const snapshot = await messagesRef.get();
      if (snapshot.empty) return;
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      this.logger.error(`Error deleting all messages for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

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
    await this.save(message);
    await this.directChatsService.updateLastMessage(chatId, dto.content, userId);
    const recipientId = chat.getOtherParticipantId(userId);
    if (recipientId) {
      await this.sendMessageNotification(
        recipientId,
        userName,
        dto.content,
        chatId,
        message.id,
        userId,
        chat,
      );
    }
    return message;
  }

  private async sendMessageNotification(
    recipientId: string,
    senderName: string,
    content: string,
    chatId: string,
    messageId: string,
    senderId: string,
    chat: any,
  ): Promise<void> {
    try {
      const recipientProfile = await this.usersService.getUserProfile(recipientId);
      if (!recipientProfile) {
        this.logger.warn(`Recipient profile not found for user ${recipientId}`);
        return;
      }
      const notificationPreferences = recipientProfile.notificationPreferences;
      const directMessagesEnabled =
        notificationPreferences?.directMessages !== undefined
          ? notificationPreferences.directMessages
          : false;
      if (!directMessagesEnabled) {
        this.logger.debug(`Direct messages notifications disabled for user ${recipientId}`);
        return;
      }
      const mutedBy = chat.mutedBy || [];
      if (mutedBy.includes(recipientId)) {
        this.logger.debug(`Chat ${chatId} is muted by user ${recipientId}`);
        return;
      }
      const truncatedContent = content.length > 100 ? content.substring(0, 97) + '...' : content;
      await this.notificationService.sendToUser(recipientId, {
        title: senderName,
        body: truncatedContent,
        data: {
          type: 'DIRECT_CHAT_MESSAGE',
          chatId,
          messageId,
          senderId,
        },
      });
    } catch (error: any) {
      this.logger.error(`Error sending notification to user ${recipientId}: ${error.message}`);
    }
  }

  async getMessages(userId: string, chatId: string): Promise<DirectMessageProps[]> {
    this.logger.debug(`Getting messages for chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const messages = await this.findByChatId(chatId);
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
    const message = await this.findById(chatId, messageId);
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
    await this.update(updatedMessage);
    return updatedMessage;
  }

  async deleteMessage(userId: string, chatId: string, messageId: string): Promise<void> {
    this.logger.debug(`User ${userId} deleting message ${messageId} in chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const message = await this.findById(chatId, messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    if (!message.isOwnedBy(userId)) {
      throw new ForbiddenException('You can only delete your own messages');
    }
    await this.delete(chatId, messageId);
  }

  async updateReaction(
    userId: string,
    chatId: string,
    messageId: string,
    dto: UpdateDirectMessageReactionDto,
  ): Promise<DirectMessage> {
    this.logger.debug(`User ${userId} updating reaction on message ${messageId} in chat ${chatId}`);
    await this.directChatsService.validateChatAccess(userId, chatId);
    const message = await this.findById(chatId, messageId);
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
    await this.update(updatedMessage);
    return updatedMessage;
  }
}
