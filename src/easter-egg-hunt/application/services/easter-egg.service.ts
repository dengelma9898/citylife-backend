import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { EasterEgg } from '../../domain/entities/easter-egg.entity';
import { EasterEggRepository, EASTER_EGG_REPOSITORY } from '../../domain/repositories/easter-egg.repository';
import { CreateEasterEggDto } from '../../dto/create-easter-egg.dto';
import { UpdateEasterEggDto } from '../../dto/update-easter-egg.dto';

@Injectable()
export class EasterEggService {
  private readonly logger = new Logger(EasterEggService.name);

  constructor(
    @Inject(EASTER_EGG_REPOSITORY)
    private readonly easterEggRepository: EasterEggRepository,
  ) {}

  async getAll(): Promise<EasterEgg[]> {
    this.logger.log('Getting all easter eggs');
    return this.easterEggRepository.findAll();
  }

  async getActive(): Promise<EasterEgg[]> {
    const eggs = await this.easterEggRepository.findAll();
    return eggs.filter(egg => egg.isActive());
  }

  async getById(id: string): Promise<EasterEgg> {
    this.logger.log(`Getting easter egg with id: ${id}`);
    const egg = await this.easterEggRepository.findById(id);
    if (!egg) {
      throw new NotFoundException('Easter egg not found');
    }
    return egg;
  }

  async create(dto: CreateEasterEggDto): Promise<EasterEgg> {
    this.logger.log(`Creating easter egg: ${dto.title}`);
    const egg = EasterEgg.create({
      title: dto.title,
      description: dto.description,
      prizeDescription: dto.prizeDescription,
      numberOfWinners: dto.numberOfWinners,
      startDate: dto.startDate,
      endDate: dto.endDate,
      location: {
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    return this.easterEggRepository.create(egg);
  }

  async update(id: string, dto: UpdateEasterEggDto): Promise<EasterEgg> {
    this.logger.log(`Updating easter egg with id: ${id}`);
    const existingEgg = await this.easterEggRepository.findById(id);
    if (!existingEgg) {
      throw new NotFoundException('Easter egg not found');
    }
    const updateProps: Record<string, any> = {};
    if (dto.title !== undefined) updateProps.title = dto.title;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.prizeDescription !== undefined) updateProps.prizeDescription = dto.prizeDescription;
    if (dto.numberOfWinners !== undefined) updateProps.numberOfWinners = dto.numberOfWinners;
    if (dto.startDate !== undefined) updateProps.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateProps.endDate = dto.endDate;
    if (dto.address !== undefined || dto.latitude !== undefined || dto.longitude !== undefined) {
      updateProps.location = {
        address: dto.address ?? existingEgg.location.address,
        latitude: dto.latitude ?? existingEgg.location.latitude,
        longitude: dto.longitude ?? existingEgg.location.longitude,
      };
    }
    const updatedEgg = existingEgg.update(updateProps);
    return this.easterEggRepository.update(id, updatedEgg);
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<EasterEgg> {
    this.logger.log(`Updating image URL for easter egg ${id}`);
    const existingEgg = await this.easterEggRepository.findById(id);
    if (!existingEgg) {
      throw new NotFoundException('Easter egg not found');
    }
    const updatedEgg = existingEgg.update({ imageUrl });
    return this.easterEggRepository.update(id, updatedEgg);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting easter egg with id: ${id}`);
    await this.easterEggRepository.delete(id);
  }
}
