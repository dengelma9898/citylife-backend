import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { BlogPost } from './interfaces/blog-post.interface';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { FirebaseService } from 'src/firebase/firebase.service';
@Injectable()
export class BlogPostsService {
  constructor(private readonly firebaseService: FirebaseService) {}
  private readonly logger = new Logger(BlogPostsService.name);

  public async getAll(): Promise<BlogPost[]> {
    this.logger.debug('Getting all blog posts');
    const db = this.firebaseService.getClientFirestore();
    const postsCol = collection(db, 'blog_posts');
    const snapshot = await getDocs(postsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlogPost));
  }

  public async getById(id: string): Promise<BlogPost | null> {
    this.logger.debug(`Getting blog post ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'blog_posts', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data()
    } as BlogPost;
  }

  public async create(data: CreateBlogPostDto, blogPictures: string[]): Promise<BlogPost> {
    this.logger.debug('Creating blog post');
    const db = this.firebaseService.getClientFirestore();
    
    const postData: Omit<BlogPost, 'id'> = {
      ...data,
      blogPictures: blogPictures || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likedByUsers: [],
      views: 0
    };

    const docRef = await addDoc(collection(db, 'blog_posts'), postData);
    
    return {
      id: docRef.id,
      ...postData
    };
  }

  public async update(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
    this.logger.debug(`Updating blog post ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'blog_posts', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Blog post not found');
    }

    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as BlogPost;
  }

  public async toggleLike(postId: string, userId: string): Promise<BlogPost> {
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
  }

  public async delete(id: string): Promise<void> {
    this.logger.debug(`Deleting blog post ${id}`);
    const db = this.firebaseService.getClientFirestore();
    const docRef = doc(db, 'blog_posts', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new NotFoundException('Blog post not found');
    }

    await deleteDoc(docRef);
  }
} 