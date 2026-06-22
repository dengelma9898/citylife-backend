import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { Chatroom, ChatroomProps } from '../../domain/entities/chatroom.entity';
import { CreateChatroomDto } from '../dtos/create-chatroom.dto';
import { UpdateChatroomDto } from '../dtos/update-chatroom.dto';

@Injectable()
export class ChatroomsService {
  private readonly logger = new Logger(ChatroomsService.name);
  private readonly collection = 'chatrooms';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toEntityProps(data: Record<string, unknown>, id: string): ChatroomProps {
    const participants = (data.participants as string[]) || [];
    const participantCount =
      data.participantCount !== undefined ? (data.participantCount as number) : participants.length;
    return {
      id,
      title: data.title as string,
      description: data.description as string,
      imageUrl: data.imageUrl as string | undefined,
      createdBy: data.createdBy as string,
      participants,
      participantCount,
      lastMessage: data.lastMessage as ChatroomProps['lastMessage'],
      createdAt: (data.createdAt as string) || new Date().toISOString(),
      updatedAt: (data.updatedAt as string) || new Date().toISOString(),
    };
  }

  private async findAllChatrooms(): Promise<Chatroom[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map(doc =>
      Chatroom.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async findChatroomById(id: string): Promise<Chatroom | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return Chatroom.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id));
  }

  private async createChatroomInFirestore(
    data: Omit<Chatroom, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Chatroom> {
    const db = this.firebaseService.getFirestore();
    const chatroom = Chatroom.create(data);
    const plainData = toFirestoreData(chatroom);
    await db.collection(this.collection).doc(chatroom.id).set(plainData);
    return chatroom;
  }

  private async updateChatroomInFirestore(
    id: string,
    data: Partial<Omit<Chatroom, 'id' | 'createdAt'>>,
  ): Promise<Chatroom | null> {
    const existing = await this.findChatroomById(id);
    if (!existing) {
      return null;
    }
    const updated = existing.update(data);
    const plainData = toFirestoreData(updated);
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(id).update(plainData);
    return updated;
  }

  private async deleteChatroomFromFirestore(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.collection).doc(id).delete();
  }

  private async findChatroomsByParticipant(userId: string): Promise<Chatroom[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('participants', 'array-contains', userId)
      .get();
    return snapshot.docs.map(doc =>
      Chatroom.fromProps(this.toEntityProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  async getAll(): Promise<Chatroom[]> {
    this.logger.log('Getting all chatrooms');
    const chatrooms = await this.findAllChatrooms();
    return chatrooms.map(chatroom => this.enrichWithParticipantCount(chatroom));
  }

  async getById(id: string): Promise<Chatroom> {
    this.logger.log(`Getting chatroom with id: ${id}`);
    const chatroom = await this.findChatroomById(id);
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }

  private enrichWithParticipantCount(chatroom: Chatroom): Chatroom {
    const participantCount = chatroom.participants?.length || 0;
    return Chatroom.fromProps({
      ...chatroom.toJSON(),
      participantCount,
    });
  }

  async create(data: CreateChatroomDto, userId: string): Promise<Chatroom> {
    this.logger.log('Creating new chatroom');
    const chatroomData = Chatroom.create({
      title: data.title,
      description: data.description || '',
      imageUrl: data.image || '',
      createdBy: userId,
      participants: [userId],
    });
    const chatroom = await this.createChatroomInFirestore(chatroomData);
    return this.enrichWithParticipantCount(chatroom);
  }

  async update(
    id: string,
    data: UpdateChatroomDto | Partial<Omit<Chatroom, 'id' | 'createdAt'>>,
  ): Promise<Chatroom> {
    this.logger.log(`Updating chatroom with id: ${id}`);
    const chatroom = await this.updateChatroomInFirestore(id, data);
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting chatroom with id: ${id}`);
    await this.deleteChatroomFromFirestore(id);
  }

  async findByParticipant(userId: string): Promise<Chatroom[]> {
    this.logger.log(`Finding chatrooms for participant: ${userId}`);
    const chatrooms = await this.findChatroomsByParticipant(userId);
    return chatrooms.map(chatroom => this.enrichWithParticipantCount(chatroom));
  }

  async updateImage(id: string, imageUrl: string): Promise<Chatroom> {
    this.logger.log(`Updating image for chatroom with id: ${id}`);
    const chatroom = await this.updateChatroomInFirestore(id, { imageUrl });
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }
}
