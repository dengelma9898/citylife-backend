import { Module } from '@nestjs/common';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentService } from './application/services/legal-document.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [LegalDocumentsController],
  providers: [LegalDocumentService],
  exports: [LegalDocumentService],
})
export class LegalDocumentsModule {}
