import { Test, TestingModule } from '@nestjs/testing';
import { ContactService } from './contact.service';
import { UsersService } from '../../../users/users.service';
import { CONTACT_REQUEST_REPOSITORY } from '../../domain/repositories/contact-request.repository';
import { ContactRequest, ContactRequestType } from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';
import { UserType } from '../../../users/enums/user-type.enum';
import { NotificationService } from '../../../notifications/application/services/notification.service';

describe('ContactService', () => {
  let service: ContactService;
  let usersService: UsersService;
  let contactRequestRepository: any;
  let notificationService: NotificationService;

  const mockUsersService = {
    getById: jest.fn(),
    update: jest.fn(),
    updateBusinessUser: jest.fn(),
    getUserProfile: jest.fn(),
    getBusinessUser: jest.fn(),
  };

  const mockContactRequestRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
    findByBusinessId: jest.fn(),
  };

  const mockNotificationService = {
    sendToUser: jest.fn(),
    sendToUsers: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: CONTACT_REQUEST_REPOSITORY,
          useValue: mockContactRequestRepository,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
    usersService = module.get<UsersService>(UsersService);
    contactRequestRepository = module.get(CONTACT_REQUEST_REPOSITORY);
    notificationService = module.get<NotificationService>(NotificationService);
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

    const mockContactRequest = ContactRequest.fromProps({
      id: 'fixed-id-123',
      type: ContactRequestType.GENERAL,
      userId: mockData.userId,
      messages: [
        ContactMessage.create({
          message: mockData.message,
          userId: mockData.userId,
          isAdminResponse: false,
        }),
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responded: false,
      isProcessed: false,
    });

    it('should create a new contact request and update user', async () => {
      mockUsersService.getById.mockResolvedValue(mockUser);
      mockContactRequestRepository.create.mockResolvedValue(mockContactRequest);

      const result = await service.createContactRequest(mockData, ContactRequestType.GENERAL);

      expect(result).toBeDefined();
      expect(result.type).toBe(ContactRequestType.GENERAL);
      expect(result.userId).toBe(mockData.userId);
      expect(mockUsersService.update).toHaveBeenCalledWith(mockData.userId, {
        contactRequestIds: [mockContactRequest.id],
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: 'admin123',
        userType: UserType.SUPER_ADMIN,
      });
      const result = await service.getById(mockRequestId, 'admin123');
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockContactRequest.id);
    });

    it('should return contact request for owner', async () => {
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: mockUserId,
        contactRequestIds: [mockRequestId],
      });

      const result = await service.getById(mockRequestId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockContactRequest.id);
    });

    it('should return null for unauthorized user', async () => {
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      mockUsersService.getById.mockResolvedValue({
        id: mockUserId,
        contactRequestIds: [mockRequestId],
      });
      mockContactRequestRepository.update.mockResolvedValue({
        ...mockContactRequest,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: mockMessage,
            userId: mockUserId,
            isAdminResponse: false,
          }),
        ],
      });

      const result = await service.addMessage(mockRequestId, mockUserId, { message: mockMessage });

      expect(result).toBeDefined();
      expect(result.messages.length).toBe(2);
      expect(result.messages[1].message).toBe(mockMessage);
    });

    it('should throw UnauthorizedException for unauthorized user', async () => {
      mockContactRequestRepository.findById.mockResolvedValue(null);

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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(alreadyRespondedRequest);
      const alreadyRespondedJsonData = alreadyRespondedRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...alreadyRespondedJsonData,
        messages: [
          ...alreadyRespondedRequest.messages,
          ContactMessage.create({
            message: 'Second admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);

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
      mockContactRequestRepository.findById.mockResolvedValue(requestWithoutUserId);
      const requestWithoutUserIdJsonData = requestWithoutUserId.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...requestWithoutUserIdJsonData,
        messages: [
          ...requestWithoutUserId.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);

      const result = await service.addAdminResponse(mockRequestId, {
        userId: mockAdminId,
        message: 'Admin response',
      });

      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle notification sending errors gracefully', async () => {
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      mockUsersService.getById.mockResolvedValue(mockAdminUser);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockContactRequest);
      mockUsersService.getById.mockResolvedValue(mockRegularUser);
      const jsonData = mockContactRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockContactRequest.messages,
          ContactMessage.create({
            message: 'User follow-up',
            userId: mockUserId,
            isAdminResponse: false,
          }),
        ],
        responded: false,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);

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
      mockContactRequestRepository.findById.mockResolvedValue(mockBusinessClaimRequest);
      const jsonData = mockBusinessClaimRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockBusinessClaimRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
      mockContactRequestRepository.findById.mockResolvedValue(mockBusinessRequest);
      const jsonData = mockBusinessRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockBusinessRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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

      mockContactRequestRepository.findById.mockResolvedValue(mockGeneralRequest);
      const updatedRequest = ContactRequest.fromProps({
        ...mockGeneralRequest.toJSON(),
        responded: true,
        messages: [
          ...mockGeneralRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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

      mockContactRequestRepository.findById.mockResolvedValue(mockBusinessClaimRequest);
      const jsonData = mockBusinessClaimRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockBusinessClaimRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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

      mockContactRequestRepository.findById.mockResolvedValue(mockBusinessClaimRequest);
      const jsonData = mockBusinessClaimRequest.toJSON();
      const updatedRequest = ContactRequest.fromProps({
        ...jsonData,
        messages: [
          ...mockBusinessClaimRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
        responded: true,
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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

      mockContactRequestRepository.findById.mockResolvedValue(mockGeneralRequest);
      const updatedRequest = ContactRequest.fromProps({
        ...mockGeneralRequest.toJSON(),
        responded: true,
        messages: [
          ...mockGeneralRequest.messages,
          ContactMessage.create({
            message: 'Admin response',
            userId: mockAdminId,
            isAdminResponse: true,
          }),
        ],
      });
      mockContactRequestRepository.update.mockResolvedValue(updatedRequest);
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
