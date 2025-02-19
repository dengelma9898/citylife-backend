import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { BusinessUser } from './interfaces/business-user.interface';
import { CreateBusinessUserDto } from './dto/create-business-user.dto';

@Injectable()
export class BusinessUsersService {
  private readonly logger = new Logger(BusinessUsersService.name);

  public async getAll(): Promise<BusinessUser[]> {
    this.logger.debug('Getting all business users');
    const db = getFirestore();
    const usersCol = collection(db, 'business_users');
    const snapshot = await getDocs(usersCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessUser));
  }

  public async getById(id: string): Promise<BusinessUser | null> {
    this.logger.debug(`Getting business user ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as BusinessUser;
  }

  public async create(data: CreateBusinessUserDto): Promise<BusinessUser> {
    this.logger.debug('Creating business user');
    const db = getFirestore();
    
    const userData: Omit<BusinessUser, 'id'> = {
      email: data.email,
      businessIds: [data.businessId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    };

    const docRef = doc(db, 'business_users', data.userId);
    await setDoc(docRef, userData);
    
    return {
      id: data.userId,
      ...userData
    };
  }

  public async update(id: string, data: Partial<CreateBusinessUserDto>): Promise<BusinessUser> {
    this.logger.debug(`Updating business user ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business user not found');
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
    } as BusinessUser;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business user ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_users', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business user not found');
    }

    await deleteDoc(docRef);
  }
} 