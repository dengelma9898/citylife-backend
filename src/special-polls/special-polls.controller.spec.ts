import { Test, TestingModule } from '@nestjs/testing';
import { SpecialPollsController } from './special-polls.controller';
import { SpecialPollsService } from './special-polls.service';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { UpdateSpecialPollHighlightDto } from './dto/update-special-poll-highlight.dto';
import { UpdateSpecialPollResponsesDto } from './dto/update-special-poll-responses.dto';
import { SpecialPoll, SpecialPollStatus } from './interfaces/special-poll.interface';
import { NotFoundException } from '@nestjs/common';
import { RolesGuard } from '../core/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { UserType } from '../users/enums/user-type.enum';
import { Reflector } from '@nestjs/core';

describe('SpecialPollsController', () => {
  let controller: SpecialPollsController;
  let service: SpecialPollsService;

  const mockSpecialPollsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    updateHighlight: jest.fn(),
    addResponse: jest.fn(),
    removeResponse: jest.fn(),
    toggleResponseUpvote: jest.fn(),
    updateResponses: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsersService = {
    getById: jest.fn().mockResolvedValue({ userType: UserType.USER }),
    getUserProfile: jest.fn(),
  };

  const mockSpecialPoll: SpecialPoll = {
    id: 'poll1',
    title: 'Test Poll',
    responses: [],
    status: SpecialPollStatus.ACTIVE,
    isHighlighted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialPollsController],
      providers: [
        {
          provide: SpecialPollsService,
          useValue: mockSpecialPollsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: RolesGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(['user', 'admin', 'super_admin']),
          },
        },
      ],
    }).compile();

    controller = module.get<SpecialPollsController>(SpecialPollsController);
    service = module.get<SpecialPollsService>(SpecialPollsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new special poll', async () => {
      const createDto: CreateSpecialPollDto = {
        title: 'New Poll',
      };

      mockSpecialPollsService.create.mockResolvedValue(mockSpecialPoll);

      const result = await controller.create(createDto);

      expect(result).toEqual(mockSpecialPoll);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of special polls', async () => {
      const polls = [mockSpecialPoll];
      mockSpecialPollsService.findAll.mockResolvedValue(polls);

      const result = await controller.findAll('caller', undefined);

      expect(result).toEqual(polls);
      expect(service.findAll).toHaveBeenCalledWith(false, false);
    });

    it('should pass highlightedOnly when query highlighted=true', async () => {
      mockSpecialPollsService.findAll.mockResolvedValue([mockSpecialPoll]);

      await controller.findAll('caller', 'true');

      expect(service.findAll).toHaveBeenCalledWith(true, false);
    });

    it('should include inactive polls for admin', async () => {
      mockUsersService.getById.mockResolvedValueOnce({ userType: UserType.ADMIN });
      mockSpecialPollsService.findAll.mockResolvedValue([mockSpecialPoll]);

      await controller.findAll('admin1', undefined);

      expect(service.findAll).toHaveBeenCalledWith(false, true);
    });
  });

  describe('findOne', () => {
    it('should return a special poll by id', async () => {
      mockSpecialPollsService.findOne.mockResolvedValue(mockSpecialPoll);

      const result = await controller.findOne('poll1', 'caller');

      expect(result).toEqual(mockSpecialPoll);
      expect(service.findOne).toHaveBeenCalledWith('poll1', false);
    });

    it('should pass includeInactive for super_admin', async () => {
      mockUsersService.getById.mockResolvedValueOnce({ userType: UserType.SUPER_ADMIN });
      mockSpecialPollsService.findOne.mockResolvedValue(mockSpecialPoll);

      await controller.findOne('poll1', 'admin');

      expect(service.findOne).toHaveBeenCalledWith('poll1', true);
    });

    it('should throw NotFoundException if poll not found', async () => {
      mockSpecialPollsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent', 'caller')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a special poll', async () => {
      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.INACTIVE,
      };

      const updatedPoll = { ...mockSpecialPoll, status: SpecialPollStatus.INACTIVE };
      mockSpecialPollsService.updateStatus.mockResolvedValue(updatedPoll);

      const result = await controller.updateStatus('poll1', updateStatusDto);

      expect(result).toEqual(updatedPoll);
      expect(service.updateStatus).toHaveBeenCalledWith('poll1', updateStatusDto);
    });
  });

  describe('updateHighlight', () => {
    it('should update highlight flag', async () => {
      const dto: UpdateSpecialPollHighlightDto = { isHighlighted: true };
      const updated = { ...mockSpecialPoll, isHighlighted: true };
      mockSpecialPollsService.updateHighlight.mockResolvedValue(updated);

      const result = await controller.updateHighlight('poll1', dto);

      expect(result).toEqual(updated);
      expect(service.updateHighlight).toHaveBeenCalledWith('poll1', true);
    });
  });

  describe('addResponse', () => {
    it('should add a response to a special poll', async () => {
      const response = 'Test Response';
      const userId = 'user1';

      const updatedPoll = {
        ...mockSpecialPoll,
        responses: [
          {
            id: 'r-new',
            userId,
            userName: 'Test User',
            response,
            createdAt: '2024-01-01T00:00:00.000Z',
            upvotedUserIds: [],
          },
        ],
      };

      mockSpecialPollsService.addResponse.mockResolvedValue(updatedPoll);

      const result = await controller.addResponse('poll1', userId, response);

      expect(result).toEqual(updatedPoll);
      expect(service.addResponse).toHaveBeenCalledWith('poll1', userId, response);
    });
  });

  describe('removeMyResponses', () => {
    it('should delegate to removeResponse with current user', async () => {
      mockSpecialPollsService.removeResponse.mockResolvedValue(mockSpecialPoll);

      const result = await controller.removeMyResponses('poll1', 'user1');

      expect(result).toEqual(mockSpecialPoll);
      expect(service.removeResponse).toHaveBeenCalledWith('poll1', 'user1');
    });
  });

  describe('toggleResponseUpvote', () => {
    it('should delegate to service', async () => {
      mockSpecialPollsService.toggleResponseUpvote.mockResolvedValue(mockSpecialPoll);

      const result = await controller.toggleResponseUpvote('poll1', 'resp1', 'user1');

      expect(result).toEqual(mockSpecialPoll);
      expect(service.toggleResponseUpvote).toHaveBeenCalledWith('poll1', 'resp1', 'user1');
    });
  });

  describe('updateResponses', () => {
    it('should update responses of a special poll', async () => {
      const updateResponsesDto: UpdateSpecialPollResponsesDto = {
        responses: [
          {
            id: 'r1',
            userId: 'user1',
            userName: 'Test User',
            response: 'Test Response',
            createdAt: '2024-01-01T00:00:00.000Z',
            upvotedUserIds: [],
          },
        ],
      };

      const updatedPoll = {
        ...mockSpecialPoll,
        responses: updateResponsesDto.responses as any,
      };

      mockSpecialPollsService.updateResponses.mockResolvedValue(updatedPoll);

      const result = await controller.updateResponses('poll1', updateResponsesDto);

      expect(result).toEqual(updatedPoll);
      expect(service.updateResponses).toHaveBeenCalledWith('poll1', updateResponsesDto.responses);
    });
  });

  describe('remove', () => {
    it('should remove a special poll', async () => {
      mockSpecialPollsService.remove.mockResolvedValue(undefined);

      await controller.remove('poll1');

      expect(service.remove).toHaveBeenCalledWith('poll1');
    });
  });
});
