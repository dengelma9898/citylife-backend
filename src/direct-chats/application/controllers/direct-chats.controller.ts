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
import { RolesGuard } from '../../../core/guards/roles.guard';
import { Roles } from '../../../core/decorators/roles.decorator';
import { DirectChatsService } from '../services/direct-chats.service';
import { DirectChatSettingsService } from '../services/direct-chat-settings.service';
import { DirectChatEnabledGuard } from '../guards/direct-chat-enabled.guard';
import { CreateDirectChatDto } from '../dtos/create-direct-chat.dto';
import { UpdateDirectChatSettingsDto } from '../dtos/update-direct-chat-settings.dto';

@ApiTags('direct-chats')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('direct-chats')
export class DirectChatsController {
  constructor(
    private readonly directChatsService: DirectChatsService,
    private readonly directChatSettingsService: DirectChatSettingsService,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get direct chat feature settings' })
  @ApiResponse({ status: 200, description: 'Feature settings' })
  async getSettings() {
    return this.directChatSettingsService.getSettings();
  }

  @Patch('settings')
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update direct chat feature settings (Admin only)' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Admin access required' })
  async updateSettings(@Request() req: any, @Body() dto: UpdateDirectChatSettingsDto) {
    const updatedBy = req.user.uid;
    return this.directChatSettingsService.updateSettings(dto.isEnabled, updatedBy);
  }

  @Post()
  @UseGuards(DirectChatEnabledGuard)
  @ApiOperation({ summary: 'Create a new direct chat request' })
  @ApiResponse({ status: 201, description: 'Chat request created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - blocked by user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async createChat(@Request() req: any, @Body() dto: CreateDirectChatDto) {
    const userId = req.user.uid;
    return this.directChatsService.createChat(userId, dto);
  }

  @Get()
  @UseGuards(DirectChatEnabledGuard)
  @ApiOperation({ summary: 'Get all direct chats for the current user' })
  @ApiResponse({ status: 200, description: 'List of direct chats' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async getChats(@Request() req: any) {
    const userId = req.user.uid;
    return this.directChatsService.getChatsForUser(userId);
  }

  @Get('pending')
  @UseGuards(DirectChatEnabledGuard)
  @ApiOperation({ summary: 'Get pending chat requests for the current user' })
  @ApiResponse({ status: 200, description: 'List of pending chat requests' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async getPendingChats(@Request() req: any) {
    const userId = req.user.uid;
    return this.directChatsService.getPendingChatsForUser(userId);
  }

  @Get(':id')
  @UseGuards(DirectChatEnabledGuard)
  @ApiOperation({ summary: 'Get a specific direct chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'Chat details' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async getChatById(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.getChatById(userId, chatId);
  }

  @Patch(':id/confirm')
  @UseGuards(DirectChatEnabledGuard)
  @ApiOperation({ summary: 'Confirm/accept a chat request' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 200, description: 'Chat confirmed successfully' })
  @ApiResponse({ status: 400, description: 'Chat already confirmed' })
  @ApiResponse({ status: 403, description: 'Only invited user can confirm' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async confirmChat(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.confirmChat(userId, chatId);
  }

  @Delete(':id')
  @UseGuards(DirectChatEnabledGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/decline a chat' })
  @ApiParam({ name: 'id', description: 'Chat ID' })
  @ApiResponse({ status: 204, description: 'Chat deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Chat not found' })
  @ApiResponse({ status: 503, description: 'Feature is disabled' })
  async deleteChat(@Request() req: any, @Param('id') chatId: string) {
    const userId = req.user.uid;
    return this.directChatsService.deleteChat(userId, chatId);
  }
}
