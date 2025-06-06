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
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async findAll(chatroomId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      this.logger.debug(`Attempting to find messages for chatroom ${chatroomId}`);
      const db = this.firebaseService.getFirestore();

      // Überprüfen Sie zuerst, ob der Chatroom existiert
      const chatroomRef = db.collection(this.collection).doc(chatroomId);
      const chatroomDoc = await chatroomRef.get();

      if (!chatroomDoc.exists) {
        this.logger.error(`Chatroom ${chatroomId} does not exist`);
        throw new Error(`Chatroom ${chatroomId} does not exist`);
      }

      // Dann laden Sie die Nachrichten
      const messagesRef = chatroomRef.collection(this.messagesCollection);
      let query = messagesRef.orderBy('createdAt', 'desc');

      if (limit) {
        query = query.limit(limit);
      }

      const snapshot = await query.get();
      this.logger.debug(`Found ${snapshot.docs.length} messages for chatroom ${chatroomId}`);

      return snapshot.docs.map(doc =>
        ChatMessage.fromProps(this.toEntityProps(doc.data(), doc.id)),
      );
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        path: error.path,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        operation: 'findAll',
        chatroomId,
        collection: this.collection,
        subcollection: this.messagesCollection,
      };

      this.logger.error('Detailed error information:', JSON.stringify(errorDetails, null, 2));

      if (error.code === 'permission-denied') {
        throw new Error(
          `Berechtigungsfehler beim Zugriff auf Chat-Nachrichten: ${JSON.stringify(errorDetails)}`,
        );
      }

      throw error;
    }
  }

  async findById(chatroomId: string, id: string): Promise<ChatMessage | null> {
    try {
      this.logger.debug(`Attempting to find message ${id} in chatroom ${chatroomId}`);
      const db = this.firebaseService.getFirestore();

      // Überprüfen Sie zuerst, ob der Chatroom existiert
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

      return ChatMessage.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding message by id ${id}: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async create(
    chatroomId: string,
    data: Omit<ChatMessage, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ChatMessage> {
    try {
      this.logger.debug(`Attempting to create message in chatroom ${chatroomId}`);
      const db = this.firebaseService.getFirestore();

      // Überprüfen Sie zuerst, ob der Chatroom existiert
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
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async update(
    chatroomId: string,
    id: string,
    data: Partial<Omit<ChatMessage, 'id' | 'createdAt'>>,
  ): Promise<ChatMessage | null> {
    try {
      this.logger.debug(`Attempting to update message ${id} in chatroom ${chatroomId}`);
      const db = this.firebaseService.getFirestore();

      // Überprüfen Sie zuerst, ob der Chatroom existiert
      const chatroomRef = db.collection(this.collection).doc(chatroomId);
      const chatroomDoc = await chatroomRef.get();

      if (!chatroomDoc.exists) {
        this.logger.error(`Chatroom ${chatroomId} does not exist`);
        return null;
      }

      const existing = await this.findById(chatroomId, id);
      if (!existing) {
        this.logger.debug(`Message ${id} not found in chatroom ${chatroomId}`);
        return null;
      }

      const updated = existing.update(data);
      const plainData = this.toPlainObject(updated);

      await chatroomRef.collection(this.messagesCollection).doc(id).update(plainData);
      this.logger.debug(`Successfully updated message ${id} in chatroom ${chatroomId}`);

      return updated;
    } catch (error) {
      this.logger.error(`Error updating message ${id}: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async delete(chatroomId: string, id: string): Promise<void> {
    try {
      this.logger.debug(`Attempting to delete message ${id} from chatroom ${chatroomId}`);
      const db = this.firebaseService.getFirestore();

      // Überprüfen Sie zuerst, ob der Chatroom existiert
      const chatroomRef = db.collection(this.collection).doc(chatroomId);
      const chatroomDoc = await chatroomRef.get();

      if (!chatroomDoc.exists) {
        this.logger.error(`Chatroom ${chatroomId} does not exist`);
        throw new Error(`Chatroom ${chatroomId} does not exist`);
      }

      await chatroomRef.collection(this.messagesCollection).doc(id).delete();
      this.logger.debug(`Successfully deleted message ${id} from chatroom ${chatroomId}`);
    } catch (error) {
      this.logger.error(`Error deleting message ${id}: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async findByChatroom(chatroomId: string): Promise<ChatMessage[]> {
    return this.findAll(chatroomId);
  }

  async addReaction(
    chatroomId: string,
    id: string,
    userId: string,
    reaction: UpdateMessageReactionDto,
  ): Promise<ChatMessage | null> {
    try {
      this.logger.debug(`Attempting to add reaction to message ${id} in chatroom ${chatroomId}`);
      const message = await this.findById(chatroomId, id);
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

      return this.update(chatroomId, id, { reactions });
    } catch (error) {
      this.logger.error(`Error adding reaction to message ${id}: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }

  async removeReaction(
    chatroomId: string,
    id: string,
    userId: string,
  ): Promise<ChatMessage | null> {
    try {
      this.logger.debug(
        `Attempting to remove reaction from message ${id} in chatroom ${chatroomId}`,
      );
      const message = await this.findById(chatroomId, id);
      if (!message || !message.reactions) {
        this.logger.debug(`Message ${id} not found or has no reactions in chatroom ${chatroomId}`);
        return null;
      }

      const reactions = message.reactions.filter(r => r.userId !== userId);
      return this.update(chatroomId, id, { reactions });
    } catch (error) {
      this.logger.error(`Error removing reaction from message ${id}: ${error.message}`);
      this.logger.error('Full error details:', error);
      throw error;
    }
  }
}
