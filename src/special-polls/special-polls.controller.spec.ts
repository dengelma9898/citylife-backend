import { Test, TestingModule } from '@nestjs/testing';
import { SpecialPollsController } from './special-polls.controller';
import { SpecialPollsService } from './special-polls.service';
import { CreateSpecialPollDto } from './dto/create-special-poll.dto';
import { UpdateSpecialPollStatusDto } from './dto/update-special-poll-status.dto';
import { UpdateSpecialPollResponsesDto } from './dto/update-special-poll-responses.dto';
import { SpecialPoll, SpecialPollStatus } from './interfaces/special-poll.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RolesGuard } from '../core/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { Reflector } from '@nestjs/core';

describe('SpecialPollsController', () => {
  let controller: SpecialPollsController;
  let service: SpecialPollsService;

  const mockSpecialPollsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
    addResponse: jest.fn(),
    updateResponses: jest.fn(),
    remove: jest.fn()
  };

  const mockUsersService = {
    getById: jest.fn(),
    getUserProfile: jest.fn()
  };

  const mockSpecialPoll: SpecialPoll = {
    id: 'poll1',
    title: 'Test Poll',
    responses: [],
    status: SpecialPollStatus.PENDING,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpecialPollsController],
      providers: [
        {
          provide: SpecialPollsService,
          useValue: mockSpecialPollsService
        },
        {
          provide: UsersService,
          useValue: mockUsersService
        },
        {
          provide: RolesGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true)
          }
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(['user', 'admin', 'super_admin'])
          }
        }
      ],
    }).compile();

    controller = module.get<SpecialPollsController>(SpecialPollsController);
    service = module.get<SpecialPollsService>(SpecialPollsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new special poll', async () => {
      const createDto: CreateSpecialPollDto = {
        title: 'New Poll'
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

      const result = await controller.findAll();

      expect(result).toEqual(polls);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a special poll by id', async () => {
      mockSpecialPollsService.findOne.mockResolvedValue(mockSpecialPoll);

      const result = await controller.findOne('poll1');

      expect(result).toEqual(mockSpecialPoll);
      expect(service.findOne).toHaveBeenCalledWith('poll1');
    });

    it('should throw NotFoundException if poll not found', async () => {
      mockSpecialPollsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent'))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update the status of a special poll', async () => {
      const updateStatusDto: UpdateSpecialPollStatusDto = {
        status: SpecialPollStatus.ACTIVE
      };

      const updatedPoll = { ...mockSpecialPoll, status: SpecialPollStatus.ACTIVE };
      mockSpecialPollsService.updateStatus.mockResolvedValue(updatedPoll);

      const result = await controller.updateStatus('poll1', updateStatusDto);

      expect(result).toEqual(updatedPoll);
      expect(service.updateStatus).toHaveBeenCalledWith('poll1', updateStatusDto);
    });
  });

  describe('addResponse', () => {
    it('should add a response to a special poll', async () => {
      const response = 'Test Response';
      const userId = 'user1';

      const updatedPoll = {
        ...mockSpecialPoll,
        responses: [{
          userId,
          userName: 'Test User',
          response,
          createdAt: expect.any(String)
        }]
      };

      mockSpecialPollsService.addResponse.mockResolvedValue(updatedPoll);

      const result = await controller.addResponse('poll1', userId, response);

      expect(result).toEqual(updatedPoll);
      expect(service.addResponse).toHaveBeenCalledWith('poll1', userId, response);
    });

    it('should throw BadRequestException if poll is not active', async () => {
      mockSpecialPollsService.addResponse.mockRejectedValue(new BadRequestException());

      await expect(controller.addResponse('poll1', 'user1', 'response'))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('updateResponses', () => {
    it('should update responses of a special poll', async () => {
      const updateResponsesDto: UpdateSpecialPollResponsesDto = {
        responses: [{
          userId: 'user1',
          userName: 'Test User',
          response: 'Test Response',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      };

      const updatedPoll = {
        ...mockSpecialPoll,
        responses: updateResponsesDto.responses
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