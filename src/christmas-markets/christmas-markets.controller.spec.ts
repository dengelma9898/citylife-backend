import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChristmasMarketsController } from './christmas-markets.controller';
import { ChristmasMarketsService } from './christmas-markets.service';
import { CreateChristmasMarketDto } from './dto/create-christmas-market.dto';
import { UpdateChristmasMarketDto } from './dto/update-christmas-market.dto';
import { ChristmasMarket } from './interfaces/christmas-market.interface';
import { RolesGuard } from '../core/guards/roles.guard';
import { ROLES_KEY } from '../core/decorators/roles.decorator';

describe('ChristmasMarketsController', () => {
  let controller: ChristmasMarketsController;
  let mockService: Record<string, jest.Mock>;

  const mockMarket: ChristmasMarket = {
    id: 'nuernberg-christkindlesmarkt',
    name: 'Nürnberger Christkindlesmarkt',
    city: 'Nürnberg',
    place: 'Hauptmarkt',
    description: 'Beschreibung',
    periodLabel: '27.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 10–21 Uhr',
    startDate: '2026-11-27T00:00:00.000Z',
    endDate: '2026-12-24T00:00:00.000Z',
    latitude: 49.4541,
    longitude: 11.0773,
    highlights: ['Christkind'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
  };

  beforeEach(async () => {
    mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChristmasMarketsController],
      providers: [{ provide: ChristmasMarketsService, useValue: mockService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<ChristmasMarketsController>(ChristmasMarketsController);
  });

  it('findAll should delegate to the service', async () => {
    mockService.findAll.mockResolvedValue([mockMarket]);
    await expect(controller.findAll()).resolves.toEqual([mockMarket]);
    expect(mockService.findAll).toHaveBeenCalledTimes(1);
  });

  it('findOne should delegate with the id', async () => {
    mockService.findOne.mockResolvedValue(mockMarket);
    await expect(controller.findOne('nuernberg-christkindlesmarkt')).resolves.toEqual(mockMarket);
    expect(mockService.findOne).toHaveBeenCalledWith('nuernberg-christkindlesmarkt');
  });

  it('create should pass dto and current user to the service', async () => {
    const dto: CreateChristmasMarketDto = {
      name: 'Markt',
      city: 'Nürnberg',
      place: 'Hauptmarkt',
      description: 'Beschreibung',
      periodLabel: '27.11. – 24.12.2026',
      openingHoursLabel: 'Täglich 10–21 Uhr',
      latitude: 49.4541,
      longitude: 11.0773,
    };
    mockService.create.mockResolvedValue(mockMarket);
    await expect(controller.create(dto, 'admin-1')).resolves.toEqual(mockMarket);
    expect(mockService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should pass id, dto and current user to the service', async () => {
    const dto: UpdateChristmasMarketDto = { name: 'Neuer Name' };
    mockService.update.mockResolvedValue({ ...mockMarket, name: 'Neuer Name' });
    await controller.update('m1', dto, 'admin-2');
    expect(mockService.update).toHaveBeenCalledWith('m1', dto, 'admin-2');
  });

  it('remove should delegate with the id', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await controller.remove('m1');
    expect(mockService.remove).toHaveBeenCalledWith('m1');
  });

  it('write endpoints should require admin or super_admin roles', () => {
    const reflector = new Reflector();
    for (const handler of [
      ChristmasMarketsController.prototype.create,
      ChristmasMarketsController.prototype.update,
      ChristmasMarketsController.prototype.remove,
    ]) {
      expect(reflector.get(ROLES_KEY, handler)).toEqual(['admin', 'super_admin']);
    }
    expect(reflector.get(ROLES_KEY, ChristmasMarketsController.prototype.findAll)).toBeUndefined();
    expect(reflector.get(ROLES_KEY, ChristmasMarketsController.prototype.findOne)).toBeUndefined();
  });
});

describe('CreateChristmasMarketDto validation', () => {
  const valid = {
    name: 'Markt',
    city: 'Nürnberg',
    place: 'Hauptmarkt',
    description: 'Beschreibung',
    periodLabel: '27.11. – 24.12.2026',
    openingHoursLabel: 'Täglich 10–21 Uhr',
    startDate: '2026-11-27',
    endDate: '2026-12-24',
    latitude: 49.4541,
    longitude: 11.0773,
    highlights: ['Christkind'],
  };

  it('should accept a valid payload', async () => {
    expect(await validate(plainToInstance(CreateChristmasMarketDto, valid))).toHaveLength(0);
  });

  it('should reject invalid coordinates, dates, slug and imageUrl', async () => {
    const errors = await validate(
      plainToInstance(CreateChristmasMarketDto, {
        ...valid,
        id: 'Not A Slug!',
        startDate: 'kein-datum',
        latitude: 123,
        longitude: -999,
        imageUrl: 'keine-url',
        highlights: [42],
      }),
    );
    const properties = errors.map(error => error.property);
    expect(properties).toEqual(
      expect.arrayContaining(['id', 'startDate', 'latitude', 'longitude', 'imageUrl', 'highlights']),
    );
  });

  it('should reject missing required fields', async () => {
    const errors = await validate(plainToInstance(CreateChristmasMarketDto, {}));
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('UpdateChristmasMarketDto validation', () => {
  it('should accept a partial payload and reject invalid latitude', async () => {
    expect(await validate(plainToInstance(UpdateChristmasMarketDto, { name: 'Neu' }))).toHaveLength(0);
    const errors = await validate(plainToInstance(UpdateChristmasMarketDto, { latitude: 100 }));
    expect(errors.map(error => error.property)).toContain('latitude');
  });
});
