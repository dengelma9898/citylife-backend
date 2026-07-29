import { OpeningHoursMapper } from './opening-hours.mapper';
import { UpdateOpeningHoursDto } from '../../dto/update-opening-hours.dto';

describe('OpeningHoursMapper', () => {
  describe('transformLegacyFormat', () => {
    it('should transform legacy day-key format into detailed intervals', () => {
      const rawData = {
        Montag: { '09:00': '18:00' },
        Dienstag: { '10:00': '20:00', '21:00': '23:00' },
      };
      const result = OpeningHoursMapper.transformLegacyFormat(rawData);
      expect(result).toEqual({
        Montag: [{ from: '09:00', to: '18:00' }],
        Dienstag: [
          { from: '10:00', to: '20:00' },
          { from: '21:00', to: '23:00' },
        ],
      });
    });

    it('should return undefined when no German day keys are present', () => {
      const rawData = { openingHours: { monday: '09:00-18:00' } };
      const result = OpeningHoursMapper.transformLegacyFormat(rawData);
      expect(result).toBeUndefined();
    });

    it('should ignore unknown day keys', () => {
      const rawData = {
        Montag: { '09:00': '18:00' },
        UnknownDay: { '09:00': '18:00' },
      };
      const result = OpeningHoursMapper.transformLegacyFormat(rawData);
      expect(result).toEqual({
        Montag: [{ from: '09:00', to: '18:00' }],
      });
    });

    it('should return empty object for empty input with day keys but invalid values', () => {
      const rawData = { Montag: null, Dienstag: 'invalid' };
      const result = OpeningHoursMapper.transformLegacyFormat(rawData);
      expect(result).toEqual({});
    });
  });

  describe('resolveDetailedOpeningHours', () => {
    it('should prefer detailedOpeningHours from DTO when present', () => {
      const dto: UpdateOpeningHoursDto = {
        detailedOpeningHours: {
          Montag: [{ from: '08:00', to: '12:00' }],
        },
      };
      const result = OpeningHoursMapper.resolveDetailedOpeningHours(dto);
      expect(result).toEqual({
        Montag: [{ from: '08:00', to: '12:00' }],
      });
    });

    it('should fall back to legacy transformation when detailedOpeningHours is missing', () => {
      const dto = {
        Montag: { '09:00': '18:00' },
      } as unknown as UpdateOpeningHoursDto;
      const result = OpeningHoursMapper.resolveDetailedOpeningHours(dto);
      expect(result).toEqual({
        Montag: [{ from: '09:00', to: '18:00' }],
      });
    });
  });

  describe('mergeDetailedOpeningHours', () => {
    it('should merge incoming intervals into existing day entries', () => {
      const existing = {
        Montag: [{ from: '08:00', to: '12:00' }],
      };
      const incoming = {
        Montag: [{ from: '14:00', to: '18:00' }],
        Dienstag: [{ from: '09:00', to: '17:00' }],
      };
      const result = OpeningHoursMapper.mergeDetailedOpeningHours(existing, incoming);
      expect(result).toEqual({
        Montag: [
          { from: '08:00', to: '12:00' },
          { from: '14:00', to: '18:00' },
        ],
        Dienstag: [{ from: '09:00', to: '17:00' }],
      });
    });

    it('should return undefined when incoming is undefined', () => {
      const result = OpeningHoursMapper.mergeDetailedOpeningHours(
        { Montag: [{ from: '09:00', to: '18:00' }] },
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('should handle undefined existing hours', () => {
      const incoming = {
        Montag: [{ from: '09:00', to: '18:00' }],
      };
      const result = OpeningHoursMapper.mergeDetailedOpeningHours(undefined, incoming);
      expect(result).toEqual({
        Montag: [{ from: '09:00', to: '18:00' }],
      });
    });
  });

  describe('buildUpdatePayload', () => {
    it('should build payload with openingHours and merged detailedOpeningHours', () => {
      const dto: UpdateOpeningHoursDto = {
        openingHours: { Montag: '09:00-18:00' },
        detailedOpeningHours: {
          Dienstag: [{ from: '10:00', to: '20:00' }],
        },
      };
      const existing = {
        Montag: [{ from: '08:00', to: '12:00' }],
      };
      const result = OpeningHoursMapper.buildUpdatePayload(dto, existing);
      expect(result).toEqual({
        openingHours: { Montag: '09:00-18:00' },
        detailedOpeningHours: {
          Montag: [{ from: '08:00', to: '12:00' }],
          Dienstag: [{ from: '10:00', to: '20:00' }],
        },
      });
    });

    it('should build payload from legacy format only', () => {
      const dto = {
        Montag: { '09:00': '18:00' },
      } as unknown as UpdateOpeningHoursDto;
      const result = OpeningHoursMapper.buildUpdatePayload(dto);
      expect(result).toEqual({
        detailedOpeningHours: {
          Montag: [{ from: '09:00', to: '18:00' }],
        },
      });
    });

    it('should return empty payload when no opening hours data is provided', () => {
      const dto: UpdateOpeningHoursDto = {};
      const result = OpeningHoursMapper.buildUpdatePayload(dto);
      expect(result).toEqual({});
    });
  });
});
