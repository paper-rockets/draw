import * as THREE from 'three';
import { PatternType } from '../types';

/**
 * Procedural Pattern Texture Generator
 * Generates seamless procedural textures for Feather-style stroke patterns:
 * - Dot: Ordered halftone dots
 * - Line: Parallel hatching
 * - Cross: Orthogonal crosshatch grid
 * - Terrazzo: Organic mosaic stone pattern
 * - Stipple: Noise-distributed stipple points
 */
export class PatternGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  public static getPatternTexture(
    type: PatternType,
    scale: number = 4.0,
    intensity: number = 0.8,
    angle: number = 45,
    contrast: number = 1.0
  ): THREE.CanvasTexture | null {
    if (type === 'none') return null;

    const cacheKey = `${type}_${scale.toFixed(1)}_${intensity.toFixed(2)}_${angle.toFixed(0)}_${contrast.toFixed(1)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base background: white (no attenuation)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const rad = (angle * Math.PI) / 180;
    const spacing = Math.max(8, Math.round(size / Math.max(1, scale * 3)));
    const alpha = Math.min(1.0, intensity * contrast);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rad);
    ctx.translate(-size / 2, -size / 2);

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha.toFixed(3)})`;

    const expand = size * 1.5;
    const start = -expand;
    const end = size + expand;

    switch (type) {
      case 'dot': {
        const dotRadius = Math.max(1.5, spacing * 0.28 * contrast);
        for (let y = start; y <= end; y += spacing) {
          for (let x = start; x <= end; x += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      }

      case 'line': {
        ctx.lineWidth = Math.max(1.2, spacing * 0.25 * contrast);
        for (let x = start; x <= end; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, start);
          ctx.lineTo(x, end);
          ctx.stroke();
        }
        break;
      }

      case 'cross': {
        ctx.lineWidth = Math.max(1.0, spacing * 0.2 * contrast);
        for (let x = start; x <= end; x += spacing) {
          ctx.beginPath();
          ctx.moveTo(x, start);
          ctx.lineTo(x, end);
          ctx.stroke();
        }
        for (let y = start; y <= end; y += spacing) {
          ctx.beginPath();
          ctx.moveTo(start, y);
          ctx.lineTo(end, y);
          ctx.stroke();
        }
        break;
      }

      case 'terrazzo': {
        // Organic mosaic stone tiles
        const numStones = Math.round(scale * 12);
        const rand = (seed: number) => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };
        for (let i = 0; i < numStones; i++) {
          const cx = (rand(i * 3 + 1) * size * 1.4) - size * 0.2;
          const cy = (rand(i * 3 + 2) * size * 1.4) - size * 0.2;
          const stoneRadius = spacing * (0.3 + rand(i * 3 + 3) * 0.4);
          const sides = 3 + Math.floor(rand(i * 7) * 4);

          ctx.beginPath();
          for (let s = 0; s < sides; s++) {
            const a = (s / sides) * Math.PI * 2 + rand(i + s) * 0.8;
            const r = stoneRadius * (0.7 + rand(i * 2 + s) * 0.6);
            const px = cx + Math.cos(a) * r;
            const py = cy + Math.sin(a) * r;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
        break;
      }

      case 'stipple': {
        // Noise-distributed stipple points
        const numDots = Math.round(scale * 150);
        const rand = (seed: number) => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
        };
        for (let i = 0; i < numDots; i++) {
          const px = rand(i * 5 + 1) * size;
          const py = rand(i * 5 + 2) * size;
          const r = 0.8 + rand(i * 5 + 3) * 1.6 * contrast;
          const dotAlpha = alpha * (0.4 + rand(i * 5 + 4) * 0.6);
          ctx.fillStyle = `rgba(0, 0, 0, ${dotAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    this.cache.set(cacheKey, texture);
    return texture;
  }
}
