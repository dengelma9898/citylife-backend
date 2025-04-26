import { Injectable } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { City } from './interfaces/city.interface';
import { Chatroom } from './interfaces/chatroom.interface';
import { Event } from './interfaces/event.interface';
import { Message } from './interfaces/message.interface';
import { FirebaseService } from 'src/firebase/firebase.service';
@Injectable()
export class CitiesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  public async getAll(): Promise<City[]> {
    const db = this.firebaseService.getClientFirestore();
    const citiesCol = collection(db, 'cities');
    const snapshot = await getDocs(citiesCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      latitude: doc.data().latitude,
      longitude: doc.data().longitude,
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt,
    }));
  }

  public async getById(id: string): Promise<City | null> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'cities', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  public async getSubcollectionData(cityId: string, subcollectionName: string): Promise<any[]> {
    const db = this.firebaseService.getClientFirestore();
    const subcollectionRef = collection(db, 'cities', cityId, subcollectionName);
    const snapshot = await getDocs(subcollectionRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  public async queryAllSubcollections(subcollectionName: string): Promise<any[]> {
    const db = this.firebaseService.getClientFirestore();
    const groupRef = collectionGroup(db, subcollectionName);
    const snapshot = await getDocs(groupRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId: doc.ref.parent.parent?.id,
      ...doc.data()
    }));
  }

  public async getChatrooms(cityId: string): Promise<Chatroom[]> {
    const db = this.firebaseService.getClientFirestore();
    const chatroomsRef = collection(db, 'cities', cityId, 'chatrooms');
    const snapshot = await getDocs(chatroomsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId,
      name: doc.data().name,
      iconName: doc.data().iconName,
    }));
  }

  public async getAllChatrooms(): Promise<Chatroom[]> {
    const db = this.firebaseService.getClientFirestore();
    const groupRef = collectionGroup(db, 'chatrooms');
    const snapshot = await getDocs(groupRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId: doc.ref.parent.parent?.id || '',
      name: doc.data().name,
      iconName: doc.data().iconName,
    }));
  }

  public async getEvents(cityId: string): Promise<Event[]> {
    const db = this.firebaseService.getClientFirestore();
    const eventsRef = collection(db, 'cities', cityId, 'events');
    const snapshot = await getDocs(eventsRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId,
      title: doc.data().title,
      description: doc.data().description,
      startDate: doc.data().startDate,
      endDate: doc.data().endDate,
      location: doc.data().location,
      imageUrls: doc.data().imageUrls || [],
      titleImageUrl: doc.data().titleImageUrl || '',
    }));
  }

  public async getAllEvents(): Promise<Event[]> {
    const db = this.firebaseService.getClientFirestore();
    const groupRef = collectionGroup(db, 'events');
    const snapshot = await getDocs(groupRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId: doc.ref.parent.parent?.id || '',
      title: doc.data().title,
      description: doc.data().description,
      startDate: doc.data().startDate,
      endDate: doc.data().endDate,
      location: doc.data().location,
      imageUrls: doc.data().imageUrls || [],
      titleImageUrl: doc.data().titleImageUrl || '',
    }));
  }

  public async getChatroomMessages(cityId: string, chatroomId: string): Promise<Message[]> {
    const db = this.firebaseService.getClientFirestore();
    const messagesRef = collection(db, 'cities', cityId, 'chatrooms', chatroomId, 'messages');
    const snapshot = await getDocs(messagesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      cityId,
      chatroomId,
      content: doc.data().content,
      senderId: doc.data().senderId,
      senderName: doc.data().senderName,
      timestamp: doc.data().timestamp,
      editedAt: doc.data().editedAt || null,
      readBy: doc.data().readBy || [],
    }));
  }

  public async getAllMessages(): Promise<Message[]> {
    const db = this.firebaseService.getClientFirestore();
    const groupRef = collectionGroup(db, 'messages');
    const snapshot = await getDocs(groupRef);
    return snapshot.docs.map(doc => {
      const chatroomRef = doc.ref.parent.parent;
      const cityRef = chatroomRef?.parent.parent;
      return {
        id: doc.id,
        cityId: cityRef?.id || '',
        chatroomId: chatroomRef?.id || '',
        content: doc.data().content,
        senderId: doc.data().senderId,
        senderName: doc.data().senderName,
        timestamp: doc.data().timestamp,
        editedAt: doc.data().editedAt || null,
        readBy: doc.data().readBy || [],
      };
    });
  }
} 