import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { Chatroom } from '../../domain/entities/chatroom.entity';
import { CHATROOM_REPOSITORY } from '../../domain/repositories/chatroom.repository';
import { ChatroomRepository } from '../../domain/repositories/chatroom.repository';
import { CreateChatroomDto } from '../dtos/create-chatroom.dto';
import { UpdateChatroomDto } from '../dtos/update-chatroom.dto';

@Injectable()
export class ChatroomsService {
  private readonly logger = new Logger(ChatroomsService.name);

  constructor(
    @Inject(CHATROOM_REPOSITORY)
    private readonly chatroomRepository: ChatroomRepository,
  ) {}

  async getAll(): Promise<Chatroom[]> {
    this.logger.log('Getting all chatrooms');
    const chatrooms = await this.chatroomRepository.findAll();
    return chatrooms.map(chatroom => this.enrichWithParticipantCount(chatroom));
  }

  async getById(id: string): Promise<Chatroom> {
    this.logger.log(`Getting chatroom with id: ${id}`);
    const chatroom = await this.chatroomRepository.findById(id);
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }

  private enrichWithParticipantCount(chatroom: Chatroom): Chatroom {
    const participantCount = chatroom.participants?.length || 0;
    return Chatroom.fromProps({
      ...chatroom.toJSON(),
      participantCount,
    });
  }

  async create(data: CreateChatroomDto, userId: string): Promise<Chatroom> {
    this.logger.log('Creating new chatroom');
    const chatroomData = Chatroom.create({
      title: data.title,
      description: data.description || '',
      imageUrl: data.image || '',
      createdBy: userId,
      participants: [userId],
    });
    const chatroom = await this.chatroomRepository.create(chatroomData);
    return this.enrichWithParticipantCount(chatroom);
  }

  async update(
    id: string,
    data: UpdateChatroomDto | Partial<Omit<Chatroom, 'id' | 'createdAt'>>,
  ): Promise<Chatroom> {
    this.logger.log(`Updating chatroom with id: ${id}`);
    const chatroom = await this.chatroomRepository.update(id, data);
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting chatroom with id: ${id}`);
    await this.chatroomRepository.delete(id);
  }

  async findByParticipant(userId: string): Promise<Chatroom[]> {
    this.logger.log(`Finding chatrooms for participant: ${userId}`);
    const chatrooms = await this.chatroomRepository.findByParticipant(userId);
    return chatrooms.map(chatroom => this.enrichWithParticipantCount(chatroom));
  }

  async updateImage(id: string, imageUrl: string): Promise<Chatroom> {
    this.logger.log(`Updating image for chatroom with id: ${id}`);
    const chatroom = await this.chatroomRepository.update(id, { imageUrl });
    if (!chatroom) {
      throw new NotFoundException(`Chatroom with id ${id} not found`);
    }
    return this.enrichWithParticipantCount(chatroom);
  }
}
