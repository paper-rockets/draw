import * as THREE from 'three';

export type ToolType = 'brush' | 'uv_brush' | 'eraser' | 'eyedropper' | 'free_brush';

export type SymmetryMode = 'none' | 'mirror_x' | 'mirror_y' | 'mirror_z' | 'radial_4x' | 'radial_8x';

export type LightingPreset = 'studio' | 'daylight' | 'neon' | 'sunset' | 'clay_neutral';

export type MaterialType = 'shaded' | 'shadeless' | 'glow' | 'cutout';

export type StrokeProfile = 'tube' | 'ribbon' | 'marker' | 'conformal';

export type PatternType = 'none' | 'dot' | 'line' | 'cross' | 'terrazzo' | 'stipple';

export type SmoothingAlgorithm = 'none' | 'one_euro' | 'kalman' | 'streamline' | 'exponential';

export type RenderMode = 'draft' | 'render';

export interface StrokePoint {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  surfaceOffset?: number;
  pressure: number;
  tangent?: THREE.Vector3;
  binormal?: THREE.Vector3;
  uv?: THREE.Vector2;
  hitMeshId?: string;
  isSurfaceHit: boolean;
  time: number;
}

export interface BrushSettings {
  size: number; // in world or screen relative units (0.01 to 0.5)
  opacity: number; // 0.05 to 1.0
  color: string; // hex
  roughness: number;
  metalness: number;
  emissiveIntensity: number;
  pressureSensitivity: boolean;
  archSegments: number; // default 5 (conformal arched cross-section)
  domeFactor: number; // dome height multiplier (e.g. 0.2)
  surfaceOffset: number; // base offset to prevent coplanar z-fighting (e.g. 0.002)
  taperLength: number; // fraction 0.05
  silhouetteClamping: boolean;
  stencilMasking: boolean;
  autoRecalculateNormals?: boolean; // Toggle automatic mesh normal recalculation after drawing
  // Smoothing & Latency Optimization
  smoothingAlgorithm: SmoothingAlgorithm;
  smoothingStrength: number; // 0.0 to 1.0
  predictiveTracking: boolean; // Forward velocity prediction
  predictionFactor: number; // 0.0 to 1.0
  // Core Material Type & Profile
  materialType: MaterialType;
  profile: StrokeProfile;
  // Procedural Surface Pattern
  patternType: PatternType;
  patternScale: number; // 1 to 20
  patternIntensity: number; // 0 to 1
  patternAngle: number; // 0 to 360
  patternContrast: number; // 0.5 to 3.0
  // Marker / Chisel parameters
  chiselAngle: number; // 0 to 180 degrees
  aspectRatio: number; // width to thickness ratio (e.g. 3.5)
}

export interface PostProcessSettings {
  renderMode: RenderMode;
  toonShading: boolean;
  toonSteps: number; // 2 to 6
  bloom: boolean;
  bloomIntensity: number; // 0.1 to 3.0
  bloomRadius: number; // 0.1 to 1.5
  bloomThreshold: number; // 0.0 to 1.0
  dof: boolean;
  dofFocusDistance: number; // 0.5 to 10.0
  dofAperture: number; // 0.001 to 0.05
  grain: boolean;
  grainIntensity: number; // 0.02 to 0.4
  pixelation: boolean;
  pixelSize: number; // 2 to 16
}

export interface StrokeDescriptor {
  id: string;
  layerId: string;
  tool: ToolType;
  points: StrokePoint[];
  settings: BrushSettings;
  symmetryIndex?: number;
  isUVStroke?: boolean;
  createdAt: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  strokeIds: string[];
}

export interface ModelMetadata {
  name: string;
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  dimensions: THREE.Vector3;
  hasUVs: boolean;
}

export interface ViewportState {
  isPainting: boolean;
  isPanningOrOrbiting: boolean;
  fps: number;
  zoomLevel: number;
  activeModelName: string;
  showWireframe: boolean;
  showNormals: boolean;
  showGrid: boolean;
  lightingPreset: LightingPreset;
  renderMode: RenderMode;
}

export type TransformJoystickMode = '2d' | '3d';

export type TransformTargetScope = 'all' | 'strokes' | 'active_layer' | 'model';

export type PerfectViewType = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric' | null;

export interface PerfectViewInfo {
  isPerfect: boolean;
  view: PerfectViewType;
  depthAxis: 'x' | 'y' | 'z' | null;
}
