import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { DirectChatsService } from '../services/direct-chats.service';
import { CreateDirectChatDto } from '../dtos/create-direct-chat.dto';

@ApiTags('direct-chats')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('direct-chats')
export class DirectChatsController {
  constructor(private readonly directChatsService: DirectChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new direct chat request' })
  @ApiResponse({ status: 201, description: 'Chat request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - blocked by user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createChat(@Request() req: any, @Body() dto: CreateDirectChatDto) {
    const userId = req.user.uid;
    return this.directChatsService.createChat(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all direct chats for the current user' })
  @ApiResponse({ status: 200, description: 'List of direct chats' })
  async getChats(@Request() req: any) {
    const userId = req.user.uid;
    return this.directChatsService.getChatsForUser(userId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending chat requests for the current user' })
  @ApiResponse({ status: 200, description: 'List of pending chat requests' })
  async getPendingChats(@Request() req: any) {
    const userId = req.user.uid;
    return this.directChatsService.getPendingChatsForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific direct chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'Chat details' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async getChatById(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.getChatById(userId, chatId);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm/accept a chat request' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'Chat confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Chat already confirmed' })
  @ApiResponse({ status: 403, description: 'Only invited user can confirm' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async confirmChat(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.confirmChat(userId, chatId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/decline a chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 204, description: 'Chat deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  async deleteChat(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.deleteChat(userId, chatId);
  }
}


