import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../firebase/firebase.service';
import {
  SpecialPoll,
  SpecialPollStatus,
  SpecialPollResponse,
  LEGACY_SPECIAL_POLL_STATUS_CLOSED,
  LEGACY_SPECIAL_POLL_STATUS_PENDING,
} from './interfaces/special-poll.interface';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { DateTimeUtils } from '../utils/date-time.utils';
import { UsersService } from '../users/users.service';
import { NotificationService } from '../notifications/application/services/notification.service';
import { SpecialPollResponseDto } from './dto/special-poll-response.dto';

@Injectable()
export class SpecialPollsService {
  private readonly logger = new Logger(SpecialPollsService.name);
  private readonly collection = 'special_polls';

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
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

  /**
   * Maps legacy Firestore values (CLOSED, PENDING) to {@link SpecialPollStatus.ACTIVE}.
   */
  private normalizeStoredStatus(raw: unknown): SpecialPollStatus {
    if (
      raw === LEGACY_SPECIAL_POLL_STATUS_CLOSED ||
      raw === LEGACY_SPECIAL_POLL_STATUS_PENDING
    ) {
      return SpecialPollStatus.ACTIVE;
    }
    if (raw === SpecialPollStatus.INACTIVE) {
      return SpecialPollStatus.INACTIVE;
    }
    if (raw === SpecialPollStatus.ACTIVE) {
      return SpecialPollStatus.ACTIVE;
    }
    return SpecialPollStatus.ACTIVE;
  }

  private normalizeOneResponse(item: unknown): SpecialPollResponse {
    const row = item as Record<string, unknown>;
    const upvotedUserIds = Array.isArray(row?.upvotedUserIds)
      ? (row.upvotedUserIds as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];
    const id =
      typeof row?.id === 'string' && row.id.length > 0 ? row.id : randomUUID();
    return {
      id,
      userId: String(row?.userId ?? ''),
      userName: String(row?.userName ?? ''),
      response: String(row?.response ?? ''),
      createdAt: String(row?.createdAt ?? ''),
      upvotedUserIds,
    };
  }

  private normalizeResponses(raw: unknown): SpecialPollResponse[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map(item => this.normalizeOneResponse(item));
  }

  /**
   * Single place to convert Firestore documents to API-facing {@link SpecialPoll}.
   */
  private mapDocumentToSpecialPoll(
    id: string,
    data: Record<string, unknown> | undefined,
  ): SpecialPoll {
    const row = data ?? {};
    return {
      id,
      title: String(row.title ?? ''),
      responses: this.normalizeResponses(row.responses),
      status: this.normalizeStoredStatus(row.status),
      isHighlighted: Boolean(row.isHighlighted),
      createdAt: String(row.createdAt ?? ''),
      updatedAt: String(row.updatedAt ?? ''),
    };
  }

  private responsesFromAdminDtos(dtos: SpecialPollResponseDto[]): SpecialPollResponse[] {
    return dtos.map(dto =>
      this.normalizeOneResponse({
        id: dto.id,
        userId: dto.userId,
        userName: dto.userName,
        response: dto.response,
        createdAt: dto.createdAt,
        upvotedUserIds: dto.upvotedUserIds,
      }),
    );
  }

