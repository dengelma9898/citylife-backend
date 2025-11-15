import { Module } from '@nestjs/common';
import { AdventCalendarController } from './application/controllers/advent-calendar.controller';
import { AdventCalendarService } from './application/services/advent-calendar.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebaseAdventCalendarEntryRepository } from './infrastructure/persistence/firebase-advent-calendar-entry.repository';
import { ADVENT_CALENDAR_ENTRY_REPOSITORY } from './domain/repositories/advent-calendar-entry.repository';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [AdventCalendarController],
  providers: [
    AdventCalendarService,
    FirebaseStorageService,
    {
      provide: ADVENT_CALENDAR_ENTRY_REPOSITORY,
      useClass: FirebaseAdventCalendarEntryRepository,
    },
  ],
  exports: [AdventCalendarService],
})
export class AdventCalendarModule {}
