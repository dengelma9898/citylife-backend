import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ChatMessage } from './interfaces/chat-message.interface';
import { DateTimeUtils } from '../utils/date-time.utils';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { UpdateMessageReactionDto, ReactionType } from './dto/update-message-reaction.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatMessagesService {
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService
  ) {}

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

  async create(chatroomId: string, userId: string, createMessageDto: CreateMessageDto): Promise<ChatMessage> {
    this.logger.debug(`Creating message in chatroom ${chatroomId}`);
    const db = this.firebaseService.getClientFirestore();
    const messagesRef = collection(db, `chatrooms/${chatroomId}/messages`);

    const userData = await this.usersService.getById(userId);
    if (!userData || 'businessIds' in userData || !userData.name) {
      throw new NotFoundException('User not found');
    }

    const senderName = userData.name;

    const messageData = {
      ...createMessageDto,
      createdAt: DateTimeUtils.getBerlinTime(),
      updatedAt: DateTimeUtils.getBerlinTime(),
      senderId: userId,
      senderName: senderName
    };

    const docRef = await addDoc(messagesRef, messageData);
    


    return {
      id: docRef.id,
      ...messageData,
    } as ChatMessage;
  }

  async update(chatroomId: string, messageId: string, userId: string, updateMessageDto: UpdateMessageDto): Promise<ChatMessage> {
    this.logger.debug(`Updating message ${messageId} in chatroom ${chatroomId}`);
    const message = await this.findOne(chatroomId, messageId);
    
    if (message.senderId !== userId) {
      throw new BadRequestException('You can only edit your own messages');
    }

    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    
    const updateData = {
      content: updateMessageDto.content,
      updatedAt: DateTimeUtils.getBerlinTime(),
      editedAt: DateTimeUtils.getBerlinTime()
    };

    await updateDoc(messageRef, updateData);
    
    const updatedDoc = await getDoc(messageRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
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

  async addReaction(chatroomId: string, messageId: string, userId: string, reactionDto: UpdateMessageReactionDto): Promise<ChatMessage> {
    this.logger.debug(`Adding reaction to message ${messageId} in chatroom ${chatroomId}`);
    const message = await this.findOne(chatroomId, messageId);
    const reactions = message.reactions || [];
    
    // Remove existing reaction if user already has one
    const updatedReactions = reactions.filter(r => r.userId !== userId);
    
    // Add new reaction
    const newReaction = { userId, type: reactionDto.type };
    updatedReactions.push(newReaction);

    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    
    await updateDoc(messageRef, {
      reactions: updatedReactions,
      updatedAt: DateTimeUtils.getBerlinTime()
    });

    return this.findOne(chatroomId, messageId);
  }

  async removeReaction(chatroomId: string, messageId: string, userId: string): Promise<ChatMessage> {
    this.logger.debug(`Removing reaction from message ${messageId} in chatroom ${chatroomId}`);
    const message = await this.findOne(chatroomId, messageId);
    const reactions = message.reactions || [];
    
    const updatedReactions = reactions.filter(r => r.userId !== userId);

    const db = this.firebaseService.getClientFirestore();
    const messageRef = doc(db, `chatrooms/${chatroomId}/messages`, messageId);
    
    await updateDoc(messageRef, {
      reactions: updatedReactions,
      updatedAt: DateTimeUtils.getBerlinTime()
    });

    return this.findOne(chatroomId, messageId);
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