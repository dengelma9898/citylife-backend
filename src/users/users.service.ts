import { Injectable, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile } from './interfaces/user-profile.interface';

@Injectable()
export class UsersService {
  public async getAll(): Promise<UserProfile[]> {
    const db = getFirestore();
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfile));
  }

  public async getById(id: string): Promise<UserProfile | null> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as UserProfile;
  }

  public async create(id: string, profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    await setDoc(docRef, profile);
    
    return {
      id,
      ...profile
    };
  }

  public async update(id: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('User not found');
    }

    await updateDoc(docRef, profile);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as UserProfile;
  }

  public async delete(id: string): Promise<void> {
    const db = getFirestore();
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('User not found');
    }

    await deleteDoc(docRef);
  }
} 