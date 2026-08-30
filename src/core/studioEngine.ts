import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import {
  BrushSettings,
  Layer,
  ModelMetadata,
  StrokeDescriptor,
  StrokePoint,
  SymmetryMode,
  ToolType,
  LightingPreset,
  PostProcessSettings,
  TransformJoystickMode,
  TransformTargetScope,
  PerfectViewInfo,
  PerfectViewType,
} from '../types';
import { ConformalBeadGenerator } from './conformalBeadGenerator';
import { MaterialCache } from './materialCache';
import { UVPaintingEngine } from './uvPaintingEngine';
import { PostProcessingEngine } from './postProcessingEngine';
import { SampleModelFactory } from './sampleModels';
import { StrokeSmoother } from './strokeSmoother';

export class StudioEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private beadGenerator: ConformalBeadGenerator;
  private materialCache: MaterialCache;
  private strokeSmoother: StrokeSmoother = new StrokeSmoother();
  private lastHitMesh: THREE.Mesh | null = null;
  public uvEngine: UVPaintingEngine;
  public postEngine: PostProcessingEngine;

  // Groups
  private modelRoot: THREE.Group;
  private strokeRoot: THREE.Group;
  private helperRoot: THREE.Group;
  private lightsRoot: THREE.Group;

  // Model & Mesh references
  private targetMeshes: THREE.Mesh[] = [];
  private activeModelName: string = 'Cyber Helmet';
  private modelMetadata: ModelMetadata = {
    name: 'Cyber Helmet',
    vertexCount: 0,
    triangleCount: 0,
    meshCount: 0,
    dimensions: new THREE.Vector3(1, 1, 1),
    hasUVs: true,
  };

  // Camera Orbit State
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraSpherical: THREE.Spherical = new THREE.Spherical(3.8, Math.PI / 2.3, Math.PI / 4);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(3.8, Math.PI / 2.3, Math.PI / 4);
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Active Stroke State
  private isDrawing: boolean = false;
  private activePoints: StrokePoint[] = [];
  private activeStrokeMeshes: THREE.Mesh[] = [];
  private activeLayerId: string = 'layer_base_1';
  private activeLayerOpacity: number = 1.0;
  private strokes: Map<string, { descriptor: StrokeDescriptor; meshes: THREE.Mesh[] }> = new Map();
  private undoStack: StrokeDescriptor[][] = [];
  private redoStack: StrokeDescriptor[][] = [];
  private activeStrokeBatch: StrokeDescriptor[] = [];
  private lastScreenCoords: { x: number; y: number } | null = null;
  private lastCapturePoint: StrokePoint | null = null;
  private isOverAir: boolean = false;

  // Brush Visual Projection Decal
  private cursorDecal: THREE.Mesh;

  // Grid & Lights
  private gridHelper: THREE.GridHelper;
  private hemiLight: THREE.HemisphereLight;
  private dirLight1: THREE.DirectionalLight;
  private dirLight2: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Animation & Rendering
  private animationFrameId: number | null = null;
  private lastTime: number = performance.now();
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Transform Joystick & Spatial State
  private transformActiveScope: TransformTargetScope = 'all';
  private currentTransformTotalMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private transformUndoStack: Array<{
    scope: TransformTargetScope;
    inverseMatrix: THREE.Matrix4;
    layerId?: string;
  }> = [];
  private transformRedoStack: Array<{
    scope: TransformTargetScope;
    forwardMatrix: THREE.Matrix4;
    layerId?: string;
  }> = [];
  private lastPerfectViewInfo: PerfectViewInfo = {
    isPerfect: false,
    view: null,
    depthAxis: null,
  };

  // Callbacks
  public onFpsUpdate?: (fps: number) => void;
  public onMetadataUpdate?: (meta: ModelMetadata) => void;
  public onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  public onViewChange?: (viewInfo: PerfectViewInfo) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. WebGL Renderer with Stencil Buffer & Depth Preservation
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true, // Required for stencil masking pipeline
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.autoClearStencil = true;
    container.appendChild(this.renderer.domElement);

    // 2. Scene Hierarchy
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0e14);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.05,
      100
    );
    this.updateCameraPosition();

    // 4. Groups with explicit render queue
    this.helperRoot = new THREE.Group();
    this.helperRoot.renderOrder = 1;

    this.modelRoot = new THREE.Group();
    this.modelRoot.renderOrder = 2; // Model renders first, writes depth and stencil

    this.strokeRoot = new THREE.Group();
    this.strokeRoot.renderOrder = 5; // Stroke geometry renders with depthTest=true, depthWrite=false

    // Attach strokes directly as child of modelRoot so all strokes stay locked to the model in 3D space
    this.modelRoot.add(this.strokeRoot);

    this.lightsRoot = new THREE.Group();

    this.scene.add(this.helperRoot);
    this.scene.add(this.modelRoot);
    this.scene.add(this.lightsRoot);

    // 5. Tooling & Engines
    this.raycaster = new THREE.Raycaster();
    this.beadGenerator = new ConformalBeadGenerator();
    this.materialCache = new MaterialCache();
    this.uvEngine = new UVPaintingEngine(2048);
    this.postEngine = new PostProcessingEngine(
      this.renderer,
      this.scene,
      this.camera,
      container.clientWidth,
      container.clientHeight
    );

    // 6. Grid Helper
    this.gridHelper = new THREE.GridHelper(10, 20, 0x2a324b, 0x181c28);
    this.gridHelper.position.y = -1.2;
    this.helperRoot.add(this.gridHelper);

    // 7. Lighting System
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x111625, 0.6);
    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLight1.position.set(5, 8, 5);
    this.dirLight2 = new THREE.DirectionalLight(0x7389ae, 0.6);
    this.dirLight2.position.set(-5, -2, -5);

    this.lightsRoot.add(this.ambientLight);
    this.lightsRoot.add(this.hemiLight);
    this.lightsRoot.add(this.dirLight1);
    this.lightsRoot.add(this.dirLight2);

    // 8. 3D Brush Cursor Decal Ring
    const cursorGeom = new THREE.RingGeometry(0.85, 1.0, 32);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    this.cursorDecal = new THREE.Mesh(cursorGeom, cursorMat);
    this.cursorDecal.renderOrder = 10;
    this.cursorDecal.visible = false;
    this.scene.add(this.cursorDecal);

    // 9. Load Default Preset Model
    this.loadPresetModel('cyber_helmet');

    // 10. Start Render Loop
    this.startLoop();
  }

  /**
   * Loads a preset procedural model
   */
  public loadPresetModel(presetId: string): void {
    const presets = SampleModelFactory.getPresets();
    const found = presets.find((p) => p.id === presetId) || presets[0];

    // Clear current model & strokes
    this.clearModel();
    const meshObj = found.createMesh();
    this.setModelObject(meshObj, found.name);
  }

  /**
   * Sets the 3D model object, configures stencil writing and auto-frames camera
   */
  public setModelObject(obj: THREE.Object3D, name: string): void {
    this.clearModel();
    this.activeModelName = name;
    this.modelRoot.add(obj);

    this.targetMeshes = [];
    let vertexCount = 0;
    let triangleCount = 0;
    let meshCount = 0;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        this.targetMeshes.push(child);
        meshCount++;
        const geom = child.geometry;

        // Ensure vertex normals exist for lighting & raycasting
        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }
        // Ensure bounding volumes are computed for raycaster intersection tests
        geom.computeBoundingBox();
        geom.computeBoundingSphere();

        vertexCount += geom.attributes.position ? geom.attributes.position.count : 0;
        triangleCount += geom.index
          ? geom.index.count / 3
          : geom.attributes.position
          ? geom.attributes.position.count / 3
          : 0;

        // Ensure vertex colors render if present
        if (geom.attributes.color) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.vertexColors = true;
              m.needsUpdate = true;
            });
          } else if (child.material) {
            child.material.vertexColors = true;
            child.material.needsUpdate = true;
          }
        }

        // Configure Stencil Writing on Model
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => MaterialCache.configureModelMaterial(m));
        } else if (child.material) {
          MaterialCache.configureModelMaterial(child.material);
        }
      }
    });

    // Auto-center and normalize bounding box scale
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    // Normalize to standard ~2.6 units studio scale so all brush sizes & offsets align
    const targetScale = 2.6 / maxDim;
    obj.scale.setScalar(targetScale);

    // Recenter scaled model at origin
    const scaledBox = new THREE.Box3().setFromObject(obj);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    obj.position.sub(scaledCenter);
    obj.updateMatrixWorld(true);

    // Update metadata
    this.modelMetadata = {
      name,
      vertexCount: Math.round(vertexCount),
      triangleCount: Math.round(triangleCount),
      meshCount,
      dimensions: size,
      hasUVs: true,
    };

    if (this.onMetadataUpdate) {
      this.onMetadataUpdate(this.modelMetadata);
    }

    // Auto-frame camera comfortably around normalized model
    this.targetSpherical.radius = 5.2;
    this.targetPosition.set(0, 0, 0);

    // Attach UV Engine to new model
    this.uvEngine.attachToModel(this.modelRoot);
  }

  /**
   * Load external GLB/GLTF model from ArrayBuffer or URL
   */
  public async loadGLTF(bufferOrUrl: ArrayBuffer | string, name: string): Promise<void> {
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      const onLoad = (gltf: any) => {
        const scene = gltf.scene || gltf.scenes[0];
        scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              const fixMat = (m: any) => {
                if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
                if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                if (child.geometry?.attributes?.color) {
                  m.vertexColors = true;
                }
                m.needsUpdate = true;
              };
              if (Array.isArray(child.material)) {
                child.material.forEach(fixMat);
              } else {
                fixMat(child.material);
              }
            }
          }
        });
        this.setModelObject(scene, name);
        resolve();
      };
      if (typeof bufferOrUrl === 'string') {
        loader.load(bufferOrUrl, onLoad, undefined, reject);
      } else {
        loader.parse(bufferOrUrl, '', onLoad, reject);
      }
    });
  }

  /**
   * Load external OBJ model
   */
  public async loadOBJ(textOrUrl: string, name: string): Promise<void> {
    const loader = new OBJLoader();
    const handleObj = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (
            !child.material ||
            (child.material instanceof THREE.MeshBasicMaterial && !child.material.map)
          ) {
            // Assign a standard PBR material for untextured OBJ meshes
            child.material = new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              roughness: 0.4,
              metalness: 0.1,
              side: THREE.DoubleSide,
              vertexColors: !!child.geometry?.attributes?.color,
            });
          }
        }
      });
      this.setModelObject(obj, name);
    };

    if (textOrUrl.startsWith('http') || textOrUrl.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        loader.load(
          textOrUrl,
          (obj) => {
            handleObj(obj);
            resolve();
          },
          undefined,
          reject
        );
      });
    } else {
      const obj = loader.parse(textOrUrl);
      handleObj(obj);
    }
  }

  /**
   * Raycasts from screen coordinates (normalized -1 to 1) onto front-facing model polygons
   */
  public raycastModel(screenX: number, screenY: number): {
    hit: boolean;
    point: THREE.Vector3;
    worldPoint: THREE.Vector3;
    normal: THREE.Vector3;
    worldNormal: THREE.Vector3;
    uv?: THREE.Vector2;
    mesh?: THREE.Mesh;
  } | null {
    const coords = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(coords, this.camera);

    let hit: THREE.Intersection | null = null;

    // Fast-path: Prioritize checking the previously hit mesh to minimize latency during rapid strokes
    if (this.lastHitMesh && this.lastHitMesh.visible) {
      const directHit = this.raycaster.intersectObject(this.lastHitMesh, false);
      if (directHit.length > 0) {
        hit = directHit[0];
      }
    }

    if (!hit) {
      const intersects = this.raycaster.intersectObjects(this.targetMeshes, false);
      if (intersects.length > 0) {
        hit = intersects[0];
        this.lastHitMesh = hit.object as THREE.Mesh;
      }
    }

    if (hit) {
      let worldNormal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : new THREE.Vector3(0, 1, 0);

      // Ensure normal points outward towards camera
      const camDir = new THREE.Vector3().subVectors(this.camera.position, hit.point).normalize();
      if (worldNormal.dot(camDir) < 0) {
        worldNormal.negate();
      }

      const worldPoint = hit.point.clone();

      // Transform into local modelRoot coordinate space
      const invModelMatrix = this.modelRoot.matrixWorld.clone().invert();
      const localPoint = worldPoint.clone().applyMatrix4(invModelMatrix);
      const localNormal = worldNormal.clone().transformDirection(invModelMatrix).normalize();

      let uv = hit.uv;
      if (!uv && hit.point) {
        const u = 0.5 + Math.atan2(localPoint.z, localPoint.x) / (2 * Math.PI);
        const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, localPoint.y / 2.0))) / Math.PI;
        uv = new THREE.Vector2(u, v);
      }

      return {
        hit: true,
        point: localPoint,
        worldPoint,
        normal: localNormal,
        worldNormal,
        uv,
        mesh: hit.object as THREE.Mesh,
      };
    }

    // In 3D model painting, if the ray misses the model meshes, do not return free-space points
    return null;
  }

  /**
   * Updates the 3D Cursor Decal Ring
   */
  public updateCursor(screenX: number, screenY: number, brushSize: number): void {
    const result = this.raycastModel(screenX, screenY);
    if (result && result.worldPoint) {
      this.cursorDecal.visible = true;
      this.cursorDecal.position.copy(result.worldPoint).addScaledVector(result.worldNormal, 0.005);
      
      // Orient cursor ring along surface normal
      const normal = result.worldNormal.clone().normalize();
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      this.cursorDecal.setRotationFromQuaternion(quat);

      const scale = brushSize;
      this.cursorDecal.scale.set(scale, scale, scale);
    } else {
      this.cursorDecal.visible = false;
    }
  }

  public hideCursor(): void {
    this.cursorDecal.visible = false;
  }

  /**
   * Start a new paint stroke with smoothing and predictive latency compensation
   */
  public startStroke(
    screenX: number,
    screenY: number,
    settings: BrushSettings,
    tool: ToolType,
    layer: Layer,
    pressure: number = 1.0,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (layer.locked || !layer.visible) return;

    this.isDrawing = true;
    this.activePoints = [];
    this.activeStrokeMeshes = [];
    this.activeStrokeBatch = [];
    this.activeLayerId = layer.id;
    this.activeLayerOpacity = layer.opacity;

    // Reset smoothing filter state for clean stroke start
    this.strokeSmoother.reset();
    const smoothed = this.strokeSmoother.processPoint(
      screenX,
      screenY,
      pressure,
      settings.smoothingAlgorithm || 'one_euro',
      settings.smoothingStrength ?? 0.5,
      settings.predictiveTracking ?? true,
      settings.predictionFactor ?? 0.4
    );

    this.lastScreenCoords = { x: smoothed.x, y: smoothed.y };
    this.lastCapturePoint = null;
    this.isOverAir = false;

    const rayResult = this.raycastModel(smoothed.x, smoothed.y);
    if (!rayResult || !rayResult.hit) {
      this.isOverAir = true;
      return;
    }

    // UV Texture Brush Mode
    if (tool === 'uv_brush' && rayResult.hit && rayResult.uv) {
      this.uvEngine.beginStroke(rayResult.uv, settings);
      this.uvEngine.paintTo(rayResult.uv, settings, smoothed.pressure);
      return;
    }

    const firstPoint: StrokePoint = {
      position: rayResult.point.clone(),
      normal: rayResult.normal.clone(),
      pressure: smoothed.pressure,
      isSurfaceHit: true,
      uv: rayResult.uv,
      time: performance.now(),
    };
    this.activePoints.push(firstPoint);
    this.lastCapturePoint = firstPoint;

    // Instantiate symmetry stroke meshes
    const symmetryCount = this.getSymmetryCount(symmetry);
    for (let s = 0; s < symmetryCount; s++) {
      const mat = this.materialCache.getStrokeMaterial(settings, rayResult.hit, layer.opacity);
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.renderOrder = 5;
      this.strokeRoot.add(mesh);
      this.activeStrokeMeshes.push(mesh);
    }

    this.updateActiveStrokeGeometry(settings, symmetry);
  }

  /**
   * Continue painting stroke with smoothed screen coordinates, high-frequency raycasting interpolation,
   * predictive mesh contact compensation, & anti-air gap segment splitting
   */
  public addStrokePoint(
    screenX: number,
    screenY: number,
    settings: BrushSettings,
    tool: ToolType,
    pressure: number = 1.0,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (!this.isDrawing) return;

    // Apply real-time smoothing and predictive forward latency compensation
    const smoothed = this.strokeSmoother.processPoint(
      screenX,
      screenY,
      pressure,
      settings.smoothingAlgorithm || 'one_euro',
      settings.smoothingStrength ?? 0.5,
      settings.predictiveTracking ?? true,
      settings.predictionFactor ?? 0.4
    );

    const targetX = smoothed.x;
    const targetY = smoothed.y;
    const targetPressure = smoothed.pressure;

    if (!this.lastScreenCoords) {
      this.lastScreenCoords = { x: targetX, y: targetY };
    }

    const dx = targetX - this.lastScreenCoords.x;
    const dy = targetY - this.lastScreenCoords.y;
    const screenDist = Math.hypot(dx, dy);

    // Sub-sample screen movements so fast sweeps calculate surface contact points smoothly without skipping
    const maxStepDist = 0.005;
    const steps = Math.min(24, Math.max(1, Math.ceil(screenDist / maxStepDist)));

    for (let step = 1; step <= steps; step++) {
      const alpha = step / steps;
      const currX = this.lastScreenCoords.x + dx * alpha;
      const currY = this.lastScreenCoords.y + dy * alpha;
      const currPressure = targetPressure;

      const rayResult = this.raycastModel(currX, currY);

      // UV Texture Brush Mode
      if (tool === 'uv_brush') {
        if (rayResult && rayResult.hit && rayResult.uv) {
          this.uvEngine.paintTo(rayResult.uv, settings, currPressure);
        }
        continue;
      }

      // AIR GAP DETECTION: Ray missed model in free air
      if (!rayResult || !rayResult.hit) {
        if (this.activePoints.length > 0) {
          // Immediately commit active segment so stroke does NOT bridge through empty air
          this.commitActiveSegment(settings, tool);
        }
        this.isOverAir = true;
        this.lastCapturePoint = null;
        continue;
      }

      // SURFACE HIT
      const newPoint: StrokePoint = {
        position: rayResult.point.clone(),
        normal: rayResult.normal.clone(),
        pressure: currPressure,
        isSurfaceHit: true,
        uv: rayResult.uv,
        time: performance.now(),
      };

      // Discontinuity detection:
      // 1. Returning from empty air
      // 2. Large 3D spatial jump across depth occlusion / silhouette
      // 3. Sharp normal flip (> 105° angle, dot < -0.25)
      if (this.lastCapturePoint) {
        const dist3D = this.lastCapturePoint.position.distanceTo(newPoint.position);
        const normalDot = this.lastCapturePoint.normal.dot(newPoint.normal);

        const maxJump = Math.max(0.18, settings.size * 6.0);
        const isDiscontinuous = this.isOverAir || dist3D > maxJump || normalDot < -0.25;

        if (isDiscontinuous) {
          if (this.activePoints.length > 0) {
            this.commitActiveSegment(settings, tool);
          }
          this.isOverAir = false;
          this.lastCapturePoint = null;
        }
      }

      this.isOverAir = false;

      // Start new segment if currently empty
      if (this.activePoints.length === 0) {
        this.activePoints.push(newPoint);
        this.lastCapturePoint = newPoint;

        const symmetryCount = this.getSymmetryCount(symmetry);
        for (let s = 0; s < symmetryCount; s++) {
          const mat = this.materialCache.getStrokeMaterial(settings, true, this.activeLayerOpacity);
          const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
          mesh.renderOrder = 5;
          this.strokeRoot.add(mesh);
          this.activeStrokeMeshes.push(mesh);
        }
      } else {
        const distFromLast = this.lastCapturePoint!.position.distanceTo(newPoint.position);
        if (distFromLast > 0.0004) {
          this.activePoints.push(newPoint);
          this.lastCapturePoint = newPoint;
        }
      }
    }

    this.lastScreenCoords = { x: targetX, y: targetY };

    if (this.activePoints.length > 0) {
      this.updateActiveStrokeGeometry(settings, symmetry);
    }
  }

  /**
   * Commits the current active segment into the permanent stroke list and stroke batch
   */
  private commitActiveSegment(settings: BrushSettings, tool: ToolType): void {
    if (this.activePoints.length === 0 || this.activeStrokeMeshes.length === 0) return;

    const strokeId = 'stroke_' + Math.random().toString(36).substring(2, 9);
    const descriptor: StrokeDescriptor = {
      id: strokeId,
      layerId: this.activeLayerId,
      tool,
      points: [...this.activePoints],
      settings: { ...settings },
      createdAt: Date.now(),
    };

    this.strokes.set(strokeId, {
      descriptor,
      meshes: [...this.activeStrokeMeshes],
    });

    this.activeStrokeBatch.push(descriptor);

    // Auto-recalculate mesh normals after committing segment if enabled
    if (settings.autoRecalculateNormals !== false) {
      descriptor.points.length > 0 && this.recalculateMeshNormals(this.activeLayerId);
    }

    this.activePoints = [];
    this.activeStrokeMeshes = [];
  }

  /**
   * End current stroke and save batch into undo stack
   */
  public endStroke(
    settings: BrushSettings,
    tool: ToolType,
    layerId: string,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastScreenCoords = null;
    this.lastCapturePoint = null;
    this.isOverAir = false;
    this.lastHitMesh = null;
    this.strokeSmoother.reset();

    if (tool === 'uv_brush') {
      this.uvEngine.endStroke();
      this.notifyHistory();
      return;
    }

    this.commitActiveSegment(settings, tool);

    if (this.activeStrokeBatch.length > 0) {
      this.undoStack.push([...this.activeStrokeBatch]);
      this.redoStack = [];
      this.activeStrokeBatch = [];
      this.notifyHistory();
    }
  }

  /**
   * Cancel active stroke without committing to history (useful for multi-touch gesture handoff)
   */
  public cancelStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastScreenCoords = null;
    this.lastCapturePoint = null;
    this.isOverAir = false;
    this.lastHitMesh = null;
    this.strokeSmoother.reset();

    // Clean up active stroke meshes
    for (const mesh of this.activeStrokeMeshes) {
      mesh.geometry.dispose();
      this.strokeRoot.remove(mesh);
    }
    this.activeStrokeMeshes = [];
    this.activePoints = [];

    // Clean up active batch if any segments were committed in this stroke
    for (const desc of this.activeStrokeBatch) {
      const entry = this.strokes.get(desc.id);
      if (entry) {
        for (const m of entry.meshes) {
          m.geometry.dispose();
          this.strokeRoot.remove(m);
        }
        this.strokes.delete(desc.id);
      }
    }
    this.activeStrokeBatch = [];
  }

  /**
   * Updates the geometry of all active symmetry stroke meshes in real-time
   */
  private updateActiveStrokeGeometry(settings: BrushSettings, symmetry: SymmetryMode): void {
    if (this.activePoints.length === 0 || this.activeStrokeMeshes.length === 0) return;

    const symmetryCount = this.getSymmetryCount(symmetry);
    for (let s = 0; s < symmetryCount; s++) {
      const mirroredPoints = this.applySymmetry(this.activePoints, symmetry, s);
      const geom = this.beadGenerator.generateGeometry(mirroredPoints, settings, this.targetMeshes);
      
      if (this.activeStrokeMeshes[s]) {
        this.activeStrokeMeshes[s].geometry.dispose();
        this.activeStrokeMeshes[s].geometry = geom;
      }
    }
  }

  /**
   * Recomputes points according to symmetry mode
   */
  private applySymmetry(points: StrokePoint[], symmetry: SymmetryMode, index: number): StrokePoint[] {
    if (symmetry === 'none' || index === 0) {
      return points;
    }

    return points.map((p) => {
      const pos = p.position.clone();
      const norm = p.normal.clone();

      if (symmetry === 'mirror_x') {
        pos.x = -pos.x;
        norm.x = -norm.x;
      } else if (symmetry === 'mirror_y') {
        pos.y = -pos.y;
        norm.y = -norm.y;
      } else if (symmetry === 'mirror_z') {
        pos.z = -pos.z;
        norm.z = -norm.z;
      } else if (symmetry === 'radial_4x' || symmetry === 'radial_8x') {
        const total = symmetry === 'radial_4x' ? 4 : 8;
        const angle = (index * Math.PI * 2) / total;
        pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        norm.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      }

      return {
        ...p,
        position: pos,
        normal: norm,
      };
    });
  }

  private getSymmetryCount(symmetry: SymmetryMode): number {
    switch (symmetry) {
      case 'mirror_x':
      case 'mirror_y':
      case 'mirror_z':
        return 2;
      case 'radial_4x':
        return 4;
      case 'radial_8x':
        return 8;
      default:
        return 1;
    }
  }

  /**
   * Undo last stroke or transform operation
   */
  public undo(): boolean {
    if (this.transformUndoStack.length > 0) {
      const transformEntry = this.transformUndoStack.pop()!;
      this.applyTransformMatrix(transformEntry.inverseMatrix, transformEntry.scope);
      const fwd = transformEntry.inverseMatrix.clone().invert();
      this.transformRedoStack.push({
        scope: transformEntry.scope,
        forwardMatrix: fwd,
        layerId: transformEntry.layerId,
      });
      this.notifyHistory();
      return true;
    }

    if (this.undoStack.length === 0) {
      return this.uvEngine.undo();
    }

    const lastBatch = this.undoStack.pop()!;
    this.redoStack.push(lastBatch);

    for (const desc of lastBatch) {
      const entry = this.strokes.get(desc.id);
      if (entry) {
        entry.meshes.forEach((m) => {
          this.strokeRoot.remove(m);
          m.geometry.dispose();
        });
        this.strokes.delete(desc.id);
      }
    }

    this.notifyHistory();
    return true;
  }

  /**
   * Redo undone stroke or transform operation
   */
  public redo(layers: Layer[]): boolean {
    if (this.transformRedoStack.length > 0) {
      const redoEntry = this.transformRedoStack.pop()!;
      this.applyTransformMatrix(redoEntry.forwardMatrix, redoEntry.scope);
      const inv = redoEntry.forwardMatrix.clone().invert();
      this.transformUndoStack.push({
        scope: redoEntry.scope,
        inverseMatrix: inv,
        layerId: redoEntry.layerId,
      });
      this.notifyHistory();
      return true;
    }

    if (this.redoStack.length === 0) {
      return this.uvEngine.redo();
    }

    const batch = this.redoStack.pop()!;
    this.undoStack.push(batch);

    for (const strokeDesc of batch) {
      const layer = layers.find((l) => l.id === strokeDesc.layerId);
      const layerOpacity = layer ? layer.opacity : 1.0;
      const layerVisible = layer ? layer.visible : true;

      // Reconstruct meshes
      const meshes: THREE.Mesh[] = [];
      const mat = this.materialCache.getStrokeMaterial(strokeDesc.settings, true, layerOpacity);
      const geom = this.beadGenerator.generateGeometry(strokeDesc.points, strokeDesc.settings, this.targetMeshes);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = layerVisible;
      mesh.renderOrder = 5;
      this.strokeRoot.add(mesh);
      meshes.push(mesh);

      this.strokes.set(strokeDesc.id, { descriptor: strokeDesc, meshes });
    }

    this.notifyHistory();
    return true;
  }

  /**
   * Re-renders all layers when layer opacity or visibility changes
   */
  public syncLayers(layers: Layer[]): void {
    const layerMap = new Map(layers.map((l) => [l.id, l]));

    this.strokes.forEach(({ descriptor, meshes }) => {
      const layer = layerMap.get(descriptor.layerId);
      if (layer) {
        const visible = layer.visible;
        const mat = this.materialCache.getStrokeMaterial(descriptor.settings, true, layer.opacity);
        meshes.forEach((m) => {
          m.visible = visible;
          m.material = mat;
        });
      }
    });
  }

  /**
   * Clear all strokes
   */
  public clearAllStrokes(): void {
    this.strokes.forEach(({ meshes }) => {
      meshes.forEach((m) => {
        this.strokeRoot.remove(m);
        m.geometry.dispose();
      });
    });
    this.strokes.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.notifyHistory();
  }

  /**
   * Delete strokes belonging to a specific layer
   */
  public deleteLayerStrokes(layerId: string): void {
    const toDelete: string[] = [];
    this.strokes.forEach(({ descriptor, meshes }, id) => {
      if (descriptor.layerId === layerId) {
        meshes.forEach((m) => {
          this.strokeRoot.remove(m);
          m.geometry.dispose();
        });
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.strokes.delete(id));
    this.undoStack = this.undoStack.filter((batch) => !batch.some((s) => s.layerId === layerId));
    this.redoStack = this.redoStack.filter((batch) => !batch.some((s) => s.layerId === layerId));
    this.notifyHistory();
  }

  /**
   * Recalculates and smooths mesh normals across stroke geometries and 3D model meshes,
   * ensuring that shading looks smooth and uncreased even after heavy paint accumulation.
   */
  public recalculateMeshNormals(layerId?: string): number {
    let count = 0;

    // Recalculate and update normals on stroke meshes
    this.strokes.forEach(({ descriptor, meshes }) => {
      if (!layerId || descriptor.layerId === layerId) {
        meshes.forEach((mesh) => {
          if (mesh.geometry) {
            mesh.geometry.computeVertexNormals();
            if (mesh.geometry.attributes.normal) {
              mesh.geometry.attributes.normal.needsUpdate = true;
            }
            count++;
          }
        });
      }
    });

    // Ensure target 3D meshes have computed normals
    this.targetMeshes.forEach((mesh) => {
      if (mesh.geometry) {
        mesh.geometry.computeVertexNormals();
        if (mesh.geometry.attributes.normal) {
          mesh.geometry.attributes.normal.needsUpdate = true;
        }
      }
    });

    return count;
  }

  /**
   * Clear current 3D Model
   */
  public clearModel(): void {
    const toRemove: THREE.Object3D[] = [];
    this.modelRoot.children.forEach((child) => {
      if (child !== this.strokeRoot) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((child) => {
      this.modelRoot.remove(child);
      child.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
          else c.material.dispose();
        }
      });
    });
    this.targetMeshes = [];
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.rotation.set(0, 0, 0);
    this.modelRoot.scale.set(1, 1, 1);
    this.modelRoot.updateMatrixWorld(true);
    this.clearAllStrokes();
  }

  /**
   * Spherical Orbit Controls
   */
  public orbit(deltaX: number, deltaY: number): void {
    const rotSpeed = 0.006;
    this.targetSpherical.theta -= deltaX * rotSpeed;
    this.targetSpherical.phi -= deltaY * rotSpeed;

    // Restrict polar angle to avoid flipping
    const eps = 0.01;
    this.targetSpherical.phi = Math.max(eps, Math.min(Math.PI - eps, this.targetSpherical.phi));
  }

  public pan(deltaX: number, deltaY: number): void {
    const panSpeed = 0.0025 * (this.cameraSpherical.radius / 3.0);
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    this.targetPosition.addScaledVector(right, -deltaX * panSpeed);
    this.targetPosition.addScaledVector(up, deltaY * panSpeed);
  }

  public zoom(deltaDistance: number): void {
    const zoomSpeed = 0.0015;
    this.targetSpherical.radius += deltaDistance * zoomSpeed * this.targetSpherical.radius;
    this.targetSpherical.radius = Math.max(0.4, Math.min(25.0, this.targetSpherical.radius));
  }

  public resetView(): void {
    const maxDim = Math.max(this.modelMetadata.dimensions.x, this.modelMetadata.dimensions.y, this.modelMetadata.dimensions.z, 1.0);
    this.targetSpherical.radius = maxDim * 2.2;
    this.targetSpherical.theta = Math.PI / 4;
    this.targetSpherical.phi = Math.PI / 2.3;
    this.targetPosition.set(0, 0, 0);
  }

  // ==========================================
  // TRANSFORM JOYSTICK & SPATIAL ENGINE
  // ==========================================

  /**
   * Calculates the geometric bounding center of the targeted selection (model, strokes, or active layer)
   */
  public getSelectionCenter(scope: TransformTargetScope = 'all'): THREE.Vector3 {
    const box = new THREE.Box3();
    let hasContent = false;

    if (scope === 'model' || scope === 'all') {
      if (this.targetMeshes.length > 0) {
        box.setFromObject(this.modelRoot);
        if (!box.isEmpty()) hasContent = true;
      }
    }

    if (scope === 'strokes' || scope === 'all') {
      if (this.strokes.size > 0) {
        const strokeBox = new THREE.Box3().setFromObject(this.strokeRoot);
        if (!strokeBox.isEmpty()) {
          if (hasContent) {
            box.union(strokeBox);
          } else {
            box.copy(strokeBox);
            hasContent = true;
          }
        }
      }
    }

    if (scope === 'active_layer') {
      const layerBox = new THREE.Box3();
      let layerFound = false;
      this.strokes.forEach(({ descriptor, meshes }) => {
        if (descriptor.layerId === this.activeLayerId) {
          meshes.forEach((m) => {
            layerBox.expandByObject(m);
            layerFound = true;
          });
        }
      });
      if (layerFound && !layerBox.isEmpty()) {
        box.copy(layerBox);
        hasContent = true;
      }
    }

    if (!hasContent || box.isEmpty()) {
      return this.cameraTarget.clone();
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  /**
   * Computes the 3D world anchor that corresponds precisely to the exact screen center crosshair
   */
  public getScreenCenterWorldAnchor(targetCenter?: THREE.Vector3): THREE.Vector3 {
    const center = targetCenter || this.getSelectionCenter(this.transformActiveScope);
    const camDir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, center);
    const ray = new THREE.Ray(this.camera.position, camDir);
    const anchor = new THREE.Vector3();
    const hit = ray.intersectPlane(plane, anchor);
    return hit ? anchor : center.clone();
  }

  /**
   * Begins a continuous transformation gesture, tracking undo state
   */
  public beginTransform(scope: TransformTargetScope = 'all'): void {
    this.transformActiveScope = scope;
    this.currentTransformTotalMatrix.identity();
  }

  /**
   * Concludes a transformation gesture and commits undo state
   */
  public endTransform(): void {
    if (!this.currentTransformTotalMatrix.equals(new THREE.Matrix4())) {
      const inv = this.currentTransformTotalMatrix.clone().invert();
      const fwd = this.currentTransformTotalMatrix.clone();
      this.transformUndoStack.push({
        scope: this.transformActiveScope,
        inverseMatrix: inv,
        layerId: this.activeLayerId,
      });
      this.transformRedoStack = [];
      this.notifyHistory();
    }
  }

  /**
   * Applies an arbitrary 4x4 matrix transformation across target meshes, strokes, and descriptors
   */
  public applyTransformMatrix(matrix: THREE.Matrix4, scope: TransformTargetScope = 'all'): void {
    this.currentTransformTotalMatrix.premultiply(matrix);

    if (scope === 'model' || scope === 'all') {
      this.modelRoot.applyMatrix4(matrix);
      this.modelRoot.updateMatrixWorld(true);
      this.targetMeshes.forEach((mesh) => {
        if (mesh.geometry) {
          mesh.geometry.computeBoundingSphere();
          mesh.geometry.computeBoundingBox();
        }
      });
    } else if (scope === 'strokes') {
      this.strokeRoot.applyMatrix4(matrix);
      this.strokeRoot.updateMatrixWorld(true);
      this.strokes.forEach(({ descriptor }) => {
        descriptor.points.forEach((p) => {
          p.position.applyMatrix4(matrix);
          p.normal.transformDirection(matrix).normalize();
        });
      });
    } else if (scope === 'active_layer') {
      this.strokes.forEach(({ descriptor, meshes }) => {
        if (descriptor.layerId === this.activeLayerId) {
          meshes.forEach((mesh) => {
            mesh.applyMatrix4(matrix);
            mesh.updateMatrixWorld(true);
          });
          descriptor.points.forEach((p) => {
            p.position.applyMatrix4(matrix);
            p.normal.transformDirection(matrix).normalize();
          });
        }
      });
    }
  }

  /**
   * 2D Screen-Space Planar Translation:
   * Moves selection parallel to the current camera view plane with 1:1 screen-to-world mapping.
   */
  public translateScreenSpace(
    deltaScreenX: number,
    deltaScreenY: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let dx = deltaScreenX;
    let dy = deltaScreenY;

    // Locked Constraints: Enforce strict orthogonal 4-way vector movement
    if (isLocked) {
      if (Math.abs(dx) > Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    const targetCenter = this.getSelectionCenter(scope);
    const dist = this.camera.position.distanceTo(targetCenter);
    const vHeight = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const factor = vHeight / (this.container?.clientHeight || 800);

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const worldDelta = new THREE.Vector3()
      .addScaledVector(right, dx * factor)
      .addScaledVector(up, -dy * factor);

    const transMatrix = new THREE.Matrix4().makeTranslation(worldDelta.x, worldDelta.y, worldDelta.z);
    this.applyTransformMatrix(transMatrix, scope);
  }

  /**
   * 2D Screen-Space Scaling:
   * Anchored precisely to the exact center of the screen (crosshair).
   */
  public scaleScreenSpace(
    scaleFactorX: number,
    scaleFactorY: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let sx = scaleFactorX;
    let sy = scaleFactorY;

    // Locked Constraints: Uniform proportions
    if (isLocked) {
      const avg = (sx + sy) / 2;
      sx = avg;
      sy = avg;
    }

    const sz = (sx + sy) / 2;
    const anchor = this.getScreenCenterWorldAnchor();

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward.clone().negate());
    const rotInv = rotMatrix.clone().invert();

    const toAnchor = new THREE.Matrix4().makeTranslation(-anchor.x, -anchor.y, -anchor.z);
    const fromAnchor = new THREE.Matrix4().makeTranslation(anchor.x, anchor.y, anchor.z);
    const scaleMatrix = new THREE.Matrix4().makeScale(sx, sy, sz);

    const finalMat = new THREE.Matrix4()
      .multiply(fromAnchor)
      .multiply(rotMatrix)
      .multiply(scaleMatrix)
      .multiply(rotInv)
      .multiply(toAnchor);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 2D Screen-Center Rotation:
   * Spins selection around the screen's center crosshair along the view axis.
   */
  public rotateScreenSpace(
    deltaAngleRad: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let angle = deltaAngleRad;

    // Locked Constraints: Quantize into exact 15-degree increments (PI / 12)
    if (isLocked) {
      const step = Math.PI / 12;
      angle = Math.round(angle / step) * step;
      if (Math.abs(angle) < 0.0001) return;
    }

    const anchor = this.getScreenCenterWorldAnchor();
    const camDir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();

    const toAnchor = new THREE.Matrix4().makeTranslation(-anchor.x, -anchor.y, -anchor.z);
    const fromAnchor = new THREE.Matrix4().makeTranslation(anchor.x, anchor.y, anchor.z);
    const rotMat = new THREE.Matrix4().makeRotationAxis(camDir, -angle);

    const finalMat = new THREE.Matrix4()
      .multiply(fromAnchor)
      .multiply(rotMat)
      .multiply(toAnchor);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 3D Global Absolute Translation:
   * Dragging Red (X), Green (Y), or Blue (Z) moves object strictly along global axis.
   */
  public translateWorldAxis(
    axis: 'x' | 'y' | 'z',
    deltaWorld: number,
    scope: TransformTargetScope = 'all'
  ): void {
    const vec = new THREE.Vector3(
      axis === 'x' ? deltaWorld : 0,
      axis === 'y' ? deltaWorld : 0,
      axis === 'z' ? deltaWorld : 0
    );
    const transMat = new THREE.Matrix4().makeTranslation(vec.x, vec.y, vec.z);
    this.applyTransformMatrix(transMat, scope);
  }

  /**
   * 3D Global Axis Rotation:
   * Rotating Red (X), Green (Y), or Blue (Z) arcs spins around the object's geometric center.
   */
  public rotateWorldAxis(
    axis: 'x' | 'y' | 'z',
    deltaAngleRad: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let angle = deltaAngleRad;
    if (isLocked) {
      const step = Math.PI / 12; // 15 degrees
      angle = Math.round(angle / step) * step;
      if (Math.abs(angle) < 0.0001) return;
    }

    const center = this.getSelectionCenter(scope);
    const axisVec = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );

    const toCenter = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const fromCenter = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
    const rotMat = new THREE.Matrix4().makeRotationAxis(axisVec, angle);

    const finalMat = new THREE.Matrix4()
      .multiply(fromCenter)
      .multiply(rotMat)
      .multiply(toCenter);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 3D Trackball Rotation:
   * Dragging central sphere enables freeform, non-linear rotation around object geometric center.
   */
  public rotateTrackball(
    deltaX: number,
    deltaY: number,
    scope: TransformTargetScope = 'all'
  ): void {
    const center = this.getSelectionCenter(scope);
    const rotSpeed = 0.008;

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const qX = new THREE.Quaternion().setFromAxisAngle(up, deltaX * rotSpeed);
    const qY = new THREE.Quaternion().setFromAxisAngle(right, deltaY * rotSpeed);
    const deltaQ = qX.multiply(qY);

    const toCenter = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const fromCenter = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
    const rotMat = new THREE.Matrix4().makeRotationFromQuaternion(deltaQ);

    const finalMat = new THREE.Matrix4()
      .multiply(fromCenter)
      .multiply(rotMat)
      .multiply(toCenter);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * Detects if the current camera view has snapped to a "Perfect View" (orthographic elevation).
   * Identifies the depth axis to allow automatic UI collapse and prevent Z plotting errors.
   */
  public getPerfectView(): PerfectViewInfo {
    const dir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const threshold = 0.985; // ~10 degrees tolerance

    // Front: looking along -Z
    if (dir.dot(new THREE.Vector3(0, 0, -1)) > threshold) {
      return { isPerfect: true, view: 'front', depthAxis: 'z' };
    }
    // Back: looking along +Z
    if (dir.dot(new THREE.Vector3(0, 0, 1)) > threshold) {
      return { isPerfect: true, view: 'back', depthAxis: 'z' };
    }
    // Top: looking along -Y
    if (dir.dot(new THREE.Vector3(0, -1, 0)) > threshold) {
      return { isPerfect: true, view: 'top', depthAxis: 'y' };
    }
    // Bottom: looking along +Y
    if (dir.dot(new THREE.Vector3(0, 1, 0)) > threshold) {
      return { isPerfect: true, view: 'bottom', depthAxis: 'y' };
    }
    // Right: looking along -X
    if (dir.dot(new THREE.Vector3(-1, 0, 0)) > threshold) {
      return { isPerfect: true, view: 'right', depthAxis: 'x' };
    }
    // Left: looking along +X
    if (dir.dot(new THREE.Vector3(1, 0, 0)) > threshold) {
      return { isPerfect: true, view: 'left', depthAxis: 'x' };
    }

    return { isPerfect: false, view: null, depthAxis: null };
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Snaps camera perspective smoothly to an exact orthographic elevation or isometric angle
   */
  public snapToView(view: PerfectViewType): void {
    const radius = Math.max(this.targetSpherical.radius, 2.0);
    switch (view) {
      case 'front':
        this.targetSpherical.set(radius, Math.PI / 2, 0);
        break;
      case 'back':
        this.targetSpherical.set(radius, Math.PI / 2, Math.PI);
        break;
      case 'top':
        this.targetSpherical.set(radius, 0.001, 0);
        break;
      case 'bottom':
        this.targetSpherical.set(radius, Math.PI - 0.001, 0);
        break;
      case 'right':
        this.targetSpherical.set(radius, Math.PI / 2, Math.PI / 2);
        break;
      case 'left':
        this.targetSpherical.set(radius, Math.PI / 2, -Math.PI / 2);
        break;
      case 'isometric':
        this.targetSpherical.set(radius, Math.PI / 2.3, Math.PI / 4);
        break;
    }
  }

  /**
   * Switch Lighting & Environment Presets
   */
  public setLightingPreset(preset: LightingPreset): void {
    switch (preset) {
      case 'studio':
        this.scene.background = new THREE.Color(0x0c0e14);
        this.ambientLight.intensity = 0.45;
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x1a202c);
        this.dirLight1.color.setHex(0xffffff);
        this.dirLight1.intensity = 1.2;
        this.dirLight2.color.setHex(0x7389ae);
        this.dirLight2.intensity = 0.6;
        break;
      case 'daylight':
        this.scene.background = new THREE.Color(0x1e293b);
        this.ambientLight.intensity = 0.6;
        this.hemiLight.color.setHex(0xe0f2fe);
        this.hemiLight.groundColor.setHex(0x334155);
        this.dirLight1.color.setHex(0xffedd5);
        this.dirLight1.intensity = 1.5;
        this.dirLight2.color.setHex(0x94a3b8);
        this.dirLight2.intensity = 0.4;
        break;
      case 'neon':
        this.scene.background = new THREE.Color(0x050508);
        this.ambientLight.intensity = 0.2;
        this.hemiLight.color.setHex(0x00f0ff);
        this.hemiLight.groundColor.setHex(0xff0055);
        this.dirLight1.color.setHex(0x00ffff);
        this.dirLight1.intensity = 1.8;
        this.dirLight2.color.setHex(0xff0077);
        this.dirLight2.intensity = 1.2;
        break;
      case 'sunset':
        this.scene.background = new THREE.Color(0x1a0f1a);
        this.ambientLight.intensity = 0.35;
        this.hemiLight.color.setHex(0xfb923c);
        this.hemiLight.groundColor.setHex(0x38184c);
        this.dirLight1.color.setHex(0xf97316);
        this.dirLight1.intensity = 1.6;
        this.dirLight2.color.setHex(0xa855f7);
        this.dirLight2.intensity = 0.8;
        break;
      case 'clay_neutral':
        this.scene.background = new THREE.Color(0x2d3139);
        this.ambientLight.intensity = 0.7;
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0x4b5563);
        this.dirLight1.color.setHex(0xffffff);
        this.dirLight1.intensity = 0.9;
        this.dirLight2.color.setHex(0x9ca3af);
        this.dirLight2.intensity = 0.5;
        break;
    }
  }

  public toggleWireframe(show: boolean): void {
    this.targetMeshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          if ('wireframe' in m) {
            (m as THREE.MeshStandardMaterial).wireframe = show;
          }
        });
      } else if (mesh.material && 'wireframe' in mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = show;
      }
    });
  }

  public toggleGrid(show: boolean): void {
    this.gridHelper.visible = show;
  }

  /**
   * Export Combined Scene to GLB
   */
  public async exportGLB(): Promise<Blob> {
    const exportScene = new THREE.Scene();

    // Clone model
    const modelClone = this.modelRoot.clone(true);
    exportScene.add(modelClone);

    // Clone strokes
    const strokeClone = this.strokeRoot.clone(true);
    exportScene.add(strokeClone);

    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        exportScene,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          resolve(blob);
        },
        reject,
        { binary: true }
      );
    });
  }

  /**
   * Export Combined Scene to OBJ
   */
  public exportOBJ(): string {
    const exportScene = new THREE.Scene();
    exportScene.add(this.modelRoot.clone(true));
    exportScene.add(this.strokeRoot.clone(true));

    const exporter = new OBJExporter();
    return exporter.parse(exportScene);
  }

  /**
   * Capture high-res screenshot
   */
  public captureSnapshot(): string {
    this.cursorDecal.visible = false;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    this.cursorDecal.visible = true;
    return dataUrl;
  }

  public resize(width: number, height: number): void {
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.postEngine) {
      this.postEngine.setSize(width, height);
    }
  }

  public setPostProcessSettings(settings: Partial<PostProcessSettings>): void {
    if (this.postEngine) {
      this.postEngine.updateSettings(settings);
    }
  }

  public getPostProcessSettings(): PostProcessSettings {
    return this.postEngine ? this.postEngine.getSettings() : {
      renderMode: 'draft',
      toonShading: false,
      toonSteps: 3,
      bloom: true,
      bloomIntensity: 1.2,
      bloomRadius: 0.8,
      bloomThreshold: 0.85,
      dof: false,
      dofFocusDistance: 2.5,
      dofAperture: 0.015,
      grain: false,
      grainIntensity: 0.08,
      pixelation: false,
      pixelSize: 4,
    };
  }

  private updateCameraPosition(): void {
    // Smooth camera damping
    this.cameraSpherical.theta += (this.targetSpherical.theta - this.cameraSpherical.theta) * 0.15;
    this.cameraSpherical.phi += (this.targetSpherical.phi - this.cameraSpherical.phi) * 0.15;
    this.cameraSpherical.radius += (this.targetSpherical.radius - this.cameraSpherical.radius) * 0.15;

    this.cameraTarget.lerp(this.targetPosition, 0.15);

    const offset = new THREE.Vector3().setFromSpherical(this.cameraSpherical);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
  }

  private notifyHistory(): void {
    if (this.onHistoryChange) {
      const canUndo = this.undoStack.length > 0 || this.transformUndoStack.length > 0;
      const canRedo = this.redoStack.length > 0 || this.transformRedoStack.length > 0;
      this.onHistoryChange(canUndo, canRedo);
    }
  }

  private startLoop(): void {
    const loop = (time: number) => {
      this.animationFrameId = requestAnimationFrame(loop);

      // FPS tracking
      this.frameCount++;
      const dt = time - this.lastTime;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
        if (this.onFpsUpdate) {
          this.onFpsUpdate(this.fps);
        }
      }
      this.lastTime = time;

      this.updateCameraPosition();

      // Check for Perfect View changes and notify subscribers
      const pvInfo = this.getPerfectView();
      if (
        pvInfo.isPerfect !== this.lastPerfectViewInfo.isPerfect ||
        pvInfo.view !== this.lastPerfectViewInfo.view ||
        pvInfo.depthAxis !== this.lastPerfectViewInfo.depthAxis
      ) {
        this.lastPerfectViewInfo = pvInfo;
        if (this.onViewChange) {
          this.onViewChange(pvInfo);
        }
      }

      if (this.postEngine) {
        this.postEngine.render(time * 0.001);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.postEngine) {
      this.postEngine.dispose();
    }
    this.materialCache.clear();
    this.uvEngine.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
