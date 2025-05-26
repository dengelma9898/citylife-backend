import { Chatroom } from '../entities/chatroom.entity';

export const CHATROOM_REPOSITORY = 'CHATROOM_REPOSITORY';

export interface ChatroomRepository {
  findAll(): Promise<Chatroom[]>;
  findById(id: string): Promise<Chatroom | null>;
  create(data: Omit<Chatroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chatroom>;
  update(id: string, data: Partial<Omit<Chatroom, 'id' | 'createdAt'>>): Promise<Chatroom | null>;
  delete(id: string): Promise<void>;
  findByParticipant(userId: string): Promise<Chatroom[]>;
}
