import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly firebaseService: FirebaseService) {}

  public async createUser(createUserDto: CreateUserDto): Promise<{ uid: string }> {
    try {
      const userRecord = await this.firebaseService.getAuth().createUser({
        email: createUserDto.email,
        password: createUserDto.password,
        displayName: createUserDto.name,
      });

      await this.firebaseService.getFirestore()
        .collection('users')
        .doc(userRecord.uid)
        .set({
          name: createUserDto.name,
          email: createUserDto.email,
          createdAt: new Date(),
        });

      return { uid: userRecord.uid };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  public async getUserById(uid: string): Promise<any> {
    const userDoc = await this.firebaseService.getFirestore()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new NotFoundException('User not found');
    }

    return { uid, ...userDoc.data() };
  }
} 