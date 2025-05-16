import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Chatroom } from './interfaces/chatroom.interface';
import { CreateChatroomDto } from './dto/create-chatroom.dto';
import { UpdateChatroomDto } from './dto/update-chatroom.dto';
import { DateTimeUtils } from '../utils/date-time.utils';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

@Injectable()
export class ChatroomsService {
  private readonly logger = new Logger(ChatroomsService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  async getAll(): Promise<Chatroom[]> {
    this.logger.debug('Getting all chatrooms');
    const db = this.firebaseService.getClientFirestore();
    const chatroomsCol = collection(db, 'chatrooms');
    const snapshot = await getDocs(chatroomsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Chatroom));
  }

  async findOne(id: string): Promise<Chatroom> {
    this.logger.debug(`Getting chatroom ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'chatrooms', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Chatroom not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Chatroom;
  }

  async create(createChatroomDto: CreateChatroomDto, userId: string): Promise<Chatroom> {
    this.logger.debug('Creating chatroom');
    const db = this.firebaseService.getClientFirestore();
    
    const chatroomData: Omit<Chatroom, 'id'> = {
      title: createChatroomDto.title,
      description: createChatroomDto.description || '',
      imageUrl: createChatroomDto.image || '',
      createdBy: userId,
      participants: [userId],
      createdAt: DateTimeUtils.getBerlinTime(),
      updatedAt: DateTimeUtils.getBerlinTime()
    };
    console.log(chatroomData);

    const docRef = await addDoc(collection(db, 'chatrooms'), chatroomData);
    
    return {
      id: docRef.id,
      ...chatroomData
    };
  }

  async update(id: string, updateChatroomDto: UpdateChatroomDto): Promise<Chatroom> {
    this.logger.debug(`Updating chatroom ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'chatrooms', id);
    
    const updateData = {
      ...updateChatroomDto,
      updatedAt: DateTimeUtils.getBerlinTime()
    };

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Chatroom;
  }

  async updateImage(id: string, imageUrl: string): Promise<Chatroom> {
    this.logger.debug(`Updating chatroom image ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'chatrooms', id);
    await updateDoc(docRef, { imageUrl });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Deleting chatroom ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'chatrooms', id);
    await deleteDoc(docRef);
  }
} 