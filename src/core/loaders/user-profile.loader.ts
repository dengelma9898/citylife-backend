import { Injectable, Scope, Inject, forwardRef } from '@nestjs/common';
import DataLoader from 'dataloader';
import { UsersService } from '../../users/users.service';
import { UserProfile } from '../../users/interfaces/user-profile.interface';

/**
 * DataLoader für User-Profiles zur Vermeidung von N+1 Query-Problemen.
 * Der Loader ist Request-scoped, d.h. er wird für jeden Request neu erstellt.
 *
 * Vorteile:
 * - Batching: Sammelt alle Anfragen innerhalb eines Request-Zyklus und führt sie als Batch aus
 * - Caching: Cached Ergebnisse innerhalb eines Requests (verhindert doppelte Abfragen)
 *
 * Verwendung:
 * - Injiziere den Loader in Services, die User-Profiles laden müssen
 * - Verwende loader.load(userId) statt directem Service-Aufruf
 */
@Injectable({ scope: Scope.REQUEST })
export class UserProfileLoader {
  private readonly loader: DataLoader<string, UserProfile | null>;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {
    this.loader = new DataLoader<string, UserProfile | null>(
      async (ids: readonly string[]) => {
        // Batch-Load alle angeforderten User-Profiles
        const profiles = await this.usersService.getUserProfilesByIds([...ids]);
        // Gebe die Ergebnisse in der gleichen Reihenfolge wie die Input-IDs zurück
        return ids.map(id => profiles.get(id) || null);
      },
      {
        cache: true, // Cache innerhalb eines Request-Zyklus aktiviert
        batch: true, // Batching aktiviert
        maxBatchSize: 100, // Maximale Batch-Größe
      },
    );
  }

  /**
   * Lädt ein einzelnes User-Profil.
   * Mehrere Aufrufe innerhalb eines Requests werden automatisch gebatcht.
   */
  async load(userId: string): Promise<UserProfile | null> {
    return this.loader.load(userId);
  }

  /**
   * Lädt mehrere User-Profile.
   * Alle IDs werden in einem einzigen Batch verarbeitet.
   */
  async loadMany(userIds: string[]): Promise<(UserProfile | Error | null)[]> {
    return this.loader.loadMany(userIds);
  }

  /**
   * Lädt mehrere User-Profile und gibt eine Map zurück.
   * Kompatibel mit dem bestehenden getUserProfilesByIds Interface.
   */
  async loadManyAsMap(userIds: string[]): Promise<Map<string, UserProfile>> {
    const results = await this.loader.loadMany(userIds);
    const profileMap = new Map<string, UserProfile>();
    userIds.forEach((id, index) => {
      const result = results[index];
      if (result && !(result instanceof Error)) {
        profileMap.set(id, result);
      }
    });
    return profileMap;
  }

  /**
   * Löscht den Cache für eine bestimmte ID.
   * Nützlich nach Updates.
   */
  clear(userId: string): void {
    this.loader.clear(userId);
  }

  /**
   * Löscht den gesamten Cache.
   */
  clearAll(): void {
    this.loader.clearAll();
  }
}
