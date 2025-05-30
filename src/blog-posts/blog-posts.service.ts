import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BlogPost } from './interfaces/blog-post.interface';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
import { DateTimeUtils } from 'src/utils/date-time.utils';

@Injectable()
export class BlogPostsService {
  private readonly logger = new Logger(BlogPostsService.name);
  private readonly collection = 'blog_posts';

  constructor(private readonly firebaseService: FirebaseService) {}

  private removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.removeUndefined(obj[key]);
      }
      return result;
    }
    return obj;
  }

  public async getAll(): Promise<BlogPost[]> {
    try {
      this.logger.debug('Getting all blog posts');
      const db = this.firebaseService.getFirestore();
      const snapshot = await db.collection(this.collection).get();
      return snapshot.docs.map(
        doc =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as BlogPost,
      );
    } catch (error) {
      this.logger.error(`Error getting all blog posts: ${error.message}`);
      throw error;
    }
  }

  public async getById(id: string): Promise<BlogPost | null> {
    try {
      this.logger.debug(`Getting blog post ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as BlogPost;
    } catch (error) {
      this.logger.error(`Error getting blog post ${id}: ${error.message}`);
      throw error;
    }
  }

  public async create(data: CreateBlogPostDto, blogPictures: string[]): Promise<BlogPost> {
    try {
      this.logger.debug('Creating blog post');
      const db = this.firebaseService.getFirestore();

      const postData: Omit<BlogPost, 'id'> = {
        ...data,
        blogPictures: blogPictures || [],
        createdAt: DateTimeUtils.getBerlinTime(),
        updatedAt: DateTimeUtils.getBerlinTime(),
        likedByUsers: [],
        views: 0,
      };

      const docRef = await db.collection(this.collection).add(this.removeUndefined(postData));

      return {
        id: docRef.id,
        ...postData,
      };
    } catch (error) {
      this.logger.error(`Error creating blog post: ${error.message}`);
      throw error;
    }
  }

  public async update(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
    try {
      this.logger.debug(`Updating blog post ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Blog post not found');
      }

      const updateData = {
        ...data,
        updatedAt: DateTimeUtils.getBerlinTime(),
      };

      await db.collection(this.collection).doc(id).update(this.removeUndefined(updateData));

      const updatedDoc = await db.collection(this.collection).doc(id).get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as BlogPost;
    } catch (error) {
      this.logger.error(`Error updating blog post ${id}: ${error.message}`);
      throw error;
    }
  }

  public async toggleLike(postId: string, userId: string): Promise<BlogPost> {
    try {
      this.logger.debug(`Toggling like for post ${postId} by user ${userId}`);
      const post = await this.getById(postId);

      if (!post) {
        throw new NotFoundException('Blog post not found');
      }

      const likedByUsers = post.likedByUsers || [];
      const userLikeIndex = likedByUsers.indexOf(userId);

      if (userLikeIndex > -1) {
        likedByUsers.splice(userLikeIndex, 1);
      } else {
        likedByUsers.push(userId);
      }

      return this.update(postId, { likedByUsers });
    } catch (error) {
      this.logger.error(`Error toggling like for post ${postId}: ${error.message}`);
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting blog post ${id}`);
      const db = this.firebaseService.getFirestore();
      const doc = await db.collection(this.collection).doc(id).get();

      if (!doc.exists) {
        throw new NotFoundException('Blog post not found');
      }

      await db.collection(this.collection).doc(id).delete();
    } catch (error) {
      this.logger.error(`Error deleting blog post ${id}: ${error.message}`);
      throw error;
    }
  }
}
