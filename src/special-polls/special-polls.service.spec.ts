import { Test, TestingModule } from '@nestjs/testing';
import { SpecialPollsService } from './special-polls.service';
import { FirebaseService } from '../firebase/firebase.service';
import { UsersService } from '../users/users.service';
import { NotificationService } from '../notifications/application/services/notification.service';
import {
  SpecialPoll,
  SpecialPollStatus,
  SpecialPollResponse,
  LEGACY_SPECIAL_POLL_STATUS_CLOSED,
  LEGACY_SPECIAL_POLL_STATUS_PENDING,
} from './interfaces/special-poll.interface';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { NotFoundException } from '@nestjs/common';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
}));

describe('SpecialPollsService', () => {
  let service: SpecialPollsService;
  let mockFirebaseService: { getFirestore: jest.Mock };
  let mockUsersService: { getById: jest.Mock; getAllUserProfilesWithIds: jest.Mock };
  let mockNotificationService: jest.Mocked<NotificationService>;

  const rawPollDoc = {
    title: 'Test Poll',
    responses: [] as unknown[],
    status: LEGACY_SPECIAL_POLL_STATUS_PENDING,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const expectedPoll = (id: string, overrides: Partial<SpecialPoll> = {}): SpecialPoll => ({
    id,
    title: 'Test Poll',
    responses: [],
    status: SpecialPollStatus.ACTIVE,
    isHighlighted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  });

  const createFirestoreMock = (mockData: Record<string, unknown> = { ...rawPollDoc }) => {
    const docRefs: Record<
      string,
      {
        get: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
      }
    > = {};

    const mockCollection = {
      doc: jest.fn().mockImplementation((docId: string) => {
        if (!docRefs[docId]) {
          docRefs[docId] = {
            get: jest.fn().mockResolvedValue({
              exists: true,
              id: docId,
              data: () => mockData,
            }),
            update: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
          };
        }
        return docRefs[docId];
      }),
      add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        docs: [{ id: 'mock-id', data: () => mockData }],
      }),
    };

    return {
      collection: jest.fn().mockReturnValue(mockCollection),
    };
  };

  beforeEach(async () => {
    mockFirebaseService = {
      getFirestore: jest.fn().mockReturnValue(createFirestoreMock()),
    };

    mockUsersService = {
      getById: jest.fn(),
      getAllUserProfilesWithIds: jest.fn(),
    };

    mockNotificationService = {
      sendToUser: jest.fn(),
      sendToUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialPollsService,
        {
          provide: FirebaseService,
          useValue: mockFirebaseService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<SpecialPollsService>(SpecialPollsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of special polls', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedPoll('mock-id'));
    });

    it('should filter highlighted polls when highlightedOnly is true', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        isHighlighted: true,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll(true);

      expect(result).toHaveLength(1);
      expect(result[0].isHighlighted).toBe(true);
    });

    it('should exclude non-highlighted when highlightedOnly is true', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc, isHighlighted: false });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll(true);

      expect(result).toHaveLength(0);
    });

    it('should exclude INACTIVE polls when includeInactivePolls is false', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.INACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll(false, false);

      expect(result).toHaveLength(0);
    });

    it('should include INACTIVE polls when includeInactivePolls is true', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.INACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findAll(false, true);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(SpecialPollStatus.INACTIVE);
    });
  });

  describe('findOne', () => {
    it('should return a special poll by id', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('poll1');

      expect(result).toEqual(expectedPoll('poll1'));
    });

    it('should normalize legacy CLOSED status to ACTIVE', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: LEGACY_SPECIAL_POLL_STATUS_CLOSED,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('poll1');

      expect(result.status).toBe(SpecialPollStatus.ACTIVE);
    });

    it('should normalize legacy PENDING in storage to ACTIVE in API', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: LEGACY_SPECIAL_POLL_STATUS_PENDING,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('poll1');

      expect(result.status).toBe(SpecialPollStatus.ACTIVE);
    });

    it('should throw NotFoundException for INACTIVE when includeInactivePolls is false', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.INACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.findOne('poll1', false)).rejects.toThrow(NotFoundException);
    });

    it('should return INACTIVE poll when includeInactivePolls is true', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.INACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const result = await service.findOne('poll1', true);

      expect(result.status).toBe(SpecialPollStatus.INACTIVE);
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const col = mockFirestore.collection();
      col.doc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: false,
          id: docId,
          data: () => null,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }));
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new special poll', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      const result = await service.create(createDto);

      expect(result.title).toBe(createDto.title);
      expect(result.status).toBe(SpecialPollStatus.ACTIVE);
      expect(result.isHighlighted).toBe(false);
      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({ status: SpecialPollStatus.ACTIVE }),
      );
    });

    it('should persist isHighlighted when provided', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([]);

      await service.create({ title: 'New Poll', isHighlighted: true });

      expect(mockFirestore.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({ isHighlighted: true }),
      );
    });

    it('should send notification when preference is enabled', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newSurveys: true,
            },
            businessHistory: [],
          },
        },
      ]);

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      await service.create(createDto);

      expect(mockUsersService.getAllUserProfilesWithIds).toHaveBeenCalled();
      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith('user1', {
        title: 'Neue Umfrage verfügbar',
        body: 'New Poll',
        data: {
          type: 'NEW_SURVEY',
          surveyId: 'mock-id',
          surveyTitle: 'New Poll',
        },
      });
    });

    it('should not send notification when preference is disabled', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newSurveys: false,
            },
            businessHistory: [],
          },
        },
      ]);

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      await service.create(createDto);

      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not send notification when preference is undefined (default: false)', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {},
            businessHistory: [],
          },
        },
      ]);

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      await service.create(createDto);

      expect(mockNotificationService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      const mockFirestore = createFirestoreMock();
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getAllUserProfilesWithIds.mockResolvedValue([
        {
          id: 'user1',
          profile: {
            email: 'user1@test.com',
            userType: 'USER' as any,
            managementId: 'mgmt1',
            notificationPreferences: {
              newSurveys: true,
            },
            businessHistory: [],
          },
        },
      ]);
      mockNotificationService.sendToUser.mockRejectedValue(new Error('Notification failed'));

      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockNotificationService.sendToUser).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a special poll', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.INACTIVE,
      };

      await service.updateStatus('poll1', updateStatusDto);

      expect(mockFirestore.collection().doc('poll1').update).toHaveBeenCalledWith({
        status: SpecialPollStatus.INACTIVE,
        updatedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const col = mockFirestore.collection();
      col.doc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: false,
          id: docId,
          data: () => null,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }));
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE,
      };

      await expect(service.updateStatus('nonexistent', updateStatusDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateHighlight', () => {
    it('should update isHighlighted', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.updateHighlight('poll1', true);

      expect(mockFirestore.collection().doc('poll1').update).toHaveBeenCalledWith({
        isHighlighted: true,
        updatedAt: expect.any(String),
      });
    });
  });

  describe('addResponse', () => {
    it('should add a response to a special poll', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.ACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      });

      await service.addResponse('poll1', 'user1', 'Test Response');

      expect(mockFirestore.collection().doc('poll1').update).toHaveBeenCalled();
      const updatePayload = mockFirestore.collection().doc('poll1').update.mock.calls[0][0];
      expect(updatePayload.responses).toHaveLength(1);
      expect(updatePayload.responses[0].userId).toBe('user1');
      expect(updatePayload.responses[0].id).toBeDefined();
      expect(updatePayload.responses[0].upvotedUserIds).toEqual([]);
    });

    it('should allow response when legacy status is CLOSED', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: LEGACY_SPECIAL_POLL_STATUS_CLOSED,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      });

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).resolves.toBeDefined();
      expect(mockFirestore.collection().doc('poll1').update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when poll is INACTIVE', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.INACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getById.mockResolvedValue({
        id: 'user1',
        name: 'Test User',
      });

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        status: SpecialPollStatus.ACTIVE,
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);
      mockUsersService.getById.mockResolvedValue(null);

      await expect(service.addResponse('poll1', 'user1', 'Test Response')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleResponseUpvote', () => {
    it('should add upvote when not present', async () => {
      const responseId = 'resp-1';
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        responses: [
          {
            id: responseId,
            userId: 'author1',
            userName: 'Author',
            response: 'Hi',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.toggleResponseUpvote('poll1', responseId, 'voter1');

      const updatePayload = mockFirestore.collection().doc('poll1').update.mock.calls[0][0];
      expect(updatePayload.responses[0].upvotedUserIds).toContain('voter1');
    });

    it('should remove upvote when already present', async () => {
      const responseId = 'resp-1';
      const mockFirestore = createFirestoreMock({
        ...rawPollDoc,
        responses: [
          {
            id: responseId,
            userId: 'author1',
            userName: 'Author',
            response: 'Hi',
            createdAt: '2024-01-01T00:00:00.000Z',
            upvotedUserIds: ['voter1'],
          },
        ],
      });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.toggleResponseUpvote('poll1', responseId, 'voter1');

      const updatePayload = mockFirestore.collection().doc('poll1').update.mock.calls[0][0];
      expect(updatePayload.responses[0].upvotedUserIds).not.toContain('voter1');
    });

    it('should throw NotFoundException when response id unknown', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc, responses: [] });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(
        service.toggleResponseUpvote('poll1', 'missing', 'voter1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateResponses', () => {
    it('should update responses of a special poll', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      const responses: SpecialPollResponse[] = [
        {
          id: 'r1',
          userId: 'user1',
          userName: 'Test User',
          response: 'Test Response',
          createdAt: '2024-01-01T00:00:00.000Z',
          upvotedUserIds: [],
        },
      ];

      await service.updateResponses('poll1', responses as any);

      expect(mockFirestore.collection().doc('poll1').update).toHaveBeenCalledWith({
        responses: expect.arrayContaining([
          expect.objectContaining({
            id: 'r1',
            userId: 'user1',
            upvotedUserIds: [],
          }),
        ]),
        updatedAt: expect.any(String),
      });
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const col = mockFirestore.collection();
      col.doc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: false,
          id: docId,
          data: () => null,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }));
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.updateResponses('nonexistent', [])).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a special poll', async () => {
      const mockFirestore = createFirestoreMock({ ...rawPollDoc });
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await service.remove('poll1');

      expect(mockFirestore.collection().doc('poll1').delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if poll not found', async () => {
      const mockFirestore = createFirestoreMock();
      const col = mockFirestore.collection();
      col.doc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: false,
          id: docId,
          data: () => null,
        }),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      }));
      mockFirebaseService.getFirestore.mockReturnValue(mockFirestore);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
