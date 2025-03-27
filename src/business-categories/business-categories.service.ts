import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BusinessCategory } from './interfaces/business-category.interface';
import { CreateBusinessCategoryDto } from './dto/create-business-category.dto';
import { UpdateBusinessCategoryDto } from './dto/update-business-category.dto';
import { KeywordsService } from '../keywords/keywords.service';

@Injectable()
export class BusinessCategoriesService {
  private readonly logger = new Logger(BusinessCategoriesService.name);

  constructor(private readonly keywordsService: KeywordsService) {}

  public async getAll(): Promise<BusinessCategory[]> {
    this.logger.debug('Getting all business categories');
    const db = getFirestore();
    const categoriesCol = collection(db, 'business_categories');
    const snapshot = await getDocs(categoriesCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BusinessCategory));
  }

  public async getById(id: string): Promise<BusinessCategory | null> {
    this.logger.debug(`Getting business category ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as BusinessCategory;
  }

  public async create(data: CreateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug('Creating business category');
    const db = getFirestore();
    
    const categoryData: Omit<BusinessCategory, 'id'> = {
      name: data.name,
      iconName: data.iconName,
      description: data.description,
      keywordIds: data.keywordIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'business_categories'), categoryData);
    
    return {
      id: docRef.id,
      ...categoryData
    };
  }

  public async update(id: string, data: UpdateBusinessCategoryDto): Promise<BusinessCategory> {
    this.logger.debug(`Updating business category ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business category not found');
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
    } as BusinessCategory;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting business category ${id}`);
    const db = getFirestore();
    const docRef = doc(db, 'business_categories', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Business category not found');
    }

    await deleteDoc(docRef);
  }

  /**
   * Holt alle Business-Kategorien und lädt die zugehörigen Keywords
   */
  public async getAllWithKeywords(): Promise<BusinessCategory[]> {
    const categories = await this.getAll();
    console.log('getAllWithKeywords categories', categories);
    // Kategorien mit Keywords anreichern
    const categoriesWithKeywords = await Promise.all(
      categories.map(async (category) => {
        if (category.keywordIds && category.keywordIds.length > 0) {
          // Keywords über den KeywordsService laden
          const keywords = await Promise.all(
            category.keywordIds.map(id => this.keywordsService.getById(id))
          );

          return {
            ...category,
            keywords: keywords.filter(keyword => keyword !== null)
          };
        }
        return {
          ...category,
          keywords: []
        };
      })
    );

    return categoriesWithKeywords;
  }
} 