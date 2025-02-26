import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { BlogPost } from './interfaces/blog-post.interface';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';

@Injectable()
export class BlogPostsService {
  private readonly logger = new Logger(BlogPostsService.name);

  public async getAll(): Promise<BlogPost[]> {
    this.logger.debug('Getting all blog posts');
    const db = getFirestore();
    const postsCol = collection(db, 'blog_posts');
    const snapshot = await getDocs(postsCol);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BlogPost));
  }

  public async getById(id: string): Promise<BlogPost | null> {
    this.logger.debug(`Getting blog post ${id}`);
    const db = getFirestore();
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

  public async create(data: CreateBlogPostDto): Promise<BlogPost> {
    this.logger.debug('Creating blog post');
    const db = getFirestore();
    
    const postData: Omit<BlogPost, 'id'> = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: 0,
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
    const db = getFirestore();
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
} 