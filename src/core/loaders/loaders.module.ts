import { Module, forwardRef } from '@nestjs/common';
import { UserProfileLoader } from './user-profile.loader';
import { UsersModule } from '../../users/users.module';

/**
 * LoadersModule stellt DataLoader-Implementierungen zur Verfügung.
 * DataLoader lösen N+1 Query-Probleme durch Batching und Request-scoped Caching.
 * 
 * Konfiguration:
 * - batch: true - Sammelt alle Anfragen innerhalb eines Ticks
 * - cache: true - Cached Ergebnisse innerhalb eines Requests
 * 
 * Siehe docs/configuration-values.md für Details.
 */
@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [UserProfileLoader],
  exports: [UserProfileLoader],
})
export class LoadersModule {}
