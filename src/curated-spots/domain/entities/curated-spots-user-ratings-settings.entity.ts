export interface CuratedSpotsUserRatingsSettingsProps {
  id: string;
  isEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Feature toggle for end-user ratings on curated spots (default off until enabled by admin).
 */
export class CuratedSpotsUserRatingsSettings {
  readonly id: string;
  readonly isEnabled: boolean;
  readonly updatedAt: string;
  readonly updatedBy?: string;

  private constructor(props: CuratedSpotsUserRatingsSettingsProps) {
    this.id = props.id;
    this.isEnabled = props.isEnabled;
    this.updatedAt = props.updatedAt;
    this.updatedBy = props.updatedBy;
  }

  static createDefault(): CuratedSpotsUserRatingsSettings {
    return new CuratedSpotsUserRatingsSettings({
      id: 'curated_spots_user_ratings_settings',
      isEnabled: false,
      updatedAt: new Date().toISOString(),
    });
  }

  static fromProps(props: CuratedSpotsUserRatingsSettingsProps): CuratedSpotsUserRatingsSettings {
    return new CuratedSpotsUserRatingsSettings(props);
  }

  update(
    props: Partial<Omit<CuratedSpotsUserRatingsSettingsProps, 'id'>>,
    updatedBy?: string,
  ): CuratedSpotsUserRatingsSettings {
    return new CuratedSpotsUserRatingsSettings({
      ...this,
      ...props,
      updatedBy: updatedBy || this.updatedBy,
      updatedAt: new Date().toISOString(),
    });
  }

  toJSON(): CuratedSpotsUserRatingsSettingsProps {
    return {
      id: this.id,
      isEnabled: this.isEnabled,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };
  }
}
