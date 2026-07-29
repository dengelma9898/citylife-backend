export interface JobCategory {
  id: string;
  name: string;
  description?: string;
  colorCode: string;
  iconName: string;
  fallbackImages: string[];
  createdAt: Date;
  updatedAt: Date;
}
