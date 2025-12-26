import { Module } from '@nestjs/common';
import { LegalDocumentsController } from './legal-documents.controller';
import { LegalDocumentService } from './application/services/legal-document.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { FirebaseLegalDocumentRepository } from './infrastructure/persistence/firebase-legal-document.repository';
import { LEGAL_DOCUMENT_REPOSITORY } from './domain/repositories/legal-document.repository';

@Module({
  imports: [FirebaseModule],
  controllers: [LegalDocumentsController],
  providers: [
    LegalDocumentService,
    {
      provide: LEGAL_DOCUMENT_REPOSITORY,
      useClass: FirebaseLegalDocumentRepository,
    },
  ],
  exports: [LegalDocumentService],
})
export class LegalDocumentsModule {}

