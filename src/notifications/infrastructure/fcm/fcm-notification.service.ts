import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NotificationService } from '../../application/services/notification.service';
import { NotificationPayload } from '../../domain/interfaces/notification-payload.interface';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class FcmNotificationService extends NotificationService {
  private readonly logger = new Logger(FcmNotificationService.name);

  constructor(private readonly usersService: UsersService) {
    super();
  }

  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      this.logger.debug(`Sending notification to user ${userId}`);
      const fcmTokens = await this.usersService.getFcmTokens(userId);
      if (!fcmTokens || fcmTokens.length === 0) {
        this.logger.debug(`No FCM tokens found for user ${userId}`);
        return;
      }
      const invalidTokens: string[] = [];
      const sendPromises = fcmTokens.map(async token => {
        try {
          await admin.messaging().send({
            token: token.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data || {},
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                },
              },
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'direct_messages',
              },
            },
          });
          this.logger.debug(`Notification sent successfully to device ${token.deviceId}`);
        } catch (error: any) {
          this.logger.error(
            `Error sending notification to device ${token.deviceId}: ${error.message}`,
          );
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(token.deviceId);
          }
        }
      });
      await Promise.all(sendPromises);
      if (invalidTokens.length > 0) {
        this.logger.debug(`Removing ${invalidTokens.length} invalid tokens for user ${userId}`);
        for (const deviceId of invalidTokens) {
          try {
            await this.usersService.removeFcmToken(userId, deviceId);
          } catch (error: any) {
            this.logger.error(`Error removing invalid token ${deviceId}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Error sending notification to user ${userId}: ${error.message}`);
    }
  }

  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      this.logger.debug(`Sending notification to ${userIds.length} users`);
      const sendPromises = userIds.map(userId => this.sendToUser(userId, payload));
      await Promise.all(sendPromises);
    } catch (error: any) {
      this.logger.error(`Error sending notification to multiple users: ${error.message}`);
    }
  }
}
