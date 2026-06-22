import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import { FeatureRequest, FeatureRequestProps } from '../../domain/entities/feature-request.entity';
import { FeatureRequestStatus } from '../../domain/enums/feature-request-status.enum';
import { CreateFeatureRequestDto } from '../../dto/create-feature-request.dto';
import { FeatureRequestDto } from '../../dto/feature-request.dto';

@Injectable()
export class FeatureRequestsService {
  private readonly logger = new Logger(FeatureRequestsService.name);
  private readonly collection = 'feature-requests';

  constructor(private readonly firebaseService: FirebaseService) {}

  private toFeatureRequestProps(data: Record<string, unknown>, id: string): FeatureRequestProps {
    return {
      id,
      title: data.title as string,
      description: data.description as string,
      imageUrls: (data.imageUrls as string[]) || [],
      authorId: data.authorId as string,
      status: data.status as FeatureRequestStatus,
      votes: (data.votes as FeatureRequestProps['votes']) || [],
      completion: (data.completion as FeatureRequestProps['completion']) || null,
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
    };
  }

  private async findAll(): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async findById(id: string): Promise<FeatureRequest | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data() as Record<string, unknown>, doc.id));
  }

  private async findByStatus(status: FeatureRequestStatus): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async findByAuthorId(authorId: string): Promise<FeatureRequest[]> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.collection)
      .where('authorId', '==', authorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc =>
      FeatureRequest.fromProps(this.toFeatureRequestProps(doc.data() as Record<string, unknown>, doc.id)),
    );
  }

  private async createEntity(featureRequest: FeatureRequest): Promise<FeatureRequest> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(featureRequest.id);
    await docRef.set(toFirestoreData(featureRequest));
    return FeatureRequest.fromProps({
      ...featureRequest.toJSON(),
      id: docRef.id,
    });
  }

  private async updateEntity(id: string, featureRequest: FeatureRequest): Promise<FeatureRequest> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Feature request not found');
    }
    await docRef.update(toFirestoreData(featureRequest));
    return FeatureRequest.fromProps({
      ...featureRequest.toJSON(),
      id,
    });
  }

  private async deleteEntity(id: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException('Feature request not found');
    }
    await docRef.delete();
  }

  async getAll(currentUserId: string): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.findAll();
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async getById(id: string, currentUserId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    return this.toDto(featureRequest, currentUserId);
  }

  async getByStatus(
    status: FeatureRequestStatus,
    currentUserId: string,
  ): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.findByStatus(status);
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async getMyFeatureRequests(currentUserId: string): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.findByAuthorId(currentUserId);
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async create(dto: CreateFeatureRequestDto, authorId: string): Promise<FeatureRequestDto> {
    const featureRequest = FeatureRequest.create({
      title: dto.title,
      description: dto.description,
      imageUrls: [],
      authorId,
    });
    const created = await this.createEntity(featureRequest);
    this.logger.log(`Feature request created: ${created.id} by user ${authorId}`);
    return this.toDto(created, authorId);
  }

  async addImages(
    id: string,
    imageUrls: string[],
    currentUserId: string,
  ): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.authorId !== currentUserId) {
      throw new BadRequestException('Only the author can add images');
    }
    const totalImages = featureRequest.imageUrls.length + imageUrls.length;
    if (totalImages > 3) {
      throw new BadRequestException('Maximum 3 images allowed per feature request');
    }
    const updated = featureRequest.update({
      imageUrls: [...featureRequest.imageUrls, ...imageUrls],
    });
    const saved = await this.updateEntity(id, updated);
    return this.toDto(saved, currentUserId);
  }

  async removeImage(
    id: string,
    imageUrl: string,
    currentUserId: string,
  ): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.authorId !== currentUserId) {
      throw new BadRequestException('Only the author can remove images');
    }
    if (!featureRequest.imageUrls.includes(imageUrl)) {
      throw new BadRequestException('Image not found in feature request');
    }
    const updated = featureRequest.update({
      imageUrls: featureRequest.imageUrls.filter(url => url !== imageUrl),
    });
    const saved = await this.updateEntity(id, updated);
    return this.toDto(saved, currentUserId);
  }

  async vote(id: string, userId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.hasUserVoted(userId)) {
      throw new BadRequestException('User has already voted for this feature request');
    }
    const updated = featureRequest.addVote(userId);
    const saved = await this.updateEntity(id, updated);
    this.logger.log(`User ${userId} voted for feature request ${id}`);
    return this.toDto(saved, userId);
  }

  async removeVote(id: string, userId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (!featureRequest.hasUserVoted(userId)) {
      throw new BadRequestException('User has not voted for this feature request');
    }
    const updated = featureRequest.removeVote(userId);
    const saved = await this.updateEntity(id, updated);
    this.logger.log(`User ${userId} removed vote from feature request ${id}`);
    return this.toDto(saved, userId);
  }

  async setInProgress(id: string, adminId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.status !== FeatureRequestStatus.OPEN) {
      throw new BadRequestException('Only open feature requests can be set to in progress');
    }
    const updated = featureRequest.setInProgress();
    const saved = await this.updateEntity(id, updated);
    this.logger.log(`Feature request ${id} set to in progress by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async complete(id: string, adminId: string, comment: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.status === FeatureRequestStatus.COMPLETED) {
      throw new BadRequestException('Feature request is already completed');
    }
    if (featureRequest.status === FeatureRequestStatus.REJECTED) {
      throw new BadRequestException('Feature request is already rejected');
    }
    const updated = featureRequest.complete(adminId, comment);
    const saved = await this.updateEntity(id, updated);
    this.logger.log(`Feature request ${id} completed by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async reject(id: string, adminId: string, comment: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.status === FeatureRequestStatus.COMPLETED) {
      throw new BadRequestException('Feature request is already completed');
    }
    if (featureRequest.status === FeatureRequestStatus.REJECTED) {
      throw new BadRequestException('Feature request is already rejected');
    }
    const updated = featureRequest.reject(adminId, comment);
    const saved = await this.updateEntity(id, updated);
    this.logger.log(`Feature request ${id} rejected by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async delete(id: string): Promise<void> {
    await this.deleteEntity(id);
    this.logger.log(`Feature request ${id} deleted`);
  }

  private toDto(featureRequest: FeatureRequest, currentUserId: string): FeatureRequestDto {
    return {
      id: featureRequest.id,
      title: featureRequest.title,
      description: featureRequest.description,
      imageUrls: featureRequest.imageUrls,
      authorId: featureRequest.authorId,
      status: featureRequest.status,
      voteCount: featureRequest.voteCount,
      hasUserVoted: featureRequest.hasUserVoted(currentUserId),
      completion: featureRequest.completion,
      createdAt: featureRequest.createdAt,
      updatedAt: featureRequest.updatedAt,
    };
  }
}
