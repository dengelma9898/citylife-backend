import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationPreferencesDto } from './notification-preferences.dto';

describe('NotificationPreferencesDto', () => {
  const validateStrict = async (plain: Record<string, unknown>) =>
    validate(plainToInstance(NotificationPreferencesDto, plain), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('should accept newKidsSpots as boolean', async () => {
    expect(await validateStrict({ newKidsSpots: true })).toHaveLength(0);
    expect(await validateStrict({ newKidsSpots: false })).toHaveLength(0);
  });

  it('should keep newKidsSpots optional (default handled as disabled by consumers)', async () => {
    expect(await validateStrict({})).toHaveLength(0);
  });

  it('should reject non-boolean newKidsSpots', async () => {
    expect((await validateStrict({ newKidsSpots: 'yes' })).length).toBeGreaterThan(0);
  });
});
