export interface BusinessCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
  keywordIds: string[];
  keywords?: { name: string }[];
  createdAt: string;
  updatedAt: string;
}
