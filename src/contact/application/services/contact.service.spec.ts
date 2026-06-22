import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { UsersService } from '../../../users/users.service';
import { ContactRequest, ContactRequestType } from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { UnauthorizedException } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UserType } from '../../../users/enums/user-type.enum';
import { NotificationService } from '../../../notifications/application/services/notification.service';

describe('ContactService', () => {
  let service: ContactService;
  let mockDoc: {
    get: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCollection: {
    doc: jest.Mock;
    add: jest.Mock;
    get: jest.Mock;
    where: jest.Mock;
  };
  let mockFirestore: { collection: jest.Mock };
  let mockFirebaseService: { getFirestore: jest.Mock };

  const mockUsersService = {
    getById: jest.fn(),
    update: jest.fn(),
    updateBusinessUser: jest.fn(),
    getUserProfile: jest.fn(),
    getBusinessUser: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const contactRequestToFirestoreData = (request: ContactRequest): Record<string, unknown> => {
    const { id, ...data } = request.toJSON();
    return data;
  };

  const configureFindById = (request: ContactRequest | null): void => {
    mockDoc.get.mockResolvedValue({
      exists: request !== null,
      id: request?.id ?? 'unknown',
      data: () => (request ? contactRequestToFirestoreData(request) : undefined),
    });
  };

  beforeEach(async () => {
    mockDoc = {
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      add: jest.fn().mockResolvedValue({ id: 'fixed-id-123' }),
      get: jest.fn().mockResolvedValue({ docs: [] }),
      where: jest.fn().mockReturnThis(),
    };
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue(mockFirestore),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FirebaseService, useValue: mockFirebaseService },
      ],
    }).compile();
    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContactRequest', () => {
    const mockData = {
      userId: 'user123',
      message: 'Test message',
    };

    const mockUser = {
      id: 'user123',
      contactRequestIds: [],
      userType: UserType.USER,
    };

    it('should create a new contact request and update user', async () => {
      mockUsersService.getById.mockResolvedValue(mockUser);
      const result = await service.createContactRequest(mockData, ContactRequestType.GENERAL);
      expect(result).toBeDefined();
      expect(result.type).toBe(ContactRequestType.GENERAL);
      expect(result.userId).toBe(mockData.userId);
      expect(mockCollection.add).toHaveBeenCalled();
      expect(mockUsersService.update).toHaveBeenCalledWith(mockData.userId, {
        contactRequestIds: ['fixed-id-123'],
      });
    });
  });

  describe('getById', () => {
    const mockUserId = 'user123';
    const mockRequestId = 'fixed-id-123';
    const mockContactRequest = ContactRequest.fromProps({
      id: mockRequestId,
      type: ContactRequestType.GENERAL,
      userId: mockUserId,
      messages: [
        ContactMessage.create({
          message: 'Test message',
          userId: mockUserId,
          isAdminResponse: false,
        }),
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responded: false,
      isProcessed: false,
    });

    it('should return contact request for super admin', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: 'admin123',
        userType: UserType.SUPER_ADMIN,
      });
      const result = await service.getById(mockRequestId, 'admin123');
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockContactRequest.id);
    });

    it('should return contact request for owner', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: mockUserId,
        contactRequestIds: [mockRequestId],
      });
      const result = await service.getById(mockRequestId, mockUserId);
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockContactRequest.id);
    });

    it('should return null for unauthorized user', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: 'other123',
        contactRequestIds: [],
      });
      const result = await service.getById(mockRequestId, 'other123');
      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    const mockUserId = 'user123';
    const mockRequestId = 'request123';
    const mockMessage = 'New message';
    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.GENERAL,
      userId: mockUserId,
      messages: [
        ContactMessage.create({
          message: 'Old message',
          userId: mockUserId,
          isAdminResponse: false,
        }),
      ],
    });

    it('should add message for authorized user', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: mockUserId,
        contactRequestIds: [mockRequestId],
      });
      const result = await service.addMessage(mockRequestId, mockUserId, { message: mockMessage });
      expect(result).toBeDefined();
      expect(result.messages.length).toBe(2);
      expect(result.messages[1].message).toBe(mockMessage);
      expect(mockDoc.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for unauthorized user', async () => {
      configureFindById(null);
      await expect(
        service.addMessage(mockRequestId, mockUserId, { message: mockMessage }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('addAdminResponse', () => {
    const mockRequestId = 'request123';
    const mockAdminId = 'admin123';
    const mockUserId = 'user123';
    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.GENERAL,
      userId: mockUserId,
      messages: [
        ContactMessage.create({
          message: 'User message',
          userId: mockUserId,
          isAdminResponse: false,
        }),
      ],
    });

    const mockUserProfile = {
      notificationPreferences: {
        contactRequestResponses: true,
      },
    };

    it('should add admin response and send notification when preference is enabled', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockUserId, {
        title: 'Antwort auf deine Anfrage',
        body: 'Du hast eine Antwort auf deine Allgemeine Anfrage erhalten',
        data: {
          type: 'CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.GENERAL.toString(),
        },
      });
    });

    it('should add admin response but not send notification when preference is disabled', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getUserProfile.mockResolvedValue({
        notificationPreferences: {
          contactRequestResponses: false,
        },
      });
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should add admin response and send notification when preference is undefined (default: true)', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getUserProfile.mockResolvedValue({
        notificationPreferences: {},
      });
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });

    it('should not send notification if contact request was already responded', async () => {
      const jsonData = mockContactRequest.toJSON();
      const alreadyRespondedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: mockContactRequest.messages,
        responded: true,
      });
      configureFindById(alreadyRespondedRequest);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Second admin response',
      });
      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send notification if contact request has no userId', async () => {
      const requestWithoutUserId = ContactRequest.create({
        type: ContactRequestType.GENERAL,
        messages: [
          ContactMessage.create({
            message: 'User message',
            userId: undefined,
            isAdminResponse: false,
          }),
        ],
      });
      configureFindById(requestWithoutUserId);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle notification sending errors gracefully', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification error'));
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
    });
  });

  describe('addMessage with admin response', () => {
    const mockRequestId = 'request123';
    const mockAdminId = 'admin123';
    const mockUserId = 'user123';
    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.FEEDBACK,
      userId: mockUserId,
      messages: [
        ContactMessage.create({
          message: 'User message',
          userId: mockUserId,
          isAdminResponse: false,
        }),
      ],
    });

    const mockAdminUser = {
      id: mockAdminId,
      userType: UserType.SUPER_ADMIN,
      contactRequestIds: [mockRequestId],
    };

    const mockUserProfile = {
      notificationPreferences: {
        contactRequestResponses: true,
      },
    };

    it('should add admin message and send notification when admin responds', async () => {
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue(mockAdminUser);
      mockUsersService.getUserProfile.mockResolvedValue(mockUserProfile);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addMessage(mockRequestId, mockAdminId, {
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockUserId, {
        title: 'Antwort auf deine Anfrage',
        body: 'Du hast eine Antwort auf deine Feedback Anfrage erhalten',
        data: {
          type: 'CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.FEEDBACK.toString(),
        },
      });
    });

    it('should add user message but not send notification when user responds', async () => {
      const mockRegularUser = {
        id: mockUserId,
        userType: UserType.USER,
        contactRequestIds: [mockRequestId],
      };
      configureFindById(mockContactRequest);
      mockUsersService.getById.mockResolvedValue(mockRegularUser);
      const result = await service.addMessage(mockRequestId, mockUserId, {
        message: 'User follow-up',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(false);
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });
  });

  describe('Business Contact Request Response Notifications', () => {
    const mockRequestId = 'request123';
    const mockAdminId = 'admin123';
    const mockBusinessUserId = 'business-user-123';
    const mockBusinessId = 'business123';

    const mockBusinessClaimRequest = ContactRequest.create({
      type: ContactRequestType.BUSINESS_CLAIM,
      userId: mockBusinessUserId,
      businessId: mockBusinessId,
      messages: [
        ContactMessage.create({
          message: 'Business claim request',
          userId: mockBusinessUserId,
          isAdminResponse: false,
        }),
      ],
    });

    const mockBusinessRequest = ContactRequest.create({
      type: ContactRequestType.BUSINESS_REQUEST,
      userId: mockBusinessUserId,
      businessId: mockBusinessId,
      messages: [
        ContactMessage.create({
          message: 'Business request',
          userId: mockBusinessUserId,
          isAdminResponse: false,
        }),
      ],
    });

    const mockBusinessUser = {
      id: mockBusinessUserId,
      email: 'business@example.com',
      businessIds: [mockBusinessId],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      isDeleted: false,
      needsReview: false,
      notificationPreferences: {
        businessContactRequestResponses: true,
      },
    };

    it('should send BUSINESS_CONTACT_REQUEST_RESPONSE notification for BUSINESS_CLAIM when preference is enabled', async () => {
      configureFindById(mockBusinessClaimRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockBusinessUserId);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockBusinessUserId, {
        title: 'Antwort auf deine Business-Anfrage',
        body: 'Du hast eine Antwort auf deine Geschäftsinhaber-Anfrage Anfrage erhalten',
        data: {
          type: 'BUSINESS_CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.BUSINESS_CLAIM.toString(),
          businessId: mockBusinessId,
        },
      });
    });

    it('should send BUSINESS_CONTACT_REQUEST_RESPONSE notification for BUSINESS_REQUEST when preference is enabled', async () => {
      configureFindById(mockBusinessRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(mockBusinessUser);
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockBusinessUserId);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockBusinessUserId, {
        title: 'Antwort auf deine Business-Anfrage',
        body: 'Du hast eine Antwort auf deine Geschäftsanfrage Anfrage erhalten',
        data: {
          type: 'BUSINESS_CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.BUSINESS_REQUEST.toString(),
          businessId: mockBusinessId,
        },
      });
    });

    it('should not send BUSINESS_CONTACT_REQUEST_RESPONSE notification for GENERAL/FEEDBACK requests', async () => {
      const mockGeneralRequest = ContactRequest.create({
        type: ContactRequestType.GENERAL,
        userId: mockBusinessUserId,
        messages: [
          ContactMessage.create({
            message: 'General request',
            userId: mockBusinessUserId,
            isAdminResponse: false,
          }),
        ],
      });
      configureFindById(mockGeneralRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue({
        notificationPreferences: {
          contactRequestResponses: true,
        },
      });
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockBusinessUserId);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockBusinessUserId, {
        title: 'Antwort auf deine Anfrage',
        body: 'Du hast eine Antwort auf deine Allgemeine Anfrage erhalten',
        data: {
          type: 'CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.GENERAL.toString(),
        },
      });
    });

    it('should not send BUSINESS_CONTACT_REQUEST_RESPONSE notification when preference is disabled', async () => {
      const businessUserWithDisabledPreference = {
        ...mockBusinessUser,
        notificationPreferences: {
          businessContactRequestResponses: false,
        },
      };
      configureFindById(mockBusinessClaimRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(businessUserWithDisabledPreference);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockBusinessUserId);
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send BUSINESS_CONTACT_REQUEST_RESPONSE notification when preference is undefined (default false)', async () => {
      const businessUserWithoutPreference = {
        ...mockBusinessUser,
        notificationPreferences: undefined,
      };
      configureFindById(mockBusinessClaimRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(businessUserWithoutPreference);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(result.responded).toBe(true);
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockBusinessUserId);
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should send CONTACT_REQUEST_RESPONSE to normal users for GENERAL/FEEDBACK requests', async () => {
      const mockNormalUserId = 'normal-user-123';
      const mockGeneralRequest = ContactRequest.create({
        type: ContactRequestType.GENERAL,
        userId: mockNormalUserId,
        messages: [
          ContactMessage.create({
            message: 'General request',
            userId: mockNormalUserId,
            isAdminResponse: false,
          }),
        ],
      });
      configureFindById(mockGeneralRequest);
      mockUsersService.getBusinessUser.mockResolvedValue(null);
      mockUsersService.getUserProfile.mockResolvedValue({
        notificationPreferences: {
          contactRequestResponses: true,
        },
      });
      mockNotificationService.sendToUser.mockResolvedValue(undefined);
      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });
      expect(result).toBeDefined();
      expect(mockUsersService.getBusinessUser).toHaveBeenCalledWith(mockNormalUserId);
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(mockNormalUserId, {
        title: 'Antwort auf deine Anfrage',
        body: 'Du hast eine Antwort auf deine Allgemeine Anfrage erhalten',
        data: {
          type: 'CONTACT_REQUEST_RESPONSE',
          contactRequestId: result.id,
          requestType: ContactRequestType.GENERAL.toString(),
        },
      });
    });
  });
});
