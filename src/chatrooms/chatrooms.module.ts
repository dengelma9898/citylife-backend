import { Module } from '@nestjs/common';
import { ChatroomsController } from './chatrooms.controller';
import { ChatroomsService } from './chatrooms.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [ChatroomsController],
  providers: [ChatroomsService],
  exports: [ChatroomsService]
})
export class ChatroomsModule {} 