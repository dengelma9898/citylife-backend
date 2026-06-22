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
import { DirectChat, DirectChatProps } from '../../domain/entities/direct-chat.entity';
import { CreateDirectChatDto } from '../dtos/create-direct-chat.dto';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { UserProfile } from '../../../users/interfaces/user-profile.interface';
import { DirectMessagesService } from './direct-messages.service';

export interface DirectChatWithParticipantInfo extends DirectChatProps {
  otherParticipantName?: string;
  otherParticipantProfilePictureUrl?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class DirectChatsService {
  private readonly logger = new Logger(DirectChatsService.name);
  private readonly collectionName = 'direct_chats';

  constructor(
    private readonly firebaseService: FirebaseService,
    @Inject(forwardRef(() => DirectMessagesService))
    private readonly directMessagesService: DirectMessagesService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  private toPlainObject(entity: DirectChat): Omit<DirectChatProps, 'id'> {
    return toFirestoreData(entity);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntityProps(data: any, id: string): DirectChatProps {
    return {
      id,
      creatorId: data.creatorId,
      invitedUserId: data.invitedUserId,
      creatorConfirmed: data.creatorConfirmed,
      invitedConfirmed: data.invitedConfirmed,
      status: data.status,
      lastMessage: data.lastMessage,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    };
  }

  private async findById(id: string): Promise<DirectChat | null> {
    try {
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();
      if (!doc.exists) return null;
      return DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding direct chat by id ${id}: ${error.message}`);
      throw error;
    }
  }

  private async findByUserId(userId: string): Promise<DirectChat[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const [creatorSnapshot, invitedSnapshot] = await Promise.all([
        db.collection(this.collectionName).where('creatorId', '==', userId).get(),
        db.collection(this.collectionName).where('invitedUserId', '==', userId).get(),
      ]);
      const chats: DirectChat[] = [];
      creatorSnapshot.docs.forEach(doc => {
        chats.push(
          DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)),
        );
      });
      invitedSnapshot.docs.forEach(doc => {
        if (!chats.find(c => c.id === doc.id)) {
          chats.push(
            DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)),
          );
        }
      });
      return chats.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch (error) {
      this.logger.error(`Error finding direct chats by user id ${userId}: ${error.message}`);
      throw error;
    }
  }

  private async findPendingByInvitedUserId(userId: string): Promise<DirectChat[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.collectionName)
        .where('invitedUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();
      return snapshot.docs.map(doc =>
        DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding pending direct chats for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  private async findExistingChat(userId1: string, userId2: string): Promise<DirectChat | null> {
    try {
      const db = this.firebaseService.getFirestore();
      const [snapshot1, snapshot2] = await Promise.all([
        db
          .collection(this.collectionName)
          .where('creatorId', '==', userId1)
          .where('invitedUserId', '==', userId2)
          .limit(1)
          .get(),
        db
          .collection(this.collectionName)
          .where('creatorId', '==', userId2)
          .where('invitedUserId', '==', userId1)
          .limit(1)
          .get(),
      ]);
      if (!snapshot1.empty) {
        const doc = snapshot1.docs[0];
        return DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id));
      }
      if (!snapshot2.empty) {
        const doc = snapshot2.docs[0];
        return DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id));
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding existing chat between ${userId1} and ${userId2}: ${error.message}`,
      );
      throw error;
    }
  }

  private async save(chat: DirectChat): Promise<DirectChat> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(chat.id).set(this.toPlainObject(chat));
      return chat;
    } catch (error) {
      this.logger.error(`Error saving direct chat: ${error.message}`);
      throw error;
    }
  }

