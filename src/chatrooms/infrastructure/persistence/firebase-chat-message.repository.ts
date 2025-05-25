import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { ChatMessage, ChatMessageProps } from '../../domain/entities/chat-message.entity';
import { ChatMessageRepository } from '../../domain/repositories/chat-message.repository';
import { UpdateMessageReactionDto } from 'src/chatrooms/application/dtos/update-message-reaction.dto';

@Injectable()
export class FirebaseChatMessageRepository implements ChatMessageRepository {
  private readonly logger = new Logger(FirebaseChatMessageRepository.name);
  private readonly collection = 'chatrooms';
  private readonly messagesCollection = 'messages';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  private toPlainObject(entity: ChatMessage) {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEntityProps(data: any, id: string): ChatMessageProps {
    return {
      id,
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString()
    };
  }

  async findAll(chatroomId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      let query = this.firebaseService.getFirestore()
        .collection(this.collection)
        .where('chatroomId', '==', chatroomId)
        .orderBy('createdAt', 'desc');

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => 
        ChatMessage.fromProps(this.toEntityProps(doc.data(), doc.id))
      );
    } catch (error) {
      this.logger.error(`Error finding messages for chatroom ${chatroomId}: ${error.message}`);
      throw error;
    }
  }

  async findById(chatroomId: string, id: string): Promise<ChatMessage | null> {
    try {
      const doc = await this.firebaseService.getFirestore()
        .collection(this.collection)
        .doc(chatroomId)
        .collection(this.messagesCollection)
        .doc(id)
        .get();

      if (!doc.exists) return null;

      return ChatMessage.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding message by id ${id}: ${error.message}`);
      throw error;
    }
  }

  async create(chatroomId: string, data: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChatMessage> {
    try {
      const message = ChatMessage.create(data);
      const plainData = this.toPlainObject(message);

      await this.firebaseService.getFirestore()
        .collection(this.collection)
        .doc(chatroomId)
        .collection(this.messagesCollection)
        .doc(message.id)
        .set(plainData);

      return message;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      throw error;
    }
  }

  async update(chatroomId: string, id: string, data: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>): Promise<ChatMessage | null> {
    try {
      const existing = await this.findById(chatroomId, id);
      if (!existing) return null;

      const updated = existing.update(data);
      const plainData = this.toPlainObject(updated);

      await this.firebaseService.getFirestore()
        .collection(this.collection)
        .doc(chatroomId)
        .collection(this.messagesCollection)
        .doc(id)
        .update(plainData);

      return updated;
    } catch (error) {
      this.logger.error(`Error updating message ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(chatroomId: string, id: string): Promise<void> {
    try {
      await this.firebaseService.getFirestore()
        .collection(this.collection)
        .doc(chatroomId)
        .collection(this.messagesCollection)
        .doc(id)
        .delete();
    } catch (error) {
      this.logger.error(`Error deleting message ${id}: ${error.message}`);
      throw error;
    }
  }

  async findByChatroom(chatroomId: string): Promise<ChatMessage[]> {
    return this.findAll(chatroomId);
  }

  async addReaction(chatroomId: string, id: string, userId: string, reaction: UpdateMessageReactionDto): Promise<ChatMessage | null> {
    try {
      const message = await this.findById(chatroomId, id);
      if (!message) return null;

      const reactions = message.reactions || [];
      const existingIndex = reactions.findIndex(r => r.userId === userId);

      if (existingIndex >= 0) {
        reactions[existingIndex] = { userId, type: reaction.type };
      } else {
        reactions.push({ userId, type: reaction.type });
      }

      return this.update(chatroomId, id, { reactions });
    } catch (error) {
      this.logger.error(`Error adding reaction to message ${id}: ${error.message}`);
      throw error;
    }
  }

  async removeReaction(chatroomId: string, id: string, userId: string): Promise<ChatMessage | null> {
    try {
      const message = await this.findById(chatroomId, id);
      if (!message || !message.reactions) return null;

      const reactions = message.reactions.filter(r => r.userId !== userId);
      return this.update(chatroomId, id, { reactions });
    } catch (error) {
      this.logger.error(`Error removing reaction from message ${id}: ${error.message}`);
      throw error;
    }
  }
} 