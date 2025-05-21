import { Controller, Post, Get, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccountManagementService } from './services/account-management.service';
import { Roles } from '../core/decorators/roles.decorator';

@ApiTags('Account Management')
@Controller('account-management')
export class AccountManagementController {
  constructor(private readonly accountManagementService: AccountManagementService) {}

  @Delete('cleanup-anonymous')
  @ApiOperation({ summary: 'Clean up old anonymous accounts' })
  @ApiResponse({ status: 200, description: 'Cleanup completed successfully' })
  @Roles('super_admin')
  async cleanupAnonymousAccounts() {
    return this.accountManagementService.cleanupAnonymousAccounts();
  }

  @Get('anonymous-stats')
  @ApiOperation({ summary: 'Get statistics about anonymous accounts' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @Roles('super_admin')
  async getAnonymousAccountStats() {
    return this.accountManagementService.getAnonymousAccountStats();
  }
} 