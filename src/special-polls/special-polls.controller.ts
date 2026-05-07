import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { SpecialPollsService } from './special-polls.service';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { UpdateSpecialPollHighlightDto } from './dto/update-special-poll-highlight.dto';
import { UpdateSpecialPollResponsesDto } from './dto/update-special-poll-responses.dto';
import { SpecialPoll } from './interfaces/special-poll.interface';
import { RolesGuard } from '../core/guards/roles.guard';
import { Roles } from '../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../core/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/enums/user-type.enum';

@ApiTags('special-polls')
@Controller('special-polls')
@UseGuards(RolesGuard)
export class SpecialPollsController {
  private readonly logger = new Logger(SpecialPollsController.name);

  constructor(
    private readonly specialPollsService: SpecialPollsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Admin und Super-Admin sehen auch INACTIVE-Umfragen in Listen und Detail.
   */
  private async resolveIncludeInactivePolls(userId: string): Promise<boolean> {
    const data = await this.usersService.getById(userId);
    if (!data || 'businessIds' in data) {
      return false;
    }
    return data.userType === UserType.ADMIN || data.userType === UserType.SUPER_ADMIN;
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Erstellt eine neue Special Poll' })
  @ApiResponse({
    status: 201,
    description: 'Die Special Poll wurde erfolgreich erstellt',
    type: CreateSpecialPollDto,
  })
  async create(@Body() createSpecialPollDto: CreateSpecialPollDto): Promise<SpecialPoll> {
    this.logger.log('POST /special-polls');
    return this.specialPollsService.create(createSpecialPollDto);
  }

  @Get()
  @Roles('user', 'admin', 'super_admin')
  @ApiQuery({
    name: 'highlighted',
    required: false,
    description: 'Wenn true, nur hervorgehobene Umfragen',
  })
  @ApiOperation({
    summary: 'Gibt alle Special Polls zurück',
    description:
      'Standard: ohne INACTIVE. Admin/Super-Admin erhalten alle Status inkl. INACTIVE.',
  })
  @ApiResponse({ status: 200, description: 'Liste aller Special Polls' })
  async findAll(
    @CurrentUser() userId: string,
    @Query('highlighted') highlighted?: string,
  ): Promise<SpecialPoll[]> {
    this.logger.log('GET /special-polls');
    const highlightedOnly = highlighted === 'true';
    const includeInactivePolls = await this.resolveIncludeInactivePolls(userId);
    return this.specialPollsService.findAll(highlightedOnly, includeInactivePolls);
  }

  @Get(':id')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({
    summary: 'Gibt eine bestimmte Special Poll zurück',
    description:
      'INACTIVE-Umfragen liefern 404 für normale Nutzer; Admin/Super-Admin erhalten das Dokument.',
  })
  @ApiResponse({ status: 200, description: 'Die angeforderte Special Poll' })
  async findOne(@Param('id') id: string, @CurrentUser() userId: string): Promise<SpecialPoll> {
    this.logger.log(`GET /special-polls/${id}`);
    const includeInactivePolls = await this.resolveIncludeInactivePolls(userId);
    return this.specialPollsService.findOne(id, includeInactivePolls);
  }

  @Patch(':id/status')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Aktualisiert den Status einer Special Poll' })
  @ApiResponse({ status: 200, description: 'Der Status wurde erfolgreich aktualisiert' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateSpecialPollStatusDto,
  ): Promise<SpecialPoll> {
    this.logger.log(`PATCH /special-polls/${id}/status`);
    return this.specialPollsService.updateStatus(id, updateStatusDto);
  }

  @Patch(':id/highlight')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Setzt die Hervorhebung einer Special Poll' })
  @ApiResponse({ status: 200, description: 'Highlight wurde aktualisiert' })
  async updateHighlight(
    @Param('id') id: string,
    @Body() dto: UpdateSpecialPollHighlightDto,
  ): Promise<SpecialPoll> {
    this.logger.log(`PATCH /special-polls/${id}/highlight`);
    return this.specialPollsService.updateHighlight(id, dto.isHighlighted);
  }

  @Post(':id/responses/:responseId/upvote')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Upvote auf eine Antwort togglen (Zustimmung)' })
  @ApiResponse({ status: 200, description: 'Aktualisierte Special Poll' })
  async toggleResponseUpvote(
    @Param('id') id: string,
    @Param('responseId') responseId: string,
    @CurrentUser() userId: string,
  ): Promise<SpecialPoll> {
    this.logger.log(`POST /special-polls/${id}/responses/${responseId}/upvote`);
    return this.specialPollsService.toggleResponseUpvote(id, responseId, userId);
  }

  @Post(':id/responses')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Fügt eine Antwort zu einer Special Poll hinzu' })
  @ApiResponse({ status: 201, description: 'Die Antwort wurde erfolgreich hinzugefügt' })
  async addResponse(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body('response') response: string,
  ): Promise<SpecialPoll> {
    this.logger.log(`POST /special-polls/${id}/responses`);
    return this.specialPollsService.addResponse(id, userId, response);
  }

  @Delete(':id/responses/me')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({
    summary: 'Entfernt alle Antworten des aktuellen Nutzers zu dieser Umfrage',
  })
  @ApiResponse({ status: 200, description: 'Aktualisierte Special Poll' })
  async removeMyResponses(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<SpecialPoll> {
    this.logger.log(`DELETE /special-polls/${id}/responses/me`);
    return this.specialPollsService.removeResponse(id, userId);
  }

  @Patch(':id/responses')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Aktualisiert die Antworten einer Special Poll (nur für Super-Admins)' })
  @ApiResponse({ status: 200, description: 'Die Antworten wurden erfolgreich aktualisiert' })
  async updateResponses(
    @Param('id') id: string,
    @Body() updateResponsesDto: UpdateSpecialPollResponsesDto,
  ): Promise<SpecialPoll> {
    this.logger.log(`PATCH /special-polls/${id}/responses`);
    return this.specialPollsService.updateResponses(id, updateResponsesDto.responses);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Löscht eine Special Poll' })
  @ApiResponse({ status: 200, description: 'Die Special Poll wurde erfolgreich gelöscht' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /special-polls/${id}`);
    return this.specialPollsService.remove(id);
  }
}
