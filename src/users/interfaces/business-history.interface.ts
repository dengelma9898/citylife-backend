export interface BusinessHistory {
  /**
   * The ID of the business that was visited
   */
  businessId: string;

  /**
   * The name of the business at time of visit
   */
  businessName: string;

  /**
   * The benefit that was offered
   */
  benefit: string;

  /**
   * ISO string of when the business was visited
   */
  visitedAt: string;
}
