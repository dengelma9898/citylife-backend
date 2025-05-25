import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ChatMessage } from '../../domain/entities/chat-message.entity';
import { DateTimeUtils } from '../../../utils/date-time.utils';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { UpdateMessageReactionDto, ReactionType } from '../dtos/update-message-reaction.dto';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { UsersService } from '../../../users/users.service';
import { CHAT_MESSAGE_REPOSITORY } from '../../domain/repositories/chat-message.repository';
import { ChatMessageRepository } from '../../domain/repositories/chat-message.repository';

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly chatMessageRepository: ChatMessageRepository
  ) {}

  async getAll(chatroomId: string, limit?: number): Promise<ChatMessage[]> {
    this.logger.log(`Getting all messages for chatroom: ${chatroomId}`);
    return this.chatMessageRepository.findAll(chatroomId, limit);
  }

  async getById(chatroomId: string, id: string): Promise<ChatMessage> {
    this.logger.log(`Getting message with id: ${id}`);
    const message = await this.chatMessageRepository.findById(chatroomId, id);
    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }
    return message;
  }

  async create(chatroomId: string, userId: string, data: CreateMessageDto): Promise<ChatMessage> {
    this.logger.log('Creating new message');
    this.logger.debug(`Creating message in chatroom ${chatroomId}`);

    const userData = await this.usersService.getById(userId);
    if (!userData || 'businessIds' in userData || !userData.name) {
      throw new NotFoundException('User not found');
    }

    const senderName = userData.name;
    const messageData = ChatMessage.create({
      content: data.content,
      senderId: userId,
      senderName: senderName, 
      reactions: []
    });
    return this.chatMessageRepository.create(chatroomId, messageData);
  }

  async update(chatroomId: string, id: string, data: UpdateMessageDto): Promise<ChatMessage> {
    this.logger.log(`Updating message with id: ${id}`);
    const message = await this.chatMessageRepository.update(chatroomId, id, data);
    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }
    return message;
  }

  async delete(chatroomId: string, id: string): Promise<void> {
    this.logger.log(`Deleting message with id: ${id}`);
    await this.chatMessageRepository.delete(chatroomId, id);
  }

  async findByChatroom(chatroomId: string): Promise<ChatMessage[]> {
    this.logger.log(`Finding messages for chatroom: ${chatroomId}`);
    return this.chatMessageRepository.findByChatroom(chatroomId);
  }

  async addReaction(chatroomId: string, id: string, userId: string, reaction: UpdateMessageReactionDto): Promise<ChatMessage> {
    this.logger.log(`Adding reaction to message with id: ${id}`);
  
    const message = await this.chatMessageRepository.addReaction(chatroomId, id, userId, reaction);
    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }
    return message;
  }

  async removeReaction(chatroomId: string, id: string, userId: string): Promise<ChatMessage> {
    this.logger.log(`Removing reaction from message with id: ${id}`);
    const message = await this.chatMessageRepository.removeReaction(chatroomId, id, userId);
    if (!message) {
      throw new NotFoundException(`Message with id ${id} not found`);
    }
    return message;
  }

  async findAll(chatroomId: string, messageLimit: number = 50): Promise<ChatMessage[]> {
    this.logger.debug(`Getting messages for chatroom ${chatroomId}`);
    const db = this.firebaseService.getClientFirestore();
    const messagesRef = collection(db, `chatrooms/${chatroomId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(messageLimit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatMessage));
  }

  async findOne(chatroomId: string, messageId: string): Promise<ChatMessage> {
    this.logger.debug(`Getting message ${messageId} from chatroom ${chatroomId}`);
    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new NotFoundException('Message not found');
    }

    return {
      id: messageDoc.id,
      ...messageDoc.data()
    } as ChatMessage;
  }

  async remove(chatroomId: string, messageId: string, userId: string): Promise<void> {
    this.logger.debug(`Deleting message ${messageId} from chatroom ${chatroomId}`);
    const message = await this.findOne(chatroomId, messageId);
    
    if (message.senderId !== userId) {
      throw new BadRequestException('You can only delete your own messages');
    }

    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    await deleteDoc(messageRef);
  }

  async adminUpdate(chatroomId: string, messageId: string, updateMessageDto: UpdateMessageDto): Promise<ChatMessage> {
    this.logger.debug(`Admin updating message ${messageId} in chatroom ${chatroomId}`);
    const message = await this.findOne(chatroomId, messageId);

    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    
    const updateData = {
      content: updateMessageDto.content,
      updatedAt: DateTimeUtils.getBerlinTime(),
      editedAt: DateTimeUtils.getBerlinTime(),
      editedByAdmin: true
    };

    await updateDoc(messageRef, updateData);
    
    const updatedDoc = await getDoc(messageRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as ChatMessage;
  }

  async adminRemove(chatroomId: string, messageId: string): Promise<void> {
    this.logger.debug(`Admin deleting message ${messageId} from chatroom ${chatroomId}`);
    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    await deleteDoc(messageRef);
  }
} 