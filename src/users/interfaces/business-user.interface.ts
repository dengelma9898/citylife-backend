export interface BusinessUser {
  id: string;
  email: string;
  businessIds: string[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  needsReview: boolean;
  eventIds?: string[];
  contactRequestIds?: string[];
} 