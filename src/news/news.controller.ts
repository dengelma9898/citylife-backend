import { Controller, Get, Post, Put, Body, Param, NotFoundException, Logger, Patch, BadRequestException, UseInterceptors, UploadedFiles, UploadedFile, Delete, UseGuards, Request } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsItem, TextNewsItem, ImageNewsItem, PollNewsItem, AudioNewsItem, SurveyNewsItem } from './interfaces/news-item.interface';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CreateImageNewsDto } from './dto/create-image-news.dto';
import { CreatePollNewsDto } from './dto/create-poll-news.dto';
import { CreateAudioNewsDto } from './dto/create-audio-news.dto';
import { VotePollDto } from './dto/vote-poll.dto';
import { CreateSurveyNewsDto } from './dto/create-survey-news.dto';
import { VoteSurveyDto } from './dto/vote-survey.dto';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';
import { AuthGuard } from '../core/guards/auth.guard';
import { CreateTextNewsDto } from './dto/create-text-news.dto';
import { UpdateImagesDto } from './dto/update-images.dto';


@Controller('news')
export class NewsController {
  private readonly logger = new Logger(NewsController.name);

  constructor(
    private readonly newsService: NewsService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  @Get()
  public async getAll(): Promise<NewsItem[]> {
    this.logger.log('GET /news');
    return this.newsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<NewsItem> {
    this.logger.log(`GET /news/${id}`);
    const newsItem = await this.newsService.getById(id);
    
    if (!newsItem) {
      throw new NotFoundException('News item not found');
    }
    
    // Increment view count asynchronously
    this.newsService.incrementViewCount(id).catch(error => {
      this.logger.error(`Failed to increment view count: ${error.message}`);
    });
    
    return newsItem;
  }

  @Post('text')
  @UseGuards(AuthGuard)
  public async createTextNews(
    @Body() createTextNewsDto: CreateTextNewsDto
  ): Promise<TextNewsItem> {
    this.logger.log('POST /news/text');
    return this.newsService.createTextNews(createTextNewsDto);
  }

  @Post('image')
  @UseGuards(AuthGuard)
  public async createImageNews(
    @Body() createImageNewsDto: CreateImageNewsDto
  ): Promise<ImageNewsItem> {
    this.logger.log('POST /news/image');
    
    // Wir erstellen zunächst einen News-Eintrag ohne Bilder
    return this.newsService.createImageNews(createImageNewsDto);
  }

  @Post('audio')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  public async createAudioNews(
    @Body() createAudioNewsDto: CreateAudioNewsDto,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File
  ): Promise<AudioNewsItem> {
    this.logger.log('POST /news/audio');
    
    if (file) {
      // If a file was uploaded, store it and use the URL
      const path = `news/audio/${Date.now()}-${file.originalname}`;
      const audioUrl = await this.firebaseStorageService.uploadFile(file, path);
      createAudioNewsDto.audioUrl = audioUrl;
    } else if (!createAudioNewsDto.audioUrl) {
      throw new BadRequestException('Either an audio file or an audioUrl must be provided');
    }
    
    return this.newsService.createAudioNews(createAudioNewsDto);
  }

  @Post('poll')
  @UseGuards(AuthGuard)
  public async createPollNews(
    @Body() createPollNewsDto: CreatePollNewsDto,
  ): Promise<PollNewsItem> {
    this.logger.log('POST /news/poll');
    return this.newsService.createPollNews(createPollNewsDto);
  }

  @Post('survey')
  @UseGuards(AuthGuard)
  public async createSurveyNews(
    @Body() createSurveyNewsDto: CreateSurveyNewsDto,
  ): Promise<SurveyNewsItem> {
    this.logger.log('POST /news/survey');
    return this.newsService.createSurveyNews(createSurveyNewsDto);
  }

  @Patch(':id/poll-vote')
  @UseGuards(AuthGuard)
  public async votePoll(
    @Param('id') id: string,
    @Body() voteData: VotePollDto,
  ): Promise<PollNewsItem> {
    this.logger.log(`POST /news/${id}/vote`);
    return this.newsService.votePoll(id, voteData);
  }

  @Post(':id/survey-vote')
  @UseGuards(AuthGuard)
  public async voteSurvey(
    @Param('id') id: string,
    @Body() voteData: VoteSurveyDto,
  ): Promise<SurveyNewsItem> {
    this.logger.log(`POST /news/${id}/survey-vote`);
    return this.newsService.voteSurvey(id, voteData);
  }

  @Patch(':id/react')
  @UseGuards(AuthGuard)
  public async postReaction(
    @Param('id') id: string,
    @Body() createReactionDto: CreateReactionDto
  ): Promise<NewsItem> {
    this.logger.log(`POST /news/${id}/react`);
    return this.newsService.postReaction(id, createReactionDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /news/${id}`);
    return this.newsService.delete(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  public async update(
    @Param('id') id: string,
    @Body() updateData: Partial<NewsItem>
  ): Promise<NewsItem> {
    this.logger.log(`PUT /news/${id}`);
    
    // Ensure type cannot be changed
    if (updateData.type) {
      delete updateData.type;
    }
    
    return this.newsService.update(id, updateData);
  }

  @Patch(':id/images')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  public async updateNewsImages(
    @Param('id') id: string,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<ImageNewsItem> {
    this.logger.log(`PATCH /news/${id}/images`);
    
    if (!files || files.length === 0) {
      throw new BadRequestException('Keine Dateien hochgeladen');
    }
    
    // Hole das bestehende News-Item
    const newsItem = await this.newsService.getById(id);
    
    if (!newsItem) {
      throw new NotFoundException('News-Eintrag nicht gefunden');
    }
    
    // Stelle sicher, dass es sich um ein Image-News-Item handelt
    if (newsItem.type !== 'image') {
      throw new BadRequestException('Der News-Eintrag ist kein Bild-Eintrag');
    }
    
    // Upload each new image
    const uploadPromises = files.map(file => {
      const path = `news/images/${Date.now()}-${file.originalname}`;
      return this.firebaseStorageService.uploadFile(file, path);
    });

    const newImageUrls = await Promise.all(uploadPromises);
    
    // Add new image URLs to existing ones
    const imageUrls = [...((newsItem as ImageNewsItem).imageUrls || []), ...newImageUrls];
    
    // Stelle sicher, dass die Anzahl der Bilder das Limit nicht überschreitet
    if (imageUrls.length > 5) {
      throw new BadRequestException('Es sind maximal 5 Bilder erlaubt');
    }
    
    // Aktualisiere die Bilder im News-Item
    return this.newsService.update(id, { imageUrls }) as Promise<ImageNewsItem>;
  }
} 