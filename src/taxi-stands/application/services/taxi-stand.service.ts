import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { TaxiStand } from '../../domain/entities/taxi-stand.entity';
import { TaxiStandRepository, TAXI_STAND_REPOSITORY } from '../../domain/repositories/taxi-stand.repository';
import { CreateTaxiStandDto } from '../../dto/create-taxi-stand.dto';
import { UpdateTaxiStandDto } from '../../dto/update-taxi-stand.dto';

@Injectable()
export class TaxiStandService {
  private readonly logger = new Logger(TaxiStandService.name);

  constructor(
    @Inject(TAXI_STAND_REPOSITORY)
    private readonly taxiStandRepository: TaxiStandRepository,
  ) {}

  async getAll(): Promise<TaxiStand[]> {
    this.logger.log('Getting all taxi stands');
    return this.taxiStandRepository.findAll();
  }

  async getById(id: string): Promise<TaxiStand> {
    this.logger.log(`Getting taxi stand with id: ${id}`);
    const taxiStand = await this.taxiStandRepository.findById(id);
    if (!taxiStand) {
      throw new NotFoundException('Taxi stand not found');
    }
    return taxiStand;
  }

  async create(dto: CreateTaxiStandDto): Promise<TaxiStand> {
    this.logger.log(`Creating taxi stand: ${dto.address}`);
    const taxiStand = TaxiStand.create({
      title: dto.title,
      description: dto.description,
      numberOfTaxis: dto.numberOfTaxis,
      phoneNumber: dto.phoneNumber,
      location: {
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    return this.taxiStandRepository.create(taxiStand);
  }

  async update(id: string, dto: UpdateTaxiStandDto): Promise<TaxiStand> {
    this.logger.log(`Updating taxi stand with id: ${id}`);
    const existingTaxiStand = await this.taxiStandRepository.findById(id);
    if (!existingTaxiStand) {
      throw new NotFoundException('Taxi stand not found');
    }
    const updateProps: Record<string, any> = {};
    if (dto.title !== undefined) updateProps.title = dto.title;
    if (dto.description !== undefined) updateProps.description = dto.description;
    if (dto.numberOfTaxis !== undefined) updateProps.numberOfTaxis = dto.numberOfTaxis;
    if (dto.phoneNumber !== undefined) updateProps.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined || dto.latitude !== undefined || dto.longitude !== undefined) {
      updateProps.location = {
        address: dto.address ?? existingTaxiStand.location.address,
        latitude: dto.latitude ?? existingTaxiStand.location.latitude,
        longitude: dto.longitude ?? existingTaxiStand.location.longitude,
      };
    }
    const updatedTaxiStand = existingTaxiStand.update(updateProps);
    return this.taxiStandRepository.update(id, updatedTaxiStand);
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting taxi stand with id: ${id}`);
    await this.taxiStandRepository.delete(id);
  }
}
