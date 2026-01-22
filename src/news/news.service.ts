import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  NewsItem,
  TextNewsItem,
  ImageNewsItem,
  PollNewsItem,
  PollOption,
  Reaction,
} from './interfaces/news-item.interface';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto } from './dto/create-poll-news.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../firebase/firebase.service';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { DateTimeUtils } from '../utils/date-time.utils';
import { NotificationService } from '../notifications/application/services/notification.service';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly collectionName = 'news';
  private readonly MAX_NEWS_COUNT = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly firebaseStorageService: FirebaseStorageService,
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

  public async getAll(): Promise<NewsItem[]> {
    try {
      this.logger.debug('Getting all news items');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collectionName).get();

      const newsItems = snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as NewsItem,
      );

      return this.populateAuthorInfo(newsItems);
    } catch (error) {
      this.logger.error(`Error getting all news items: ${error.message}`);
      throw error;
    }
  }

  public async getById(id: string): Promise<NewsItem | null> {
    try {
      this.logger.debug(`Getting news item ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      const newsItem = {
        id: doc.id,
        ...doc.data(),
      } as NewsItem;

      const enrichedItems = await this.populateAuthorInfo([newsItem]);
      return enrichedItems[0];
    } catch (error) {
      this.logger.error(`Error getting news item ${id}: ${error.message}`);
      throw error;
    }
  }

  private async populateAuthorInfo(newsItems: NewsItem[]): Promise<NewsItem[]> {
    try {
      const authorIds = newsItems
        .map(item => item.createdBy)
        .filter((id): id is string => id !== undefined && id !== null);

      if (authorIds.length === 0) {
        return newsItems;
      }

      const userProfiles = await this.usersService.getUserProfilesByIds(authorIds);

      return newsItems.map(item => {
        if (item.createdBy) {
          const userProfile = userProfiles.get(item.createdBy);
          if (userProfile) {
            item.authorName = userProfile.name || 'Unbekannter Benutzer';
            item.authorImageUrl = userProfile.profilePictureUrl;
          }
        }

        if (item.type === 'poll') {
          this.transformPollForClient(item as PollNewsItem);
        }

        return item;
      });
    } catch (error) {
      this.logger.error(`Error populating author info: ${error.message}`);
      return newsItems;
    }
  }

  private transformPollForClient(pollItem: PollNewsItem): void {
    const pollInfo = {
      options: pollItem.options.map(option => ({
        id: option.id,
        text: option.text,
        voters: option.voters,
      })),
      endDate: pollItem.expiresAt,
      allowMultipleChoices: pollItem.allowMultipleAnswers,
      votes: this.createVotesMap(pollItem.options),
      updatedAt: pollItem.updatedAt,
      createdAt: pollItem.createdAt,
    };

    (pollItem as any).content = pollItem.question;
    (pollItem as any).pollInfo = pollInfo;
  }

  private createVotesMap(options: PollOption[]): number {
    let totalVotes = 0;
    for (const option of options) {
      totalVotes += option.voters.length;
    }
    return totalVotes;
  }

  public async createTextNews(data: CreateTextNewsDto): Promise<TextNewsItem> {
    try {
      this.logger.debug('Creating text news item');
      const db = this.firebaseService.getFirestore();

      const newsItem: Omit<TextNewsItem, 'id'> = {
        type: 'text',
        content: data.content,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
        createdBy: data.authorId,
        reactions: [],
        views: 0,
        bearbeitet: false,
      };

      return this.saveNewsItem(newsItem) as Promise<TextNewsItem>;
    } catch (error) {
      this.logger.error(`Error creating text news: ${error.message}`);
      throw error;
    }
  }

  public async createImageNews(data: CreateImageNewsDto): Promise<ImageNewsItem> {
    try {
      this.logger.debug('Creating image news item');
      const db = this.firebaseService.getFirestore();

      const newsItem: Omit<ImageNewsItem, 'id'> = {
        type: 'image',
        imageUrls: data.imageUrls,
        content: data.content,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
        createdBy: data.authorId,
        reactions: [],
        views: 0,
        bearbeitet: false,
      };

      return this.saveNewsItem(newsItem) as Promise<ImageNewsItem>;
    } catch (error) {
      this.logger.error(`Error creating image news: ${error.message}`);
      throw error;
    }
  }

  public async createPollNews(data: CreatePollNewsDto): Promise<PollNewsItem> {
    try {
      this.logger.debug('Creating poll news item');
      const db = this.firebaseService.getFirestore();

      const options: PollOption[] = data.pollInfo.options.map(option => ({
        id: option.id,
        text: option.text,
        voters: [],
      }));

      const newsItem: Omit<PollNewsItem, 'id'> = {
        type: 'poll',
        question: data.content,
        options,
        expiresAt: data.pollInfo.endDate,
        allowMultipleAnswers: data.pollInfo.allowMultipleChoices,
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
        createdBy: data.authorId,
        reactions: [],
        views: 0,
        votes: 0,
        bearbeitet: false,
      };

      return this.saveNewsItem(newsItem) as Promise<PollNewsItem>;
    } catch (error) {
      this.logger.error(`Error creating poll news: ${error.message}`);
      throw error;
    }
  }

  private async saveNewsItem(newsItem: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    try {
      const db = this.firebaseService.getFirestore();
      const docRef = await db.collection(this.collectionName).add(this.removeUndefined(newsItem));
      const savedNewsItem = {
        id: docRef.id,
        ...newsItem,
      } as NewsItem;
      await this.enforceNewsLimit();
      await this.sendNewNewsNotification(savedNewsItem);
      return savedNewsItem;
    } catch (error) {
      this.logger.error(`Error saving news item: ${error.message}`);
      throw error;
    }
  }

  private async enforceNewsLimit(): Promise<void> {
    try {
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collectionName).orderBy('createdAt', 'asc').get();
      const newsCount = snapshot.docs.length;
      if (newsCount <= this.MAX_NEWS_COUNT) {
        return;
      }
      const itemsToDelete = newsCount - this.MAX_NEWS_COUNT;
      this.logger.log(`News limit exceeded. Deleting ${itemsToDelete} oldest news item(s).`);
      const oldestDocs = snapshot.docs.slice(0, itemsToDelete);
      for (const doc of oldestDocs) {
        const newsData = doc.data() as NewsItem;
        await this.deleteNewsWithImages(doc.id, newsData);
      }
    } catch (error) {
      this.logger.error(`Error enforcing news limit: ${error.message}`);
    }
  }

  private async deleteNewsWithImages(newsId: string, newsData: NewsItem): Promise<void> {
    try {
      this.logger.debug(`Deleting news item ${newsId} with associated images`);
      if (newsData.type === 'image') {
        const imageNewsData = newsData as ImageNewsItem;
        if (imageNewsData.imageUrls && imageNewsData.imageUrls.length > 0) {
          const deletePromises = imageNewsData.imageUrls.map(url =>
            this.firebaseStorageService.deleteFile(url).catch(error => {
              this.logger.warn(`Failed to delete image ${url}: ${error.message}`);
            }),
          );
          await Promise.all(deletePromises);
          this.logger.debug(`Deleted ${imageNewsData.imageUrls.length} images for news ${newsId}`);
        }
      }
      const db = this.firebaseService.getFirestore();
      await db.collection(this.collectionName).doc(newsId).delete();
      this.logger.log(`Deleted oldest news item ${newsId}`);
    } catch (error) {
      this.logger.error(`Error deleting news with images ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async update(
    id: string,
    data: Partial<NewsItem>,
    options?: { skipBearbeitetFlag?: boolean },
  ): Promise<NewsItem> {
    try {
      this.logger.debug(`Updating news item ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('News item not found');
      }

      const isContentOrImageUpdate = 'content' in data || 'imageUrls' in data || 'question' in data;
      const hasExplicitBearbeitet = 'bearbeitet' in data;

      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
        ...(isContentOrImageUpdate &&
          !options?.skipBearbeitetFlag &&
          !hasExplicitBearbeitet && { bearbeitet: true }),
      };

      await db.collection(this.collectionName).doc(id).update(this.removeUndefined(updateData));

      const updatedDoc = await db.collection(this.collectionName).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as NewsItem;
    } catch (error) {
      this.logger.error(`Error updating news item ${id}: ${error.message}`);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting news item ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collectionName).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('News item not found');
      }

      await db.collection(this.collectionName).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting news item ${id}: ${error.message}`);
      throw error;
    }
  }

  public async postReaction(
    newsId: string,
    createReactionDto: CreateReactionDto,
  ): Promise<NewsItem> {
    try {
      this.logger.debug(
        `Adding reaction ${createReactionDto.reactionType} for news item ${newsId} by user ${createReactionDto.userId}`,
      );
      const db = this.firebaseService.getFirestore();
      const newsRef = db.collection(this.collectionName).doc(newsId);

      let updatedNews: NewsItem;

      await db.runTransaction(async transaction => {
        const newsDoc = await transaction.get(newsRef);

        if (!newsDoc.exists) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }

        const newsData = newsDoc.data() as NewsItem;
        const reactions = newsData.reactions || [];

        const existingReactionIndex = reactions.findIndex(
          reaction => reaction.userId === createReactionDto.userId,
        );

        let updatedReactions: Reaction[];

        if (existingReactionIndex >= 0) {
          if (reactions[existingReactionIndex].type === createReactionDto.reactionType) {
            updatedReactions = [
              ...reactions.slice(0, existingReactionIndex),
              ...reactions.slice(existingReactionIndex + 1),
            ];
          } else {
            const updatedReaction: Reaction = {
              userId: createReactionDto.userId,
              type: createReactionDto.reactionType,
            };

            updatedReactions = [
              ...reactions.slice(0, existingReactionIndex),
              updatedReaction,
              ...reactions.slice(existingReactionIndex + 1),
            ];
          }
        } else {
          updatedReactions = [
            ...reactions,
            {
              userId: createReactionDto.userId,
              type: createReactionDto.reactionType,
            },
          ];
        }

        transaction.update(newsRef, {
          reactions: updatedReactions,
          updatedAt: DateTimeUtils.getBerlinTime(),
        });
      });

      const updatedNewsDoc = await newsRef.get();
      updatedNews = {
        id: updatedNewsDoc.id,
        ...updatedNewsDoc.data(),
      } as NewsItem;

      const enrichedNews = await this.populateAuthorInfo([updatedNews]);
      return enrichedNews[0];
    } catch (error) {
      this.logger.error(`Error adding reaction for news ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async votePoll(newsId: string, voteData: VotePollDto): Promise<PollNewsItem> {
    try {
      this.logger.debug(
        `User ${voteData.userId} voting on poll ${newsId} for option: ${voteData.optionId}`,
      );
      const db = this.firebaseService.getFirestore();
      const newsRef = db.collection(this.collectionName).doc(newsId);

      let updatedPoll: PollNewsItem;

      await db.runTransaction(async transaction => {
        const newsDoc = await transaction.get(newsRef);

        if (!newsDoc.exists) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }

        const newsData = newsDoc.data() as PollNewsItem;

        if (newsData.type !== 'poll') {
          throw new BadRequestException('News item is not a poll');
        }

        if (newsData.expiresAt && new Date(newsData.expiresAt) < new Date()) {
          throw new BadRequestException('Poll has expired');
        }

        const option = newsData.options.find(opt => opt.id === voteData.optionId);
        if (!option) {
          throw new BadRequestException(`Option with ID ${voteData.optionId} not found`);
        }

        let updatedOptions = newsData.options.map(option => {
          if (option.voters.includes(voteData.userId)) {
            return {
              ...option,
              voters: option.voters.filter(voterId => voterId !== voteData.userId),
            };
          }
          return option;
        });

        updatedOptions = updatedOptions.map(option => {
          if (option.id === voteData.optionId) {
            return {
              ...option,
              voters: [...option.voters, voteData.userId],
            };
          }
          return option;
        });

        const totalVotes = updatedOptions.reduce((sum, option) => sum + option.voters.length, 0);

        transaction.update(newsRef, {
          options: updatedOptions,
          votes: totalVotes,
          updatedAt: DateTimeUtils.getBerlinTime(),
        });
      });

      const updatedNewsDoc = await newsRef.get();
      updatedPoll = {
        id: updatedNewsDoc.id,
        ...updatedNewsDoc.data(),
      } as PollNewsItem;

      return updatedPoll;
    } catch (error) {
      this.logger.error(`Error voting on poll ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async incrementViewCount(newsId: string): Promise<void> {
    try {
      this.logger.debug(`Incrementing view count for news ${newsId}`);
      const db = this.firebaseService.getFirestore();
      const newsRef = db.collection(this.collectionName).doc(newsId);

      await db.runTransaction(async transaction => {
        const newsDoc = await transaction.get(newsRef);

        if (!newsDoc.exists) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }

        const newsData = newsDoc.data() as NewsItem;
        const currentCount = newsData.views || 0;

        transaction.update(newsRef, {
          views: currentCount + 1,
          updatedAt: DateTimeUtils.getBerlinTime(),
        });
      });
    } catch (error) {
      this.logger.error(`Error incrementing view count for news ${newsId}: ${error.message}`);
      throw error;
    }
  }

  private async sendNewNewsNotification(newsItem: NewsItem): Promise<void> {
    try {
      this.logger.log(`[NOTIFICATION] Starting notification process for news ${newsItem.id}`);
      const newsTitle =
        newsItem.type === 'poll'
          ? (newsItem as PollNewsItem).question
          : (newsItem as TextNewsItem | ImageNewsItem).content;
      this.logger.debug(`[NOTIFICATION] News title: ${newsTitle}`);
      const allUsers = await this.usersService.getAllUserProfilesWithIds();
      this.logger.debug(`[NOTIFICATION] Found ${allUsers.length} total users`);
      const usersToNotify = allUsers.filter(({ id, profile }) => {
        const notificationPreferences = profile.notificationPreferences;
        const newNewsEnabled =
          notificationPreferences?.newNews !== undefined ? notificationPreferences.newNews : false;
        if (!newNewsEnabled) {
          this.logger.debug(`[NOTIFICATION] User ${id} has newNews disabled`);
        }
        return newNewsEnabled;
      });
      this.logger.log(
        `[NOTIFICATION] Filtered to ${usersToNotify.length} users with newNews enabled`,
      );
      if (usersToNotify.length === 0) {
        this.logger.warn(`[NOTIFICATION] No users to notify for news ${newsItem.id}`);
        return;
      }
      const sendPromises = usersToNotify.map(async ({ id }) => {
        try {
          this.logger.debug(`[NOTIFICATION] Sending to user ${id}`);
          await this.notificationService.sendToUser(id, {
            title: 'Neue Nachricht verfügbar',
            body: newsTitle,
            data: {
              type: 'NEW_NEWS',
              newsId: newsItem.id,
              newsTitle: newsTitle,
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
        `[NOTIFICATION] Completed notification process for news ${newsItem.id}. Sent to ${usersToNotify.length} users.`,
      );
    } catch (error: any) {
      this.logger.error(
        `[NOTIFICATION] Error sending new news notification for news ${newsItem.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
