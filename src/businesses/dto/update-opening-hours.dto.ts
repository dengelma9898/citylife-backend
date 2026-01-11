import { IsObject, IsOptional } from 'class-validator';

export class UpdateOpeningHoursDto {
  @IsObject()
  @IsOptional()
  public readonly openingHours?: Record<string, string>;

  /**
   * Detaillierte Öffnungszeiten mit mehreren Intervallen pro Tag.
   * Beispiel: { Montag: [{ from: '08:00', to: '12:00' }, { from: '14:00', to: '22:00' }] }
   */
  @IsOptional()
  @IsObject()
  public readonly detailedOpeningHours?: Record<string, { from: string; to: string }[]>;
}
