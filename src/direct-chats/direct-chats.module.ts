import { Module, forwardRef } from '@nestjs/common';
import { DirectChatsController } from './application/controllers/direct-chats.controller';
import { DirectMessagesController } from './application/controllers/direct-messages.controller';
import { DirectChatsService } from './application/services/direct-chats.service';
import { DirectMessagesService } from './application/services/direct-messages.service';
import { DirectChatSettingsService } from './application/services/direct-chat-settings.service';
import { DirectChatEnabledGuard } from './application/guards/direct-chat-enabled.guard';
import { DirectChatRepository } from './domain/repositories/direct-chat.repository';
import { DirectMessageRepository } from './domain/repositories/direct-message.repository';
import { DirectChatSettingsRepository } from './domain/repositories/direct-chat-settings.repository';
import { FirebaseDirectChatRepository } from './infrastructure/persistence/firebase-direct-chat.repository';
import { FirebaseDirectMessageRepository } from './infrastructure/persistence/firebase-direct-message.repository';
import { FirebaseDirectChatSettingsRepository } from './infrastructure/persistence/firebase-direct-chat-settings.repository';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FirebaseModule, forwardRef(() => UsersModule), NotificationsModule],
  controllers: [DirectChatsController, DirectMessagesController],
  providers: [
    DirectChatsService,
    DirectMessagesService,
    DirectChatSettingsService,
    DirectChatEnabledGuard,
    {
      provide: DirectChatRepository,
      useClass: FirebaseDirectChatRepository,
    },
    {
      provide: DirectMessageRepository,
      useClass: FirebaseDirectMessageRepository,
    },
    {
      provide: DirectChatSettingsRepository,
      useClass: FirebaseDirectChatSettingsRepository,
    },
  ],
  exports: [DirectChatsService, DirectMessagesService, DirectChatSettingsService],
})
export class DirectChatsModule {}
