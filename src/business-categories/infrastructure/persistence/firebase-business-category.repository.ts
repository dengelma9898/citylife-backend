import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  BusinessCategory,
  BusinessCategoryProps,
} from '../../domain/entities/business-category.entity';
import { BusinessCategoryRepository } from '../../domain/repositories/business-category.repository';

@Injectable()
export class FirebaseBusinessCategoryRepository implements BusinessCategoryRepository {
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

  private toPlainObject(entity: BusinessCategory): Omit<BusinessCategoryProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toBusinessCategoryProps(data: any, id: string): BusinessCategoryProps {
    return {
      id,
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findAll(): Promise<BusinessCategory[]> {
    const db = this.firebaseService.getClientFirestore();
    const categoriesCol = collection(db, 'business_categories');
    const snapshot = await getDocs(categoriesCol);

    return snapshot.docs.map(doc =>
      BusinessCategory.fromProps(this.toBusinessCategoryProps(doc.data(), doc.id)),
    );
  }

  async findById(id: string): Promise<BusinessCategory | null> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return BusinessCategory.fromProps(this.toBusinessCategoryProps(docSnap.data(), docSnap.id));
  }

  async create(category: BusinessCategory): Promise<BusinessCategory> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = await addDoc(
      collection(db, 'business_categories'),
      this.toPlainObject(category),
    );

    return BusinessCategory.fromProps({
      ...category.toJSON(),
      id: docRef.id,
    });
  }

  async update(id: string, category: BusinessCategory): Promise<BusinessCategory> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Business category not found');
    }

    await updateDoc(docRef, this.toPlainObject(category));

    return BusinessCategory.fromProps({
      ...category.toJSON(),
      id,
    });
  }

  async delete(id: string): Promise<void> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new NotFoundException('Business category not found');
    }

    await deleteDoc(docRef);
  }
}
