import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { FirebaseHealthIndicator } from './indicators/firebase-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { FirebaseModule } from '../firebase/firebase.module';

/**
 * Health-Modul für System-Monitoring und Kubernetes Probes.
 *
 * Endpoints:
 * - GET /health - Basis Health-Check (Liveness Probe)
 * - GET /health/detailed - Detaillierter Check (Readiness Probe)
 * - GET /health/firebase - Firebase-Verbindungs-Check
 * - GET /health/memory - Memory-Status-Check
 *
 * Konfiguration:
 * - MEMORY_HEAP_THRESHOLD: Maximaler Heap in MB (Standard: 500MB)
 *
 * Siehe docs/configuration-values.md für Details.
 */
@Module({
  imports: [TerminusModule, FirebaseModule],
  controllers: [HealthController],
  providers: [FirebaseHealthIndicator, MemoryHealthIndicator],
})
export class HealthModule {}
