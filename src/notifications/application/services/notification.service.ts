import { NotificationPayload } from '../../domain/interfaces/notification-payload.interface';

export abstract class NotificationService {
  abstract sendToUser(userId: string, payload: NotificationPayload): Promise<void>;
  abstract sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void>;
}
