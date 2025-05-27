import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { Chatroom, ChatroomProps } from '../../domain/entities/chatroom.entity';
import { ChatroomRepository } from '../../domain/repositories/chatroom.repository';

@Injectable()
export class FirebaseChatroomRepository implements ChatroomRepository {
  private readonly logger = new Logger(FirebaseChatroomRepository.name);
  private readonly collection = 'chatrooms';

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

  private toPlainObject(entity: Chatroom) {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEntityProps(data: any, id: string): ChatroomProps {
    return {
      id,
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  async findAll(): Promise<Chatroom[]> {
    try {
      const snapshot = await this.firebaseService.getFirestore().collection(this.collection).get();

      return snapshot.docs.map(doc => Chatroom.fromProps(this.toEntityProps(doc.data(), doc.id)));
    } catch (error) {
      this.logger.error(`Error finding all chatrooms: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<Chatroom | null> {
    try {
      const doc = await this.firebaseService
        .getFirestore()
        .collection(this.collection)
        .doc(id)
        .get();

      if (!doc.exists) return null;

      return Chatroom.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding chatroom by id ${id}: ${error.message}`);
      throw error;
    }
  }

  async create(data: Omit<Chatroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chatroom> {
    try {
      const chatroom = Chatroom.create(data);
      const plainData = this.toPlainObject(chatroom);

      await this.firebaseService
        .getFirestore()
        .collection(this.collection)
        .doc(chatroom.id)
        .set(plainData);

      return chatroom;
    } catch (error) {
      this.logger.error(`Error creating chatroom: ${error.message}`);
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<Omit<Chatroom, 'id' | 'createdAt'>>,
  ): Promise<Chatroom | null> {
    try {
      const existing = await this.findById(id);
      if (!existing) return null;

      const updated = existing.update(data);
      const plainData = this.toPlainObject(updated);

      await this.firebaseService
        .getFirestore()
        .collection(this.collection)
        .doc(id)
        .update(plainData);

      return updated;
    } catch (error) {
      this.logger.error(`Error updating chatroom ${id}: ${error.message}`);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.firebaseService.getFirestore().collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting chatroom ${id}: ${error.message}`);
      throw error;
    }
  }

  async findByParticipant(userId: string): Promise<Chatroom[]> {
    try {
      const snapshot = await this.firebaseService
        .getFirestore()
        .collection(this.collection)
        .where('participants', 'array-contains', userId)
        .get();

      return snapshot.docs.map(doc => Chatroom.fromProps(this.toEntityProps(doc.data(), doc.id)));
    } catch (error) {
      this.logger.error(`Error finding chatrooms for participant ${userId}: ${error.message}`);
      throw error;
    }
  }
}
