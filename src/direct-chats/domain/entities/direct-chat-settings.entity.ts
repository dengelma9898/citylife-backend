export interface DirectChatSettingsProps {
  id: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export class DirectChatSettings {
  readonly id: string;
  readonly isEnabled: boolean;
  readonly updatedAt: string;
  readonly updatedBy?: string;

  private constructor(props: DirectChatSettingsProps) {
    this.id = props.id;
    this.isEnabled = props.isEnabled;
    this.updatedAt = props.updatedAt;
    this.updatedBy = props.updatedBy;
  }

  static create(props: Omit<DirectChatSettingsProps, 'id' | 'updatedAt'>): DirectChatSettings {
    return new DirectChatSettings({
      id: 'direct_chat_settings',
      ...props,
      updatedAt: new Date().toISOString(),
    });
  }

  static createDefault(): DirectChatSettings {
    return new DirectChatSettings({
      id: 'direct_chat_settings',
      isEnabled: true,
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: DirectChatSettingsProps): DirectChatSettings {
    return new DirectChatSettings(props);
  }

  update(props: Partial<Omit<DirectChatSettingsProps, 'id'>>, updatedBy?: string): DirectChatSettings {
    return new DirectChatSettings({
      ...this,
      ...props,
      updatedBy: updatedBy || this.updatedBy,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): DirectChatSettingsProps {
    return {
      id: this.id,
      isEnabled: this.isEnabled,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}

