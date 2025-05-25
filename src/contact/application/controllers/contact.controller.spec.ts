import { Test, TestingModule } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from '../services/contact.service';
import { ContactRequest, ContactRequestType } from '../../domain/entities/contact-request.entity';
import { ContactMessage } from '../../domain/entities/contact-message.entity';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../../../firebase/firebase.service';

jest.mock('../../../firebase/firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  }))
}));

describe('ContactController', () => {
  let controller: ContactController;
  let service: ContactService;

  const mockContactService = {
    createGeneralContactRequest: jest.fn(),
    createFeedbackRequest: jest.fn(),
    createBusinessClaimRequest: jest.fn(),
    createBusinessRequest: jest.fn(),
    addAdminResponse: jest.fn(),
    getAll: jest.fn(),
    getById: jest.fn(),
    markAsProcessed: jest.fn(),
    getContactRequestsByUserId: jest.fn(),
    getOpenRequestsCount: jest.fn(),
    addMessage: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn()
  };

  const mockFirebaseService = {
    getClientFirestore: jest.fn(),
    getClientAuth: jest.fn(),
    getClientStorage: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        {
          provide: ContactService,
          useValue: mockContactService
        },
        {
          provide: ConfigService,
          useValue: mockConfigService
        },
        {
          provide: FirebaseService,
          useValue: mockFirebaseService
        }
      ],
    }).compile();

    controller = module.get<ContactController>(ContactController);
    service = module.get<ContactService>(ContactService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGeneralContact', () => {
    const mockData = {
      userId: 'user123',
      message: 'Test message'
    };

    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.GENERAL,
      userId: mockData.userId,
      messages: [ContactMessage.create({
        message: mockData.message,
        userId: mockData.userId,
        isAdminResponse: false
      })]
    });

    it('should create a general contact request', async () => {
      mockContactService.createGeneralContactRequest.mockResolvedValue(mockContactRequest);

      const result = await controller.createGeneralContact(mockData);

      expect(result).toBeDefined();
      expect(result.type).toBe(ContactRequestType.GENERAL);
      expect(mockContactService.createGeneralContactRequest).toHaveBeenCalledWith(mockData);
    });
  });

  describe('getById', () => {
    const mockUserId = 'user123';
    const mockRequestId = 'request123';
    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.GENERAL,
      userId: mockUserId,
      messages: [ContactMessage.create({
        message: 'Test message',
        userId: mockUserId,
        isAdminResponse: false
      })]
    });

    it('should return contact request if found', async () => {
      mockContactService.getById.mockResolvedValue(mockContactRequest);

      const result = await controller.getById(mockUserId, mockRequestId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockContactRequest.id);
      expect(mockContactService.getById).toHaveBeenCalledWith(mockRequestId, mockUserId);
    });

    it('should throw NotFoundException if contact request not found', async () => {
      mockContactService.getById.mockResolvedValue(null);

      await expect(controller.getById(mockUserId, mockRequestId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('addMessage', () => {
    const mockUserId = 'user123';
    const mockRequestId = 'request123';
    const mockMessage = { message: 'New message' };
    const mockContactRequest = ContactRequest.create({
      type: ContactRequestType.GENERAL,
      userId: mockUserId,
      messages: [
        ContactMessage.create({
          message: 'Old message',
          userId: mockUserId,
          isAdminResponse: false
        }),
        ContactMessage.create({
          message: mockMessage.message,
          userId: mockUserId,
          isAdminResponse: false
        })
      ]
    });

    it('should add message to contact request', async () => {
      mockContactService.addMessage.mockResolvedValue(mockContactRequest);

      const result = await controller.addMessage(mockUserId, mockRequestId, mockMessage);

      expect(result).toBeDefined();
      expect(result.messages.length).toBe(2);
      expect(result.messages[1].message).toBe(mockMessage.message);
      expect(mockContactService.addMessage).toHaveBeenCalledWith(mockRequestId, mockUserId, mockMessage);
    });
  });

  describe('getOpenRequestsCount', () => {
    it('should return count of open requests', async () => {
      const mockCount = 5;
      mockContactService.getOpenRequestsCount.mockResolvedValue(mockCount);

      const result = await controller.getOpenRequestsCount();

      expect(result).toBe(mockCount);
      expect(mockContactService.getOpenRequestsCount).toHaveBeenCalled();
    });
  });
}); 