  async findAll(
    highlightedOnly?: boolean,
    includeInactivePolls = false,
  ): Promise<SpecialPoll[]> {
    try {
      this.logger.debug('Getting all special polls');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).orderBy('createdAt', 'desc').get();
      let polls = snapshot.docs.map(doc =>
        this.mapDocumentToSpecialPoll(doc.id, doc.data() as Record<string, unknown>),
      );
      if (!includeInactivePolls) {
        polls = polls.filter(p => p.status !== SpecialPollStatus.INACTIVE);
      }
      if (highlightedOnly === true) {
        polls = polls.filter(p => p.isHighlighted);
      }
      return polls;
    } catch (error) {
      this.logger.error(`Error getting all special polls: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string, includeInactivePolls = false): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Getting special poll ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        throw new NotFoundException('Special poll not found');
      }
      const poll = this.mapDocumentToSpecialPoll(doc.id, doc.data() as Record<string, unknown>);
      if (!includeInactivePolls && poll.status === SpecialPollStatus.INACTIVE) {
        throw new NotFoundException('Special poll not found');
      }
      return poll;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async create(createSpecialPollDto: CreateSpecialPollDto): Promise<SpecialPoll> {
    try {
      this.logger.debug('Creating new special poll');
      const db = this.firebaseService.getFirestore();
      const isHighlighted = createSpecialPollDto.isHighlighted ?? false;
      const pollData = {
        title: createSpecialPollDto.title,
        isHighlighted,
        responses: [],
        status: SpecialPollStatus.ACTIVE,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      const docRef = await db.collection(this.collection).add(this.removeUndefined(pollData));
      const specialPoll = this.mapDocumentToSpecialPoll(
        docRef.id,
        pollData as unknown as Record<string, unknown>,
      );
      await this.sendNewSurveyNotification(specialPoll);
      return specialPoll;
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
      await this.findOne(id, true);
      const db = this.firebaseService.getFirestore();
      const updateData = {
        status: updateStatusDto.status,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      return this.findOne(id, true);
    } catch (error) {
      this.logger.error(`Error updating status of special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateHighlight(id: string, isHighlighted: boolean): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Updating highlight of special poll ${id}`);
      await this.findOne(id, true);
      const db = this.firebaseService.getFirestore();
      const updateData = {
        isHighlighted,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      return this.findOne(id, true);
    } catch (error) {
      this.logger.error(`Error updating highlight of special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async addResponse(id: string, userId: string, response: string): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Adding response to special poll ${id}`);
      const poll = await this.findOne(id);
      const userData = await this.usersService.getById(userId);
      if (!userData || 'businessIds' in userData || !userData.name) {
        throw new NotFoundException('User not found');
      }
      const newResponse: SpecialPollResponse = {
        id: randomUUID(),
        userId,
        userName: userData.name,
        response,
        createdAt: DateTimeUtils.getBerlinTime(),
        upvotedUserIds: [],
      };
      const db = this.firebaseService.getFirestore();
      const responsesForStore = [...poll.responses, newResponse].map(r => ({ ...r }));
      const updateData = {
        responses: responsesForStore,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Error adding response to special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  async toggleResponseUpvote(
    pollId: string,
    responseId: string,
    userId: string,
  ): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Toggling upvote on response ${responseId} of poll ${pollId}`);
      const poll = await this.findOne(pollId);
      const target = poll.responses.find(r => r.id === responseId);
      if (!target) {
        throw new NotFoundException('Response not found');
      }
      const hasUpvote = target.upvotedUserIds.includes(userId);
      const nextUpvoted = hasUpvote
        ? target.upvotedUserIds.filter(uid => uid !== userId)
        : [...target.upvotedUserIds, userId];
      const responsesForStore = poll.responses.map(r =>
        r.id === responseId ? { ...r, upvotedUserIds: nextUpvoted } : { ...r },
      );
      const db = this.firebaseService.getFirestore();
      const updateData = {
        responses: responsesForStore,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(pollId).update(this.removeUndefined(updateData));
      return this.findOne(pollId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error toggling upvote on response ${responseId} of poll ${pollId}: ${error.message}`,
      );
      throw error;
    }
  }

  async removeResponse(id: string, userId: string): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Removing response from special poll ${id}`);
      const poll = await this.findOne(id);
      const updatedResponses = poll.responses
        .filter(response => response.userId !== userId)
        .map(r => ({ ...r }));
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

  async updateResponses(id: string, responses: SpecialPollResponseDto[]): Promise<SpecialPoll> {
    try {
      this.logger.debug(`Updating responses for special poll ${id}`);
      await this.findOne(id, true);
      const normalized = this.responsesFromAdminDtos(responses);
      const db = this.firebaseService.getFirestore();
      const updateData = {
        responses: normalized.map(r => ({ ...r })),
        updatedAt: DateTimeUtils.getBerlinTime(),
      };
      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));
      return this.findOne(id, true);
    } catch (error) {
      this.logger.error(`Error updating responses for special poll ${id}: ${error.message}`);
      throw error;
    }
  }

  private async sendNewSurveyNotification(specialPoll: SpecialPoll): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for survey ${specialPoll.id}`);
      this.logger.debug(`[NOTIFICATION] Survey title: ${specialPoll.title}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const notificationPreferences = profile.notificationPreferences;
        const newSurveysEnabled =
          notificationPreferences?.newSurveys !== undefined
            ? notificationPreferences.newSurveys
            : false;
        if (!newSurveysEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has newSurveys disabled`);
        }
        return newSurveysEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with newSurveys enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for survey ${specialPoll.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Neue Umfrage verfügbar',
            body: specialPoll.title,
            data: {
              type: 'NEW_SURVEY',
              surveyId: specialPoll.id,
              surveyTitle: specialPoll.title,
            },
          });
          this.logger.debug(`[NOTIFICATION] Successfully sent to user ${id}`);
        } catch (error: any) {
          this.logger.error(
            `[NOTIFICATION] Error sending notification to user ${id}: ${error.message}`,
            error.stack,
          );
        }
      });
      await Promise.all(sendPromises);
      this.logger.log(
        `[NOTIFICATION] Completed notification process for survey ${specialPoll.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending new survey notification for survey ${specialPoll.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
