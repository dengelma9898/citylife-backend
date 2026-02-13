import { Injectable, Inject, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';
import { EasterEggRepository, EASTER_EGG_REPOSITORY } from '../../domain/repositories/easter-egg.repository';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UsersService } from '../../../users/users.service';
import { NotificationService } from '../../../notifications/application/services/notification.service';

export interface FeatureStatus {
  isFeatureActive: boolean;
  startDate?: string;
}

export interface EasterEggHuntStatistics {
  totalEggs: number;
  activeEggs: number;
  totalParticipants: number;
  totalWinners: number;
  participantsPerEgg: {
    eggId: string;
    title: string;
    participantCount: number;
    winnerCount: number;
  }[];
}

@Injectable()
export class EasterEggHuntService {
  private readonly logger = new Logger(EasterEggHuntService.name);
  private readonly FEATURE_STATUS_DOC_ID = 'feature-status';
  private readonly COLLECTION = 'easterEggHunt';

  constructor(
    @Inject(EASTER_EGG_REPOSITORY)
    private readonly easterEggRepository: EasterEggRepository,
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationService,
  ) {}

  async getFeatureStatus(): Promise<FeatureStatus> {
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(this.FEATURE_STATUS_DOC_ID);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { isFeatureActive: false };
    }
    const data = doc.data();
    return {
      isFeatureActive: data?.isFeatureActive || false,
      startDate: data?.startDate,
    };
  }

  async isFeatureActive(): Promise<boolean> {
    const status = await this.getFeatureStatus();
    if (!status.isFeatureActive) {
      return false;
    }
    if (status.startDate) {
      const today = new Date().toISOString().split('T')[0];
      return today >= status.startDate;
    }
    return true;
  }

  async setFeatureStatus(isFeatureActive: boolean, startDate?: string): Promise<FeatureStatus> {
    this.logger.log(`Setting easter egg hunt feature status to: ${isFeatureActive}`);
    const db = this.firebaseService.getFirestore();
    const docRef = db.collection(this.COLLECTION).doc(this.FEATURE_STATUS_DOC_ID);
    const updateData: Record<string, any> = {
      isFeatureActive,
      updatedAt: new Date().toISOString(),
    };
    if (startDate !== undefined) {
      updateData.startDate = startDate;
    }
    await docRef.set(updateData, { merge: true });
    this.logger.log(`Easter egg hunt feature status successfully set to: ${isFeatureActive}`);
    return { isFeatureActive, startDate };
  }

  async participate(eggId: string, userId: string): Promise<EasterEgg> {
    this.logger.log(`User ${userId} participating in easter egg ${eggId}`);
    const userProfile = await this.usersService.getUserProfile(userId);
    if (!userProfile) {
      throw new ForbiddenException('Only registered users can participate in the easter egg hunt');
    }
    const egg = await this.easterEggRepository.findById(eggId);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    if (!egg.isActive()) {
      throw new BadRequestException('This easter egg is not currently active');
    }
    if (egg.participants.includes(userId)) {
      throw new BadRequestException('User has already participated in this easter egg');
    }
    const updatedEgg = egg.addParticipant(userId);
    return this.easterEggRepository.update(eggId, updatedEgg);
  }

  async addWinner(eggId: string, userId: string): Promise<EasterEgg> {
    this.logger.log(`Adding winner ${userId} to easter egg ${eggId}`);
    const egg = await this.easterEggRepository.findById(eggId);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    if (!egg.participants.includes(userId)) {
      throw new BadRequestException('User is not a participant of this easter egg');
    }
    if (egg.winners.includes(userId)) {
      throw new BadRequestException('User is already a winner');
    }
    const updatedEgg = egg.addWinner(userId);
    const result = await this.easterEggRepository.update(eggId, updatedEgg);
    await this.sendWinnerNotification(userId, egg);
    return result;
  }

  async drawWinners(eggId: string): Promise<EasterEgg> {
    this.logger.log(`Drawing winners for easter egg ${eggId}`);
    const egg = await this.easterEggRepository.findById(eggId);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    if (egg.participants.length === 0) {
      throw new BadRequestException('No participants to draw winners from');
    }
    const numberOfWinners = egg.numberOfWinners || 1;
    const eligibleParticipants = egg.participants.filter(p => !egg.winners.includes(p));
    if (eligibleParticipants.length === 0) {
      throw new BadRequestException('All participants are already winners');
    }
    const winnersToSelect = Math.min(numberOfWinners - egg.winners.length, eligibleParticipants.length);
    if (winnersToSelect <= 0) {
      throw new BadRequestException('Maximum number of winners already reached');
    }
    const shuffled = [...eligibleParticipants].sort(() => Math.random() - 0.5);
    const selectedWinners = shuffled.slice(0, winnersToSelect);
    let updatedEgg = egg;
    for (const winnerId of selectedWinners) {
      updatedEgg = updatedEgg.addWinner(winnerId);
    }
    const result = await this.easterEggRepository.update(eggId, updatedEgg);
    for (const winnerId of selectedWinners) {
      await this.sendWinnerNotification(winnerId, egg);
    }
    this.logger.log(`Drew ${selectedWinners.length} winners for easter egg ${eggId}`);
    return result;
  }

  async getParticipants(eggId: string): Promise<string[]> {
    const egg = await this.easterEggRepository.findById(eggId);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    return egg.participants;
  }

  async getStatistics(): Promise<EasterEggHuntStatistics> {
    const eggs = await this.easterEggRepository.findAll();
    const uniqueParticipants = new Set<string>();
    const uniqueWinners = new Set<string>();
    const participantsPerEgg = eggs.map(egg => {
      egg.participants.forEach(p => uniqueParticipants.add(p));
      egg.winners.forEach(w => uniqueWinners.add(w));
      return {
        eggId: egg.id,
        title: egg.title,
        participantCount: egg.participants.length,
        winnerCount: egg.winners.length,
      };
    });
    const activeEggs = eggs.filter(egg => egg.isActive()).length;
    return {
      totalEggs: eggs.length,
      activeEggs,
      totalParticipants: uniqueParticipants.size,
      totalWinners: uniqueWinners.size,
      participantsPerEgg,
    };
  }

  private async sendWinnerNotification(userId: string, egg: EasterEgg): Promise<void> {
    try {
      const userProfile = await this.usersService.getUserProfile(userId);
      if (!userProfile) {
        return;
      }
      const preferences = userProfile.notificationPreferences;
      const isEnabled = preferences?.easterEggHuntWinner !== undefined
        ? preferences.easterEggHuntWinner
        : false;
      if (!isEnabled) {
        return;
      }
      await this.notificationService.sendToUser(userId, {
        title: 'Du hast gewonnen!',
        body: `Herzlichen Glückwunsch! Du hast bei "${egg.title}" gewonnen!`,
        data: {
          type: 'EASTER_EGG_HUNT_WINNER',
          eggId: egg.id,
          eggTitle: egg.title,
          prizeDescription: egg.prizeDescription || '',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send winner notification to user ${userId}: ${error.message}`);
    }
  }
}
