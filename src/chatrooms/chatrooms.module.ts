import { Module } from '@nestjs/common';
import { ChatroomsService } from './application/services/chatrooms.service';
import { ChatroomsController } from './application/controllers/chatrooms.controller';
import { ChatMessagesService } from './application/services/chat-messages.service';
import { ChatMessagesController } from './application/controllers/chat-messages.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';
import { FirebaseChatroomRepository } from './infrastructure/persistence/firebase-chatroom.repository';
import { FirebaseChatMessageRepository } from './infrastructure/persistence/firebase-chat-message.repository';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { CHATROOM_REPOSITORY } from './domain/repositories/chatroom.repository';
import { CHAT_MESSAGE_REPOSITORY } from './domain/repositories/chat-message.repository';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [ChatroomsController, ChatMessagesController],
  providers: [
    ChatroomsService,
    ChatMessagesService,
    FirebaseStorageService,
    {
      provide: CHATROOM_REPOSITORY,
      useClass: FirebaseChatroomRepository
    },
    {
      provide: CHAT_MESSAGE_REPOSITORY,
      useClass: FirebaseChatMessageRepository
    }
  ],
  exports: [ChatroomsService, ChatMessagesService]
})
export class ChatroomsModule {} 