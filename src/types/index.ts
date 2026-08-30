export type ToolMode = 
  | 'draw' 
  | 'draw_shape' 
  | 'erase' 
  | 'vacuum' 
  | 'select' 
  | 'deselect' 
  | 'mirror' 
  | 'injector' 
  | 'eyedropper' 
  | 'liquify';

export type BrushType = 'tube' | 'ribbon' | 'marker' | 'flat' | 'conformal';

export type StrokeProfile = 'tube' | 'ribbon' | 'marker' | 'conformal';

export type SmoothingAlgorithm = 'none' | 'one_euro' | 'kalman' | 'streamline' | 'exponential';

export type MaterialType = 'shaded' | 'shadeless' | 'glow' | 'cutout';

export type ProceduralPattern = 'none' | 'dot' | 'line' | 'cross' | 'terrazzo' | 'stipple';

export type LiquifyMode = 'push' | 'pinch' | 'comb';

export type GuidePrimitiveType = 'plane' | 'cube' | 'pyramid' | 'sphere' | 'tube';

export type ResourceCollisionState = 'active' | 'passive' | 'hidden'; // active = solid black cube, passive = unfilled, hidden = dashed

export interface Point3D {
  x: number;
  y: number;
  z: number;
  pressure: number; // 0.0 to 1.0
  normal?: { x: number; y: number; z: number };
  isSurfaceHit?: boolean;
  surfaceOffset?: number;
  uv?: { x: number; y: number };
  hitMeshId?: string;
  tiltX?: number;
  tiltY?: number;
  timestamp?: number;
}

export interface Stroke {
  id: string;
  groupId: string;
  points: Point3D[];
  color: string;
  size: number; // in mm, 1 to 300
  opacity: number; // 0 to 1
  jitter?: number; // 0.0 to 1.0 procedural spline noise variance for hand-sketched aesthetic
  brushType: BrushType;
  profile?: StrokeProfile;
  material: MaterialType;
  pattern: ProceduralPattern;
  patternScale: number; // 0.5 to 5.0
  patternAngle: number; // 0 to 360
  patternContrast: number; // 0.1 to 2.0
  pressureSensitive: boolean;
  isShape?: boolean;
  tension?: number;
  // Conformal & Surface Parameters
  archSegments?: number; // default 5 (conformal arched cross-section)
  domeFactor?: number; // dome height multiplier (e.g. 0.22)
  surfaceOffset?: number; // base offset to prevent coplanar z-fighting (e.g. 0.003)
  taperLength?: number; // fraction 0.05
  silhouetteClamping?: boolean;
  stencilMasking?: boolean;
  chiselAngle?: number; // 0 to 180 degrees
  aspectRatio?: number; // width to thickness ratio
  // Smoothing & Latency
  smoothingAlgorithm?: SmoothingAlgorithm;
  smoothingStrength?: number; // 0.0 to 1.0
  predictiveTracking?: boolean;
  predictionFactor?: number; // 0.0 to 1.0
  createdAt: number;
}

export interface SpatialGroup {
  id: string;
  name: string;
  visible: boolean;
  isolated: boolean;
  locked: boolean;
  colorTag?: string;
}

export interface Guide3D {
  id: string;
  name: string;
  type: GuidePrimitiveType;
  originPoint: Point3D;
  normal: { x: number; y: number; z: number };
  width: number;
  height: number;
  depth?: number;
  segments: number; // 3 to 64
  tension: number; // 0 to 1 (for loft)
  opacity: number; // 0 to 1
  rotation?: { x: number; y: number; z: number };
  bentPath?: Point3D[];
  meshData?: { vertices: number[]; indices: number[] };
  active: boolean;
  savedToResources?: boolean;
}

export interface ImportedResource {
  id: string;
  name: string;
  type: 'image' | 'obj' | 'surface';
  url: string;
  state: ResourceCollisionState; // active (draw-on collider), passive (visible reference), hidden
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  opacity: number;
  aspectRatio?: number;
  guideData?: Guide3D;
}

export interface BrushPreset {
  id: string;
  name: string;
  brushType: BrushType;
  color: string;
  size: number;
  opacity: number;
  jitter?: number;
  material: MaterialType;
  pattern: ProceduralPattern;
  pressureSensitive: boolean;
}

