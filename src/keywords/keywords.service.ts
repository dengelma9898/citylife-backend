import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';

@Injectable()
export class KeywordsService {
  private readonly logger = new Logger(KeywordsService.name);

  public async getAll(): Promise<Keyword[]> {
    this.logger.debug('Getting all keywords');
    const db = getFirestore();
    const keywordsCol = collection(db, 'keywords');
    const snapshot = await getDocs(keywordsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Keyword));
  }

  public async getById(id: string): Promise<Keyword | null> {
    this.logger.debug(`Getting keyword ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'keywords', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Keyword;
  }

  public async create(data: CreateKeywordDto): Promise<Keyword> {
    this.logger.debug('Creating keyword');
    const db = getFirestore();
    
    const keywordData: Omit<Keyword, 'id'> = {
      name: data.name,
      description: data.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'keywords'), keywordData);
    
    return {
      id: docRef.id,
      ...keywordData
    };
  }

  public async update(id: string, data: UpdateKeywordDto): Promise<Keyword> {
    this.logger.debug(`Updating keyword ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'keywords', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Keyword not found');
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
    } as Keyword;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting keyword ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'keywords', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Keyword not found');
    }

    await deleteDoc(docRef);
  }
} 