  private async update(chat: DirectChat): Promise<DirectChat> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(chat.id).update(this.toPlainObject(chat));
      return chat;
    } catch (error) {
      this.logger.error(`Error updating direct chat: ${error.message}`);
      throw error;
    }
  }

  private async delete(id: string): Promise<void> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting direct chat ${id}: ${error.message}`);
      throw error;
    }
  }

  async createChat(userId: string, dto: CreateDirectChatDto): Promise<DirectChat> {
    this.logger.debug(`User ${userId} creating direct chat with ${dto.invitedUserId}`);
    if (userId === dto.invitedUserId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }
    const profiles = await this.usersService.getUserProfilesByIds([userId, dto.invitedUserId]);
    const userProfile = profiles.get(userId) ?? null;
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    const blockedUserIds = userProfile.blockedUserIds || [];
    if (blockedUserIds.includes(dto.invitedUserId)) {
      throw new BadRequestException('Cannot create a chat with a blocked user');
    }
    const invitedUserProfile = profiles.get(dto.invitedUserId) ?? null;
    if (!invitedUserProfile) {
      throw new NotFoundException('Invited user not found');
    }
    const invitedBlockedUserIds = invitedUserProfile.blockedUserIds || [];
    if (invitedBlockedUserIds.includes(userId)) {
      throw new ForbiddenException('You have been blocked by this user');
    }
    const existingChat = await this.findExistingChat(userId, dto.invitedUserId);
    if (existingChat) {
      throw new BadRequestException('A chat with this user already exists');
    }
    const chat = DirectChat.create({
      creatorId: userId,
      invitedUserId: dto.invitedUserId,
    });
    await this.save(chat);
    await this.updateUserDirectChatIds(userId, chat.id, 'add');
    await this.updateUserDirectChatIds(dto.invitedUserId, chat.id, 'add');
    await this.sendDirectChatRequestNotification(chat, userProfile);
    return chat;
  }

  async getChatsForUser(userId: string): Promise<DirectChatWithParticipantInfo[]> {
    this.logger.debug(`Getting direct chats for user ${userId}`);
    const chats = await this.findByUserId(userId);
    const otherParticipantIds = chats
      .map(chat => chat.getOtherParticipantId(userId))
      .filter(Boolean) as string[];
    const userProfiles = await this.usersService.getUserProfilesByIds(otherParticipantIds);
    return chats.map(chat => {
      const otherParticipantId = chat.getOtherParticipantId(userId);
      const otherParticipant = otherParticipantId ? userProfiles.get(otherParticipantId) : null;
      return {
        ...chat.toJSON(),
        otherParticipantName: otherParticipant?.name,
        otherParticipantProfilePictureUrl: otherParticipant?.profilePictureUrl,
      };
    });
  }

  async getPendingChatsForUser(userId: string): Promise<DirectChatWithParticipantInfo[]> {
    this.logger.debug(`Getting pending direct chats for user ${userId}`);
    const chats = await this.findPendingByInvitedUserId(userId);
    const creatorIds = chats.map(chat => chat.creatorId);
    const userProfiles = await this.usersService.getUserProfilesByIds(creatorIds);
    return chats.map(chat => {
      const creator = userProfiles.get(chat.creatorId);
      return {
        ...chat.toJSON(),
        otherParticipantName: creator?.name,
        otherParticipantProfilePictureUrl: creator?.profilePictureUrl,
      };
    });
  }

  async getChatById(userId: string, chatId: string): Promise<DirectChatWithParticipantInfo> {
    this.logger.debug(`Getting direct chat ${chatId} for user ${userId}`);
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.isParticipant(userId)) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
    const otherParticipantId = chat.getOtherParticipantId(userId);
    let otherParticipant = null;
    if (otherParticipantId) {
      otherParticipant = await this.usersService.getUserProfile(otherParticipantId);
    }
    return {
      ...chat.toJSON(),
      otherParticipantName: otherParticipant?.name,
      otherParticipantProfilePictureUrl: otherParticipant?.profilePictureUrl,
    };
  }

  async confirmChat(userId: string, chatId: string): Promise<DirectChat> {
    this.logger.debug(`User ${userId} confirming chat ${chatId}`);
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (chat.invitedUserId !== userId) {
      throw new ForbiddenException('Only the invited user can confirm this chat');
    }
    if (chat.invitedConfirmed) {
      throw new BadRequestException('Chat is already confirmed');
    }
    const confirmedChat = chat.confirm();
    await this.update(confirmedChat);
    return confirmedChat;
  }

  async deleteChat(userId: string, chatId: string): Promise<void> {
    this.logger.debug(`User ${userId} deleting chat ${chatId}`);
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.isParticipant(userId)) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
    await this.directMessagesService.deleteAllMessagesByChatId(chatId);
    await this.delete(chatId);
    await this.updateUserDirectChatIds(chat.creatorId, chatId, 'remove');
    await this.updateUserDirectChatIds(chat.invitedUserId, chatId, 'remove');
  }

  async updateLastMessage(chatId: string, content: string, senderId: string): Promise<void> {
    const chat = await this.findById(chatId);
    if (!chat) return;
    const updatedChat = chat.update({
      lastMessage: {
        content,
        senderId,
        sentAt: new Date().toISOString(),
      },
    });
    await this.update(updatedChat);
  }

  async validateChatAccess(userId: string, chatId: string): Promise<DirectChat> {
    const chat = await this.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.isParticipant(userId)) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
    return chat;
  }

  private async sendDirectChatRequestNotification(
    chat: DirectChat,
    senderProfile: UserProfile,
  ): Promise<void> {
    try {
      const invitedUserProfile = await this.usersService.getUserProfile(chat.invitedUserId);
      if (!invitedUserProfile) {
        this.logger.warn(
          `Invited user profile not found for user ${chat.invitedUserId}, skipping notification`,
        );
        return;
      }
      const notificationPreferences = invitedUserProfile.notificationPreferences;
      const directChatRequestsEnabled =
        notificationPreferences?.directChatRequests !== undefined
          ? notificationPreferences.directChatRequests
          : false;
      if (!directChatRequestsEnabled) {
        this.logger.debug(
          `Direct chat requests notifications disabled for user ${chat.invitedUserId}`,
        );
        return;
      }
      const senderName = senderProfile.name || 'Jemand';
      await this.notificationService.sendToUser(chat.invitedUserId, {
        title: 'Neue Chat-Anfrage',
        body: `${senderName} möchte mit dir chatten`,
        data: {
          type: 'DIRECT_CHAT_REQUEST',
          chatId: chat.id,
          senderId: chat.creatorId,
          senderName,
        },
      });
      this.logger.debug(
        `Successfully sent direct chat request notification to user ${chat.invitedUserId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error sending direct chat request notification: ${error.message}`,
        error.stack,
      );
    }
  }

  private async updateUserDirectChatIds(
    userId: string,
    chatId: string,
    action: 'add' | 'remove',
  ): Promise<void> {
    try {
      const userProfile = await this.usersService.getUserProfile(userId);
      if (!userProfile) return;
      let directChatIds = userProfile.directChatIds || [];
      if (action === 'add' && !directChatIds.includes(chatId)) {
        directChatIds = [...directChatIds, chatId];
      } else if (action === 'remove') {
        directChatIds = directChatIds.filter(id => id !== chatId);
      }
      await this.usersService.update(userId, { directChatIds });
    } catch (error) {
      this.logger.error(`Error updating directChatIds for user ${userId}: ${error.message}`);
    }
  }
}
