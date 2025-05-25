import { Controller, Get, Post, Body, Param, Logger, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { ContactRequest } from '../../domain/entities/contact-request.entity';
import { GeneralContactRequestDto } from '../dto/general-contact-request.dto';
import { FeedbackRequestDto } from '../dto/feedback-request.dto';
import { BusinessClaimRequestDto } from '../dto/business-claim-request.dto';
import { BusinessRequestDto } from '../dto/business-request.dto';
import { AdminResponseDto } from '../dto/admin-response.dto';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AddMessageDto } from '../dto/add-message.dto';

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly contactService: ContactService) {}

  @Post('general')
  @ApiOperation({ summary: 'Create a new general contact request' })
  @ApiResponse({ 
    status: 201, 
    description: 'The general contact request has been successfully created'
  })
  public async createGeneralContact(@Body() generalContactRequestDto: GeneralContactRequestDto): Promise<ContactRequest> {
    this.logger.log('POST /contact/general');
    return this.contactService.createGeneralContactRequest(generalContactRequestDto);
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Create a new feedback request' })
  @ApiResponse({ 
    status: 201, 
    description: 'The feedback request has been successfully created'
  })
  public async createFeedback(@Body() feedbackRequestDto: FeedbackRequestDto): Promise<ContactRequest> {
    this.logger.log('POST /contact/feedback');
    return this.contactService.createFeedbackRequest(feedbackRequestDto);
  }

  @Post('business-claim')
  @ApiOperation({ summary: 'Create a new business claim request' })
  @ApiResponse({ 
    status: 201, 
    description: 'The business claim request has been successfully created'
  })
  public async createBusinessClaim(@Body() businessClaimRequestDto: BusinessClaimRequestDto): Promise<ContactRequest> {
    this.logger.log('POST /contact/business-claim');
    return this.contactService.createBusinessClaimRequest(businessClaimRequestDto);
  }

  @Post('business')
  @ApiOperation({ summary: 'Create a new business request' })
  @ApiResponse({ 
    status: 201, 
    description: 'The business request has been successfully created'
  })
  public async createBusinessRequest(@Body() businessRequestDto: BusinessRequestDto): Promise<ContactRequest> {
    this.logger.log('POST /contact/business');
    return this.contactService.createBusinessRequest(businessRequestDto);
  }

  @Post(':id/response')
  @ApiOperation({ summary: 'Add an admin response to a contact request' })
  @ApiResponse({ 
    status: 200, 
    description: 'The admin response has been added to the contact request'
  })
  public async addAdminResponse(
    @Param('id') id: string,
    @Body() adminResponseDto: AdminResponseDto,
  ): Promise<ContactRequest> {
    this.logger.log(`POST /contact/${id}/response`);
    return this.contactService.addAdminResponse(id, adminResponseDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contact requests' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all contact requests'
  })
  public async getAll(): Promise<ContactRequest[]> {
    this.logger.log('GET /contact');
    return this.contactService.getAll();
  }

  @Get('user/:userId/request/:id')
  @ApiOperation({ summary: 'Get a specific contact request for a user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the contact request with the specified id for the specified user'
  })
  public async getById(
    @Param('userId') userId: string,
    @Param('id') id: string
  ): Promise<ContactRequest> {
    this.logger.log(`GET /contact/user/${userId}/request/${id}`);
    const contactRequest = await this.contactService.getById(id, userId);
    if (!contactRequest) {
      throw new NotFoundException('Contact request not found');
    }
    return contactRequest;
  }

  @Patch('user/:userId/request/:id/processed')
  @ApiOperation({ summary: 'Mark a contact request as processed' })
  @ApiResponse({ 
    status: 200, 
    description: 'The contact request has been marked as processed'
  })
  public async markAsProcessed(
    @Param('userId') userId: string,
    @Param('id') id: string
  ): Promise<ContactRequest> {
    this.logger.log(`PATCH /contact/user/${userId}/request/${id}/processed`);
    const contactRequest = await this.contactService.getById(id, userId);
    if (!contactRequest) {
      throw new NotFoundException('Contact request not found');
    }
    return this.contactService.markAsProcessed(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all contact requests for a specific user' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all contact requests for the specified user'
  })
  public async getContactRequestsByUserId(@Param('userId') userId: string): Promise<ContactRequest[]> {
    this.logger.log(`GET /contact/user/${userId}`);
    return this.contactService.getContactRequestsByUserId(userId);
  }

  @Get('open-requests/count')
  @ApiOperation({ summary: 'Get the number of open (unresponded) contact requests' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the number of contact requests that have not been responded to yet',
    type: Number
  })
  public async getOpenRequestsCount(): Promise<number> {
    this.logger.log('GET /contact/open-requests/count');
    return this.contactService.getOpenRequestsCount();
  }

  @Patch('user/:userId/request/:id')
  @ApiOperation({ summary: 'Fügt eine neue Nachricht zu einer Kontaktanfrage hinzu' })
  @ApiResponse({ 
    status: 200, 
    description: 'Die Nachricht wurde erfolgreich zur Kontaktanfrage hinzugefügt'
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Nicht autorisiert - Sie haben keine Berechtigung, diese Kontaktanfrage zu bearbeiten'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID des Benutzers'
  })
  @ApiParam({
    name: 'id',
    description: 'ID der Kontaktanfrage'
  })
  public async addMessage(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() messageDto: AddMessageDto
  ): Promise<ContactRequest> {
    this.logger.log(`PATCH /contact/user/${userId}/request/${id}/message`);
    return this.contactService.addMessage(id, userId, messageDto);
  }
} 