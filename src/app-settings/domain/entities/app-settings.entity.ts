export interface AppSettingsProps {
  id: string;
  preferences: string[];
}

export class AppSettings {
  readonly id: string;
  readonly preferences: string[];

  private constructor(props: AppSettingsProps) {
    this.id = props.id;
    this.preferences = props.preferences;
  }

  static create(props: Omit<AppSettingsProps, 'id'>): AppSettings {
    return new AppSettings({
      id: crypto.randomUUID(),
      ...props,
    });
  }

  static fromProps(props: AppSettingsProps): AppSettings {
    return new AppSettings(props);
  }

  update(props: Partial<Omit<AppSettingsProps, 'id'>>): AppSettings {
    return new AppSettings({
      ...this,
      ...props,
    });
  }

  toJSON(): AppSettingsProps {
    return {
      id: this.id,
      preferences: this.preferences,
    };
  }
}
