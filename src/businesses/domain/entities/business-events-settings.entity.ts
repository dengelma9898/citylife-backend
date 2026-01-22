export interface BusinessEventsSettingsProps {
  id: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export class BusinessEventsSettings {
  readonly id: string;
  readonly isEnabled: boolean;
  readonly updatedAt: string;
  readonly updatedBy?: string;

  private constructor(props: BusinessEventsSettingsProps) {
    this.id = props.id;
    this.isEnabled = props.isEnabled;
    this.updatedAt = props.updatedAt;
    this.updatedBy = props.updatedBy;
  }

  static create(
    props: Omit<BusinessEventsSettingsProps, 'id' | 'updatedAt'>,
  ): BusinessEventsSettings {
    return new BusinessEventsSettings({
      id: 'business_events_settings',
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  static createDefault(): BusinessEventsSettings {
    return new BusinessEventsSettings({
      id: 'business_events_settings',
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: BusinessEventsSettingsProps): BusinessEventsSettings {
    return new BusinessEventsSettings(props);
  }

  update(
    props: Partial<Omit<BusinessEventsSettingsProps, 'id'>>,
    updatedBy?: string,
  ): BusinessEventsSettings {
    return new BusinessEventsSettings({
      ...this,
      ...props,
      updatedBy: updatedBy || this.updatedBy,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): BusinessEventsSettingsProps {
    return {
      id: this.id,
      isEnabled: this.isEnabled,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}
