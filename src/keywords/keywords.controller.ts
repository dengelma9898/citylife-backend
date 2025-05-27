import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { KeywordsService } from './keywords.service';
import { Keyword } from './interfaces/keyword.interface';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';

@Controller('keywords')
export class KeywordsController {
  private readonly logger = new Logger(KeywordsController.name);

  constructor(private readonly keywordsService: KeywordsService) {}

  @Get()
  public async getAll(): Promise<Keyword[]> {
    this.logger.log('GET /keywords');
    return this.keywordsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<Keyword> {
    this.logger.log(`GET /keywords/${id}`);
    const keyword = await this.keywordsService.getById(id);
    if (!keyword) {
      throw new NotFoundException('Keyword not found');
    }
    return keyword;
  }

  @Post()
  public async create(@Body() createKeywordDto: CreateKeywordDto): Promise<Keyword> {
    this.logger.log('POST /keywords');
    return this.keywordsService.create(createKeywordDto);
  }

  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() updateKeywordDto: UpdateKeywordDto,
  ): Promise<Keyword> {
    this.logger.log(`PATCH /keywords/${id}`);
    return this.keywordsService.update(id, updateKeywordDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /keywords/${id}`);
    return this.keywordsService.delete(id);
  }
}
