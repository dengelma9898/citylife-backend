import { Injectable, Logger, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { toFirestoreData } from '../../../firebase/firebase-mapper.util';
import {
  ContactRequest,
  ContactRequestProps,
  ContactRequestType,
} from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { GeneralContactRequestDto } from '../dto/general-contact-request.dto';
import { FeedbackRequestDto } from '../dto/feedback-request.dto';
import { BusinessClaimRequestDto } from '../dto/business-claim-request.dto';
import { BusinessRequestDto } from '../dto/business-request.dto';
import { AdminResponseDto } from '../dto/admin-response.dto';
import { UsersService } from '../../../users/users.service';
import { UserType } from '../../../users/enums/user-type.enum';
import { AddMessageDto } from '../dto/add-message.dto';
import { NotificationService } from '../../../notifications/application/services/notification.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly collection = 'contact_requests';

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly firebaseService: FirebaseService,
    private readonly notificationService: NotificationService,
  ) {}

  private toContactRequestProps(data: Record<string, unknown>, id: string): ContactRequestProps {
    const messages = (data.messages as Record<string, unknown>[]) || [];
    return {
      id,
      type: data.type as ContactRequestType,
      userId: data.userId as string | undefined,
      businessId: data.businessId as string | undefined,
      messages: messages.map(msg =>
        ContactMessage.fromProps({
          userId: msg.userId as string | undefined,
          message: msg.message as string,
          createdAt: msg.createdAt as string,
          isAdminResponse: msg.isAdminResponse as boolean,
        }),
      ),
      createdAt: data.createdAt as string,
      updatedAt: data.updatedAt as string,
      isProcessed: (data.isProcessed as boolean) ?? false,
      responded: (data.responded as boolean) ?? false,
    };
  }

  private async findAllContactRequests(): Promise<ContactRequest[]> {
    this.logger.log('Getting all contact requests');
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(
        this.toContactRequestProps(doc.data() as Record<string, unknown>, doc.id),
      ),
    );
  }

  private async findContactRequestById(id: string): Promise<ContactRequest | null> {
    this.logger.log(`Getting contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return ContactRequest.fromProps(
      this.toContactRequestProps(doc.data() as Record<string, unknown>, doc.id),
    );
  }

  private async createContactRequestInFirestore(
    data: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ContactRequest> {
    this.logger.log('Creating new contact request');
    const db = this.firebaseService.getFirestore();
    const contactRequest = ContactRequest.create(data);
    const plainData = toFirestoreData(contactRequest);
    const docRef = await db.collection(this.collection).add(plainData);
    return ContactRequest.fromProps(this.toContactRequestProps(plainData, docRef.id));
  }

  private async updateContactRequest(
    id: string,
    data: Partial<Omit<ContactRequest, 'id' | 'createdAt'>>,
  ): Promise<ContactRequest | null> {
    this.logger.log(`Updating contact request with id: ${id}`);
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const currentRequest = ContactRequest.fromProps(
      this.toContactRequestProps(doc.data() as Record<string, unknown>, doc.id),
    );
    const updatedRequest = currentRequest.update(data);
    const plainData = toFirestoreData(updatedRequest);
    await db.collection(this.collection).doc(id).update(plainData);
    return ContactRequest.fromProps(this.toContactRequestProps(plainData, id));
  }

  private async findContactRequestsByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.log(`Finding contact requests for user: ${userId}`);
    const db = this.firebaseService.getFirestore();
    const snapshot = await db.collection(this.collection).where('userId', '==', userId).get();
    return snapshot.docs.map(doc =>
      ContactRequest.fromProps(
        this.toContactRequestProps(doc.data() as Record<string, unknown>, doc.id),
      ),
    );
  }

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
    const createdRequest = await this.createContactRequestInFirestore(contactRequest);
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
    const contactRequest = await this.findContactRequestById(id);
    if (!contactRequest) {
      throw new Error(`Contact request with id ${id} not found`);
    }
    const wasResponded = contactRequest.responded;
    const newMessage = ContactMessage.create({
      message: data.message,
      userId: data.userId,
      isAdminResponse: true,
    });
    const updatedRequest = await this.updateContactRequest(id, {
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
    return this.findAllContactRequests();
  }

  public async getById(id: string, userId: string): Promise<ContactRequest | null> {
    this.logger.debug(`Getting contact request ${id} for user ${userId}`);
    const contactRequest = await this.findContactRequestById(id);
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
    const updatedRequest = await this.updateContactRequest(id, { isProcessed: true });
    if (!updatedRequest) {
      throw new Error(`Contact request with id ${id} not found after update`);
    }
    return updatedRequest;
  }

  public async getContactRequestsByUserId(userId: string): Promise<ContactRequest[]> {
    this.logger.debug(`Getting contact requests for user ${userId}`);
    return this.findContactRequestsByUserId(userId);
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
    const updatedRequest = await this.updateContactRequest(id, {
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
    const requests = await this.findAllContactRequests();
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
      const isBusinessRequestType =
        contactRequest.type === ContactRequestType.BUSINESS_CLAIM ||
        contactRequest.type === ContactRequestType.BUSINESS_REQUEST;
      const businessUser = await this.usersService.getBusinessUser(contactRequest.userId);
      if (isBusinessRequestType && businessUser) {
        await this.sendBusinessContactRequestResponseNotification(contactRequest);
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

  private async sendBusinessContactRequestResponseNotification(
    contactRequest: ContactRequest,
  ): Promise<void> {
    try {
      if (!contactRequest.userId) {
        this.logger.debug(
          `Contact request ${contactRequest.id} has no userId, skipping business notification`,
        );
        return;
      }
      const isBusinessRequestType =
        contactRequest.type === ContactRequestType.BUSINESS_CLAIM ||
        contactRequest.type === ContactRequestType.BUSINESS_REQUEST;
      if (!isBusinessRequestType) {
        this.logger.debug(
          `Contact request ${contactRequest.id} is not a business request type, skipping business notification`,
        );
        return;
      }
      const businessUser = await this.usersService.getBusinessUser(contactRequest.userId);
      if (!businessUser) {
        this.logger.debug(
          `Business user not found for user ${contactRequest.userId}, skipping business notification`,
        );
        return;
      }
      const notificationPreferences = businessUser.notificationPreferences;
      const businessContactRequestResponsesEnabled =
        notificationPreferences?.businessContactRequestResponses !== undefined
          ? notificationPreferences.businessContactRequestResponses
          : false;
      if (!businessContactRequestResponsesEnabled) {
        this.logger.debug(
          `Business contact request responses notifications disabled for business user ${contactRequest.userId}`,
        );
        return;
      }
      const requestTypeLabels: Partial<Record<ContactRequestType, string>> = {
        [ContactRequestType.BUSINESS_CLAIM]: 'Geschäftsinhaber-Anfrage',
        [ContactRequestType.BUSINESS_REQUEST]: 'Geschäftsanfrage',
      };
      const requestTypeLabel = requestTypeLabels[contactRequest.type] || 'Business-Anfrage';
      await this.notificationService.sendToUser(contactRequest.userId, {
        title: 'Antwort auf deine Business-Anfrage',
        body: `Du hast eine Antwort auf deine ${requestTypeLabel} Anfrage erhalten`,
        data: {
          type: 'BUSINESS_CONTACT_REQUEST_RESPONSE',
          contactRequestId: contactRequest.id,
          requestType: contactRequest.type.toString(),
          businessId: contactRequest.businessId || undefined,
        },
      });
      this.logger.debug(
        `Successfully sent business contact request response notification to business user ${contactRequest.userId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error sending business contact request response notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
