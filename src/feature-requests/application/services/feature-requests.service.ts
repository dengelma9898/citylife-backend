import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { FeatureRequest } from '../../domain/entities/feature-request.entity';
import {
  FeatureRequestRepository,
  FEATURE_REQUEST_REPOSITORY,
} from '../../domain/repositories/feature-request.repository';
import { FeatureRequestStatus } from '../../domain/enums/feature-request-status.enum';
import { CreateFeatureRequestDto } from '../../dto/create-feature-request.dto';
import { FeatureRequestDto } from '../../dto/feature-request.dto';

@Injectable()
export class FeatureRequestsService {
  private readonly logger = new Logger(FeatureRequestsService.name);

  constructor(
    @Inject(FEATURE_REQUEST_REPOSITORY)
    private readonly featureRequestRepository: FeatureRequestRepository,
  ) {}

  async getAll(currentUserId: string): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.featureRequestRepository.findAll();
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async getById(id: string, currentUserId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    return this.toDto(featureRequest, currentUserId);
  }

  async getByStatus(status: FeatureRequestStatus, currentUserId: string): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.featureRequestRepository.findByStatus(status);
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async getMyFeatureRequests(currentUserId: string): Promise<FeatureRequestDto[]> {
    const featureRequests = await this.featureRequestRepository.findByAuthorId(currentUserId);
    return featureRequests.map(fr => this.toDto(fr, currentUserId));
  }

  async create(dto: CreateFeatureRequestDto, authorId: string): Promise<FeatureRequestDto> {
    const featureRequest = FeatureRequest.create({
      title: dto.title,
      description: dto.description,
      imageUrls: [],
      authorId,
    });
    const created = await this.featureRequestRepository.create(featureRequest);
    this.logger.log(`Feature request created: ${created.id} by user ${authorId}`);
    return this.toDto(created, authorId);
  }

  async addImages(id: string, imageUrls: string[], currentUserId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
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
    const saved = await this.featureRequestRepository.update(id, updated);
    return this.toDto(saved, currentUserId);
  }

  async removeImage(id: string, imageUrl: string, currentUserId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
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
    const saved = await this.featureRequestRepository.update(id, updated);
    return this.toDto(saved, currentUserId);
  }

  async vote(id: string, userId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.hasUserVoted(userId)) {
      throw new BadRequestException('User has already voted for this feature request');
    }
    const updated = featureRequest.addVote(userId);
    const saved = await this.featureRequestRepository.update(id, updated);
    this.logger.log(`User ${userId} voted for feature request ${id}`);
    return this.toDto(saved, userId);
  }

  async removeVote(id: string, userId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (!featureRequest.hasUserVoted(userId)) {
      throw new BadRequestException('User has not voted for this feature request');
    }
    const updated = featureRequest.removeVote(userId);
    const saved = await this.featureRequestRepository.update(id, updated);
    this.logger.log(`User ${userId} removed vote from feature request ${id}`);
    return this.toDto(saved, userId);
  }

  async setInProgress(id: string, adminId: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
    if (!featureRequest) {
      throw new NotFoundException('Feature request not found');
    }
    if (featureRequest.status !== FeatureRequestStatus.OPEN) {
      throw new BadRequestException('Only open feature requests can be set to in progress');
    }
    const updated = featureRequest.setInProgress();
    const saved = await this.featureRequestRepository.update(id, updated);
    this.logger.log(`Feature request ${id} set to in progress by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async complete(id: string, adminId: string, comment: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
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
    const saved = await this.featureRequestRepository.update(id, updated);
    this.logger.log(`Feature request ${id} completed by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async reject(id: string, adminId: string, comment: string): Promise<FeatureRequestDto> {
    const featureRequest = await this.featureRequestRepository.findById(id);
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
    const saved = await this.featureRequestRepository.update(id, updated);
    this.logger.log(`Feature request ${id} rejected by admin ${adminId}`);
    return this.toDto(saved, adminId);
  }

  async delete(id: string): Promise<void> {
    await this.featureRequestRepository.delete(id);
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

