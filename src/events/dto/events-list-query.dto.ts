import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class EventsListFilterDto {
  @IsOptional()
  @IsString()
  public readonly q?: string;

  @IsOptional()
  @IsIn(['all', 'past', 'running', 'future'])
  public readonly status?: string;

  @IsOptional()
  @IsIn(['all', 'pending', 'active'])
  public readonly approval?: string;

  @IsOptional()
  @IsString()
  public readonly category?: string;

  @IsOptional()
  @IsIn(['all', 'with-date', 'no-date'])
  public readonly date?: string;

  @IsOptional()
  @IsIn(['all', 'week', 'month'])
  public readonly time?: string;

  @IsOptional()
  @Matches(/^(?:[1-9]|[1-4][0-9]|5[0-3])$/)
  public readonly week?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  public readonly month?: string;
}

export class EventsListQueryDto extends EventsListFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public readonly limit?: number;

  @IsOptional()
  @IsIn(['startDate', 'updatedAt'])
  public readonly sort?: 'startDate' | 'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  public readonly order?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  public readonly facets?: boolean;
}

export class EventsCountQueryDto extends EventsListFilterDto {}
