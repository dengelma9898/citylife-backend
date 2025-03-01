import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { Chatroom } from './interfaces/chatroom.interface';
import { CreateChatroomDto } from './dto/create-chatroom.dto';

@Injectable()
export class ChatroomsService {
  private readonly logger = new Logger(ChatroomsService.name);

  public async getAll(): Promise<Chatroom[]> {
    this.logger.debug('Getting all chatrooms');
    const db = getFirestore();
    const chatroomsCol = collection(db, 'chatrooms');
    const snapshot = await getDocs(chatroomsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Chatroom));
  }

  public async getById(id: string): Promise<Chatroom | null> {
    this.logger.debug(`Getting chatroom ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'chatrooms', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Chatroom;
  }

  public async create(data: CreateChatroomDto): Promise<Chatroom> {
    this.logger.debug('Creating chatroom');
    const db = getFirestore();
    
    const chatroomData: Omit<Chatroom, 'id'> = {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      participants: data.participants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'chatrooms'), chatroomData);
    
    return {
      id: docRef.id,
      ...chatroomData
    };
  }

  public async update(id: string, data: Partial<Chatroom>): Promise<Chatroom> {
    this.logger.debug(`Updating chatroom ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'chatrooms', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Chatroom not found');
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Chatroom;
  }

  public async updateLastMessage(id: string, content: string, authorId: string): Promise<Chatroom> {
    this.logger.debug(`Updating last message for chatroom ${id}`);
    
    const lastMessage = {
      content,
      authorId,
      sentAt: new Date().toISOString()
    };

    return this.update(id, { lastMessage });
  }
} 