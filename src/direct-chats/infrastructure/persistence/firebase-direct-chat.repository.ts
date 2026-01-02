import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { DirectChatRepository } from '../../domain/repositories/direct-chat.repository';
import { DirectChat, DirectChatProps } from '../../domain/entities/direct-chat.entity';

@Injectable()
export class FirebaseDirectChatRepository extends DirectChatRepository {
  private readonly logger = new Logger(FirebaseDirectChatRepository.name);
  private readonly collectionName = 'direct_chats';

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

  private toPlainObject(entity: DirectChat): Omit<DirectChatProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

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

  async findById(id: string): Promise<DirectChat | null> {
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

  async findByUserId(userId: string): Promise<DirectChat[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const [creatorSnapshot, invitedSnapshot] = await Promise.all([
        db.collection(this.collectionName).where('creatorId', '==', userId).get(),
        db.collection(this.collectionName).where('invitedUserId', '==', userId).get(),
      ]);
      const chats: DirectChat[] = [];
      creatorSnapshot.docs.forEach(doc => {
        chats.push(DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)));
      });
      invitedSnapshot.docs.forEach(doc => {
        if (!chats.find(c => c.id === doc.id)) {
          chats.push(DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)));
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

  async findPendingByInvitedUserId(userId: string): Promise<DirectChat[]> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.collectionName)
        .where('invitedUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();
      return snapshot.docs.map(doc => DirectChat.fromProps(this.toEntityProps(doc.data(), doc.id)));
    } catch (error) {
      this.logger.error(`Error finding pending direct chats for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  async findExistingChat(userId1: string, userId2: string): Promise<DirectChat | null> {
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

  async save(chat: DirectChat): Promise<DirectChat> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(chat.id).set(this.toPlainObject(chat));
      return chat;
    } catch (error) {
      this.logger.error(`Error saving direct chat: ${error.message}`);
      throw error;
    }
  }

  async update(chat: DirectChat): Promise<DirectChat> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(chat.id).update(this.toPlainObject(chat));
      return chat;
    } catch (error) {
      this.logger.error(`Error updating direct chat: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting direct chat ${id}: ${error.message}`);
      throw error;
    }
  }
}
