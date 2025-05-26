import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ChatMessagesService } from '../services/chat-messages.service';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { UpdateMessageDto } from '../dtos/update-message.dto';
import { UpdateMessageReactionDto } from '../dtos/update-message-reaction.dto';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { Roles } from '../../../core/decorators/roles.decorator';

@ApiTags('chat-messages')
@Controller('chatrooms/:chatroomId/messages')
export class ChatMessagesController {
  constructor(private readonly chatMessagesService: ChatMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @Roles('user', 'admin', 'super_admin')
  async create(
    @Param('chatroomId') chatroomId: string,
    @CurrentUser() userId: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.chatMessagesService.create(chatroomId, userId, createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages in a chatroom' })
  @ApiResponse({ status: 200, description: 'Returns all messages' })
  async findAll(@Param('chatroomId') chatroomId: string, @Query('limit') limit?: number) {
    return this.chatMessagesService.findAll(chatroomId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiResponse({ status: 200, description: 'Returns the message' })
  async findOne(@Param('chatroomId') chatroomId: string, @Param('id') id: string) {
    return this.chatMessagesService.findOne(chatroomId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  @Roles('user', 'admin', 'super_admin')
  async update(
    @Param('chatroomId') chatroomId: string,
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.chatMessagesService.update(chatroomId, id, updateMessageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @Roles('user', 'admin', 'super_admin')
  async remove(
    @Param('chatroomId') chatroomId: string,
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.chatMessagesService.remove(chatroomId, id, userId);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiResponse({ status: 201, description: 'Reaction added successfully' })
  @Roles('user', 'admin', 'super_admin')
  async addReaction(
    @Param('chatroomId') chatroomId: string,
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body() reactionDto: UpdateMessageReactionDto,
  ) {
    return this.chatMessagesService.addReaction(chatroomId, id, userId, reactionDto);
  }

  @Delete(':id/reactions')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @Roles('user', 'admin', 'super_admin')
  async removeReaction(
    @Param('chatroomId') chatroomId: string,
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    return this.chatMessagesService.removeReaction(chatroomId, id, userId);
  }

  @Patch(':id/admin')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Admin: Update any message' })
  @ApiResponse({ status: 200, description: 'Message updated successfully' })
  async adminUpdate(
    @Param('chatroomId') chatroomId: string,
    @Param('id') id: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.chatMessagesService.adminUpdate(chatroomId, id, updateMessageDto);
  }

  @Delete(':id/admin')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Admin: Delete any message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async adminRemove(@Param('chatroomId') chatroomId: string, @Param('id') id: string) {
    return this.chatMessagesService.adminRemove(chatroomId, id);
  }
}
