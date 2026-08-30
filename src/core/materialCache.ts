import * as THREE from 'three';
import { BrushSettings, MaterialType, PatternType } from '../types';
import { PatternGenerator } from './patternGenerator';

/**
 * Material Cache Isolation Engine
 *
 * Implements strict key isolation for Feather-style material types:
 * - Shaded: Dynamic PBR MeshStandardMaterial responding to scene lights & shadows
 * - Shadeless: Flat, unlit MeshBasicMaterial unaffected by scene lighting
 * - Glow (Bloom): Self-illuminated emissive material triggering bloom post-processing
 * - Cutout: Spatial transparency material punching negative space through overlapping 3D curves
 * - Procedural Surface Patterns: Halftone Dot, Line Hatch, Crosshatch, Terrazzo, Stipple
 */
export class MaterialCache {
  private cache: Map<string, THREE.Material> = new Map();

  /**
   * Get or create a compliant stroke material with aggressive depth bias and stencil testing
   */
  public getStrokeMaterial(
    settings: BrushSettings,
    isOnModel: boolean = true,
    layerOpacity: number = 1.0
  ): THREE.Material {
    const effectiveOpacity = Math.max(0.01, Math.min(1.0, (settings.opacity ?? 1.0) * layerOpacity));
    const modeKey = isOnModel ? 'm1' : 'm0';
    const stencilKey = settings.stencilMasking && isOnModel ? 's1' : 's0';
    const matType: MaterialType = settings.materialType || 'shaded';
    const patType: PatternType = settings.patternType || 'none';
    const patScale = settings.patternScale ?? 4.0;
    const patInt = settings.patternIntensity ?? 0.8;
    const patAng = settings.patternAngle ?? 45;
    const patContr = settings.patternContrast ?? 1.0;

    // Strict isolation key
    const key = `${matType}|${settings.color}|o${effectiveOpacity.toFixed(3)}|r${(settings.roughness ?? 0.35).toFixed(2)}|m${(settings.metalness ?? 0.15).toFixed(2)}|e${(settings.emissiveIntensity ?? 0).toFixed(2)}|${modeKey}|${stencilKey}|p_${patType}_${patScale}_${patInt}_${patAng}_${patContr}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const color = new THREE.Color(settings.color || '#38bdf8');
    const isOpaque = effectiveOpacity >= 0.99;

    // Get procedural pattern texture if enabled
    const patternTexture = PatternGenerator.getPatternTexture(
      patType,
      patScale,
      patInt,
      patAng,
      patContr
    );

    let material: THREE.Material;

    if (matType === 'cutout') {
      // Spatial transparency material that punches negative space through overlapping 3D curves
      // Uses colorWrite: false, depthWrite: true, or zero-alpha blend to punch through
      material = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        transparent: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4.0,
        polygonOffsetUnits: -4.0,
      });
    } else if (matType === 'shadeless') {
      // Flat unlit material completely unaffected by lights or shadows
      material = new THREE.MeshBasicMaterial({
        color: color,
        map: patternTexture,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        toneMapped: true,
      });
    } else if (matType === 'glow') {
      // Self-illuminated emissive material (high intensity, bloom responsive)
      const glowIntensity = Math.max(1.8, (settings.emissiveIntensity || 1.0) * 2.5);
      const glowColor = color.clone().multiplyScalar(glowIntensity);
      material = new THREE.MeshBasicMaterial({
        color: glowColor,
        map: patternTexture,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        toneMapped: false, // Allows super-saturated HDR color for post-processing bloom
      });
    } else {
      // Default: 'shaded' (PBR MeshStandardMaterial responding to dynamic lights and shadows)
      const emissiveColor = color.clone().multiplyScalar(settings.emissiveIntensity || 0.0);
      material = new THREE.MeshStandardMaterial({
        color: color,
        map: patternTexture,
        roughness: settings.roughness ?? 0.35,
        metalness: settings.metalness ?? 0.15,
        emissive: emissiveColor,
        transparent: !isOpaque,
        opacity: effectiveOpacity,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: isOpaque,
        polygonOffset: true,
        polygonOffsetFactor: -3.0,
        polygonOffsetUnits: -3.0,
        stencilWrite: false,
      });
    }

    if (isOnModel && settings.stencilMasking) {
      material.stencilWrite = false;
      material.stencilRef = 1;
      material.stencilFunc = THREE.EqualStencilFunc; // Only render fragments where model exists
    } else {
      material.stencilFunc = THREE.AlwaysStencilFunc;
    }

    this.cache.set(key, material);
    return material;
  }

  /**
   * Configure model material for stencil writing
   */
  public static configureModelMaterial(material: THREE.Material): void {
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilZPass = THREE.ReplaceStencilOp;
    material.stencilWriteMask = 0xff;
    material.polygonOffset = false;
    material.needsUpdate = true;
  }

  /**
   * Clear cached materials
   */
  public clear(): void {
    this.cache.forEach((mat) => mat.dispose());
    this.cache.clear();
  }
}

