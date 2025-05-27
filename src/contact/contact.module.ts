import { Module, forwardRef } from '@nestjs/common';
import { ContactController } from './application/controllers/contact.controller';
import { ContactService } from './application/services/contact.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseContactRequestRepository } from './infrastructure/persistence/firebase-contact-request.repository';
import { CONTACT_REQUEST_REPOSITORY } from './domain/repositories/contact-request.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule), FirebaseModule],
  controllers: [ContactController],
  providers: [
    ContactService,
    {
      provide: CONTACT_REQUEST_REPOSITORY,
      useClass: FirebaseContactRequestRepository,
    },
  ],
  exports: [ContactService],
})
export class ContactModule {}
