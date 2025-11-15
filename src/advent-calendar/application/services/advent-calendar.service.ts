import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdventCalendarEntry } from '../../domain/entities/advent-calendar-entry.entity';
import {
  AdventCalendarEntryRepository,
  ADVENT_CALENDAR_ENTRY_REPOSITORY,
} from '../../domain/repositories/advent-calendar-entry.repository';
import { CreateAdventCalendarEntryDto } from '../../dto/create-advent-calendar-entry.dto';
import { UpdateAdventCalendarEntryDto } from '../../dto/update-advent-calendar-entry.dto';

@Injectable()
export class AdventCalendarService {
  private readonly logger = new Logger(AdventCalendarService.name);

  constructor(
    @Inject(ADVENT_CALENDAR_ENTRY_REPOSITORY)
    private readonly adventCalendarEntryRepository: AdventCalendarEntryRepository,
  ) {}

  public async getAll(): Promise<AdventCalendarEntry[]> {
    this.logger.log('Getting all advent calendar entries');
    return this.adventCalendarEntryRepository.findAll();
  }

  public async getById(id: string): Promise<AdventCalendarEntry> {
    this.logger.log(`Getting advent calendar entry with id: ${id}`);
    const entry = await this.adventCalendarEntryRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    return entry;
  }

  public async create(createDto: CreateAdventCalendarEntryDto): Promise<AdventCalendarEntry> {
    this.logger.log(`Creating advent calendar entry with number: ${createDto.number}`);
    const existingEntry = await this.adventCalendarEntryRepository.findByNumber(createDto.number);
    if (existingEntry) {
      throw new BadRequestException(`Entry with number ${createDto.number} already exists`);
    }
    const entry = AdventCalendarEntry.create(createDto);
    return this.adventCalendarEntryRepository.create(entry);
  }

  public async update(
    id: string,
    updateDto: UpdateAdventCalendarEntryDto,
  ): Promise<AdventCalendarEntry> {
    this.logger.log(`Updating advent calendar entry with id: ${id}`);
    const existingEntry = await this.adventCalendarEntryRepository.findById(id);
    if (!existingEntry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (updateDto.number && updateDto.number !== existingEntry.number) {
      const entryWithNumber = await this.adventCalendarEntryRepository.findByNumber(
        updateDto.number,
      );
      if (entryWithNumber && entryWithNumber.id !== id) {
        throw new BadRequestException(`Entry with number ${updateDto.number} already exists`);
      }
    }
    const updatedEntry = existingEntry.update(updateDto);
    return this.adventCalendarEntryRepository.update(id, updatedEntry);
  }

  public async delete(id: string): Promise<void> {
    this.logger.log(`Deleting advent calendar entry with id: ${id}`);
    await this.adventCalendarEntryRepository.delete(id);
  }

  public async participate(id: string, userId: string): Promise<AdventCalendarEntry> {
    this.logger.log(`User ${userId} participating in entry ${id}`);
    const entry = await this.adventCalendarEntryRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (!entry.canParticipate) {
      throw new BadRequestException('Participation is not allowed for this entry');
    }
    if (!entry.isActive) {
      throw new BadRequestException('Entry is not active');
    }
    if (entry.participants.includes(userId)) {
      throw new BadRequestException('User has already participated in this entry');
    }
    const updatedEntry = entry.addParticipant(userId);
    return this.adventCalendarEntryRepository.update(id, updatedEntry);
  }

  public async addWinner(id: string, userId: string): Promise<AdventCalendarEntry> {
    this.logger.log(`Adding winner ${userId} to entry ${id}`);
    const entry = await this.adventCalendarEntryRepository.findById(id);
    if (!entry) {
      throw new NotFoundException('Advent calendar entry not found');
    }
    if (!entry.participants.includes(userId)) {
      throw new BadRequestException('User is not a participant of this entry');
    }
    if (entry.winners.includes(userId)) {
      throw new BadRequestException('User is already a winner');
    }
    const updatedEntry = entry.addWinner(userId);
    return this.adventCalendarEntryRepository.update(id, updatedEntry);
  }
}
