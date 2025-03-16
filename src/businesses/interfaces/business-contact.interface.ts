export interface BusinessContact {
  /**
   * Optional email address of the business.
   * Can be added by admin or business owner.
   */
  email?: string;

  /**
   * Optional phone number of the business.
   * Can be added by admin or business owner.
   */
  phoneNumber?: string;

  /**
   * Optional Instagram profile URL or username.
   */
  instagram?: string;

  /**
   * Optional Facebook page URL or username.
   */
  facebook?: string;

  /**
   * Optional TikTok profile URL or username.
   */
  tiktok?: string;

  /**
   * Optional website URL of the business.
   */
  website?: string;
} 