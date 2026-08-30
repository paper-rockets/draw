import * as THREE from 'three';
import { SmoothingAlgorithm, StrokePoint } from '../types';

/**
 * Low-Pass 1-Euro Filter component
 */
class OneEuroFilter1D {
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(minCutoff: number = 1.2, beta: number = 0.05, dCutoff: number = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  public setParams(minCutoff: number, beta: number): void {
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max(0.001, (t - this.tPrev) * 0.001);
    this.tPrev = t;

    // Estimate derivative
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1.0 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    // Dynamic cutoff based on speed
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1.0 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  public reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * 2D Kalman Filter with forward velocity prediction for ultra-low latency contact calculation
 */
class KalmanPredictive2D {
  private x: number = 0;
  private y: number = 0;
  private vx: number = 0;
  private vy: number = 0;
  private p: number = 1.0;
  private q: number = 0.08; // Process noise
  private r: number = 0.2; // Measurement noise
  private initialized: boolean = false;
  private lastT: number = 0;

  public reset(): void {
    this.initialized = false;
    this.vx = 0;
    this.vy = 0;
  }

  public update(
    measX: number,
    measY: number,
    t: number,
    predictionLead: number = 0.0
  ): { x: number; y: number } {
    if (!this.initialized) {
      this.x = measX;
      this.y = measY;
      this.vx = 0;
      this.vy = 0;
      this.p = 1.0;
      this.initialized = true;
      this.lastT = t;
      return { x: measX, y: measY };
    }

    const dt = Math.min(0.1, Math.max(0.001, (t - this.lastT) * 0.001));
    this.lastT = t;

    // Predict step
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.p += this.q;

    // Update step
    const k = this.p / (this.p + this.r);
    const residualX = measX - this.x;
    const residualY = measY - this.y;

    this.x += k * residualX;
    this.y += k * residualY;
    this.vx = (residualX / dt) * 0.7 + this.vx * 0.3;
    this.vy = (residualY / dt) * 0.7 + this.vy * 0.3;
    this.p = (1 - k) * this.p;

    // Forward predictive compensation to eliminate perceived latency at high drawing speeds
    const predX = this.x + this.vx * dt * (predictionLead * 3.0);
    const predY = this.y + this.vy * dt * (predictionLead * 3.0);

    return { x: predX, y: predY };
  }
}

/**
 * Real-time Stroke Smoother & Predictive Mesh Contact Optimizer
 */
export class StrokeSmoother {
  private euroX = new OneEuroFilter1D();
  private euroY = new OneEuroFilter1D();
  private euroPressure = new OneEuroFilter1D(2.0, 0.1);
  private kalman = new KalmanPredictive2D();

  private historyWindow: Array<{ x: number; y: number; time: number }> = [];
  private lastSmoothed: { x: number; y: number } | null = null;

  public reset(): void {
    this.euroX.reset();
    this.euroY.reset();
    this.euroPressure.reset();
    this.kalman.reset();
    this.historyWindow = [];
    this.lastSmoothed = null;
  }

  /**
   * Process raw input coordinate into a jitter-free, latency-compensated coordinate
   */
  public processPoint(
    rawX: number,
    rawY: number,
    pressure: number,
    algorithm: SmoothingAlgorithm,
    strength: number, // 0.0 to 1.0
    predictive: boolean,
    predictionFactor: number, // 0.0 to 1.0
    timestamp: number = performance.now()
  ): { x: number; y: number; pressure: number } {
    if (algorithm === 'none' && !predictive) {
      this.lastSmoothed = { x: rawX, y: rawY };
      return { x: rawX, y: rawY, pressure };
    }

    let outX = rawX;
    let outY = rawY;
    let outP = pressure;

    switch (algorithm) {
      case 'one_euro': {
        // High strength = lower minCutoff (higher stability at low speed) & lower beta
        const minCutoff = Math.max(0.1, 3.5 * (1.0 - strength * 0.85));
        const beta = 0.02 + (1.0 - strength) * 0.25;
        this.euroX.setParams(minCutoff, beta);
        this.euroY.setParams(minCutoff, beta);

        outX = this.euroX.filter(rawX, timestamp);
        outY = this.euroY.filter(rawY, timestamp);
        outP = this.euroPressure.filter(pressure, timestamp);

        if (predictive && this.lastSmoothed) {
          const vx = (outX - this.lastSmoothed.x);
          const vy = (outY - this.lastSmoothed.y);
          outX += vx * (predictionFactor * 1.5);
          outY += vy * (predictionFactor * 1.5);
        }
        break;
      }

      case 'kalman': {
        const lead = predictive ? (predictionFactor * 0.8 + 0.2) : 0.0;
        const res = this.kalman.update(rawX, rawY, timestamp, lead);
        // Blend with raw based on strength
        const blend = 0.2 + strength * 0.8;
        outX = rawX * (1 - blend) + res.x * blend;
        outY = rawY * (1 - blend) + res.y * blend;
        outP = pressure;
        break;
      }

      case 'streamline': {
        this.historyWindow.push({ x: rawX, y: rawY, time: timestamp });
        if (this.historyWindow.length > 8) this.historyWindow.shift();

        // Weighted moving average with exponential falloff
        let weightSum = 0;
        let sumX = 0;
        let sumY = 0;
        const count = this.historyWindow.length;
        const alpha = 0.3 + (1.0 - strength) * 0.6;

        for (let i = 0; i < count; i++) {
          const w = Math.pow(alpha, count - 1 - i);
          sumX += this.historyWindow[i].x * w;
          sumY += this.historyWindow[i].y * w;
          weightSum += w;
        }

        outX = sumX / weightSum;
        outY = sumY / weightSum;

        if (predictive && count >= 2) {
          const prev = this.historyWindow[count - 2];
          const last = this.historyWindow[count - 1];
          const vx = last.x - prev.x;
          const vy = last.y - prev.y;
          outX += vx * (predictionFactor * 1.2);
          outY += vy * (predictionFactor * 1.2);
        }
        break;
      }

      case 'exponential': {
        if (!this.lastSmoothed) {
          outX = rawX;
          outY = rawY;
        } else {
          // Velocity-adaptive smoothing factor
          const dist = Math.hypot(rawX - this.lastSmoothed.x, rawY - this.lastSmoothed.y);
          const dynamicAlpha = Math.min(0.95, Math.max(0.1, (1.0 - strength * 0.75) + dist * 5.0));
          outX = this.lastSmoothed.x + (rawX - this.lastSmoothed.x) * dynamicAlpha;
          outY = this.lastSmoothed.y + (rawY - this.lastSmoothed.y) * dynamicAlpha;

          if (predictive) {
            outX += (rawX - this.lastSmoothed.x) * (predictionFactor * 1.2);
            outY += (rawY - this.lastSmoothed.y) * (predictionFactor * 1.2);
          }
        }
        break;
      }

      default: {
        outX = rawX;
        outY = rawY;
        break;
      }
    }

    this.lastSmoothed = { x: outX, y: outY };
    return { x: outX, y: outY, pressure: Math.max(0.05, Math.min(1.0, outP)) };
  }
}
