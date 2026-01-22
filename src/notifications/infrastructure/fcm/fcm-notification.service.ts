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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'fcm-notification.service.ts:15',
          message: 'FcmNotificationService.sendToUser called',
          data: { userId, payloadType: payload.data?.type },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'C',
        }),
      }).catch(() => {});
      // #endregion
      this.logger.log(`[FCM] Sending notification to user ${userId}`);
      this.logger.debug(`[FCM] Payload: ${JSON.stringify(payload)}`);
      const fcmTokens = await this.usersService.getFcmTokens(userId);
      if (!fcmTokens || fcmTokens.length === 0) {
        this.logger.warn(`[FCM] No FCM tokens found for user ${userId}`);
        return;
      }
      this.logger.debug(`[FCM] Found ${fcmTokens.length} FCM tokens for user ${userId}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'fcm-notification.service.ts:24',
          message: 'FCM tokens retrieved',
          data: {
            userId,
            tokenCount: fcmTokens.length,
            tokenDeviceIds: fcmTokens.map(t => t.deviceId),
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A',
        }),
      }).catch(() => {});
      // #endregion
      const invalidTokens: string[] = [];
      let successCount = 0;
      const sendPromises = fcmTokens.map(async token => {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'fcm-notification.service.ts:27',
              message: 'Sending notification to FCM token',
              data: { userId, deviceId: token.deviceId, platform: token.platform },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'A',
            }),
          }).catch(() => {});
          // #endregion
          this.logger.debug(
            `[FCM] Sending to device ${token.deviceId} (token: ${token.token.substring(0, 20)}...)`,
          );
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
          successCount++;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/348fd923-c5d7-4f25-b5ad-db7afba331f0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'fcm-notification.service.ts:55',
              message: 'Notification sent successfully to device',
              data: { userId, deviceId: token.deviceId, successCount },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'A',
            }),
          }).catch(() => {});
          // #endregion
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
      await Promise.all(sendPromises);
      this.logger.log(
        `[FCM] Completed sending to user ${userId}: ${successCount} successful, ${invalidTokens.length} invalid tokens`,
      );
      if (invalidTokens.length > 0) {
        this.logger.debug(
          `[FCM] Removing ${invalidTokens.length} invalid tokens for user ${userId}`,
        );
        for (const deviceId of invalidTokens) {
          try {
            await this.usersService.removeFcmToken(userId, deviceId);
            this.logger.debug(`[FCM] Removed invalid token ${deviceId} for user ${userId}`);
          } catch (error: any) {
            this.logger.error(`[FCM] Error removing invalid token ${deviceId}: ${error.message}`);
          }
        }
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
      const sendPromises = userIds.map(userId => this.sendToUser(userId, payload));
      await Promise.all(sendPromises);
    } catch (error: any) {
      this.logger.error(`Error sending notification to multiple users: ${error.message}`);
    }
  }
}
