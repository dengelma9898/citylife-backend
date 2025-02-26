import { Controller, Get, Post, Put, Body, Param, NotFoundException, Logger } from '@nestjs/common';
import { BlogPostsService } from './blog-posts.service';
import { BlogPost } from './interfaces/blog-post.interface';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';

@Controller('blog')
export class BlogPostsController {
  private readonly logger = new Logger(BlogPostsController.name);

  constructor(private readonly blogPostsService: BlogPostsService) {}

  @Get()
  public async getAll(): Promise<BlogPost[]> {
    this.logger.log('GET /blog');
    return this.blogPostsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BlogPost> {
    this.logger.log(`GET /blog/${id}`);
    const post = await this.blogPostsService.getById(id);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  @Post()
  public async create(@Body() createPostDto: CreateBlogPostDto): Promise<BlogPost> {
    this.logger.log('POST /blog');
    return this.blogPostsService.create(createPostDto);
  }

  @Put(':id')
  public async update(
    @Param('id') id: string,
    @Body() updatePostDto: Partial<BlogPost>
  ): Promise<BlogPost> {
    this.logger.log(`PUT /blog/${id}`);
    return this.blogPostsService.update(id, updatePostDto);
  }
} 