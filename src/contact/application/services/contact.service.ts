import { Injectable, Logger, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { ContactRequest, ContactRequestType } from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { GeneralContactRequestDto } from '../dto/general-contact-request.dto';
import { FeedbackRequestDto } from '../dto/feedback-request.dto';
import { BusinessClaimRequestDto } from '../dto/business-claim-request.dto';
import { BusinessRequestDto } from '../dto/business-request.dto';
import { AdminResponseDto } from '../dto/admin-response.dto';
import { UsersService } from '../../../users/users.service';
import { UserType } from '../../../users/enums/user-type.enum';
import { AddMessageDto } from '../dto/add-message.dto';
import {
  CONTACT_REQUEST_REPOSITORY,
  ContactRequestRepository,
} from '../../domain/repositories/contact-request.repository';
import { NotificationService } from '../../../notifications/application/services/notification.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(CONTACT_REQUEST_REPOSITORY)
    private readonly contactRequestRepository: ContactRequestRepository,
    private readonly notificationService: NotificationService,
  ) {}

  public async createContactRequest(
    data:
      | GeneralContactRequestDto
      | FeedbackRequestDto
      | BusinessClaimRequestDto
      | BusinessRequestDto,
    type: ContactRequestType,
  ): Promise<ContactRequest> {
    this.logger.debug(`Creating new ${type} contact request`);

    const initialMessage = ContactMessage.create({
      message: data.message,
      userId: data.userId,
      isAdminResponse: false,
    });

    const contactRequest = ContactRequest.create({
      type,
      businessId: 'businessId' in data ? data.businessId : '',
      userId: data.userId,
      messages: [initialMessage],
    });

    const createdRequest = await this.contactRequestRepository.create(contactRequest);

    // Speichere die ID im Benutzermodell
    const user = await this.usersService.getById(data.userId);
    if (user) {
      const contactRequestIds = user.contactRequestIds || [];
      contactRequestIds.push(createdRequest.id);

      if ('userType' in user) {
        await this.usersService.update(data.userId, { contactRequestIds });
      } else {
        await this.usersService.updateBusinessUser(data.userId, { contactRequestIds });
      }
    }

    return createdRequest;
  }

  public async createGeneralContactRequest(
    data: GeneralContactRequestDto,
  ): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.GENERAL);
  }

  public async createFeedbackRequest(data: FeedbackRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.FEEDBACK);
  }

  public async createBusinessClaimRequest(data: BusinessClaimRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.BUSINESS_CLAIM);
  }

  public async createBusinessRequest(data: BusinessRequestDto): Promise<ContactRequest> {
    return this.createContactRequest(data, ContactRequestType.BUSINESS_REQUEST);
  }

  public async addAdminResponse(id: string, data: AdminResponseDto): Promise<ContactRequest> {
    this.logger.debug(`Adding admin response to contact request ${id}`);

    const contactRequest = await this.contactRequestRepository.findById(id);
    if (!contactRequest) {
      throw new Error(`Contact request with id ${id} not found`);
    }

    const wasResponded = contactRequest.responded;

    const newMessage = ContactMessage.create({
      message: data.message,
      userId: data.userId,
      isAdminResponse: true,
    });

    const updatedRequest = await this.contactRequestRepository.update(id, {
      messages: [...contactRequest.messages.map(msg => ContactMessage.fromProps(msg)), newMessage],
      responded: true,
    });

    if (!updatedRequest) {
      throw new Error(`Contact request with id ${id} not found after update`);
    }

    if (!wasResponded && updatedRequest.userId) {
      await this.sendContactRequestResponseNotification(updatedRequest);
    }

    return updatedRequest;
  }

  public async getAll(): Promise<ContactRequest[]> {
    this.logger.debug('Getting all contact requests');
    return this.contactRequestRepository.findAll();
  }

  public async getById(id: string, userId: string): Promise<ContactRequest | null> {
    this.logger.debug(`Getting contact request ${id} for user ${userId}`);
    const contactRequest = await this.contactRequestRepository.findById(id);

    if (!contactRequest) {
      return null;
    }

    const user = await this.usersService.getById(userId);
    if (!user) {
      return null;
    }

    if ('userType' in user && user.userType === UserType.SUPER_ADMIN) {
      return contactRequest;
    }

    if (!user.contactRequestIds || !user.contactRequestIds.includes(id)) {
      return null;
    }

    return contactRequest;
  }

  public async markAsProcessed(id: string): Promise<ContactRequest> {
    this.logger.debug(`Marking contact request ${id} as processed`);
    const updatedRequest = await this.contactRequestRepository.update(id, { isProcessed: true });

    if (!updatedRequest) {
      throw new Error(`Contact request with id ${id} not found after update`);
    }

    return updatedRequest;
  }

  public async getContactRequestsByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.debug(`Getting contact requests for user ${userId}`);
    return this.contactRequestRepository.findByUserId(userId);
  }

  public async addMessage(
    id: string,
    userId: string,
    messageDto: AddMessageDto,
  ): Promise<ContactRequest> {
    this.logger.debug(`Adding message to contact request ${id} from user ${userId}`);

    const contactRequest = await this.getById(id, userId);
    if (!contactRequest) {
      throw new UnauthorizedException(
        'Sie haben keine Berechtigung, diese Kontaktanfrage zu bearbeiten',
      );
    }

    const user = await this.usersService.getById(userId);
    if (!user) {
      throw new UnauthorizedException('Benutzer nicht gefunden');
    }

    const wasResponded = contactRequest.responded;
    const isAdminResponse = 'userType' in user && user.userType === UserType.SUPER_ADMIN;

    const newMessage = ContactMessage.create({
      message: messageDto.message,
      userId: userId,
      isAdminResponse,
    });

    const updatedRequest = await this.contactRequestRepository.update(id, {
      messages: [...contactRequest.messages.map(msg => ContactMessage.fromProps(msg)), newMessage],
      responded: isAdminResponse,
    });

    if (!updatedRequest) {
      throw new Error('Kontaktanfrage konnte nach dem Update nicht gefunden werden');
    }

    if (!wasResponded && isAdminResponse && updatedRequest.userId) {
      await this.sendContactRequestResponseNotification(updatedRequest);
    }

    return updatedRequest;
  }

  public async getOpenRequestsCount(): Promise<number> {
    this.logger.debug('Getting count of open contact requests');
    const requests = await this.contactRequestRepository.findAll();
    return requests.filter(request => !request.responded).length;
  }

  private async sendContactRequestResponseNotification(
    contactRequest: ContactRequest,
  ): Promise<void> {
    try {
      if (!contactRequest.userId) {
        this.logger.debug(
          `Contact request ${contactRequest.id} has no userId, skipping notification`,
        );
        return;
      }
      const userProfile = await this.usersService.getUserProfile(contactRequest.userId);
      if (!userProfile) {
        this.logger.warn(
          `User profile not found for user ${contactRequest.userId}, skipping notification`,
        );
        return;
      }
      const notificationPreferences = userProfile.notificationPreferences;
      const contactRequestResponsesEnabled =
        notificationPreferences?.contactRequestResponses !== undefined
          ? notificationPreferences.contactRequestResponses
          : true;
      if (!contactRequestResponsesEnabled) {
        this.logger.debug(
          `Contact request responses notifications disabled for user ${contactRequest.userId}`,
        );
        return;
      }
      const requestTypeLabels: Record<ContactRequestType, string> = {
        [ContactRequestType.GENERAL]: 'Allgemeine',
        [ContactRequestType.FEEDBACK]: 'Feedback',
        [ContactRequestType.BUSINESS_CLAIM]: 'Geschäftsinhaber-Anfrage',
        [ContactRequestType.BUSINESS_REQUEST]: 'Geschäftsanfrage',
      };
      const requestTypeLabel = requestTypeLabels[contactRequest.type] || 'Anfrage';
      await this.notificationService.sendToUser(contactRequest.userId, {
        title: 'Antwort auf deine Anfrage',
        body: `Du hast eine Antwort auf deine ${requestTypeLabel} Anfrage erhalten`,
        data: {
          type: 'CONTACT_REQUEST_RESPONSE',
          contactRequestId: contactRequest.id,
          requestType: contactRequest.type.toString(),
        },
      });
      this.logger.debug(
        `Successfully sent contact request response notification to user ${contactRequest.userId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error sending contact request response notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
