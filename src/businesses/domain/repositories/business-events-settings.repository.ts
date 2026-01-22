import { BusinessEventsSettings } from '../entities/business-events-settings.entity';

export abstract class BusinessEventsSettingsRepository {
  abstract get(): Promise<BusinessEventsSettings>;
  abstract save(settings: BusinessEventsSettings): Promise<BusinessEventsSettings>;
}
