import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { DirectMessageRepository } from '../../domain/repositories/direct-message.repository';
import { DirectMessage, DirectMessageProps } from '../../domain/entities/direct-message.entity';

@Injectable()
export class FirebaseDirectMessageRepository extends DirectMessageRepository {
  private readonly logger = new Logger(FirebaseDirectMessageRepository.name);
  private readonly chatCollectionName = 'direct_chats';
  private readonly messagesSubCollectionName = 'messages';

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

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

  private toPlainObject(entity: DirectMessage): Omit<DirectMessageProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

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
    return db.collection(this.chatCollectionName).doc(chatId).collection(this.messagesSubCollectionName);
  }

  async findById(chatId: string, messageId: string): Promise<DirectMessage | null> {
    try {
      const doc = await this.getMessagesCollection(chatId).doc(messageId).get();
      if (!doc.exists) return null;
      return DirectMessage.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding message ${messageId} in chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  async findByChatId(chatId: string): Promise<DirectMessage[]> {
    try {
      const snapshot = await this.getMessagesCollection(chatId).orderBy('createdAt', 'asc').get();
      return snapshot.docs.map(doc => DirectMessage.fromProps(this.toEntityProps(doc.data(), doc.id)));
    } catch (error) {
      this.logger.error(`Error finding messages for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  async save(message: DirectMessage): Promise<DirectMessage> {
    try {
      await this.getMessagesCollection(message.chatId).doc(message.id).set(this.toPlainObject(message));
      return message;
    } catch (error) {
      this.logger.error(`Error saving message: ${error.message}`);
      throw error;
    }
  }

  async update(message: DirectMessage): Promise<DirectMessage> {
    try {
      await this.getMessagesCollection(message.chatId).doc(message.id).update(this.toPlainObject(message));
      return message;
    } catch (error) {
      this.logger.error(`Error updating message: ${error.message}`);
      throw error;
    }
  }

  async delete(chatId: string, messageId: string): Promise<void> {
    try {
      await this.getMessagesCollection(chatId).doc(messageId).delete();
    } catch (error) {
      this.logger.error(`Error deleting message ${messageId} from chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  async deleteAllByChatId(chatId: string): Promise<void> {
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
}


