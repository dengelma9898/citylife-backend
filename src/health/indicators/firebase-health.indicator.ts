import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { FirebaseService } from '../../firebase/firebase.service';

/**
 * Health-Indicator für Firebase Firestore-Verbindung.
 * Prüft die Verbindung durch eine einfache Query.
 */
@Injectable()
export class FirebaseHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(FirebaseHealthIndicator.name);

  constructor(private readonly firebaseService: FirebaseService) {
    super();
  }

  /**
   * Prüft die Firebase Firestore-Verbindung.
   * Führt eine einfache Query aus, um die Verbindung zu testen.
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const db = this.firebaseService.getFirestore();
      // Führe eine einfache Query aus, um die Verbindung zu prüfen
      const startTime = Date.now();
      await db.collection('_health_check').limit(1).get();
      const responseTime = Date.now() - startTime;
      this.logger.debug(`Firebase health check passed in ${responseTime}ms`);
      return this.getStatus(key, true, { responseTime: `${responseTime}ms` });
    } catch (error) {
      this.logger.error(`Firebase health check failed: ${error.message}`);
      throw new HealthCheckError(
        'Firebase check failed',
        this.getStatus(key, false, { error: error.message }),
      );
    }
  }
}
