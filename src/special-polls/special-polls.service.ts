import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import {
  SpecialPoll,
  SpecialPollStatus,
  SpecialPollResponse,
} from './interfaces/special-poll.interface';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { DateTimeUtils } from '../utils/date-time.utils';
import { UsersService } from '../users/users.service';

@Injectable()
export class SpecialPollsService {
  private readonly logger = new Logger(SpecialPollsService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(): Promise<SpecialPoll[]> {
    this.logger.debug('Getting all special polls');
    const db = this.firebaseService.getClientFirestore();
    const pollsRef = collection(db, 'special_polls');
    const q = query(pollsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as SpecialPoll,
    );
  }

  async findOne(id: string): Promise<SpecialPoll> {
    this.logger.debug(`Getting special poll ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);
    const pollDoc = await getDoc(pollRef);

    if (!pollDoc.exists()) {
      throw new NotFoundException('Special poll not found');
    }

    return {
      id: pollDoc.id,
      ...pollDoc.data(),
    } as SpecialPoll;
  }

  async create(createSpecialPollDto: CreateSpecialPollDto): Promise<SpecialPoll> {
    this.logger.debug('Creating new special poll');
    const db = this.firebaseService.getClientFirestore();
    const pollsRef = collection(db, 'special_polls');

    const pollData = {
      ...createSpecialPollDto,
      responses: [],
      status: SpecialPollStatus.PENDING,
      createdAt: DateTimeUtils.getBerlinTime(),
      updatedAt: DateTimeUtils.getBerlinTime(),
    };

    const docRef = await addDoc(pollsRef, pollData);

    return {
      id: docRef.id,
      ...pollData,
    } as SpecialPoll;
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateSpecialPollStatusDto,
  ): Promise<SpecialPoll> {
    this.logger.debug(`Updating status of special poll ${id}`);
    const poll = await this.findOne(id);

    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);

    await updateDoc(pollRef, {
      status: updateStatusDto.status,
      updatedAt: DateTimeUtils.getBerlinTime(),
    });

    return this.findOne(id);
  }

  async addResponse(id: string, userId: string, response: string): Promise<SpecialPoll> {
    this.logger.debug(`Adding response to special poll ${id}`);
    const poll = await this.findOne(id);

    if (poll.status !== SpecialPollStatus.ACTIVE) {
      throw new BadRequestException('Can only add responses to active polls');
    }

    const userData = await this.usersService.getById(userId);
    if (!userData || 'businessIds' in userData || !userData.name) {
      throw new NotFoundException('User not found');
    }

    // Check if user already responded
    // if (poll.responses.some(response => response.userId === userId)) {
    //   throw new BadRequestException('User has already responded to this poll');
    // }

    const newResponse: SpecialPollResponse = {
      userId,
      userName: userData.name,
      response,
      createdAt: DateTimeUtils.getBerlinTime(),
    };

    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);

    await updateDoc(pollRef, {
      responses: [...poll.responses, newResponse],
      updatedAt: DateTimeUtils.getBerlinTime(),
    });

    return this.findOne(id);
  }

  async removeResponse(id: string, userId: string): Promise<SpecialPoll> {
    this.logger.debug(`Removing response from special poll ${id}`);
    const poll = await this.findOne(id);

    const updatedResponses = poll.responses.filter(response => response.userId !== userId);

    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);

    await updateDoc(pollRef, {
      responses: updatedResponses,
      updatedAt: DateTimeUtils.getBerlinTime(),
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.debug(`Deleting special poll ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);

    const pollDoc = await getDoc(pollRef);
    if (!pollDoc.exists()) {
      throw new NotFoundException('Special poll not found');
    }

    await deleteDoc(pollRef);
  }

  async updateResponses(id: string, responses: SpecialPollResponse[]): Promise<SpecialPoll> {
    this.logger.debug(`Updating responses for special poll ${id}`);
    const poll = await this.findOne(id);

    const db = this.firebaseService.getClientFirestore();
    const pollRef = doc(db, 'special_polls', id);

    await updateDoc(pollRef, {
      responses,
      updatedAt: DateTimeUtils.getBerlinTime(),
    });

    return this.findOne(id);
  }
}
