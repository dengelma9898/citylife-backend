import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { DateTimeUtils } from '../../utils/date-time.utils';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
    jest.spyOn(DateTimeUtils, 'getBerlinTime').mockReturnValue('2026-07-27T10:00:00+02:00');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should format HttpException responses', () => {
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      timestamp: '2026-07-27T10:00:00+02:00',
      message: 'Bad request',
    });
  });

  it('should return generic message for unhandled non-HttpException errors', () => {
    filter.catch(new TypeError('Cannot read property of undefined'), mockHost);
    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: '2026-07-27T10:00:00+02:00',
      message: 'Internal server error',
    });
  });
});
