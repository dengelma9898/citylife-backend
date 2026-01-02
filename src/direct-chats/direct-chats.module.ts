import { Module, forwardRef } from '@nestjs/common';
import { DirectChatsController } from './application/controllers/direct-chats.controller';
import { DirectMessagesController } from './application/controllers/direct-messages.controller';
import { DirectChatsService } from './application/services/direct-chats.service';
import { DirectMessagesService } from './application/services/direct-messages.service';
import { DirectChatRepository } from './domain/repositories/direct-chat.repository';
import { DirectMessageRepository } from './domain/repositories/direct-message.repository';
import { FirebaseDirectChatRepository } from './infrastructure/persistence/firebase-direct-chat.repository';
import { FirebaseDirectMessageRepository } from './infrastructure/persistence/firebase-direct-message.repository';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [
    DirectChatsController,
    DirectMessagesController,
  ],
  providers: [
    DirectChatsService,
    DirectMessagesService,
    {
      provide: DirectChatRepository,
      useClass: FirebaseDirectChatRepository,
    },
    {
      provide: DirectMessageRepository,
      useClass: FirebaseDirectMessageRepository,
    },
  ],
  exports: [
    DirectChatsService,
    DirectMessagesService,
  ],
})
export class DirectChatsModule {}


