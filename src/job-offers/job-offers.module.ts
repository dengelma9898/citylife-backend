import { Module } from '@nestjs/common';
import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './application/services/job-offers.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { FirebaseJobOfferRepository } from './infrastructure/persistence/firebase-job-offer.repository';
import { JOB_OFFER_REPOSITORY } from './domain/repositories/job-offer.repository.interface';

@Module({
  imports: [FirebaseModule],
  controllers: [JobOffersController],
  providers: [
    JobOffersService,
    FirebaseStorageService,
    {
      provide: JOB_OFFER_REPOSITORY,
      useClass: FirebaseJobOfferRepository,
    },
  ],
  exports: [JobOffersService],
})
export class JobOffersModule {}
