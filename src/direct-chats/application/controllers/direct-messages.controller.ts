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
import { DirectChatEnabledGuard } from '../guards/direct-chat-enabled.guard';
import { DirectMessagesService } from '../services/direct-messages.service';
import { CreateDirectMessageDto } from '../dtos/create-direct-message.dto';
import { UpdateDirectMessageDto } from '../dtos/update-direct-message.dto';
import { UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';

@ApiTags('direct-chats')
@ApiBearerAuth()
@UseGuards(AuthGuard, DirectChatEnabledGuard)
@Controller('direct-chats/:chatId/messages')
export class DirectMessagesController {
  constructor(private readonly directMessagesService: DirectMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message in a direct chat' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Cannot send messages in pending chat' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async createMessage(
    @Request() req: any,
    @Param('chatId') chatId: string,
    @Body() dto: CreateDirectMessageDto,
  ) {
    const userId = req.user.uid;
    const userName = req.user.name || 'Anonymous';
    return this.directMessagesService.createMessage(userId, userName, chatId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages in a direct chat' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async getMessages(@Request() req: any, @Param('chatId') chatId: string) {
    const userId = req.user.uid;
    return this.directMessagesService.getMessages(userId, chatId);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Update a message' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @ApiResponse({ status: 403, description: 'Can only edit own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async updateMessage(
    @Request() req: any,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateDirectMessageDto,
  ) {
    const userId = req.user.uid;
    return this.directMessagesService.updateMessage(userId, chatId, messageId, dto);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async deleteMessage(
    @Request() req: any,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
  ) {
    const userId = req.user.uid;
    return this.directMessagesService.deleteMessage(userId, chatId, messageId);
  }

  @Patch(':messageId/reactions')
  @ApiOperation({ summary: 'Add or remove a reaction to a message' })
  @ApiParam({ name: 'chatId', description: 'Chat ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Reaction updated successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async updateReaction(
    @Request() req: any,
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageReactionDto,
  ) {
    const userId = req.user.uid;
    return this.directMessagesService.updateReaction(userId, chatId, messageId, dto);
  }
}