export type EnvironmentPreset = 'day' | 'dusk' | 'night' | 'dawn' | 'studio' | 'darkroom' | 'cyberpunk' | 'custom' | 'daylight' | 'sunset';

export type BackgroundType = 'solid' | 'procedural-sky' | 'gradient' | 'image';

export interface SymmetryConfig {
  mirrorX: boolean;
  mirrorY: boolean;
  mirrorZ: boolean;
  radialCount: number; // 0 for off, or 3, 4, 6, 8, 12
  radialAxis: 'x' | 'y' | 'z';
}

export interface CameraBookmark {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  orthographic?: boolean;
  createdAt?: number;
}

export interface SequenceShot {
  id: string;
  name: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  orthographic: boolean;
  duration: number; // seconds
}

export interface EnvironmentConfig {
  renderMode: boolean; // false = drafting wire/basic, true = fully lit & post-processed
  preset?: EnvironmentPreset;
  backgroundType?: BackgroundType;
  showAxes: boolean;
  showGrid: boolean;
  backgroundColor: string;
  backgroundImage: string | null;
  fogEnabled: boolean;
  fogDensity: number; // 0.001 to 0.05
  // Lighting
  lightAltitude: number; // -90 to 90 degrees
  lightAzimuth: number; // 0 to 360 degrees
  lightColor: string;
  lightIntensity: number;
  groundShadow: boolean;
  
  // Toon & Cel Shading Parameters
  toonShading: boolean;
  toonBands?: number; // 2, 3, 4, 5
  toonRimIntensity?: number; // 0 to 2
  toonRimPower?: number; // 1 to 8
  toonRimColor?: string;
  toonSpecular?: boolean;

  // Procedural Sky & Animated Clouds (Wanderlust)
  skyZenithColor?: string;
  skyHorizonColor?: string;
  skyGroundColor?: string;
  cloudDensity?: number; // 0.0 to 1.0
  cloudScale?: number; // 0.5 to 4.0
  cloudSpeed?: number; // 0.0 to 3.0
  cloudColor?: string;
  cloudShadowColor?: string;
  sunGlow?: number; // 0.0 to 3.0
  starDensity?: number; // 0.0 to 1.0
  horizonHaze?: number; // 0.0 to 1.0

  // Post Processing Effects
  bloomEnabled: boolean;
  bloomRadius: number; // 0 to 100
  bloomIntensity: number; // 0 to 2
  dofEnabled: boolean;
  dofFStop: number; // 1.4 to 22
  grainEnabled: boolean;
  grainAmount: number; // 0 to 1
  pixelationEnabled: boolean;
  pixelSize: number; // 1 to 16
  orbitPoint: [number, number, number];
  orbitPointPinned: boolean;
  cameraProjectionMode?: 'perspective' | 'orthographic';
}

export type CreativeCommonsLicense = 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'CC0-1.0' | 'All-Rights-Reserved';

export interface GalleryPublishInfo {
  title: string;
  author: string;
  description: string;
  license: CreativeCommonsLicense;
  isWip: boolean;
  isDownloadable: boolean;
  tags: string[];
  thumbnail: string;
  publishedAt: number;
}

export interface NoteProject {
  id: string;
  title: string;
  updatedAt: number;
  thumbnail: string;
  strokes: Stroke[];
  groups: SpatialGroup[];
  guides: Guide3D[];
  resources: ImportedResource[];
  environment: EnvironmentConfig;
  sequence: SequenceShot[];
  cameraBookmarks?: CameraBookmark[];
  publishInfo?: GalleryPublishInfo;
}

export type SnapshotReason = 'inactivity_30s' | 'manual' | 'session_recovery' | 'milestone' | 'auto_interval';

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  projectTitle: string;
  timestamp: number;
  reason: SnapshotReason;
  strokeCount: number;
  layerCount: number;
  projectData: NoteProject;
  thumbnail?: string;
}

export interface SessionRecoveryState {
  key: string;
  activeProjectId: string;
  timestamp: number;
  project: NoteProject;
  cameraState?: {
    radius: number;
    theta: number;
    phi: number;
    target: [number, number, number];
  };
  activeGroupId?: string;
  lastAction?: string;
}

export interface ModelMetadata {
  name: string;
  vertexCount: number;
  triangleCount: number;
  meshCount: number;
  dimensions: { x: number; y: number; z: number };
  hasUVs: boolean;
}

export interface PresetModelDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  createMesh: () => any;
}

