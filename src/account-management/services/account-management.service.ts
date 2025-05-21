import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { getAuth } from 'firebase-admin/auth';
import { UserRecord } from 'firebase-admin/auth';

@Injectable()
export class AccountManagementService {
  private readonly logger = new Logger(AccountManagementService.name);
  private readonly MAX_ANONYMOUS_AGE_DAYS = 5;

  constructor(private readonly firebaseService: FirebaseService) {}

  async cleanupAnonymousAccounts(): Promise<{ deleted: number; failed: number }> {
    this.logger.log('Starting cleanup of anonymous accounts');
    const auth = getAuth();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_ANONYMOUS_AGE_DAYS);

    let deleted = 0;
    let failed = 0;

    try {
      // Get all users
      const listUsersResult = await auth.listUsers();
      
      // Filter anonymous users older than MAX_ANONYMOUS_AGE_DAYS
      const oldAnonymousUsers = listUsersResult.users.filter((user: UserRecord) => {
        if (user.providerData.length > 0) return false;
        if (!user.metadata.creationTime) return false;
        
        const creationDate = new Date(user.metadata.creationTime);
        return creationDate < cutoffDate;
      });

      this.logger.log(`Found ${oldAnonymousUsers.length} old anonymous accounts to delete`);

      // Delete each old anonymous account
      for (const user of oldAnonymousUsers) {
        try {
          await auth.deleteUser(user.uid);
          deleted++;
          this.logger.debug(`Successfully deleted anonymous account: ${user.uid}`);
        } catch (error) {
          failed++;
          this.logger.error(`Failed to delete anonymous account ${user.uid}: ${error.message}`);
        }
      }

      this.logger.log(`Cleanup completed. Deleted: ${deleted}, Failed: ${failed}`);
      return { deleted, failed };
    } catch (error) {
      this.logger.error(`Error during account cleanup: ${error.message}`);
      throw error;
    }
  }

  async getAnonymousAccountStats(): Promise<{
    total: number;
    oldAccounts: number;
    cutoffDate: string;
  }> {
    const auth = getAuth();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_ANONYMOUS_AGE_DAYS);

    const listUsersResult = await auth.listUsers();
    const anonymousUsers = listUsersResult.users.filter((user: UserRecord) => 
      user.providerData.length === 0
    );
    this.logger.log(`Found ${anonymousUsers.length} anonymous users`);

    const oldAnonymousUsers = anonymousUsers.filter((user: UserRecord) => {
      if (!user.metadata.creationTime) return false;
      const creationDate = new Date(user.metadata.creationTime);
      return creationDate < cutoffDate;
    });

    this.logger.log(`Found ${cutoffDate}`);

    return {
      total: anonymousUsers.length,
      oldAccounts: oldAnonymousUsers.length,
      cutoffDate: cutoffDate.toISOString()
    };
  }
} 