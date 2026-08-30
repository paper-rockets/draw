import * as THREE from 'three';
import { MaterialType, ProceduralPattern, EnvironmentConfig, EnvironmentPreset } from '../types';
import { createWanderlustToonMaterial } from './WanderlustToonShader';

export class RenderEngine {
  /**
   * Environment and Lighting Presets (Day, Dusk, Night, Dawn, Studio, Cyberpunk)
   */
  static getEnvironmentPreset(presetName: EnvironmentPreset): Partial<EnvironmentConfig> {
    switch (presetName) {
      case 'day':
      case 'daylight':
        return {
          preset: 'day',
          backgroundType: 'procedural-sky',
          backgroundColor: '#e0f2fe',
          skyZenithColor: '#1e88e5',
          skyHorizonColor: '#bae6fd',
          skyGroundColor: '#e2e8f0',
          cloudDensity: 0.45,
          cloudScale: 1.5,
          cloudSpeed: 0.8,
          cloudColor: '#ffffff',
          cloudShadowColor: '#cbd5e1',
          sunGlow: 1.3,
          starDensity: 0.0,
          horizonHaze: 0.5,
          lightAltitude: 55,
          lightAzimuth: 135,
          lightColor: '#fffbeb',
          lightIntensity: 1.35,
          groundShadow: true,
          toonShading: true,
          toonBands: 3,
          toonRimIntensity: 0.5,
          toonRimColor: '#e0f2fe',
          fogEnabled: false,
          bloomEnabled: false,
        };

      case 'dusk':
      case 'sunset':
        return {
          preset: 'dusk',
          backgroundType: 'procedural-sky',
          backgroundColor: '#ffedd5',
          skyZenithColor: '#2e1065',
          skyHorizonColor: '#fb923c',
          skyGroundColor: '#451a03',
          cloudDensity: 0.55,
          cloudScale: 1.8,
          cloudSpeed: 0.5,
          cloudColor: '#fed7aa',
          cloudShadowColor: '#4c1d95',
          sunGlow: 1.8,
          starDensity: 0.2,
          horizonHaze: 0.7,
          lightAltitude: 14,
          lightAzimuth: 235,
          lightColor: '#f97316',
          lightIntensity: 1.4,
          groundShadow: true,
          toonShading: true,
          toonBands: 3,
          toonRimIntensity: 0.85,
          toonRimColor: '#fdba74',
          fogEnabled: true,
          fogDensity: 0.012,
          bloomEnabled: true,
          bloomIntensity: 0.5,
        };

      case 'night':
      case 'darkroom':
        return {
          preset: 'night',
          backgroundType: 'procedural-sky',
          backgroundColor: '#090d16',
          skyZenithColor: '#050714',
          skyHorizonColor: '#0f172a',
          skyGroundColor: '#090d16',
          cloudDensity: 0.35,
          cloudScale: 2.0,
          cloudSpeed: 0.4,
          cloudColor: '#334155',
          cloudShadowColor: '#0a0f1d',
          sunGlow: 0.8,
          starDensity: 0.85,
          horizonHaze: 0.3,
          lightAltitude: 65,
          lightAzimuth: 45,
          lightColor: '#93c5fd',
          lightIntensity: 0.85,
          groundShadow: false,
          toonShading: true,
          toonBands: 2,
          toonRimIntensity: 0.9,
          toonRimColor: '#60a5fa',
          fogEnabled: false,
          bloomEnabled: true,
          bloomIntensity: 0.6,
        };

      case 'dawn':
        return {
          preset: 'dawn',
          backgroundType: 'procedural-sky',
          backgroundColor: '#fce7f3',
          skyZenithColor: '#4338ca',
          skyHorizonColor: '#f472b6',
          skyGroundColor: '#701a75',
          cloudDensity: 0.5,
          cloudScale: 1.6,
          cloudSpeed: 0.6,
          cloudColor: '#fbcfe8',
          cloudShadowColor: '#581c87',
          sunGlow: 1.5,
          starDensity: 0.15,
          horizonHaze: 0.6,
          lightAltitude: 18,
          lightAzimuth: 80,
          lightColor: '#fb7185',
          lightIntensity: 1.3,
          groundShadow: true,
          toonShading: true,
          toonBands: 3,
          toonRimIntensity: 0.7,
          toonRimColor: '#f472b6',
          fogEnabled: true,
          fogDensity: 0.008,
          bloomEnabled: true,
          bloomIntensity: 0.4,
        };

      case 'studio':
        return {
          preset: 'studio',
          backgroundType: 'solid',
          backgroundColor: '#f1f5f9',
          lightAltitude: 60,
          lightAzimuth: 45,
          lightColor: '#ffffff',
          lightIntensity: 1.0,
          groundShadow: true,
          toonShading: false,
          fogEnabled: false,
          bloomEnabled: false,
        };

      case 'cyberpunk':
        return {
          preset: 'cyberpunk',
          backgroundType: 'procedural-sky',
          backgroundColor: '#090514',
          skyZenithColor: '#1e0538',
          skyHorizonColor: '#d946ef',
          skyGroundColor: '#0a0014',
          cloudDensity: 0.4,
          cloudScale: 2.2,
          cloudSpeed: 1.2,
          cloudColor: '#ec4899',
          cloudShadowColor: '#4c0519',
          sunGlow: 2.2,
          starDensity: 0.5,
          horizonHaze: 0.8,
          lightAltitude: 45,
          lightAzimuth: 300,
          lightColor: '#ec4899',
          lightIntensity: 1.5,
          groundShadow: true,
          toonShading: true,
          toonBands: 3,
          toonRimIntensity: 1.3,
          toonRimColor: '#22d3ee',
          fogEnabled: true,
          fogDensity: 0.02,
          bloomEnabled: true,
          bloomIntensity: 1.2,
          bloomRadius: 60,
        };

      default:
        return {};
    }
  }

