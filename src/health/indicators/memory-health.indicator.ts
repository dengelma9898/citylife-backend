import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

/**
 * Health-Indicator für Memory-Status.
 * Prüft den verfügbaren Speicher und warnt bei hoher Auslastung.
 *
 * Konfiguration:
 * - MEMORY_HEAP_THRESHOLD: Maximaler Heap-Verbrauch in MB (Standard: 500MB)
 *
 * Siehe docs/configuration-values.md für Details.
 */
@Injectable()
export class MemoryHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(MemoryHealthIndicator.name);
  private readonly heapThresholdMB: number;

  constructor() {
    super();
    // Konfigurierbar über Environment-Variable, Standard: 500MB
    this.heapThresholdMB = parseInt(process.env.MEMORY_HEAP_THRESHOLD || '500', 10);
  }

  /**
   * Prüft den Memory-Status.
   * Gibt Warnung zurück, wenn Heap über Threshold liegt.
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const details = {
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      rss: `${rssMB}MB`,
      threshold: `${this.heapThresholdMB}MB`,
    };
    if (heapUsedMB > this.heapThresholdMB) {
      this.logger.warn(`Memory usage high: ${heapUsedMB}MB (threshold: ${this.heapThresholdMB}MB)`);
      throw new HealthCheckError('Memory usage high', this.getStatus(key, false, details));
    }
    this.logger.debug(`Memory health check passed: ${heapUsedMB}MB used`);
    return this.getStatus(key, true, details);
  }
}
