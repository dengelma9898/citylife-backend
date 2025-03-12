import { Controller, Get, Post, Put, Body, Param, NotFoundException, Logger, Patch, BadRequestException, UseInterceptors, UploadedFiles, UploadedFile, Delete } from '@nestjs/common';
import { BlogPostsService } from './blog-posts.service';
import { BlogPost } from './interfaces/blog-post.interface';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { FirebaseStorageService } from '../firebase/firebase-storage.service';
import { FileValidationPipe } from '../core/pipes/file-validation.pipe';

@Controller('blog-posts')
export class BlogPostsController {
  private readonly logger = new Logger(BlogPostsController.name);

  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly firebaseStorageService: FirebaseStorageService
  ) {}

  @Get()
  public async getAll(): Promise<BlogPost[]> {
    this.logger.log('GET /blog-posts');
    return this.blogPostsService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string): Promise<BlogPost> {
    this.logger.log(`GET /blog-posts/${id}`);
    const post = await this.blogPostsService.getById(id);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  public async create(
    @Body() createPostDto: CreateBlogPostDto,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<BlogPost> {
    this.logger.log('POST /blog-posts');
    
    const blogPictures: string[] = [];
    
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} images for new blog post`);
      
      // Upload each file and collect URLs
      for (const file of files) {
        const path = `blog-posts/images/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        blogPictures.push(imageUrl);
      }
    } else {
      this.logger.debug('No images provided for new blog post');
    }
    
    // Add image URLs to the blog post data
    return this.blogPostsService.create(createPostDto, blogPictures);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images'))
  public async update(
    @Param('id') id: string,
    @Body() updatePostDto: Partial<BlogPost>,
    @UploadedFiles(new FileValidationPipe({ optional: true })) files?: Express.Multer.File[]
  ): Promise<BlogPost> {
    this.logger.log(`PATCH /blog-posts/${id}`);
    
    // Get current blog post to check for existing images
    const currentPost = await this.blogPostsService.getById(id);
    if (!currentPost) {
      throw new NotFoundException('Blog post not found');
    }
    
    let blogPictures = currentPost.blogPictures || [];
    
    if (files && files.length > 0) {
      this.logger.debug(`Uploading ${files.length} new images for blog post ${id}`);
      
      // Upload each new file and collect URLs
      for (const file of files) {
        const path = `blog-posts/images/${id}/${Date.now()}-${file.originalname}`;
        const imageUrl = await this.firebaseStorageService.uploadFile(file, path);
        blogPictures.push(imageUrl);
      }
    } else {
      this.logger.debug('No new images provided for blog post update');
    }
    
    // Add image URLs to the update data
    return this.blogPostsService.update(id, {
      ...updatePostDto,
      blogPictures
    });
  }

  @Patch(':id/images/remove')
  public async removeImage(
    @Param('id') id: string,
    @Body('imageUrl') imageUrl: string
  ): Promise<BlogPost> {
    this.logger.log(`PATCH /blog-posts/${id}/images/remove`);
    
    if (!imageUrl) {
      throw new BadRequestException('imageUrl is required');
    }
    
    // Get current blog post
    const currentPost = await this.blogPostsService.getById(id);
    if (!currentPost) {
      throw new NotFoundException('Blog post not found');
    }
    
    // Check if the image exists in the blog post
    if (!currentPost.blogPictures || !currentPost.blogPictures.includes(imageUrl)) {
      throw new NotFoundException('Image not found in blog post');
    }
    
    // Delete the image from Firebase Storage
    await this.firebaseStorageService.deleteFile(imageUrl);
    
    // Remove the URL from the blog post's imageUrls array
    const updatedImageUrls = currentPost.blogPictures.filter(url => url !== imageUrl);
    
    // Update the blog post
    return this.blogPostsService.update(id, { blogPictures: updatedImageUrls });
  }

  @Patch(':id/like')
  public async toggleLike(
    @Param('id') postId: string,
    @Body('userId') userId: string
  ): Promise<BlogPost> {
    this.logger.log(`PATCH /blog-posts/${postId}/like for user ${userId}`);
    
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.blogPostsService.toggleLike(postId, userId);
  }

  @Patch(':id/blog-pictures')
  @UseInterceptors(FileInterceptor('files'))
  public async uploadBlogPicture(
    @Param('id') blogId: string,
    @UploadedFile(new FileValidationPipe({ optional: false })) file: Express.Multer.File
  ): Promise<BlogPost> {
    this.logger.log(`POST /blog-posts/${blogId}/blog-pictures`);

    // Get current blog post
    const currentPost = await this.blogPostsService.getById(blogId);
    if (!currentPost) {
      throw new NotFoundException('Blog post not found');
    }

    // Upload the file to Firebase Storage
    const path = `blog-posts/images/${blogId}/${Date.now()}-${file.originalname}`;
    const imageUrl = await this.firebaseStorageService.uploadFile(file, path);

    // Add the new URL to the blog post's blogPictures array
    const blogPictures = currentPost.blogPictures || [];
    blogPictures.push(imageUrl);

    // Update the blog post
    return this.blogPostsService.update(blogId, { blogPictures });
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`DELETE /blog-posts/${id}`);
    
    // Get current blog post to check for existing images
    const currentPost = await this.blogPostsService.getById(id);
    if (!currentPost) {
      throw new NotFoundException('Blog post not found');
    }
    
    // Delete all images from Firebase Storage if they exist
    if (currentPost.blogPictures && currentPost.blogPictures.length > 0) {
      this.logger.debug(`Deleting ${currentPost.blogPictures.length} images for blog post ${id}`);
      
      // Delete each image from Firebase Storage
      const deletePromises = currentPost.blogPictures.map(imageUrl => {
        this.logger.debug(`Deleting image: ${imageUrl}`);
        return this.firebaseStorageService.deleteFile(imageUrl);
      });
      
      // Wait for all images to be deleted
      await Promise.all(deletePromises);
    }
    
    // Delete the blog post
    return this.blogPostsService.delete(id);
  }
} 