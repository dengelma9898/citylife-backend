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

describe('ContactService', () => {
  let service: ContactService;
  let usersService: UsersService;
  let contactRequestRepository: any;

  const mockUsersService = {
    getById: jest.fn(),
    update: jest.fn(),
    updateBusinessUser: jest.fn(),
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
});
