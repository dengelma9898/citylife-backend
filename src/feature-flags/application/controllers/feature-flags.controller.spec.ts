import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlag } from '../../domain/enums/feature-flag.enum';
import { ParseFeatureFlagPipe } from '../../dto/parse-feature-flag.pipe';
import { UpdateFeatureFlagDto } from '../../dto/update-feature-flag.dto';
import { RolesGuard } from '../../../core/guards/roles.guard';

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let mockFeatureFlagsService: Record<string, jest.Mock>;

  const communitySettings = {
    id: 'community_settings',
    isEnabled: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const kidsSettings = {
    id: 'kids_spots_settings',
    isEnabled: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const christmasMarketsSettings = {
    id: 'christmas_markets_settings',
    isEnabled: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockFeatureFlagsService = {
      getAllFlags: jest.fn(),
      getFlag: jest.fn(),
      updateFlag: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [{ provide: FeatureFlagsService, useValue: mockFeatureFlagsService }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get<FeatureFlagsController>(FeatureFlagsController);
  });

  it('getAll should return all flags', async () => {
    mockFeatureFlagsService.getAllFlags.mockResolvedValue({
      community: communitySettings,
      kidsSpots: kidsSettings,
      christmasMarkets: christmasMarketsSettings,
    });
    const result = await controller.getAll();
    expect(result.community).toEqual(communitySettings);
    expect(result.kidsSpots).toEqual(kidsSettings);
    expect(result.christmasMarkets).toEqual(christmasMarketsSettings);
  });

  it('getOne should delegate christmas-markets', async () => {
    mockFeatureFlagsService.getFlag.mockResolvedValue(christmasMarketsSettings);
    const result = await controller.getOne(FeatureFlag.CHRISTMAS_MARKETS);
    expect(mockFeatureFlagsService.getFlag).toHaveBeenCalledWith(FeatureFlag.CHRISTMAS_MARKETS);
    expect(result).toEqual(christmasMarketsSettings);
  });

  it('getOne should delegate with the parsed flag', async () => {
    mockFeatureFlagsService.getFlag.mockResolvedValue(kidsSettings);
    const result = await controller.getOne(FeatureFlag.KIDS_SPOTS);
    expect(mockFeatureFlagsService.getFlag).toHaveBeenCalledWith(FeatureFlag.KIDS_SPOTS);
    expect(result).toEqual(kidsSettings);
  });

  it('update should pass flag, value and current user to the service', async () => {
    mockFeatureFlagsService.updateFlag.mockResolvedValue({ ...kidsSettings, isEnabled: true });
    const result = await controller.update(
      FeatureFlag.KIDS_SPOTS,
      { isEnabled: true },
      'admin-1',
    );
    expect(mockFeatureFlagsService.updateFlag).toHaveBeenCalledWith(
      FeatureFlag.KIDS_SPOTS,
      true,
      'admin-1',
    );
    expect(result.isEnabled).toBe(true);
  });
});

describe('ParseFeatureFlagPipe', () => {
  const pipe = new ParseFeatureFlagPipe();

  it.each([FeatureFlag.COMMUNITY, FeatureFlag.KIDS_SPOTS, FeatureFlag.CHRISTMAS_MARKETS])(
    'should accept %s',
    flag => {
    expect(pipe.transform(flag)).toBe(flag);
  });

  it('should reject unknown flags with 400', () => {
    expect(() => pipe.transform('chatrooms')).toThrow(BadRequestException);
  });
});

describe('UpdateFeatureFlagDto', () => {
  it('should accept a boolean', async () => {
    expect(await validate(plainToInstance(UpdateFeatureFlagDto, { isEnabled: true }))).toHaveLength(
      0,
    );
  });

  it('should reject missing or non-boolean values', async () => {
    expect((await validate(plainToInstance(UpdateFeatureFlagDto, {}))).length).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(UpdateFeatureFlagDto, { isEnabled: 'yes' }))).length,
    ).toBeGreaterThan(0);
  });
});
