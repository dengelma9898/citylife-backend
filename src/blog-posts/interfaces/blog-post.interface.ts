export interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorName: string;
  imageUrl: string;
  blogPictures?: string[];  // Optional array of additional images
  createdAt: string;
  updatedAt: string;
  likedByUsers: string[]; // Array of user IDs who liked the post
  views: number;
} 