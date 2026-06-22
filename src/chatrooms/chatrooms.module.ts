import { Module } from '@nestjs/common';
import { ChatroomsService } from './application/services/chatrooms.service';
import { ChatroomsController } from './application/controllers/chatrooms.controller';
import { ChatMessagesService } from './application/services/chat-messages.service';
import { ChatMessagesController } from './application/controllers/chat-messages.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [ChatroomsController, ChatMessagesController],
  providers: [ChatroomsService, ChatMessagesService],
  exports: [ChatroomsService, ChatMessagesService],
})
export class ChatroomsModule {}
