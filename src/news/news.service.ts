import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, runTransaction, where, query } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { NewsItem, TextNewsItem, ImageNewsItem, PollNewsItem, AudioNewsItem, PollOption, SurveyNewsItem, SurveyOption, Reaction } from './interfaces/news-item.interface';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto, PollOptionDto } from './dto/create-poll-news.dto';
import { CreateAudioNewsDto } from './dto/create-audio-news.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { CreateSurveyNewsDto, SurveyOptionDto } from './dto/create-survey-news.dto';
import { VoteSurveyDto } from './dto/vote-survey.dto';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { UsersService } from '../users/users.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly collectionName = 'news';

  constructor(private readonly usersService: UsersService, private readonly firebaseService: FirebaseService) {}

  public async getAll(): Promise<NewsItem[]> {
    this.logger.debug('Getting all news items');
    const db = this.firebaseService.getClientFirestore();
    const newsCol = collection(db, this.collectionName);
    const snapshot = await getDocs(newsCol);
    
    const newsItems = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NewsItem));
    
    return this.populateAuthorInfo(newsItems);
  }

  public async getById(id: string): Promise<NewsItem | null> {
    this.logger.debug(`Getting news item ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const newsItem = {
      id: docSnap.id,
      ...docSnap.data()
    } as NewsItem;
    
    const enrichedItems = await this.populateAuthorInfo([newsItem]);
    return enrichedItems[0];
  }

  private async populateAuthorInfo(newsItems: NewsItem[]): Promise<NewsItem[]> {
    const enrichedItems: NewsItem[] = [];
    
    for (const item of newsItems) {
      if (item.createdBy) {
        try {
          const userProfile = await this.usersService.getUserProfile(item.createdBy);
          if (userProfile) {
            item.authorName = userProfile.name || 'Unbekannter Benutzer';
            item.authorImageUrl = userProfile.profilePictureUrl;
          }
        } catch (error) {
          this.logger.warn(`Failed to get author info for user ${item.createdBy}: ${error.message}`);
        }
      }
      
      // Transform poll items for client format
      if (item.type === 'poll') {
        this.transformPollForClient(item as PollNewsItem);
        console.log('item', item);
      }
      
      enrichedItems.push(item);
    }
    
    return enrichedItems;
  }
  
  /**
   * Transformiert ein PollNewsItem in ein Format, das mit CreatePollNewsDto kompatibel ist.
   * Fügt ein pollInfo-Feld hinzu und passt die Feldnamen entsprechend an.
   */
  private transformPollForClient(pollItem: PollNewsItem): void {
    // Erstelle ein pollInfo-Objekt im erwarteten Format
    const pollInfo = {
      options: pollItem.options.map(option => ({
        id: option.id,
        text: option.text,
        voters: option.voters
      })),
      endDate: pollItem.expiresAt,
      allowMultipleChoices: pollItem.allowMultipleAnswers,
      votes: this.createVotesMap(pollItem.options),
      updatedAt: pollItem.updatedAt,
      createdAt: pollItem.createdAt
    };
    
    // Rename the question field to content for client format
    (pollItem as any).content = pollItem.question;
    
    // Add the pollInfo object
    (pollItem as any).pollInfo = pollInfo;
  }
  
  /**
   * Erstellt eine Map der Votes für jede Option.
   * Format: { optionId: anzahlVotes }
   */
  private createVotesMap(options: PollOption[]): number {
    let totalVotes = 0;

    for (const option of options) {
      // Wir verwenden die Länge des voters-Arrays als Anzahl der Votes
      totalVotes += option.voters.length;
    }
    
    return totalVotes;
  }

  public async createTextNews(data: CreateTextNewsDto): Promise<TextNewsItem> {
    this.logger.debug('Creating text news item');
    
    const newsItem: Omit<TextNewsItem, 'id'> = {
      type: 'text',
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.authorId,
      reactions: [],
      views: 0
    };

    return this.saveNewsItem(newsItem) as Promise<TextNewsItem>;
  }

  public async createImageNews(data: CreateImageNewsDto): Promise<ImageNewsItem> {
    this.logger.debug('Creating image news item');
    
    const newsItem: Omit<ImageNewsItem, 'id'> = {
      type: 'image',
      imageUrls: data.imageUrls,
      content: data.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.authorId,
      reactions: [],
      views: 0
    };

    return this.saveNewsItem(newsItem) as Promise<ImageNewsItem>;
  }

  public async createAudioNews(data: CreateAudioNewsDto): Promise<AudioNewsItem> {
    this.logger.debug('Creating audio news item');
    
    const newsItem: Omit<AudioNewsItem, 'id'> = {
      type: 'audio',
      audioUrl: data.audioUrl,
      duration: data.duration,
      caption: data.caption,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.authorId,
      reactions: [],
      views: 0
    };

    return this.saveNewsItem(newsItem) as Promise<AudioNewsItem>;
  }

  public async createPollNews(data: CreatePollNewsDto): Promise<PollNewsItem> {
    this.logger.debug('Creating poll news item');
    
    const options: PollOption[] = data.pollInfo.options.map(option => ({
      id: option.id,
      text: option.text,
      voters: []
    }));
    
    const newsItem: Omit<PollNewsItem, 'id'> = {
      type: 'poll',
      question: data.content,
      options,
      expiresAt: data.pollInfo.endDate,
      allowMultipleAnswers: data.pollInfo.allowMultipleChoices,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.authorId,
      reactions: [],
      views: 0,
      votes: 0 // Gesamtzahl der Votes für diese Umfrage
    };

    return this.saveNewsItem(newsItem) as Promise<PollNewsItem>;
  }

  public async createSurveyNews(data: CreateSurveyNewsDto): Promise<SurveyNewsItem> {
    this.logger.debug('Creating survey news item');
    
    const options: SurveyOption[] = data.options.map(option => ({
      id: uuidv4(),
      text: option.text,
      votes: 0,
      voters: []
    }));
    
    const newsItem: Omit<SurveyNewsItem, 'id'> = {
      type: 'survey',
      question: data.question,
      options,
      allowMultipleAnswers: data.allowMultipleAnswers,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.authorId,
      reactions: [],
      views: 0
    };

    return this.saveNewsItem(newsItem) as Promise<SurveyNewsItem>;
  }

  private async saveNewsItem(newsItem: Omit<NewsItem, 'id'>): Promise<NewsItem> {
    const db = this.firebaseService.getClientFirestore();
    const docRef = await addDoc(collection(db, this.collectionName), newsItem);
    
    return {
      id: docRef.id,
      ...newsItem
    } as NewsItem;
  }

  public async update(id: string, data: Partial<NewsItem>): Promise<NewsItem> {
    this.logger.debug(`Updating news item ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('News item not found');
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
    } as NewsItem;
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting news item ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('News item not found');
    }

    await deleteDoc(docRef);
  }

  public async postReaction(newsId: string, createReactionDto: CreateReactionDto): Promise<NewsItem> {
    this.logger.debug(`Adding reaction ${createReactionDto.reactionType} for news item ${newsId} by user ${createReactionDto.userId}`);
    const db = this.firebaseService.getClientFirestore();
    const newsRef = doc(db, this.collectionName, newsId);
    
    try {
      let updatedNews: NewsItem;
      
      await runTransaction(db, async (transaction) => {
        const newsDoc = await transaction.get(newsRef);
        
        if (!newsDoc.exists()) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }
        
        const newsData = newsDoc.data() as NewsItem;
        const reactions = newsData.reactions || [];
        
        // Check if user already reacted
        const existingReactionIndex = reactions.findIndex(
          reaction => reaction.userId === createReactionDto.userId
        );
        
        let updatedReactions: Reaction[];
        
        if (existingReactionIndex >= 0) {
          // If the same reaction type, remove it (toggle off)
          if (reactions[existingReactionIndex].type === createReactionDto.reactionType) {
            updatedReactions = [
              ...reactions.slice(0, existingReactionIndex),
              ...reactions.slice(existingReactionIndex + 1)
            ];
          } else {
            // If different reaction type, update it
            const updatedReaction: Reaction = {
              userId: createReactionDto.userId,
              type: createReactionDto.reactionType
            };
            
            updatedReactions = [
              ...reactions.slice(0, existingReactionIndex),
              updatedReaction,
              ...reactions.slice(existingReactionIndex + 1)
            ];
          }
        } else {
          // Add new reaction
          updatedReactions = [
            ...reactions,
            {
              userId: createReactionDto.userId,
              type: createReactionDto.reactionType
            }
          ];
        }
        
        transaction.update(newsRef, { 
          reactions: updatedReactions,
          updatedAt: new Date().toISOString()
        });
      });
      
      const updatedNewsDoc = await getDoc(newsRef);
      updatedNews = {
        id: updatedNewsDoc.id,
        ...updatedNewsDoc.data()
      } as NewsItem;
      
      // Add author info
      const enrichedNews = await this.populateAuthorInfo([updatedNews]);
      return enrichedNews[0];
    } catch (error) {
      this.logger.error(`Error adding reaction for news ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async votePoll(newsId: string, voteData: VotePollDto): Promise<PollNewsItem> {
    this.logger.debug(`User ${voteData.userId} voting on poll ${newsId} for option: ${voteData.optionId}`);
    const db = this.firebaseService.getClientFirestore();
    const newsRef = doc(db, this.collectionName, newsId);
    
    try {
      let updatedPoll: PollNewsItem;
      
      await runTransaction(db, async (transaction) => {
        const newsDoc = await transaction.get(newsRef);
        
        if (!newsDoc.exists()) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }
        
        const newsData = newsDoc.data() as PollNewsItem;
        
        if (newsData.type !== 'poll') {
          throw new BadRequestException('News item is not a poll');
        }
        
        // Check if poll has expired
        if (newsData.expiresAt && new Date(newsData.expiresAt) < new Date()) {
          throw new BadRequestException('Poll has expired');
        }
        
        // Validate that all optionIds exist
        const option = newsData.options.find(opt => opt.id === voteData.optionId);
        if (!option) {
          throw new BadRequestException(`Option with ID ${voteData.optionId} not found`);
        }
        
        // First, remove user from all options
        let updatedOptions = newsData.options.map(option => {
          if (option.voters.includes(voteData.userId)) {
            return {
              ...option,
              voters: option.voters.filter(voterId => voterId !== voteData.userId)
            };
          }
          return option;
        });
        
        // Then add the user's votes to the selected options
        updatedOptions = updatedOptions.map(option => {
          if (option.id === voteData.optionId) {
            return {
              ...option,
              voters: [...option.voters, voteData.userId]
            };
          }
          return option;
        });
        
        // Berechne die Gesamtzahl der Stimmen neu
        const totalVotes = updatedOptions.reduce((sum, option) => sum + option.voters.length, 0);
        
        transaction.update(newsRef, { 
          options: updatedOptions,
          votes: totalVotes,
          updatedAt: new Date().toISOString()
        });
      });
      
      const updatedNewsDoc = await getDoc(newsRef);
      updatedPoll = {
        id: updatedNewsDoc.id,
        ...updatedNewsDoc.data()
      } as PollNewsItem;
      
      return updatedPoll;
    } catch (error) {
      this.logger.error(`Error voting on poll ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async voteSurvey(newsId: string, voteData: VoteSurveyDto): Promise<SurveyNewsItem> {
    this.logger.debug(`User ${voteData.userId} voting on survey ${newsId}, options: ${voteData.optionIds.join(', ')}`);
    const db = this.firebaseService.getClientFirestore();
    const newsRef = doc(db, this.collectionName, newsId);
    
    try {
      let updatedSurvey: SurveyNewsItem;
      
      await runTransaction(db, async (transaction) => {
        const newsDoc = await transaction.get(newsRef);
        
        if (!newsDoc.exists()) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }
        
        const newsData = newsDoc.data() as SurveyNewsItem;
        
        if (newsData.type !== 'survey') {
          throw new BadRequestException('News item is not a survey');
        }
        
        // Check if survey has expired
        if (newsData.expiresAt && new Date(newsData.expiresAt) < new Date()) {
          throw new BadRequestException('Survey has expired');
        }
        
        // Validate that all optionIds exist
        const optionIds = newsData.options.map(option => option.id);
        for (const optionId of voteData.optionIds) {
          if (!optionIds.includes(optionId)) {
            throw new BadRequestException(`Option with ID ${optionId} not found`);
          }
        }
        
        // If not allowing multiple answers and user tries to select more than one
        if (!newsData.allowMultipleAnswers && voteData.optionIds.length > 1) {
          throw new BadRequestException('This survey does not allow multiple answers');
        }
        
        // Remove any previous votes by this user
        const updatedOptions = newsData.options.map(option => {
          if (option.voters.includes(voteData.userId)) {
            return {
              ...option,
              votes: option.votes - 1,
              voters: option.voters.filter(voterId => voterId !== voteData.userId)
            };
          }
          return option;
        });
        
        // Add the new votes
        const finalOptions = updatedOptions.map(option => {
          if (voteData.optionIds.includes(option.id)) {
            return {
              ...option,
              votes: option.votes + 1,
              voters: [...option.voters, voteData.userId]
            };
          }
          return option;
        });
        
        transaction.update(newsRef, { 
          options: finalOptions,
          updatedAt: new Date().toISOString()
        });
      });
      
      const updatedNewsDoc = await getDoc(newsRef);
      updatedSurvey = {
        id: updatedNewsDoc.id,
        ...updatedNewsDoc.data()
      } as SurveyNewsItem;
      
      return updatedSurvey;
    } catch (error) {
      this.logger.error(`Error voting on survey ${newsId}: ${error.message}`);
      throw error;
    }
  }

  public async incrementViewCount(newsId: string): Promise<void> {
    this.logger.debug(`Incrementing view count for news ${newsId}`);
    const db = this.firebaseService.getClientFirestore();
    const newsRef = doc(db, this.collectionName, newsId);
    
    try {
      await runTransaction(db, async (transaction) => {
        const newsDoc = await transaction.get(newsRef);
        
        if (!newsDoc.exists()) {
          throw new NotFoundException(`News item ${newsId} not found`);
        }
        
        const newsData = newsDoc.data() as NewsItem;
        const currentCount = newsData.views || 0;
        
        transaction.update(newsRef, { 
          views: currentCount + 1,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (error) {
      this.logger.error(`Error incrementing view count for news ${newsId}: ${error.message}`);
      throw error;
    }
  }
} 