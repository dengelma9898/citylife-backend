import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationPayload } from '../../domain/interfaces/notification-payload.interface';
import { UsersService } from '../../../users/users.service';
import { mapWithConcurrency } from '../../../core/utils/concurrency.util';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly FCM_SEND_CONCURRENCY = 25;
  private readonly USER_SEND_CONCURRENCY = 15;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      this.logger.log(`[FCM] Sending notification to user ${userId}`);
      this.logger.debug(`[FCM] Payload: ${JSON.stringify(payload)}`);
      const fcmTokens = await this.usersService.getFcmTokens(userId);
      if (!fcmTokens || fcmTokens.length === 0) {
        this.logger.warn(`[FCM] No FCM tokens found for user ${userId}`);
        return;
      }
      this.logger.debug(`[FCM] Found ${fcmTokens.length} FCM tokens for user ${userId}`);
      const invalidTokens: string[] = [];
      let successCount = 0;
      await mapWithConcurrency(fcmTokens, this.FCM_SEND_CONCURRENCY, async token => {
        try {
          this.logger.debug(
            `[FCM] Sending to device ${token.deviceId} (token: ${token.token.substring(0, 20)}...)`,
          );
          await getMessaging().send({
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
          successCount++;
          this.logger.debug(`[FCM] Notification sent successfully to device ${token.deviceId}`);
        } catch (error: any) {
          this.logger.error(
            `[FCM] Error sending notification to device ${token.deviceId}: ${error.message}`,
            error.stack,
          );
          if (
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(token.deviceId);
          }
        }
      });
      this.logger.log(
        `[FCM] Completed sending to user ${userId}: ${successCount} successful, ${invalidTokens.length} invalid tokens`,
      );
      if (invalidTokens.length > 0) {
        this.logger.debug(
          `[FCM] Removing ${invalidTokens.length} invalid tokens for user ${userId}`,
        );
        await Promise.all(
          invalidTokens.map(async deviceId => {
            try {
              await this.usersService.removeFcmToken(userId, deviceId);
              this.logger.debug(`[FCM] Removed invalid token ${deviceId} for user ${userId}`);
            } catch (error: any) {
              this.logger.error(`[FCM] Error removing invalid token ${deviceId}: ${error.message}`);
            }
          }),
        );
      }
    } catch (error: any) {
      this.logger.error(
        `[FCM] Error sending notification to user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async sendToUsers(userIds: string[], payload: NotificationPayload): Promise<void> {
    try {
      this.logger.debug(`Sending notification to ${userIds.length} users`);
      await mapWithConcurrency(userIds, this.USER_SEND_CONCURRENCY, userId =>
        this.sendToUser(userId, payload),
      );
    } catch (error: any) {
      this.logger.error(`Error sending notification to multiple users: ${error.message}`);
    }
  }
}
