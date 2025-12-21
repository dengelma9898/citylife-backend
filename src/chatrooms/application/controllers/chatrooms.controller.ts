import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
} from '@nestjs/common';
import { ChatroomsService } from '../services/chatrooms.service';
import { Chatroom } from '../../domain/entities/chatroom.entity';
import { CreateChatroomDto } from '../dtos/create-chatroom.dto';
import { UpdateChatroomDto } from '../dtos/update-chatroom.dto';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileValidationPipe } from '../../../core/pipes/file-validation.pipe';
import { FirebaseStorageService } from '../../../firebase/firebase-storage.service';

@Controller('chatrooms')
export class ChatroomsController {
  private readonly logger = new Logger(ChatroomsController.name);

  constructor(
    private readonly chatroomsService: ChatroomsService,
    private readonly firebaseStorageService: FirebaseStorageService,
  ) {}

  @Get()
  public async getAll(): Promise<Chatroom[]> {
    this.logger.log('GET /chatrooms');
    return this.chatroomsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Chatroom> {
    this.logger.log(`GET /chatrooms/${id}`);
    return this.chatroomsService.getById(id);
  }

  @Post()
  @Roles('super_admin')
  public async create(
    @Body() createChatroomDto: CreateChatroomDto,
    @CurrentUser() userId: string,
  ): Promise<Chatroom> {
    this.logger.log('POST /chatrooms');
    return this.chatroomsService.create(createChatroomDto, userId);
  }

  @Patch(':id')
  @Roles('super_admin')
  public async update(
    @Param('id') id: string,
    @Body() updateChatroomDto: UpdateChatroomDto,
  ): Promise<Chatroom> {
    this.logger.log(`PATCH /chatrooms/${id}`);

    // Prüfe, ob das Bild gelöscht werden soll (null oder leerer String)
    const shouldDeleteImage =
      updateChatroomDto.image === null || updateChatroomDto.image === '';

    if (shouldDeleteImage) {
      // Hole das bestehende Chatroom, um die aktuelle imageUrl zu erhalten
      const currentChatroom = await this.chatroomsService.getById(id);
      if (!currentChatroom) {
        throw new NotFoundException('Chatroom not found');
      }

      // Lösche das Bild aus dem Storage, falls vorhanden
      if (currentChatroom.imageUrl) {
        this.logger.debug('Deleting chatroom image from storage');
        try {
          await this.firebaseStorageService.deleteFile(currentChatroom.imageUrl);
        } catch (error) {
          this.logger.error(`Failed to delete image from storage: ${error.message}`);
          // Weiter mit dem Update, auch wenn das Löschen fehlschlägt
        }
      }

      // Setze imageUrl auf leeren String (wird als null gespeichert)
      updateChatroomDto.image = '';
    }

    // Mappe 'image' aus DTO auf 'imageUrl' für die Entity
    const updateData: any = {};
    if (updateChatroomDto.title !== undefined) {
      updateData.title = updateChatroomDto.title;
    }
    if (updateChatroomDto.image !== undefined) {
      updateData.imageUrl = updateChatroomDto.image === '' ? null : updateChatroomDto.image;
    }

    return this.chatroomsService.update(id, updateData);
  }

  @Delete(':id')
  @Roles('super_admin')
  public async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /chatrooms/${id}`);
    return this.chatroomsService.remove(id);
  }

  @Patch(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  public async updateImage(
    @Param('id') chatroomId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File,
  ): Promise<Chatroom> {
    this.logger.log(`PATCH /chatrooms/${chatroomId}/image`);

    // Get current chatroom to check for existing image
    const currentChatroom = await this.chatroomsService.getById(chatroomId);
    if (!currentChatroom) {
      throw new NotFoundException('Chatroom not found');
    }

    // Delete old image if it exists
    if (currentChatroom.imageUrl) {
      this.logger.debug('Deleting old chatroom image');
      await this.firebaseStorageService.deleteFile(currentChatroom.imageUrl);
    }

    // Upload the new image
    const path = `chatrooms/images/${chatroomId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    // Update the chatroom with the new image URL
    return this.chatroomsService.updateImage(chatroomId, imageUrl);
  }
}
