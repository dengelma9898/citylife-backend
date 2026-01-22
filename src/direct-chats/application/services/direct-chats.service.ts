import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DirectChatRepository } from '../../domain/repositories/direct-chat.repository';
import { DirectMessageRepository } from '../../domain/repositories/direct-message.repository';
import { DirectChat, DirectChatProps } from '../../domain/entities/direct-chat.entity';
import { CreateDirectChatDto } from '../dtos/create-direct-chat.dto';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';

export interface DirectChatWithParticipantInfo extends DirectChatProps {
  otherParticipantName?: string;
  otherParticipantProfilePictureUrl?: string;
}

@Injectable()
export class DirectChatsService {
  private readonly logger = new Logger(DirectChatsService.name);

  constructor(
    private readonly directChatRepository: DirectChatRepository,
    private readonly directMessageRepository: DirectMessageRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  async createChat(userId: string, dto: CreateDirectChatDto): Promise<DirectChat> {
    this.logger.debug(`User ${userId} creating direct chat with ${dto.invitedUserId}`);
    if (userId === dto.invitedUserId) {
      throw new BadRequestException('Cannot create a chat with yourself');
    }
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }
    const blockedUserIds = userProfile.blockedUserIds || [];
    if (blockedUserIds.includes(dto.invitedUserId)) {
      throw new BadRequestException('Cannot create a chat with a blocked user');
    }
    const invitedUserProfile = await this.usersService.getUserProfile(dto.invitedUserId);
    if (!invitedUserProfile) {
      throw new NotFoundException('Invited user not found');
    }
    const invitedBlockedUserIds = invitedUserProfile.blockedUserIds || [];
    if (invitedBlockedUserIds.includes(userId)) {
      throw new ForbiddenException('You have been blocked by this user');
    }
    const existingChat = await this.directChatRepository.findExistingChat(
      userId,
      dto.invitedUserId,
    );
    if (existingChat) {
      throw new BadRequestException('A chat with this user already exists');
    }
    const chat = DirectChat.create({
      creatorId: userId,
      invitedUserId: dto.invitedUserId,
    });
    await this.directChatRepository.save(chat);
    await this.updateUserDirectChatIds(userId, chat.id, 'add');
    await this.updateUserDirectChatIds(dto.invitedUserId, chat.id, 'add');
    await this.sendDirectChatRequestNotification(chat, userProfile);
    return chat;
  }

  async getChatsForUser(userId: string): Promise<DirectChatWithParticipantInfo[]> {
    this.logger.debug(`Getting direct chats for user ${userId}`);
    const chats = await this.directChatRepository.findByUserId(userId);
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
    const chats = await this.directChatRepository.findPendingByInvitedUserId(userId);
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
    const chat = await this.directChatRepository.findById(chatId);
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
    const chat = await this.directChatRepository.findById(chatId);
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
    await this.directChatRepository.update(confirmedChat);
    return confirmedChat;
  }

  async deleteChat(userId: string, chatId: string): Promise<void> {
    this.logger.debug(`User ${userId} deleting chat ${chatId}`);
    const chat = await this.directChatRepository.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }
    if (!chat.isParticipant(userId)) {
      throw new ForbiddenException('You are not a participant of this chat');
    }
    await this.directMessageRepository.deleteAllByChatId(chatId);
    await this.directChatRepository.delete(chatId);
    await this.updateUserDirectChatIds(chat.creatorId, chatId, 'remove');
    await this.updateUserDirectChatIds(chat.invitedUserId, chatId, 'remove');
  }

  async updateLastMessage(chatId: string, content: string, senderId: string): Promise<void> {
    const chat = await this.directChatRepository.findById(chatId);
    if (!chat) return;
    const updatedChat = chat.update({
      lastMessage: {
        content,
        senderId,
        sentAt: new Date().toISOString(),
      },
    });
    await this.directChatRepository.update(updatedChat);
  }

  async validateChatAccess(userId: string, chatId: string): Promise<DirectChat> {
    const chat = await this.directChatRepository.findById(chatId);
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
    senderProfile: any,
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
