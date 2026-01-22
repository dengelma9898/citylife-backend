export interface SurveyNotificationData {
  type: 'NEW_SURVEY';
  surveyId: string;
  surveyTitle: string;
  categoryId?: string;
}
