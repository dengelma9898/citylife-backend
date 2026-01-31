import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthCheckResult } from '@nestjs/terminus';
import { FirebaseHealthIndicator } from './indicators/firebase-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Health-Check-Controller für Monitoring und Liveness/Readiness Probes.
 *
 * Endpoints:
 * - GET /health - Basis Health-Check (nur Status)
 * - GET /health/detailed - Detaillierter Health-Check mit allen Indikatoren
 *
 * Alle Endpoints sind vom Rate-Limiting ausgenommen.
 */
@ApiTags('Health')
@Controller('health')
@SkipThrottle() // Health-Checks vom Rate-Limiting ausnehmen
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly firebaseHealthIndicator: FirebaseHealthIndicator,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
  ) {}

  /**
   * Basis Health-Check.
   * Gibt nur den allgemeinen Status zurück (für Kubernetes Liveness Probe).
   */
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Basis Health-Check' })
  @ApiResponse({ status: 200, description: 'Service ist gesund' })
  @ApiResponse({ status: 503, description: 'Service ist nicht gesund' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  /**
   * Detaillierter Health-Check.
   * Prüft alle Health-Indikatoren (für Kubernetes Readiness Probe).
   */
  @Get('detailed')
  @HealthCheck()
  @ApiOperation({ summary: 'Detaillierter Health-Check mit allen Indikatoren' })
  @ApiResponse({ status: 200, description: 'Alle Checks erfolgreich' })
  @ApiResponse({ status: 503, description: 'Ein oder mehrere Checks fehlgeschlagen' })
  async checkDetailed(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.firebaseHealthIndicator.isHealthy('firebase'),
      () => this.memoryHealthIndicator.isHealthy('memory'),
    ]);
  }

  /**
   * Firebase-spezifischer Health-Check.
   */
  @Get('firebase')
  @HealthCheck()
  @ApiOperation({ summary: 'Firebase-Verbindungs-Check' })
  @ApiResponse({ status: 200, description: 'Firebase-Verbindung OK' })
  @ApiResponse({ status: 503, description: 'Firebase-Verbindung fehlgeschlagen' })
  async checkFirebase(): Promise<HealthCheckResult> {
    return this.health.check([() => this.firebaseHealthIndicator.isHealthy('firebase')]);
  }

  /**
   * Memory-spezifischer Health-Check.
   */
  @Get('memory')
  @HealthCheck()
  @ApiOperation({ summary: 'Memory-Status-Check' })
  @ApiResponse({ status: 200, description: 'Memory-Status OK' })
  @ApiResponse({ status: 503, description: 'Memory-Auslastung zu hoch' })
  async checkMemory(): Promise<HealthCheckResult> {
    return this.health.check([() => this.memoryHealthIndicator.isHealthy('memory')]);
  }
}
