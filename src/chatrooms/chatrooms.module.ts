import { Module } from '@nestjs/common';
import { ChatroomsService } from './chatrooms.service';
import { ChatroomsController } from './chatrooms.controller';
import { ChatMessagesService } from './chat-messages.service';
import { ChatMessagesController } from './chat-messages.controller';
import { FirebaseModule } from '../firebase/firebase.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [FirebaseModule, UsersModule],
  controllers: [ChatroomsController, ChatMessagesController],
  providers: [ChatroomsService, ChatMessagesService],
  exports: [ChatroomsService, ChatMessagesService]
})
export class ChatroomsModule {} 