  /**
   * Generates a procedural pattern texture (Dot, Line, Cross, Terrazzo, Stipple)
   */
  static createPatternTexture(
    pattern: ProceduralPattern,
    scale: number = 1.0,
    angle: number = 0,
    contrast: number = 1.0
  ): THREE.CanvasTexture | null {
    if (pattern === 'none') return null;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-size / 2, -size / 2);

    const alpha = Math.min(1.0, Math.max(0.15, contrast * 0.85));
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.lineWidth = Math.max(2, 4 * scale);

    const step = Math.max(12, 32 / scale);

    if (pattern === 'dot') {
      // Ordered halftone dots mapped along stroke surface
      const radius = Math.max(2, 5 * scale);
      for (let x = 0; x <= size + step; x += step) {
        for (let y = 0; y <= size + step; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (pattern === 'line') {
      // Linear parallel hatching
      for (let x = -size; x <= size * 2; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, -size);
        ctx.lineTo(x + size * 2, size * 2);
        ctx.stroke();
      }
    } else if (pattern === 'cross') {
      // Orthogonal crosshatch grid
      const arm = Math.max(4, 8 * scale);
      for (let x = 0; x <= size + step; x += step) {
        for (let y = 0; y <= size + step; y += step) {
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
        }
      }
    } else if (pattern === 'terrazzo') {
      // Organic mosaic stone pattern
      const chips = 36;
      for (let i = 0; i < chips; i++) {
        const cx = ((Math.sin(i * 127.1 + 13.7) * 0.5 + 0.5) * (size - 40)) + 20;
        const cy = ((Math.cos(i * 311.7 + 47.3) * 0.5 + 0.5) * (size - 40)) + 20;
        const s = (6 + (i % 6) * 5) * scale;
        const polySides = 4 + (i % 3);
        ctx.beginPath();
        for (let j = 0; j < polySides; j++) {
          const theta = (j / polySides) * Math.PI * 2 + (i * 0.7);
          const rOffset = s * (0.6 + Math.sin(j * 3 + i) * 0.4);
          const px = cx + Math.cos(theta) * rOffset;
          const py = cy + Math.sin(theta) * rOffset;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else if (pattern === 'stipple') {
      // Noise-distributed stipple points for shading transitions
      const count = Math.floor(700 * scale);
      for (let i = 0; i < count; i++) {
        const px = Math.random() * size;
        const py = Math.random() * size;
        const r = (0.8 + Math.random() * 2.2) * scale;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3 * scale, 3 * scale);
    return texture;
  }

  /**
   * Constructs appropriate Three.js material based on Feather 3D material paradigm
   */
  static createMaterial(
    type: MaterialType,
    color: string,
    opacity: number = 1.0,
    pattern: ProceduralPattern = 'none',
    patternScale: number = 1.0,
    patternAngle: number = 0,
    patternContrast: number = 1.0,
    envConfig?: EnvironmentConfig
  ): THREE.Material {
    const threeColor = new THREE.Color(color);
    const transparent = opacity < 1.0;
    const patternTex = this.createPatternTexture(pattern, patternScale, patternAngle, patternContrast);

    switch (type) {
      case 'shadeless': {
        // Flat unlit graphic material
        const mat = new THREE.MeshBasicMaterial({
          color: threeColor,
          opacity,
          transparent,
          side: THREE.DoubleSide,
          map: patternTex,
        });
        return mat;
      }

      case 'glow': {
        // Self-illuminated emissive material with bloom interaction
        const glowBoost = envConfig?.bloomEnabled ? (envConfig.bloomIntensity || 1.2) : 1.1;
        const mat = new THREE.MeshBasicMaterial({
          color: threeColor.clone().multiplyScalar(1.2 * glowBoost),
          opacity,
          transparent,
          side: THREE.DoubleSide,
        });
        return mat;
      }

      case 'cutout': {
        // Spatial transparency material that punches negative space through overlapping 3D curves
        const mat = new THREE.MeshBasicMaterial({
          colorWrite: false, // Do not write RGB pixels
          depthWrite: true,  // Write to depth buffer to mask curves behind
          depthTest: true,
          side: THREE.DoubleSide,
        });
        return mat;
      }

      case 'shaded':
      default: {
        if (envConfig?.toonShading) {
          // Wanderlust Custom Cel/Toon Stepped Shading with Anime Fresnel Rim Highlight
          return createWanderlustToonMaterial(
            color,
            opacity,
            pattern,
            patternScale,
            patternAngle,
            patternContrast,
            envConfig
          );
        }

        const standardMat = new THREE.MeshStandardMaterial({
          color: threeColor,
          roughness: 0.45,
          metalness: 0.1,
          opacity,
          transparent,
          side: THREE.DoubleSide,
          map: patternTex,
        });
        return standardMat;
      }
    }
  }

  /**
   * Helper to build 3D Brush Cursor Decal Ring
   */
  static createCursorDecal(): THREE.Mesh {
    const cursorGeom = new THREE.RingGeometry(0.85, 1.0, 32);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(cursorGeom, cursorMat);
    mesh.renderOrder = 999;
    mesh.visible = false;
    return mesh;
  }

  /**
   * Configures 3D model materials for stencil writing and depth tests
   */
  static configureModelMaterial(material: THREE.Material): void {
    material.stencilWrite = true;
    material.stencilRef = 1;
    material.stencilZPass = THREE.ReplaceStencilOp;
    material.stencilWriteMask = 0xff;
    material.polygonOffset = false;
    material.needsUpdate = true;
  }

  /**
   * Helper to build the Orbit Point 3D Gizmo (Target rings)
   */
  static createOrbitPointGizmo(): THREE.Group {
    const group = new THREE.Group();

    // Outer circle
    const outerGeo = new THREE.RingGeometry(0.12, 0.14, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff4081,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // Inner dot
    const innerGeo = new THREE.CircleGeometry(0.04, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff4081,
      side: THREE.DoubleSide,
      depthTest: false,
      transparent: true,
      opacity: 1.0,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    group.add(innerMesh);

    group.renderOrder = 999;
    return group;
  }

  /**
   * Create Global XYZ Axis Indicators (Red X, Green Y, Blue Z)
   */
  static createGlobalAxes(): THREE.Group {
    const group = new THREE.Group();
    const len = 3.0;

    // X - Red
    const xGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(len, 0, 0)]);
    const xMat = new THREE.LineBasicMaterial({ color: 0xff3b30, linewidth: 2 });
    group.add(new THREE.Line(xGeo, xMat));

    // Y - Green
    const yGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, len, 0)]);
    const yMat = new THREE.LineBasicMaterial({ color: 0x34c759, linewidth: 2 });
    group.add(new THREE.Line(yGeo, yMat));

    // Z - Blue
    const zGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, len)]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x007aff, linewidth: 2 });
    group.add(new THREE.Line(zGeo, zMat));

    return group;
  }

  /**
   * Calculate directional light vector from altitude and azimuth angles
   */
  static getLightDirection(altitudeDeg: number, azimuthDeg: number): THREE.Vector3 {
    const altRad = (altitudeDeg * Math.PI) / 180;
    const azRad = (azimuthDeg * Math.PI) / 180;

    const y = Math.sin(altRad);
    const groundDist = Math.cos(altRad);
    const x = groundDist * Math.cos(azRad);
    const z = groundDist * Math.sin(azRad);

    return new THREE.Vector3(x, y, z).normalize();
  }
}

