import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  SpecialPoll,
  SpecialPollStatus,
  SpecialPollResponse,
} from './interfaces/special-poll.interface';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { DateTimeUtils } from '../utils/date-time.utils';
import { UsersService } from '../users/users.service';

@Injectable()
export class SpecialPollsService {
  private readonly logger = new Logger(SpecialPollsService.name);
  private readonly collection = 'special_polls';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

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

  async findAll(): Promise<SpecialPoll[]> {
    try {
      this.logger.debug('Getting all special polls');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as SpecialPoll,
      );
    } catch (error) {
      this.logger.error(`Error getting all special polls: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Getting special poll ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Special poll not found');
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as SpecialPoll;
    } catch (error) {
      this.logger.error(`Error getting special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async create(createSpecialPollDto: CreateSpecialPollDto): Promise<SpecialPoll> {
    try {
      this.logger.debug('Creating new special poll');
      const db = this.firebaseService.getFirestore();

      const pollData = {
        ...createSpecialPollDto,
        responses: [],
        status: SpecialPollStatus.PENDING,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      const docRef = await db.collection(this.collection).add(this.removeUndefined(pollData));

      return {
        id: docRef.id,
        ...pollData,
      } as SpecialPoll;
    } catch (error) {
      this.logger.error(`Error creating special poll: ${error.message}`);
      throw error;
    }
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateSpecialPollStatusDto,
  ): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Updating status of special poll ${id}`);
      await this.findOne(id);

      const db = this.firebaseService.getFirestore();
      const updateData = {
        status: updateStatusDto.status,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error updating status of special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async addResponse(id: string, userId: string, response: string): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Adding response to special poll ${id}`);
      const poll = await this.findOne(id);

      if (poll.status !== SpecialPollStatus.ACTIVE) {
        throw new BadRequestException('Can only add responses to active polls');
      }

      const userData = await this.usersService.getById(userId);
      if (!userData || 'businessIds' in userData || !userData.name) {
        throw new NotFoundException('User not found');
      }

      const newResponse: SpecialPollResponse = {
        userId,
        userName: userData.name,
        response,
        createdAt: DateTimeUtils.getBerlinTime(),
      };

      const db = this.firebaseService.getFirestore();
      const updateData = {
        responses: [...poll.responses, newResponse],
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error adding response to special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async removeResponse(id: string, userId: string): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Removing response from special poll ${id}`);
      const poll = await this.findOne(id);

      const updatedResponses = poll.responses.filter(response => response.userId !== userId);

      const db = this.firebaseService.getFirestore();
      const updateData = {
        responses: updatedResponses,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error removing response from special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting special poll ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Special poll not found');
      }

      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateResponses(id: string, responses: SpecialPollResponse[]): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Updating responses for special poll ${id}`);
      await this.findOne(id);

      const db = this.firebaseService.getFirestore();
      const updateData = {
        responses,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error updating responses for special poll ${id}: ${error.message}`);
      throw error;
    }
  }
}
