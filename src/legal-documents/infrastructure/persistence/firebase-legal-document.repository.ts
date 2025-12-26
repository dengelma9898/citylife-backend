import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { LegalDocument, LegalDocumentProps } from '../../domain/entities/legal-document.entity';
import { LegalDocumentRepository } from '../../domain/repositories/legal-document.repository';
import { LegalDocumentType } from '../../domain/entities/legal-document.entity';

@Injectable()
export class FirebaseLegalDocumentRepository implements LegalDocumentRepository {
  private readonly logger = new Logger(FirebaseLegalDocumentRepository.name);
  private readonly collection = 'legal_documents';

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

  private toPlainObject(entity: LegalDocument): Omit<LegalDocumentProps, 'id'> {
    const { id, ...data } = entity.toJSON();
    return this.removeUndefined(data);
  }

  private toEntityProps(data: any, id: string): LegalDocumentProps {
    return {
      id,
      type: data.type,
      content: data.content,
      version: data.version || 1,
      createdAt: data.createdAt || new Date().toISOString(),
      createdBy: data.createdBy,
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
  }

  async save(document: LegalDocument): Promise<LegalDocument> {
    try {
      this.logger.debug(`Saving legal document ${document.id} of type ${document.type}`);
      const db = this.firebaseService.getFirestore();
      const plainData = this.toPlainObject(document);
      await db.collection(this.collection).doc(document.id).set(plainData);
      return document;
    } catch (error) {
      this.logger.error(`Error saving legal document ${document.id}: ${error.message}`);
      throw error;
    }
  }

  async findById(id: string): Promise<LegalDocument | null> {
    try {
      this.logger.debug(`Finding legal document with id: ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return LegalDocument.fromProps(this.toEntityProps(doc.data(), doc.id));
    } catch (error) {
      this.logger.error(`Error finding legal document ${id}: ${error.message}`);
      throw error;
    }
  }

  async findByType(type: LegalDocumentType): Promise<LegalDocument[]> {
    try {
      this.logger.debug(`Finding legal documents of type: ${type}`);
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).where('type', '==', type).get();
      return snapshot.docs.map(doc =>
        LegalDocument.fromProps(this.toEntityProps(doc.data(), doc.id)),
      );
    } catch (error) {
      this.logger.error(`Error finding legal documents by type ${type}: ${error.message}`);
      throw error;
    }
  }

  async findLatestByType(type: LegalDocumentType): Promise<LegalDocument | null> {
    try {
      this.logger.debug(`Finding latest legal document of type: ${type}`);
      const db = this.firebaseService.getFirestore();
      const snapshot = await db
        .collection(this.collection)
        .where('type', '==', type)
        .orderBy('version', 'desc')
        .limit(1)
        .get();
      if (snapshot.empty) {
        return null;
      }
      return LegalDocument.fromProps(
        this.toEntityProps(snapshot.docs[0].data(), snapshot.docs[0].id),
      );
    } catch (error) {
      this.logger.error(`Error finding latest legal document by type ${type}: ${error.message}`);
      throw error;
    }
  }

  async update(document: LegalDocument): Promise<LegalDocument> {
    try {
      this.logger.debug(`Updating legal document ${document.id}`);
      const db = this.firebaseService.getFirestore();
      const plainData = this.toPlainObject(document);
      await db.collection(this.collection).doc(document.id).update(plainData);
      return document;
    } catch (error) {
      this.logger.error(`Error updating legal document ${document.id}: ${error.message}`);
      throw error;
    }
  }
}
