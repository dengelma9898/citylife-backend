import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { KidsProfileDto } from './kids-profile.dto';
import { KidsSpotsQueryDto } from './kids-spots-query.dto';
import { CreateCuratedSpotDto } from './create-curated-spot.dto';
import { UpdateCuratedSpotDto } from './update-curated-spot.dto';
import { KidsLocationType } from '../domain/enums/kids-location-type.enum';
import { KidsEquipmentTag } from '../domain/enums/kids-equipment-tag.enum';

const validProfile = {
  locationType: KidsLocationType.INDOOR,
  suitableForToddlers: true,
  suitableForSchoolKids: false,
  isFree: true,
  isBadWeatherTip: false,
  equipmentTags: [KidsEquipmentTag.DIAPER_CHANGING_FACILITY],
};

const validAddress = {
  street: 'Hauptstraße',
  houseNumber: '1',
  postalCode: '90403',
  city: 'Nürnberg',
  latitude: 49.45,
  longitude: 11.08,
};

describe('KidsProfileDto', () => {
  const errorsFor = async (plain: Record<string, unknown>) =>
    validate(plainToInstance(KidsProfileDto, plain));

  it('should accept a complete profile', async () => {
    expect(await errorsFor(validProfile)).toHaveLength(0);
  });

  it('should accept a profile without equipmentTags', async () => {
    const { equipmentTags: _tags, ...withoutTags } = validProfile;
    expect(await errorsFor(withoutTags)).toHaveLength(0);
  });

  it('should reject when no age group is selected', async () => {
    const errors = await errorsFor({
      ...validProfile,
      suitableForToddlers: false,
      suitableForSchoolKids: false,
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept both age groups at once', async () => {
    expect(
      await errorsFor({ ...validProfile, suitableForToddlers: true, suitableForSchoolKids: true }),
    ).toHaveLength(0);
  });

  it('should reject an unknown location type', async () => {
    expect((await errorsFor({ ...validProfile, locationType: 'MOON' })).length).toBeGreaterThan(0);
  });

  it('should reject unknown or duplicate equipment tags', async () => {
    expect(
      (await errorsFor({ ...validProfile, equipmentTags: ['UNKNOWN'] })).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await errorsFor({
          ...validProfile,
          equipmentTags: [KidsEquipmentTag.PLAY_AREA, KidsEquipmentTag.PLAY_AREA],
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it.each(['isFree', 'isBadWeatherTip', 'locationType'])('should require %s', async field => {
    const incomplete: Record<string, unknown> = { ...validProfile };
    delete incomplete[field];
    expect((await errorsFor(incomplete)).length).toBeGreaterThan(0);
  });
});

describe('CreateCuratedSpotDto / UpdateCuratedSpotDto kids fields', () => {
  const base = { name: 'Spot', descriptionMarkdown: 'Text', address: validAddress };

  it('should validate nested kidsProfile on create', async () => {
    const valid = plainToInstance(CreateCuratedSpotDto, { ...base, kidsProfile: validProfile });
    const invalid = plainToInstance(CreateCuratedSpotDto, {
      ...base,
      kidsProfile: { ...validProfile, suitableForToddlers: false },
    });
    expect(await validate(valid)).toHaveLength(0);
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });

  it('should validate websiteUrl on create', async () => {
    const valid = plainToInstance(CreateCuratedSpotDto, { ...base, websiteUrl: 'https://a.de' });
    const invalid = plainToInstance(CreateCuratedSpotDto, { ...base, websiteUrl: 'not a url' });
    expect(await validate(valid)).toHaveLength(0);
    expect((await validate(invalid)).length).toBeGreaterThan(0);
  });

  it('should allow null kidsProfile and websiteUrl on update (remove)', async () => {
    const dto = plainToInstance(UpdateCuratedSpotDto, { kidsProfile: null, websiteUrl: null });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should validate nested kidsProfile on update', async () => {
    const dto = plainToInstance(UpdateCuratedSpotDto, {
      kidsProfile: { ...validProfile, suitableForToddlers: false },
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('should reject unknown fields such as kidsNotificationSentAt with whitelist validation', async () => {
    const dto = plainToInstance(UpdateCuratedSpotDto, { kidsNotificationSentAt: '2026-01-01' });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('KidsSpotsQueryDto', () => {
  const errorsFor = async (plain: Record<string, unknown>) =>
    validate(plainToInstance(KidsSpotsQueryDto, plain));

  it('should accept an empty query', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it('should accept all valid filters', async () => {
    expect(
      await errorsFor({
        locationType: 'INDOOR',
        ageGroup: 'SCHOOL_CHILD',
        isFree: 'true',
        isBadWeatherTip: 'false',
      }),
    ).toHaveLength(0);
  });

  it.each([
    { locationType: 'MOON' },
    { ageGroup: 'TEENAGER' },
    { isFree: 'yes' },
    { isBadWeatherTip: '1' },
  ])('should reject invalid query %j', async query => {
    expect((await errorsFor(query)).length).toBeGreaterThan(0);
  });
});
