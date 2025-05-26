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
} from '@nestjs/common';
import { SpecialPollsService } from './special-polls.service';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { UpdateSpecialPollResponsesDto } from './dto/update-special-poll-responses.dto';
import { SpecialPoll } from './interfaces/special-poll.interface';
import { RolesGuard } from '../core/guards/roles.guard';
import { Roles } from '../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../core/decorators/current-user.decorator';

@ApiTags('special-polls')
@Controller('special-polls')
@UseGuards(RolesGuard)
export class SpecialPollsController {
  private readonly logger = new Logger(SpecialPollsController.name);

  constructor(private readonly specialPollsService: SpecialPollsService) {}

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
  @ApiOperation({ summary: 'Gibt alle Special Polls zurück' })
  @ApiResponse({ status: 200, description: 'Liste aller Special Polls' })
  async findAll(): Promise<SpecialPoll[]> {
    this.logger.log('GET /special-polls');
    return this.specialPollsService.findAll();
  }

  @Get(':id')
  @Roles('user', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Gibt eine bestimmte Special Poll zurück' })
  @ApiResponse({ status: 200, description: 'Die angeforderte Special Poll' })
  async findOne(@Param('id') id: string): Promise<SpecialPoll> {
    this.logger.log(`GET /special-polls/${id}`);
    return this.specialPollsService.findOne(id);
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
