import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { 
  ToolMode, 
  BrushType, 
  StrokeProfile,
  SmoothingAlgorithm,
  MaterialType, 
  ProceduralPattern, 
  GuidePrimitiveType, 
  LiquifyMode, 
  Point3D, 
  Stroke, 
  SpatialGroup, 
  Guide3D, 
  ImportedResource, 
  BrushPreset, 
  SequenceShot, 
  CameraBookmark,
  EnvironmentConfig, 
  NoteProject,
  GalleryPublishInfo
} from './types';
import { GeometryEngine } from './engine/GeometryEngine';
import { RenderEngine } from './engine/RenderEngine';
import { StrokeSmoother } from './engine/StrokeSmoother';
import { WanderlustSkyDome } from './engine/WanderlustSkyShader';
import { defaultProjects } from './data/sampleProjects';
import { SampleModelFactory } from './data/sampleModels';
import { StorageEngine } from './utils/storage';
import { TopLeftSystemMenu } from './components/TopLeftSystemMenu';
import { TopRightToolMenu } from './components/TopRightToolMenu';
import { LeftSidebarBrushPanel } from './components/LeftSidebarBrushPanel';
import { BottomContextRibbon } from './components/BottomContextRibbon';
import { StagePanel } from './components/StagePanel';
import { TransformJoystick, OrthoDepthAxis } from './components/TransformJoystick';
import { ClipboardOverlay } from './components/ClipboardOverlay';
import { RadialSqueezeMenu } from './components/RadialSqueezeMenu';
import { HomeGalleryModal } from './components/HomeGalleryModal';
import { ModelLibraryModal } from './components/ModelLibraryModal';
import { PublishToGalleryModal } from './components/PublishToGalleryModal';
import { ARSequenceModal } from './components/ARSequenceModal';
import { ExportModal } from './components/ExportModal';
import { MobileBottomBar } from './components/MobileBottomBar';
import { SingleHandDualNav } from './components/SingleHandDualNav';

export default function App() {
  // Global Project and State
  const [projects, setProjects] = useState<NoteProject[]>(defaultProjects);
  const [activeProjectIdx, setActiveProjectIdx] = useState(0);
  const currentProject = projects[activeProjectIdx] || defaultProjects[0];
  const [isAutosaved, setIsAutosaved] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  // Tool Modes and Properties
  const [toolMode, setToolMode] = useState<ToolMode>('draw');
  const [brushType, setBrushType] = useState<BrushType>('conformal');
  const [strokeProfile, setStrokeProfile] = useState<StrokeProfile>('conformal');
  const [color, setColor] = useState<string>('#ff3b30');
  const [brushSize, setBrushSize] = useState<number>(24); // mm
  const [opacity, setOpacity] = useState<number>(1.0);
  const [jitter, setJitter] = useState<number>(0.0);
  const [pressureSensitive, setPressureSensitive] = useState<boolean>(true);
  const [material, setMaterial] = useState<MaterialType>('shaded');
  const [pattern, setPattern] = useState<ProceduralPattern>('none');
  const [patternScale, setPatternScale] = useState<number>(1.0);
  const [patternAngle, setPatternAngle] = useState<number>(0);
  const [patternContrast, setPatternContrast] = useState<number>(1.0);

  // Smoothing & Conformal Parameters
  const [smoothingAlgorithm, setSmoothingAlgorithm] = useState<SmoothingAlgorithm>('one_euro');
  const [smoothingStrength, setSmoothingStrength] = useState<number>(0.5);
  const [domeFactor, setDomeFactor] = useState<number>(0.22);
  const [silhouetteClamping, setSilhouetteClamping] = useState<boolean>(true);
  const [surfaceOffset, setSurfaceOffset] = useState<number>(0.003);

  // 3D Model Library State
  const [isModelLibraryOpen, setIsModelLibraryOpen] = useState<boolean>(false);
  const [activeModelName, setActiveModelName] = useState<string>('Cyber Helmet');
  const [hasActiveModel, setHasActiveModel] = useState<boolean>(true);

  // Assisted Modifiers and Symmetry
  const [stableStrokeAmount, setStableStrokeAmount] = useState<number>(0.5);
  const [activeMirrorAxis, setActiveMirrorAxis] = useState<{ x: boolean; y: boolean; z: boolean }>({ x: false, y: false, z: false });
  const [radialSymmetry, setRadialSymmetry] = useState<{ count: number; axis: 'x' | 'y' | 'z' }>({ count: 0, axis: 'y' });
  const [activeGuide, setActiveGuide] = useState<Guide3D | null>(null);
  const [isBendingGuide, setIsBendingGuide] = useState<boolean>(false);
  const [loftTension, setLoftTension] = useState<number>(0.5);

  // Selection and Transform
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<Set<string>>(new Set());
  const [activeJoystickType, setActiveJoystickType] = useState<'2d' | '3d'>('2d');
  const [isTransformActive, setIsTransformActive] = useState<boolean>(false);
  const [liquifyMode, setLiquifyMode] = useState<LiquifyMode>('push');
  const [liquifySize, setLiquifySize] = useState<number>(0.5);
  const [liquifyStrength, setLiquifyStrength] = useState<number>(0.8);

  // Timelapse and Turntable Recording State
  const [isRecordingTurntable, setIsRecordingTurntable] = useState<boolean>(false);
  const [timelapseVisibleCount, setTimelapseVisibleCount] = useState<number>(currentProject.strokes.length);
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState<boolean>(false);

  // Navigation and System Controls
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [hideUI, setHideUI] = useState<boolean>(false);
  const [isFingerPenMode, setIsFingerPenMode] = useState<boolean>(false);
  const [palmRejectionEnabled, setPalmRejectionEnabled] = useState<boolean>(true);
  const [palmRejectionRadius, setPalmRejectionRadius] = useState<number>(160);
  const [palmRejectionFeedback, setPalmRejectionFeedback] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  const [isStagePanelOpen, setIsStagePanelOpen] = useState<boolean>(false);
  const [isClipboardOpen, setIsClipboardOpen] = useState<boolean>(false);
  const [isHomeGalleryOpen, setIsHomeGalleryOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishingProject, setPublishingProject] = useState<NoteProject | null>(null);
  const [isSequenceOpen, setIsSequenceOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isDualNavOpen, setIsDualNavOpen] = useState<boolean>(false);
  const [isInjectorActive, setIsInjectorActive] = useState<boolean>(false);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [isOrthographicMode, setIsOrthographicMode] = useState<boolean>(false);
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);
  const [fovBadge, setFovBadge] = useState<{ visible: boolean; fov: number; mm: number }>({ visible: false, fov: 40, mm: 50 });

  // Radial Squeeze Menu
  const [radialMenu, setRadialMenu] = useState<{ isOpen: boolean; x: number; y: number; twistAngle?: number }>({
    isOpen: false,
    x: 0,
    y: 0,
    twistAngle: 0,
  });

  // History Stacks
  const [history, setHistory] = useState<Stroke[][]>([currentProject.strokes]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active Spatial Group
  const [activeGroupId, setActiveGroupId] = useState<string>(currentProject.groups[0]?.id || 'g-1');

  // Brush Presets
  const [presets, setPresets] = useState<BrushPreset[]>([
    { id: 'p1', name: 'Fine Conformal', brushType: 'conformal', color: '#ff3b30', size: 18, opacity: 1.0, jitter: 0.0, material: 'shaded', pattern: 'none', pressureSensitive: true },
    { id: 'p2', name: 'Thick Ribbon', brushType: 'ribbon', color: '#007aff', size: 36, opacity: 1.0, jitter: 0.0, material: 'shaded', pattern: 'none', pressureSensitive: true },
    { id: 'p3', name: 'Calligraphic Marker', brushType: 'marker', color: '#ff9500', size: 28, opacity: 0.9, jitter: 0.0, material: 'shaded', pattern: 'none', pressureSensitive: true },
    { id: 'p4', name: 'Neon Glow Tube', brushType: 'tube', color: '#00e676', size: 20, opacity: 1.0, jitter: 0.0, material: 'glow', pattern: 'none', pressureSensitive: false },
    { id: 'p5', name: 'Stipple Ceramic', brushType: 'conformal', color: '#ffffff', size: 22, opacity: 0.9, jitter: 0.05, material: 'shaded', pattern: 'stipple', pressureSensitive: true },
  ]);

  // Environment Settings
  const [environment, setEnvironment] = useState<EnvironmentConfig>(currentProject.environment);

  // Three.js Scene References
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const skyDomeRef = useRef<WanderlustSkyDome | null>(null);
  const strokeMeshesMap = useRef<Map<string, THREE.Mesh>>(new Map());
  const guideMeshRef = useRef<THREE.Mesh | null>(null);
  const orbitGizmoRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // 3D Model & Surface Raycasting References
  const modelRootRef = useRef<THREE.Group | null>(null);
  const targetMeshesRef = useRef<THREE.Mesh[]>([]);
  const cursorDecalRef = useRef<THREE.Mesh | null>(null);
  const strokeSmootherRef = useRef<StrokeSmoother>(new StrokeSmoother());
  const lastHitMeshRef = useRef<THREE.Mesh | null>(null);
  const lastScreenCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const lastCapturePointRef = useRef<Point3D | null>(null);
  const isOverAirRef = useRef<boolean>(false);
  const activeStrokeBatchRef = useRef<Stroke[]>([]);

  // Interactive Stroke Drawing State
  const isDrawingRef = useRef<boolean>(false);
  const currentPointsRef = useRef<Point3D[]>([]);
  const activeTouchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const activeStylusPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const rejectedTouchPointersRef = useRef<Set<number>>(new Set());
  const pinchStartDistRef = useRef<number | null>(null);
  const initialCamDistanceRef = useRef<number>(5.0);
  const touchStartTimeRef = useRef<number>(0);
  const touchHoldTimerRef = useRef<any>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastThreeFingerTapTimeRef = useRef<number>(0);
  const lastSpacebarPressTimeRef = useRef<number>(0);
  const lastTabPressTimeRef = useRef<number>(0);
  const isSpacebarHeldRef = useRef<boolean>(false);
  const isDHeldRef = useRef<boolean>(false);
  const isFHeldRef = useRef<boolean>(false);
  const fovBadgeTimerRef = useRef<any>(null);

  const multiTouchTapRef = useRef<{
    startTime: number;
    maxTouches: number;
    moved: boolean;
  }>({
    startTime: 0,
    maxTouches: 0,
    moved: false,
  });

  const cameraSphericalRef = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 4.8,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });
  const [cameraSphericalState, setCameraSphericalState] = useState<{ radius: number; theta: number; phi: number }>({
    radius: 4.8,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
  });
  const cameraTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Sync History on Stroke Update
  const pushHistory = useCallback((newStrokes: Stroke[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newStrokes);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);

    setProjects((prev) => {
      const next = [...prev];
      if (next[activeProjectIdx]) {
        next[activeProjectIdx] = {
          ...next[activeProjectIdx],
          strokes: newStrokes,
          updatedAt: Date.now(),
        };
      }
      return next;
    });
  }, [history, historyIndex, activeProjectIdx]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevStrokes = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProjects((prev) => {
        const next = [...prev];
        if (next[activeProjectIdx]) {
          next[activeProjectIdx] = { ...next[activeProjectIdx], strokes: prevStrokes };
        }
        return next;
      });
      if ('vibrate' in navigator) navigator.vibrate(15);
    }
  }, [historyIndex, history, activeProjectIdx]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextStrokes = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProjects((prev) => {
        const next = [...prev];
        if (next[activeProjectIdx]) {
          next[activeProjectIdx] = { ...next[activeProjectIdx], strokes: nextStrokes };
        }
        return next;
      });
      if ('vibrate' in navigator) navigator.vibrate(15);
    }
  }, [historyIndex, history, activeProjectIdx]);

  // Load Projects from IndexedDB on Mount
  useEffect(() => {
    StorageEngine.loadProjects()
      .then((loaded) => {
        if (loaded && loaded.length > 0) {
          setProjects(loaded);
          const activeId = StorageEngine.getActiveProjectId();
          const foundIdx = loaded.findIndex((p) => p.id === activeId);
          if (foundIdx !== -1) {
            setActiveProjectIdx(foundIdx);
            setEnvironment(loaded[foundIdx].environment);
            setHistory([loaded[foundIdx].strokes]);
            setHistoryIndex(0);
          }
        }
      })
      .catch((err) => console.warn('IndexedDB load notice:', err));
  }, []);

  // Autosave current project to IndexedDB
  useEffect(() => {
    if (!currentProject) return;
    setIsAutosaved(false);
    const timer = setTimeout(async () => {
      await StorageEngine.saveProject(currentProject);
      StorageEngine.setActiveProjectId(currentProject.id);
      setIsAutosaved(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [currentProject]);

  // Keep timelapse visible count in sync
  useEffect(() => {
    if (!isTimelapsePlaying) {
      setTimelapseVisibleCount(currentProject.strokes.length);
    }
  }, [isTimelapsePlaying, currentProject.strokes.length]);

  // Update Camera Matrix from Spherical Coordinates
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { radius, theta, phi } = cameraSphericalRef.current || { radius: 4.8, theta: Math.PI / 4, phi: Math.PI / 3 };
    const target = cameraTargetRef.current || new THREE.Vector3(0, 0, 0);

    const x = (target?.x ?? 0) + radius * Math.sin(phi) * Math.sin(theta);
    const y = (target?.y ?? 0) + radius * Math.cos(phi);
    const z = (target?.z ?? 0) + radius * Math.sin(phi) * Math.cos(theta);

    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
    setCameraSphericalState({ radius, theta, phi });
  }, []);

  // Projection Toggle
  const toggleProjectionMode = useCallback(() => {
    setIsOrthographicMode((prev) => {
      const next = !prev;
      if (cameraRef.current) {
        if (next) {
          cameraRef.current.fov = 8;
          cameraSphericalRef.current.radius = 22;
        } else {
          cameraRef.current.fov = 40;
          cameraSphericalRef.current.radius = 4.8;
        }
        cameraRef.current.updateProjectionMatrix();
        updateCameraPosition();
      }
      showToast(next ? 'Projection: Isometric (Orthographic)' : 'Projection: Perspective');
      if ('vibrate' in navigator) navigator.vibrate(30);
      return next;
    });
  }, [updateCameraPosition]);

  // Snap to Nearest Perfect View
  const snapToPerfectView = useCallback(() => {
    const { theta, phi } = cameraSphericalRef.current;
    if (phi < 0.35) {
      cameraSphericalRef.current.phi = 0.01;
      showToast('Top Plan Elevation Snapped');
    } else if (phi > 2.8) {
      cameraSphericalRef.current.phi = Math.PI - 0.01;
      showToast('Bottom View Snapped');
    } else {
      const snapTheta = Math.round(theta / (Math.PI / 2)) * (Math.PI / 2);
      cameraSphericalRef.current.theta = snapTheta;
      cameraSphericalRef.current.phi = Math.PI / 2;
      showToast('Perfect Elevation Snapped');
    }
    updateCameraPosition();
    if ('vibrate' in navigator) navigator.vibrate(25);
  }, [updateCameraPosition]);

  // 3D Model Management
  const setModelObject = useCallback((obj: THREE.Object3D, name: string) => {
    if (!modelRootRef.current) return;

    while (modelRootRef.current.children.length > 0) {
      const child = modelRootRef.current.children[0];
      modelRootRef.current.remove(child);
      child.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
          else c.material.dispose();
        }
      });
    }

    modelRootRef.current.add(obj);
    targetMeshesRef.current = [];

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        targetMeshesRef.current.push(child);
        const geom = child.geometry;
        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }
        geom.computeBoundingBox();
        geom.computeBoundingSphere();

        if (Array.isArray(child.material)) {
          child.material.forEach((m) => RenderEngine.configureModelMaterial(m));
        } else if (child.material) {
          RenderEngine.configureModelMaterial(child.material);
        }
      }
    });

    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetScale = 2.6 / maxDim;
    obj.scale.setScalar(targetScale);

    const scaledBox = new THREE.Box3().setFromObject(obj);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    obj.position.sub(scaledCenter);
    obj.updateMatrixWorld(true);

    setActiveModelName(name);
    setHasActiveModel(true);
    showToast(`Loaded 3D Model: ${name}`);
  }, []);

  const loadPresetModel = useCallback((presetId: string) => {
    const presets = SampleModelFactory.getPresets();
    const found = presets.find((p) => p.id === presetId) || presets[0];
    const meshObj = found.createMesh();
    setModelObject(meshObj, found.name);
  }, [setModelObject]);

  const clearModel = useCallback(() => {
    if (!modelRootRef.current) return;
    while (modelRootRef.current.children.length > 0) {
      const child = modelRootRef.current.children[0];
      modelRootRef.current.remove(child);
      child.traverse((c: any) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
          else c.material.dispose();
        }
      });
    }
    targetMeshesRef.current = [];
    setHasActiveModel(false);
    if (cursorDecalRef.current) {
      cursorDecalRef.current.visible = false;
    }
    showToast('Unloaded 3D Model');
  }, []);

  const handleImportCustomModel = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const buffer = await file.arrayBuffer();

    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader();
      loader.parse(
        buffer,
        '',
        (gltf) => {
          const scene = gltf.scene || gltf.scenes[0];
          setModelObject(scene, file.name);
        },
        (err) => {
          console.error('Failed to parse GLTF:', err);
          showToast('Failed to load GLTF file');
        }
      );
    } else if (ext === 'obj') {
      const text = new TextDecoder().decode(buffer);
      const loader = new OBJLoader();
      const obj = loader.parse(text);
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.4,
            metalness: 0.1,
            side: THREE.DoubleSide,
          });
        }
      });
      setModelObject(obj, file.name);
    }
  }, [setModelObject]);

  // Raycast from NDC (-1 to 1) onto front-facing 3D meshes or guides
  const raycastModel = useCallback((screenX: number, screenY: number): {
    hit: boolean;
    point: THREE.Vector3;
    worldPoint: THREE.Vector3;
    normal: THREE.Vector3;
    worldNormal: THREE.Vector3;
    uv?: { x: number; y: number };
    mesh?: THREE.Mesh;
  } | null => {
    if (!cameraRef.current) return null;

    const coords = new THREE.Vector2(screenX, screenY);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(coords, cameraRef.current);

    let hit: THREE.Intersection | null = null;

    // Fast-path: Prioritize checking the previously hit mesh
    if (lastHitMeshRef.current && lastHitMeshRef.current.visible) {
      const directHit = raycaster.intersectObject(lastHitMeshRef.current, false);
      if (directHit.length > 0) {
        hit = directHit[0];
      }
    }

    if (!hit && targetMeshesRef.current.length > 0) {
      const intersects = raycaster.intersectObjects(targetMeshesRef.current, false);
      if (intersects.length > 0) {
        hit = intersects[0];
        lastHitMeshRef.current = hit.object as THREE.Mesh;
      }
    }

    // Check active guide mesh
    if (!hit && activeGuide && guideMeshRef.current) {
      const guideHits = raycaster.intersectObject(guideMeshRef.current, false);
      if (guideHits.length > 0) {
        hit = guideHits[0];
      }
    }

    if (hit) {
      let worldNormal = hit.face
        ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize()
        : new THREE.Vector3(0, 1, 0);

      const camDir = new THREE.Vector3().subVectors(cameraRef.current.position, hit.point).normalize();
      if (worldNormal.dot(camDir) < 0) {
        worldNormal.negate();
      }

      const worldPoint = hit.point.clone();
      let localPoint = worldPoint.clone();
      let localNormal = worldNormal.clone();

      if (modelRootRef.current) {
        const invModelMatrix = modelRootRef.current.matrixWorld.clone().invert();
        localPoint.applyMatrix4(invModelMatrix);
        localNormal.transformDirection(invModelMatrix).normalize();
      }

      const uv = hit.uv ? { x: hit.uv.x, y: hit.uv.y } : undefined;

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

    return null;
  }, [activeGuide]);

  // Update 3D Brush Cursor Decal Ring
  const updateCursorDecal = useCallback((screenX: number, screenY: number, sizeInMm: number) => {
    if (!cursorDecalRef.current) return;

    const rayResult = raycastModel(screenX, screenY);
    if (rayResult && rayResult.worldPoint) {
      cursorDecalRef.current.visible = true;
      cursorDecalRef.current.position.copy(rayResult.worldPoint).addScaledVector(rayResult.worldNormal, 0.005);

      const normal = rayResult.worldNormal.clone().normalize();
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      cursorDecalRef.current.setRotationFromQuaternion(quat);

      const worldScale = (sizeInMm / 1000) * 0.5;
      cursorDecalRef.current.scale.set(worldScale, worldScale, worldScale);
    } else {
      cursorDecalRef.current.visible = false;
    }
  }, [raycastModel]);

  // Fallback Camera Plane Intersection for free spatial sketching
  const getPointerWorldCoordinate = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    if (!cameraRef.current || !canvasContainerRef.current) return new THREE.Vector3(0, 0, 0);

    const rect = canvasContainerRef.current.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const rayResult = raycastModel(ndcX, ndcY);
    if (rayResult && rayResult.worldPoint) {
      return rayResult.worldPoint;
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

    const orbitTarget = new THREE.Vector3(...environment.orbitPoint);
    const cameraDir = new THREE.Vector3();
    cameraRef.current.getWorldDirection(cameraDir);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraDir.clone().negate(), orbitTarget);
    const targetPt = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, targetPt);

    return targetPt || new THREE.Vector3(0, 0, 0);
  }, [raycastModel, environment.orbitPoint]);

  // Commit Active Segment during air gap or discontinuity splitting
  const commitActiveSegment = useCallback(() => {
    if (currentPointsRef.current.length < 2) {
      currentPointsRef.current = [];
      return;
    }

    const newStroke: Stroke = {
      id: 'stroke-' + Math.random().toString(36).substring(2, 9),
      groupId: activeGroupId,
      points: [...currentPointsRef.current],
      color,
      size: brushSize,
      opacity,
      jitter,
      brushType: (brushType === 'conformal' ? 'conformal' : brushType),
      profile: strokeProfile,
      material,
      pattern,
      patternScale,
      patternAngle,
      patternContrast,
      pressureSensitive,
      isShape: toolMode === 'draw_shape',
      archSegments: 5,
      domeFactor,
      surfaceOffset,
      taperLength: 0.05,
      silhouetteClamping,
      smoothingAlgorithm,
      smoothingStrength,
      createdAt: Date.now(),
    };

    activeStrokeBatchRef.current.push(newStroke);
    currentPointsRef.current = [];
  }, [
    activeGroupId,
    color,
    brushSize,
    opacity,
    jitter,
    brushType,
    strokeProfile,
    material,
    pattern,
    patternScale,
    patternAngle,
    patternContrast,
    pressureSensitive,
    toolMode,
    domeFactor,
    surfaceOffset,
    silhouetteClamping,
    smoothingAlgorithm,
    smoothingStrength,
  ]);

  // Handle Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';

    if (e.buttons === 2 || e.button === 2) {
      e.preventDefault();
      const twist = (e as any).twist || 0;
      setRadialMenu({ isOpen: true, x: e.clientX, y: e.clientY, twistAngle: twist });
      if ('vibrate' in navigator) navigator.vibrate([20, 20, 20]);
      return;
    }

    if (isPen) {
      activeStylusPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

      if (palmRejectionEnabled) {
        activeTouchPointersRef.current.forEach((pos, id) => {
          const dist = Math.hypot(pos.x - e.clientX, pos.y - e.clientY);
          if (dist <= palmRejectionRadius) {
            rejectedTouchPointersRef.current.add(id);
            activeTouchPointersRef.current.delete(id);
            setPalmRejectionFeedback({ x: pos.x, y: pos.y, timestamp: Date.now() });
          }
        });
      }
    }

    if (isTouch && palmRejectionEnabled && activeStylusPosRef.current) {
      const timeSinceStylus = Date.now() - activeStylusPosRef.current.time;
      if (isDrawingRef.current || timeSinceStylus < 1500) {
        const dist = Math.hypot(e.clientX - activeStylusPosRef.current.x, e.clientY - activeStylusPosRef.current.y);
        if (dist <= palmRejectionRadius) {
          rejectedTouchPointersRef.current.add(e.pointerId);
          setPalmRejectionFeedback({ x: e.clientX, y: e.clientY, timestamp: Date.now() });
          return;
        }
      }
    }

    activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const currentTouches = activeTouchPointersRef.current.size;

    if (isTouch) {
      if (currentTouches === 1) {
        multiTouchTapRef.current = {
          startTime: Date.now(),
          maxTouches: 1,
          moved: false,
        };
      } else {
        multiTouchTapRef.current.maxTouches = Math.max(multiTouchTapRef.current.maxTouches, currentTouches);
      }
    }

    const canDraw = isPen || (isFingerPenMode && currentTouches === 1);

    if (canDraw) {
      touchStartTimeRef.current = Date.now();

      touchHoldTimerRef.current = setTimeout(() => {
        if (!isDrawingRef.current && activeTouchPointersRef.current.size === 1) {
          const worldPt = getPointerWorldCoordinate(e.clientX, e.clientY);
          if (worldPt && cameraRef.current) {
            setEnvironment((prev) => ({
              ...prev,
              orbitPoint: [worldPt.x ?? 0, worldPt.y ?? 0, worldPt.z ?? 0],
              orbitPointPinned: true,
              dofEnabled: true,
              dofFStop: 2.8,
            }));
            showToast('Anchor Pinned: Orbit Center Locked');
            if ('vibrate' in navigator) navigator.vibrate([25, 20, 25]);
          }
        }
      }, 420);

      // Start Stroke
      isDrawingRef.current = true;
      activeStrokeBatchRef.current = [];
      strokeSmootherRef.current.reset();

      if (canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const rawNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const rawNdcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const rawPress = isPen && pressureSensitive ? (e.pressure || 0.6) : 0.8;

        const smoothed = strokeSmootherRef.current.processPoint(
          rawNdcX,
          rawNdcY,
          rawPress,
          smoothingAlgorithm,
          smoothingStrength,
          true,
          0.4
        );

        lastScreenCoordsRef.current = { x: smoothed.x, y: smoothed.y };
        lastCapturePointRef.current = null;
        isOverAirRef.current = false;

        const rayResult = raycastModel(smoothed.x, smoothed.y);

        if (rayResult && rayResult.hit) {
          const firstPoint: Point3D = {
            x: rayResult.worldPoint.x,
            y: rayResult.worldPoint.y,
            z: rayResult.worldPoint.z,
            normal: { x: rayResult.worldNormal.x, y: rayResult.worldNormal.y, z: rayResult.worldNormal.z },
            pressure: smoothed.pressure,
            isSurfaceHit: true,
            uv: rayResult.uv,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            timestamp: Date.now(),
          };
          currentPointsRef.current = [firstPoint];
          lastCapturePointRef.current = firstPoint;
        } else {
          isOverAirRef.current = true;
          const fallbackPt = getPointerWorldCoordinate(e.clientX, e.clientY);
          const firstPoint: Point3D = {
            x: fallbackPt.x,
            y: fallbackPt.y,
            z: fallbackPt.z,
            pressure: smoothed.pressure,
            isSurfaceHit: false,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            timestamp: Date.now(),
          };
          currentPointsRef.current = [firstPoint];
          lastCapturePointRef.current = firstPoint;
        }
      }
    } else {
      isDrawingRef.current = false;
    }
  };

  // Handle Pointer Move with High-Frequency Raycast Sub-Sampling
  const handlePointerMove = (e: React.PointerEvent) => {
    if (rejectedTouchPointersRef.current.has(e.pointerId)) {
      return;
    }

    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';

    if (isPen) {
      activeStylusPosRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

      if (palmRejectionEnabled) {
        activeTouchPointersRef.current.forEach((pos, id) => {
          const dist = Math.hypot(pos.x - e.clientX, pos.y - e.clientY);
          if (dist <= palmRejectionRadius) {
            rejectedTouchPointersRef.current.add(id);
            activeTouchPointersRef.current.delete(id);
            setPalmRejectionFeedback({ x: pos.x, y: pos.y, timestamp: Date.now() });
          }
        });
      }
    }

    if (isTouch) {
      if (palmRejectionEnabled && activeStylusPosRef.current) {
        const timeSinceStylus = Date.now() - activeStylusPosRef.current.time;
        if (isDrawingRef.current || timeSinceStylus < 1500) {
          const dist = Math.hypot(e.clientX - activeStylusPosRef.current.x, e.clientY - activeStylusPosRef.current.y);
          if (dist <= palmRejectionRadius) {
            rejectedTouchPointersRef.current.add(e.pointerId);
            activeTouchPointersRef.current.delete(e.pointerId);
            setPalmRejectionFeedback({ x: e.clientX, y: e.clientY, timestamp: Date.now() });
            return;
          }
        }
      }
      activeTouchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Keyboard navigation overrides
    if (isSpacebarHeldRef.current) {
      cameraSphericalRef.current.theta -= e.movementX * 0.008;
      cameraSphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraSphericalRef.current.phi - e.movementY * 0.008));
      updateCameraPosition();
      return;
    }
    if (isDHeldRef.current) {
      cameraSphericalRef.current.radius = Math.max(0.5, Math.min(25, cameraSphericalRef.current.radius + e.movementY * 0.05));
      updateCameraPosition();
      return;
    }
    if (isFHeldRef.current) {
      const panX = e.movementX * 0.005;
      const panY = -e.movementY * 0.005;
      cameraTargetRef.current.x += panX;
      cameraTargetRef.current.y += panY;
      updateCameraPosition();
      return;
    }

    const numTouches = activeTouchPointersRef.current.size;

    if (isTouch && (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2)) {
      multiTouchTapRef.current.moved = true;
    }

    // 1-Finger Orbit
    if (numTouches === 1 && !isPen && !isFingerPenMode && !isDrawingRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      const deltaX = e.movementX * 0.008;
      const deltaY = e.movementY * 0.008;
      cameraSphericalRef.current.theta -= deltaX;
      cameraSphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraSphericalRef.current.phi - deltaY));
      updateCameraPosition();
      return;
    }

    // 2-Finger Pinch Zoom and Pan
    if (numTouches === 2) {
      clearTimeout(touchHoldTimerRef.current);
      isDrawingRef.current = false;
      const pointers = Array.from(activeTouchPointersRef.current.values()) as { x: number; y: number }[];
      if (pointers.length >= 2 && pointers[0] && pointers[1]) {
        const dist = Math.max(1, Math.hypot(pointers[0].x - pointers[1].x, pointers[0].y - pointers[1].y));

        if (pinchStartDistRef.current !== null && pinchStartDistRef.current > 0) {
          const factor = pinchStartDistRef.current / dist;
          cameraSphericalRef.current.radius = Math.max(0.5, Math.min(20, initialCamDistanceRef.current * factor));
        } else {
          pinchStartDistRef.current = dist;
          initialCamDistanceRef.current = cameraSphericalRef.current.radius;
        }
      }

      const panX = e.movementX * 0.005;
      const panY = -e.movementY * 0.005;
      if (cameraTargetRef.current) {
        cameraTargetRef.current.x += panX;
        cameraTargetRef.current.y += panY;
      }
      updateCameraPosition();
      return;
    }

    // 3-Finger Vertical Swipe (FOV Distortion)
    if (numTouches === 3 && cameraRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      const fovDelta = e.movementY * 0.25;
      const nextFov = Math.max(6, Math.min(105, cameraRef.current.fov + fovDelta));
      cameraRef.current.fov = nextFov;
      cameraRef.current.updateProjectionMatrix();

      const focalMm = Math.round(500 / ((nextFov / 40) * 10));
      setFovBadge({ visible: true, fov: nextFov, mm: focalMm });
      clearTimeout(fovBadgeTimerRef.current);
      fovBadgeTimerRef.current = setTimeout(() => {
        setFovBadge((prev) => ({ ...prev, visible: false }));
      }, 1500);
      return;
    }

    // NDC Coordinates
    if (!canvasContainerRef.current) return;
    const rect = canvasContainerRef.current.getBoundingClientRect();
    const rawNdcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const rawNdcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const rawPress = isPen && pressureSensitive ? (e.pressure || 0.6) : 0.8;

    // Update 3D cursor decal projection when hovering over model
    if (!isDrawingRef.current && hasActiveModel) {
      updateCursorDecal(rawNdcX, rawNdcY, brushSize);
    }

    // Active Drawing Process
    if (isDrawingRef.current) {
      clearTimeout(touchHoldTimerRef.current);

      const smoothed = strokeSmootherRef.current.processPoint(
        rawNdcX,
        rawNdcY,
        rawPress,
        smoothingAlgorithm,
        smoothingStrength,
        true,
        0.4
      );

      const targetX = smoothed.x;
      const targetY = smoothed.y;
      const targetPressure = smoothed.pressure;

      if (!lastScreenCoordsRef.current) {
        lastScreenCoordsRef.current = { x: targetX, y: targetY };
      }

      const dx = targetX - lastScreenCoordsRef.current.x;
      const dy = targetY - lastScreenCoordsRef.current.y;
      const screenDist = Math.hypot(dx, dy);

      // Sub-sample screen movements so rapid strokes capture all surface contours
      const maxStepDist = 0.005;
      const steps = Math.min(24, Math.max(1, Math.ceil(screenDist / maxStepDist)));

      for (let step = 1; step <= steps; step++) {
        const alpha = step / steps;
        const currX = lastScreenCoordsRef.current.x + dx * alpha;
        const currY = lastScreenCoordsRef.current.y + dy * alpha;
        const currPressure = targetPressure;

        const rayResult = raycastModel(currX, currY);

        if (!rayResult || !rayResult.hit) {
          // Ray missed into empty air
          if (currentPointsRef.current.length > 1) {
            commitActiveSegment();
          }
          isOverAirRef.current = true;
          lastCapturePointRef.current = null;
          continue;
        }

        // Surface Hit Point
        const newPoint: Point3D = {
          x: rayResult.worldPoint.x,
          y: rayResult.worldPoint.y,
          z: rayResult.worldPoint.z,
          normal: { x: rayResult.worldNormal.x, y: rayResult.worldNormal.y, z: rayResult.worldNormal.z },
          pressure: currPressure,
          isSurfaceHit: true,
          uv: rayResult.uv,
          tiltX: e.tiltX,
          tiltY: e.tiltY,
          timestamp: Date.now(),
        };

        // Discontinuity detection: Returning from air, large 3D jump, or sharp normal flip (>105 deg)
        if (lastCapturePointRef.current) {
          const dist3D = Math.hypot(
            newPoint.x - lastCapturePointRef.current.x,
            newPoint.y - lastCapturePointRef.current.y,
            newPoint.z - lastCapturePointRef.current.z
          );

          let normalDot = 1.0;
          if (lastCapturePointRef.current.normal && newPoint.normal) {
            const nA = lastCapturePointRef.current.normal;
            const nB = newPoint.normal;
            normalDot = nA.x * nB.x + nA.y * nB.y + nA.z * nB.z;
          }

          const maxJump = Math.max(0.18, (brushSize / 1000) * 6.0);
          const isDiscontinuous = isOverAirRef.current || dist3D > maxJump || normalDot < -0.25;

          if (isDiscontinuous) {
            if (currentPointsRef.current.length > 1) {
              commitActiveSegment();
            }
            isOverAirRef.current = false;
            lastCapturePointRef.current = null;
          }
        }

        isOverAirRef.current = false;

        if (currentPointsRef.current.length === 0) {
          currentPointsRef.current.push(newPoint);
          lastCapturePointRef.current = newPoint;
        } else {
          const distFromLast = Math.hypot(
            newPoint.x - lastCapturePointRef.current!.x,
            newPoint.y - lastCapturePointRef.current!.y,
            newPoint.z - lastCapturePointRef.current!.z
          );
          if (distFromLast > 0.0004) {
            currentPointsRef.current.push(newPoint);
            lastCapturePointRef.current = newPoint;
          }
        }
      }

      lastScreenCoordsRef.current = { x: targetX, y: targetY };
      updateCursorDecal(targetX, targetY, brushSize);

      // Vacuum / Erase interaction
      if (toolMode === 'erase' || toolMode === 'vacuum') {
        if (cameraRef.current && canvasContainerRef.current) {
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(rawNdcX, rawNdcY), cameraRef.current);

          const remainingStrokes = currentProject.strokes.filter((s) => {
            if (toolMode === 'vacuum') {
              return !GeometryEngine.doesRayTouchStrokeEnvelope(raycaster.ray, s, 0.35);
            }
            return !GeometryEngine.doesRayIntersectCenterline(raycaster.ray, s.points, 0.12);
          });

          if (remainingStrokes.length !== currentProject.strokes.length) {
            pushHistory(remainingStrokes);
            if ('vibrate' in navigator) navigator.vibrate(toolMode === 'vacuum' ? 35 : 15);
          }
        }
      }
    }
  };

  // Handle Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (rejectedTouchPointersRef.current.has(e.pointerId)) {
      rejectedTouchPointersRef.current.delete(e.pointerId);
      return;
    }

    if (e.pointerType === 'pen' && activeStylusPosRef.current) {
      activeStylusPosRef.current.time = Date.now();
    }

    const isTouch = e.pointerType === 'touch';
    activeTouchPointersRef.current.delete(e.pointerId);
    pinchStartDistRef.current = null;
    clearTimeout(touchHoldTimerRef.current);

    // Multi-Touch Tap Gesture Engine
    const elapsed = Date.now() - multiTouchTapRef.current.startTime;
    if (isTouch && elapsed < 350 && !multiTouchTapRef.current.moved) {
      if (multiTouchTapRef.current.maxTouches === 2) {
        handleUndo();
        showToast('Undo (2-Finger Tap)');
        isDrawingRef.current = false;
        currentPointsRef.current = [];
        return;
      } else if (multiTouchTapRef.current.maxTouches === 3) {
        const now = Date.now();
        if (now - lastThreeFingerTapTimeRef.current < 350) {
          toggleProjectionMode();
        } else {
          handleRedo();
          showToast('Redo (3-Finger Tap)');
        }
        lastThreeFingerTapTimeRef.current = now;
        isDrawingRef.current = false;
        currentPointsRef.current = [];
        return;
      }
    }

    // 1-Finger Double Tap detection
    const now = Date.now();
    if (now - lastTapTimeRef.current < 280 && !isDrawingRef.current && isTouch && !multiTouchTapRef.current.moved) {
      snapToPerfectView();
    }
    lastTapTimeRef.current = now;

    // Finalize Drawn Stroke & Batch
    if (isDrawingRef.current) {
      if (currentPointsRef.current.length > 1) {
        let finalPoints = currentPointsRef.current;

        if (stableStrokeAmount > 0) {
          finalPoints = GeometryEngine.applyStableStrokeFilter(finalPoints, stableStrokeAmount);
        }
        if (toolMode === 'draw_shape') {
          finalPoints = GeometryEngine.snapStrokeToShape(finalPoints, 0.5);
        }

        currentPointsRef.current = finalPoints;
        commitActiveSegment();
      }

      if (activeStrokeBatchRef.current.length > 0) {
        let updatedStrokes = [...currentProject.strokes];
        const baseStrokesToAdd = [...activeStrokeBatchRef.current];

        // Apply mirror duplication
        activeStrokeBatchRef.current.forEach((st) => {
          if (activeMirrorAxis?.x) baseStrokesToAdd.push(GeometryEngine.mirrorStroke(st, 'x'));
          if (activeMirrorAxis?.y) baseStrokesToAdd.push(GeometryEngine.mirrorStroke(st, 'y'));
          if (activeMirrorAxis?.z) baseStrokesToAdd.push(GeometryEngine.mirrorStroke(st, 'z'));
        });

        // Apply Radial Symmetry Array
        if ((radialSymmetry?.count ?? 0) > 1) {
          const orbitCenter = {
            x: environment.orbitPoint?.[0] ?? 0,
            y: environment.orbitPoint?.[1] ?? 0,
            z: environment.orbitPoint?.[2] ?? 0,
            pressure: 1,
          };
          const radialGenerated: Stroke[] = [];
          baseStrokesToAdd.forEach((st) => {
            const radArr = GeometryEngine.createRadialArrayStrokes(
              st,
              radialSymmetry.count,
              radialSymmetry.axis,
              orbitCenter
            );
            radialGenerated.push(...radArr);
          });
          baseStrokesToAdd.push(...radialGenerated);
        }

        updatedStrokes.push(...baseStrokesToAdd);
        pushHistory(updatedStrokes);
        activeStrokeBatchRef.current = [];
      }
    }

    isDrawingRef.current = false;
    currentPointsRef.current = [];
    lastScreenCoordsRef.current = null;
    lastCapturePointRef.current = null;
    isOverAirRef.current = false;
    strokeSmootherRef.current.reset();
  };

  // Keyboard Navigation Bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastSpacebarPressTimeRef.current < 300) {
          snapToPerfectView();
        }
        lastSpacebarPressTimeRef.current = now;
        isSpacebarHeldRef.current = true;
        return;
      }

      if (e.key.toLowerCase() === 'd') {
        isDHeldRef.current = true;
        return;
      }

      if (e.key.toLowerCase() === 'f') {
        isFHeldRef.current = true;
        cameraTargetRef.current.set(0, 0, 0);
        updateCameraPosition();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const now = Date.now();
        if (now - lastTabPressTimeRef.current < 320) {
          toggleProjectionMode();
        }
        lastTabPressTimeRef.current = now;
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'b':
          setToolMode((prev) => (prev === 'draw' ? 'draw_shape' : 'draw'));
          break;
        case 'e':
          setToolMode((prev) => (prev === 'erase' ? 'vacuum' : 'erase'));
          break;
        case 'w':
        case 'v':
          setToolMode((prev) => (prev === 'select' ? 'draw' : 'select'));
          break;
        case 'u':
          setHideUI((prev) => !prev);
          break;
        case 'i':
          setIsInjectorActive((prev) => !prev);
          break;
        case '[':
          setBrushSize((s) => Math.max(1, s - (e.shiftKey ? 10 : 2)));
          break;
        case ']':
          setBrushSize((s) => Math.min(300, s + (e.shiftKey ? 10 : 2)));
          break;
        case '-':
          setOpacity((o) => Math.max(0, o - 0.1));
          break;
        case '=':
          setOpacity((o) => Math.min(1, o + 0.1));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacebarHeldRef.current = false;
      if (e.key.toLowerCase() === 'd') isDHeldRef.current = false;
      if (e.key.toLowerCase() === 'f') isFHeldRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleUndo, handleRedo, snapToPerfectView, toggleProjectionMode, updateCameraPosition]);

  // Capture Thumbnail for Project
  const handleCaptureThumbnail = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    setProjects((prev) => {
      const next = [...prev];
      if (next[activeProjectIdx]) {
        next[activeProjectIdx].thumbnail = dataUrl;
      }
      return next;
    });
    showToast('Captured Thumbnail');
  };

  // Curve Smoothing Handler
  const handleSmoothSelection = useCallback((strength: number) => {
    const updated = currentProject.strokes.map((s) => {
      if (selectedStrokeIds.has(s.id)) {
        return GeometryEngine.smoothStroke(s, strength);
      }
      return s;
    });
    selectedStrokeIds.forEach((id) => {
      const m = strokeMeshesMap.current.get(id);
      if (m) {
        sceneRef.current?.remove(m);
        m.geometry.dispose();
        strokeMeshesMap.current.delete(id);
      }
    });
    pushHistory(updated);
  }, [currentProject.strokes, selectedStrokeIds, pushHistory]);

  // Curve Decimation Handler
  const handleDecimateSelection = useCallback(() => {
    const updated = currentProject.strokes.map((s) => {
      if (selectedStrokeIds.has(s.id)) {
        return GeometryEngine.decimateStroke(s, 0.04);
      }
      return s;
    });
    selectedStrokeIds.forEach((id) => {
      const m = strokeMeshesMap.current.get(id);
      if (m) {
        sceneRef.current?.remove(m);
        m.geometry.dispose();
        strokeMeshesMap.current.delete(id);
      }
    });
    pushHistory(updated);
  }, [currentProject.strokes, selectedStrokeIds, pushHistory]);

  // Screen-Space 2D Transform Handler
  const handleTransformScreenSpace = useCallback((
    screenDelta: { x: number; y: number },
    screenRotationRad: number,
    screenScale: { x: number; y: number; z: number }
  ) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;

    let targetStrokes = currentProject.strokes.filter((s) => selectedStrokeIds.has(s.id));
    if (targetStrokes.length === 0) {
      targetStrokes = currentProject.strokes.filter((s) => s.groupId === activeGroupId);
    }
    if (targetStrokes.length === 0) return;

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    const orbitTarget = environment.orbitPoint;
    const pivot = { x: orbitTarget[0], y: orbitTarget[1], z: orbitTarget[2] };

    const transformed = GeometryEngine.transformStrokesScreenSpace(
      targetStrokes,
      screenDelta,
      screenRotationRad,
      screenScale,
      { x: right.x, y: right.y, z: right.z },
      { x: up.x, y: up.y, z: up.z },
      { x: forward.x, y: forward.y, z: forward.z },
      pivot
    );

    const transMap = new Map(transformed.map((s) => [s.id, s]));
    const updated = currentProject.strokes.map((s) => transMap.get(s.id) || s);

    targetStrokes.forEach((s) => {
      const m = strokeMeshesMap.current.get(s.id);
      if (m) {
        sceneRef.current?.remove(m);
        m.geometry.dispose();
        strokeMeshesMap.current.delete(s.id);
      }
    });

    pushHistory(updated);
  }, [currentProject.strokes, selectedStrokeIds, activeGroupId, environment.orbitPoint, pushHistory]);

  // Spatial 3D Transform Handler
  const handleTransformSpatial = useCallback((
    translation: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number },
    scale: { x: number; y: number; z: number }
  ) => {
    let targetStrokes = currentProject.strokes.filter((s) => selectedStrokeIds.has(s.id));
    if (targetStrokes.length === 0) {
      targetStrokes = currentProject.strokes.filter((s) => s.groupId === activeGroupId);
    }
    if (targetStrokes.length === 0) return;

    const bbox = GeometryEngine.computeStrokesBoundingBox(targetStrokes);
    const pivot = bbox ? bbox.center : { x: environment.orbitPoint[0], y: environment.orbitPoint[1], z: environment.orbitPoint[2], pressure: 1 };

    const transformed = GeometryEngine.transformStrokes(targetStrokes, translation, rotation, scale, pivot);
    const transMap = new Map(transformed.map((s) => [s.id, s]));
    const updated = currentProject.strokes.map((s) => transMap.get(s.id) || s);

    targetStrokes.forEach((s) => {
      const m = strokeMeshesMap.current.get(s.id);
      if (m) {
        sceneRef.current?.remove(m);
        m.geometry.dispose();
        strokeMeshesMap.current.delete(s.id);
      }
    });

    pushHistory(updated);
  }, [currentProject.strokes, selectedStrokeIds, activeGroupId, environment.orbitPoint, pushHistory]);

  // Orthographic depth collapse axis
  const orthoDepthAxis: OrthoDepthAxis = useMemo(() => {
    if (isOrthographicMode) return 'z';
    const phi = cameraSphericalState.phi;
    const theta = cameraSphericalState.theta;
    const phiDeg = (phi * 180) / Math.PI;
    const thetaDeg = (((theta * 180) / Math.PI) % 360 + 360) % 360;

    if (phiDeg < 12 || phiDeg > 168) return 'y';

    if (Math.abs(phiDeg - 90) < 14) {
      if (thetaDeg < 14 || thetaDeg > 346 || Math.abs(thetaDeg - 180) < 14) return 'z';
      if (Math.abs(thetaDeg - 90) < 14 || Math.abs(thetaDeg - 270) < 14) return 'x';
    }
    return 'none';
  }, [isOrthographicMode, cameraSphericalState]);

  // Camera Bookmark Handlers
  const handleAddBookmark = useCallback((name: string) => {
    if (!cameraRef.current) return;
    const newBm: CameraBookmark = {
      id: 'bm-' + Date.now(),
      name: name || `View ${(currentProject.cameraBookmarks || []).length + 1}`,
      position: [cameraRef.current.position?.x ?? 0, cameraRef.current.position?.y ?? 0, cameraRef.current.position?.z ?? 0],
      target: [cameraTargetRef.current?.x ?? 0, cameraTargetRef.current?.y ?? 0, cameraTargetRef.current?.z ?? 0],
      fov: cameraRef.current.fov || 40,
      orthographic: false,
      createdAt: Date.now(),
    };
    setProjects((prev) => {
      const next = [...prev];
      if (next[activeProjectIdx]) {
        const bms = next[activeProjectIdx].cameraBookmarks || [];
        next[activeProjectIdx] = {
          ...next[activeProjectIdx],
          cameraBookmarks: [...bms, newBm],
        };
      }
      return next;
    });
  }, [activeProjectIdx, currentProject.cameraBookmarks]);

  const handleSelectBookmark = useCallback((bm: CameraBookmark) => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(...bm.position);
    cameraTargetRef.current.set(...bm.target);
    cameraRef.current.fov = bm.fov;
    cameraRef.current.updateProjectionMatrix();
    const dx = bm.position[0] - bm.target[0];
    const dy = bm.position[1] - bm.target[1];
    const dz = bm.position[2] - bm.target[2];
    const radius = Math.hypot(dx, dy, dz);
    cameraSphericalRef.current.radius = radius;
    cameraSphericalRef.current.theta = Math.atan2(dx, dz);
    cameraSphericalRef.current.phi = Math.acos(Math.max(-1, Math.min(1, dy / (radius || 1))));
  }, []);

  const handleDeleteBookmark = useCallback((id: string) => {
    setProjects((prev) => {
      const next = [...prev];
      if (next[activeProjectIdx]) {
        const bms = next[activeProjectIdx].cameraBookmarks || [];
        next[activeProjectIdx] = {
          ...next[activeProjectIdx],
          cameraBookmarks: bms.filter((b) => b.id !== id),
        };
      }
      return next;
    });
  }, [activeProjectIdx]);

  // 360 Turntable Recorder
  const handleStartTurntableRecording = useCallback((durationSec: number = 8) => {
    if (!rendererRef.current || !cameraRef.current || isRecordingTurntable) return;

    try {
      const stream = (rendererRef.current.domElement as any).captureStream(60);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentProject.title.toLowerCase().replace(/\s+/g, '_')}_turntable.webm`;
        a.click();
        setIsRecordingTurntable(false);
      };

      mediaRecorder.start();
      setIsRecordingTurntable(true);

      const startTheta = cameraSphericalRef.current.theta;
      const startTime = performance.now();
      const durationMs = durationSec * 1000;

      const spinStep = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);
        cameraSphericalRef.current.theta = startTheta + progress * Math.PI * 2;
        updateCameraPosition();

        if (progress < 1.0) {
          requestAnimationFrame(spinStep);
        } else {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 150);
        }
      };

      requestAnimationFrame(spinStep);
    } catch (err) {
      console.warn('Turntable recording error:', err);
      setIsRecordingTurntable(false);
    }
  }, [currentProject.title, isRecordingTurntable, updateCameraPosition]);

  // Timelapse Playback
  const handleStartTimelapseRecording = useCallback((speedMs: number = 80) => {
    if (isTimelapsePlaying) return;
    setIsTimelapsePlaying(true);
    setTimelapseVisibleCount(0);
    const total = currentProject.strokes.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setTimelapseVisibleCount(count);
      if (count >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTimelapsePlaying(false);
        }, 500);
      }
    }, speedMs);
  }, [currentProject.strokes.length, isTimelapsePlaying]);

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const width = canvasContainerRef.current.clientWidth || window.innerWidth;
    const height = canvasContainerRef.current.clientHeight || window.innerHeight;

    strokeMeshesMap.current.clear();
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 500);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    canvasContainerRef.current.innerHTML = '';
    canvasContainerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const d = 5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const grid = new THREE.GridHelper(10, 20, 0x888888, 0x444444);
    grid.position.y = -0.85;
    scene.add(grid);
    gridHelperRef.current = grid;

    const axes = RenderEngine.createGlobalAxes();
    scene.add(axes);
    axesGroupRef.current = axes;

    const orbitGizmo = RenderEngine.createOrbitPointGizmo();
    scene.add(orbitGizmo);
    orbitGizmoRef.current = orbitGizmo;

    // 3D Model Root Group
    const modelRoot = new THREE.Group();
    modelRoot.renderOrder = 2;
    scene.add(modelRoot);
    modelRootRef.current = modelRoot;

    // 3D Surface Cursor Decal
    const cursorDecal = RenderEngine.createCursorDecal();
    scene.add(cursorDecal);
    cursorDecalRef.current = cursorDecal;

    // Procedural Wanderlust Sky Dome
    const skyDome = new WanderlustSkyDome();
    scene.add(skyDome.mesh);
    skyDomeRef.current = skyDome;

    // Load initial default 3D preset model
    loadPresetModel('cyber_helmet');

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = performance.now() * 0.001;

      if (skyDomeRef.current && skyDomeRef.current.mesh.visible && cameraRef.current) {
        skyDomeRef.current.update(
          time,
          cameraRef.current.position,
          dirLightRef.current ? dirLightRef.current.position.clone().normalize() : new THREE.Vector3(0, 1, 0)
        );
      }

      if (orbitGizmoRef.current && cameraRef.current) {
        orbitGizmoRef.current.quaternion.copy(cameraRef.current.quaternion);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!canvasContainerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = canvasContainerRef.current.clientWidth;
      const h = canvasContainerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    setIsSceneReady(true);

    return () => {
      setIsSceneReady(false);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Environment and Lighting
  useEffect(() => {
    if (!sceneRef.current || !dirLightRef.current || !gridHelperRef.current || !axesGroupRef.current) return;

    const isSkyActive = environment.backgroundType === 'procedural-sky' || (!environment.backgroundType && environment.preset !== 'studio');
    if (isSkyActive) {
      sceneRef.current.background = null;
      if (skyDomeRef.current) {
        skyDomeRef.current.mesh.visible = true;
        skyDomeRef.current.updateConfig(environment);
      }
    } else {
      sceneRef.current.background = new THREE.Color(environment.backgroundColor);
      if (skyDomeRef.current) {
        skyDomeRef.current.mesh.visible = false;
      }
    }

    if (environment.fogEnabled) {
      sceneRef.current.fog = new THREE.FogExp2(environment.backgroundColor, environment.fogDensity);
    } else {
      sceneRef.current.fog = null;
    }

    gridHelperRef.current.visible = environment.showGrid;
    axesGroupRef.current.visible = environment.showAxes;

    const lightDir = RenderEngine.getLightDirection(environment.lightAltitude, environment.lightAzimuth);
    dirLightRef.current.position.copy(lightDir.multiplyScalar(6));
    dirLightRef.current.color = new THREE.Color(environment.lightColor);
    dirLightRef.current.intensity = environment.lightIntensity;
    dirLightRef.current.castShadow = environment.groundShadow;

    if (orbitGizmoRef.current) {
      orbitGizmoRef.current.position.set(...environment.orbitPoint);
      orbitGizmoRef.current.visible = environment.orbitPointPinned || !environment.renderMode;
    }
  }, [environment, isSceneReady]);

  // Re-mesh and Render All Strokes
  useEffect(() => {
    if (!sceneRef.current) return;

    const visibleGroupIds = new Set(
      currentProject.groups.filter((g) => g.visible && !g.locked).map((g) => g.id)
    );

    const strokesToRender = currentProject.strokes.slice(0, timelapseVisibleCount);
    const activeStrokeIds = new Set(strokesToRender.map((s) => s.id));

    strokeMeshesMap.current.forEach((mesh, id) => {
      if (!activeStrokeIds.has(id)) {
        sceneRef.current?.remove(mesh);
        mesh.geometry.dispose();
        strokeMeshesMap.current.delete(id);
      }
    });

    strokesToRender.forEach((stroke) => {
      const isVisible = visibleGroupIds.has(stroke.groupId);
      let mesh = strokeMeshesMap.current.get(stroke.id);

      if (!mesh) {
        const geo = GeometryEngine.createStrokeGeometry(stroke, targetMeshesRef.current);
        const mat = RenderEngine.createMaterial(
          stroke.material,
          stroke.color,
          stroke.opacity,
          stroke.pattern,
          stroke.patternScale || 1.0,
          stroke.patternAngle || 0,
          stroke.patternContrast || 1.0,
          environment
        );
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { strokeId: stroke.id, strokePointsRef: stroke.points };
        sceneRef.current?.add(mesh);
        strokeMeshesMap.current.set(stroke.id, mesh);
      } else if (mesh.userData.strokePointsRef !== stroke.points) {
        mesh.geometry.dispose();
        mesh.geometry = GeometryEngine.createStrokeGeometry(stroke, targetMeshesRef.current);
        mesh.userData.strokePointsRef = stroke.points;
      }

      mesh.visible = isVisible;
    });
  }, [currentProject.strokes, currentProject.groups, timelapseVisibleCount, environment, isSceneReady]);

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none ${isDarkMode ? 'dark bg-[#18191c]' : 'bg-[#f4f4f6]'}`}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={canvasContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* Palm Rejection Feedback */}
      {palmRejectionEnabled && palmRejectionFeedback && Date.now() - palmRejectionFeedback.timestamp < 1200 && (
        <div
          style={{
            left: `${palmRejectionFeedback.x}px`,
            top: `${palmRejectionFeedback.y}px`,
            width: `${palmRejectionRadius * 2}px`,
            height: `${palmRejectionRadius * 2}px`,
          }}
          className="fixed pointer-events-none -translate-x-1/2 -translate-y-1/2 z-40 rounded-full border border-blue-500/30 bg-blue-500/5 animate-ping flex items-center justify-center"
        >
          <span className="text-[10px] font-mono font-bold tracking-wider text-blue-400 bg-zinc-950/80 px-2 py-0.5 rounded-full border border-blue-500/30 shadow-lg">
            Palm Touch Discarded
          </span>
        </div>
      )}

      {/* FOV Badge */}
      {fovBadge.visible && (
        <div className="fixed top-20 right-6 z-50 pointer-events-none flex items-center gap-2 px-3.5 py-1.5 rounded-full feather-panel shadow-2xl border border-blue-500/40 text-xs font-mono font-bold text-blue-500 dark:text-blue-400 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-90 duration-150">
          <span>Lens: {fovBadge.mm}mm ({fovBadge.fov.toFixed(1)} deg)</span>
        </div>
      )}

      {/* Screen Center Crosshair Anchor */}
      {!hideUI && activeJoystickType === '2d' && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <div className="relative flex items-center justify-center">
            <div 
              className={`w-12 h-12 rounded-full border transition-all duration-200 ${
                isTransformActive 
                  ? 'scale-125 border-blue-400 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                  : 'scale-100 border-white/25 dark:border-white/20 bg-white/5'
              }`} 
            />
            <div className="absolute w-4 h-4 rounded-full border border-blue-400/60" />
            <div className={`absolute w-1.5 h-1.5 rounded-full ${isTransformActive ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]' : 'bg-white/60'}`} />
            <div className="absolute w-20 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <div className="absolute h-20 w-px bg-gradient-to-b from-transparent via-blue-400/50 to-transparent" />
          </div>
          <span className="mt-2 text-[8px] font-mono font-bold tracking-wider text-blue-400/90 bg-black/60 px-2 py-0.5 rounded-full border border-blue-500/30 backdrop-blur-md">
            Screen Pivot (0,0)
          </span>
        </div>
      )}

      {/* Persistent Hide UI Restore Button */}
      {hideUI && (
        <button
          onClick={() => setHideUI(false)}
          title="Restore User Interface"
          className="absolute bottom-6 left-6 z-50 p-3 rounded-2xl feather-panel shadow-2xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:scale-110 active:scale-95 feather-btn border border-zinc-200 dark:border-zinc-700"
        >
          Show UI
        </button>
      )}

      {/* Main HUD Overlays */}
      {!hideUI && (
        <>
          {/* Top Left System Menu */}
          <TopLeftSystemMenu
            projectTitle={currentProject.title}
            isAutosaved={isAutosaved}
            onOpenHome={() => setIsHomeGalleryOpen(true)}
            onOpenModelLibrary={() => setIsModelLibraryOpen(true)}
            onCaptureThumbnail={handleCaptureThumbnail}
            onToggleHideUI={() => setHideUI(true)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            isFingerPenMode={isFingerPenMode}
            onToggleFingerPen={() => {
              setIsFingerPenMode(!isFingerPenMode);
              showToast(!isFingerPenMode ? 'Finger-Pen Draw Active (Orbit Locked)' : 'Turntable 3D Orbit Active');
            }}
            palmRejectionEnabled={palmRejectionEnabled}
            onTogglePalmRejection={() => {
              setPalmRejectionEnabled(!palmRejectionEnabled);
              showToast(!palmRejectionEnabled ? 'Palm Rejection Active' : 'Palm Rejection Off');
            }}
            palmRejectionRadius={palmRejectionRadius}
            onChangePalmRejectionRadius={setPalmRejectionRadius}
            onOpenSequence={() => setIsSequenceOpen(true)}
            onOpenExport={() => setIsExportOpen(true)}
            environment={environment}
            onUpdateEnvironment={(env) => setEnvironment((prev) => ({ ...prev, ...env }))}
          />

          {/* Top Right Tool Matrix */}
          <TopRightToolMenu
            toolMode={toolMode}
            onSetToolMode={setToolMode}
            isStagePanelOpen={isStagePanelOpen}
            onToggleStagePanel={() => setIsStagePanelOpen(!isStagePanelOpen)}
            isClipboardOpen={isClipboardOpen}
            onToggleClipboard={() => setIsClipboardOpen(!isClipboardOpen)}
            isDualNavOpen={isDualNavOpen}
            onToggleDualNav={() => setIsDualNavOpen(!isDualNavOpen)}
            activeMirrorAxis={activeMirrorAxis}
            onToggleMirrorAxis={(axis) =>
              setActiveMirrorAxis((prev) => ({ ...prev, [axis]: !prev[axis] }))
            }
            radialSymmetry={radialSymmetry}
            onChangeRadialSymmetry={setRadialSymmetry}
          />

          {/* Mobile Bottom Bar */}
          <MobileBottomBar
            toolMode={toolMode}
            onSetToolMode={setToolMode}
            brushType={brushType}
            onSetBrushType={setBrushType}
            color={color}
            onChangeColor={setColor}
            brushSize={brushSize}
            onChangeBrushSize={setBrushSize}
            opacity={opacity}
            onChangeOpacity={setOpacity}
            jitter={jitter}
            onChangeJitter={setJitter}
            pressureSensitive={pressureSensitive}
            onTogglePressure={() => {
              setPressureSensitive(!pressureSensitive);
              showToast(!pressureSensitive ? 'Stylus Pressure Enabled' : 'Fixed Pressure');
            }}
            palmRejectionEnabled={palmRejectionEnabled}
            onTogglePalmRejection={() => {
              setPalmRejectionEnabled(!palmRejectionEnabled);
              showToast(!palmRejectionEnabled ? 'Palm Rejection Active' : 'Palm Rejection Off');
            }}
            palmRejectionRadius={palmRejectionRadius}
            onChangePalmRejectionRadius={setPalmRejectionRadius}
            material={material}
            onChangeMaterial={setMaterial}
            pattern={pattern}
            onChangePattern={setPattern}
            patternScale={patternScale}
            onChangePatternScale={setPatternScale}
            patternAngle={patternAngle}
            onChangePatternAngle={setPatternAngle}
            patternContrast={patternContrast}
            onChangePatternContrast={setPatternContrast}
            isFingerPenMode={isFingerPenMode}
            onToggleFingerPen={() => {
              setIsFingerPenMode(!isFingerPenMode);
              showToast(!isFingerPenMode ? 'Finger-Pen Draw Active' : 'Turntable Orbit Active');
            }}
            isDualNavOpen={isDualNavOpen}
            onToggleDualNav={() => setIsDualNavOpen(!isDualNavOpen)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onToggleStagePanel={() => setIsStagePanelOpen(!isStagePanelOpen)}
            isStagePanelOpen={isStagePanelOpen}
            onToggleHideUI={() => setHideUI(!hideUI)}
            presets={presets}
            onSavePreset={() => {
              const newPreset: BrushPreset = {
                id: 'preset-' + Date.now(),
                name: `Preset ${presets.length + 1}`,
                brushType,
                color,
                size: brushSize,
                opacity,
                jitter,
                material,
                pattern,
                pressureSensitive,
              };
              setPresets((prev) => [...prev, newPreset]);
              showToast('Preset Saved');
            }}
            onLoadPreset={(p) => {
              setBrushType(p.brushType);
              setColor(p.color);
              setBrushSize(p.size);
              setOpacity(p.opacity);
              if (p.jitter !== undefined) {
                setJitter(p.jitter);
              }
              setMaterial(p.material);
              setPattern(p.pattern);
              setPressureSensitive(p.pressureSensitive);
              showToast(`Loaded Preset: ${p.name}`);
            }}
            onDeletePreset={(id) => setPresets((prev) => prev.filter((p) => p.id !== id))}
          />

          {/* Desktop Mode Indicators */}
          <div className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto items-center gap-2">
            <button
              onClick={() => setIsModelLibraryOpen(true)}
              title="Open 3D Model Library"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full feather-panel text-xs font-bold shadow-md border border-purple-500/40 text-purple-600 dark:text-purple-400 active:scale-95 feather-btn"
            >
              <span>3D Model: {hasActiveModel ? activeModelName : 'None'}</span>
            </button>

            <button
              onClick={() => {
                setIsFingerPenMode(!isFingerPenMode);
                showToast(!isFingerPenMode ? 'Finger-Pen Drawing Active' : 'Touch Orbit Active');
              }}
              title="Toggle Finger-Pen Mode"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full feather-panel text-xs font-bold shadow-md border border-zinc-200/80 dark:border-zinc-700/80 active:scale-95 feather-btn"
            >
              <span className="text-zinc-800 dark:text-zinc-200">
                {isFingerPenMode ? 'Finger-Pen: ON' : 'Touch Orbit: ON'}
              </span>
            </button>

            <button
              onClick={toggleProjectionMode}
              title="Toggle Projection"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold feather-btn shadow-md ${
                isOrthographicMode ? 'bg-indigo-600 text-white' : 'feather-panel text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span>{isOrthographicMode ? 'Isometric (Ortho)' : 'Perspective'}</span>
            </button>
          </div>

          {/* Transient Toast Message */}
          {toastMessage && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-zinc-900/90 text-white dark:bg-white/95 dark:text-zinc-900 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 border border-white/20 dark:border-black/20 pointer-events-none">
              {toastMessage}
            </div>
          )}

          {/* Left Sidebar Brush Panel */}
          <LeftSidebarBrushPanel
            brushType={brushType}
            onSetBrushType={setBrushType}
            strokeProfile={strokeProfile}
            onSetStrokeProfile={setStrokeProfile}
            smoothingAlgorithm={smoothingAlgorithm}
            onChangeSmoothingAlgorithm={setSmoothingAlgorithm}
            smoothingStrength={smoothingStrength}
            onChangeSmoothingStrength={setSmoothingStrength}
            domeFactor={domeFactor}
            onChangeDomeFactor={setDomeFactor}
            silhouetteClamping={silhouetteClamping}
            onToggleSilhouetteClamping={() => setSilhouetteClamping(!silhouetteClamping)}
            color={color}
            onChangeColor={setColor}
            brushSize={brushSize}
            onChangeBrushSize={setBrushSize}
            opacity={opacity}
            onChangeOpacity={setOpacity}
            jitter={jitter}
            onChangeJitter={setJitter}
            pressureSensitive={pressureSensitive}
            onTogglePressure={() => setPressureSensitive(!pressureSensitive)}
            palmRejectionEnabled={palmRejectionEnabled}
            onTogglePalmRejection={() => {
              setPalmRejectionEnabled(!palmRejectionEnabled);
              showToast(!palmRejectionEnabled ? 'Palm Rejection Active' : 'Palm Rejection Off');
            }}
            palmRejectionRadius={palmRejectionRadius}
            material={material}
            onChangeMaterial={setMaterial}
            pattern={pattern}
            onChangePattern={setPattern}
            patternScale={patternScale}
            onChangePatternScale={setPatternScale}
            patternAngle={patternAngle}
            onChangePatternAngle={setPatternAngle}
            patternContrast={patternContrast}
            onChangePatternContrast={setPatternContrast}
            isInjectorActive={isInjectorActive}
            onToggleInjector={() => setIsInjectorActive(!isInjectorActive)}
            isEyedropperActive={isEyedropperActive}
            onToggleEyedropper={() => setIsEyedropperActive(!isEyedropperActive)}
            presets={presets}
            onSavePreset={() => {
              const newPreset: BrushPreset = {
                id: 'preset-' + Date.now(),
                name: `Preset ${presets.length + 1}`,
                brushType,
                color,
                size: brushSize,
                opacity,
                jitter,
                material,
                pattern,
                pressureSensitive,
              };
              setPresets((prev) => [...prev, newPreset]);
              showToast('Preset Saved');
            }}
            onLoadPreset={(p) => {
              setBrushType(p.brushType);
              setColor(p.color);
              setBrushSize(p.size);
              setOpacity(p.opacity);
              if (p.jitter !== undefined) {
                setJitter(p.jitter);
              }
              setMaterial(p.material);
              setPattern(p.pattern);
              setPressureSensitive(p.pressureSensitive);
              showToast(`Loaded Preset: ${p.name}`);
            }}
            onDeletePreset={(id) => setPresets((prev) => prev.filter((p) => p.id !== id))}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />

          {/* Bottom Context Ribbon */}
          <BottomContextRibbon
            toolMode={toolMode}
            onSetToolMode={setToolMode}
            activeGuide={activeGuide}
            onCloseGuide={() => setActiveGuide(null)}
            onSaveGuideToResources={() => {
              if (activeGuide) {
                const newRes: ImportedResource = {
                  id: 'res-' + Date.now(),
                  name: activeGuide.name,
                  type: 'surface',
                  url: '',
                  state: 'active',
                  position: [activeGuide.originPoint?.x ?? 0, activeGuide.originPoint?.y ?? 0, activeGuide.originPoint?.z ?? 0],
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1],
                  opacity: activeGuide.opacity,
                  guideData: activeGuide,
                };
                setProjects((prev) => {
                  const next = [...prev];
                  next[activeProjectIdx].resources.push(newRes);
                  return next;
                });
                setActiveGuide(null);
              }
            }}
            onChangeGuideOpacity={(op) => {
              if (activeGuide) setActiveGuide({ ...activeGuide, opacity: op });
            }}
            onSpawnGuide={(type, segments) => {
              const orbitTarget = environment.orbitPoint;
              const newGuide: Guide3D = {
                id: 'guide-' + Math.random().toString(36).substring(2, 7),
                name: `${type.toUpperCase()} Guide`,
                type,
                originPoint: { x: orbitTarget[0], y: orbitTarget[1], z: orbitTarget[2], pressure: 1 },
                normal: { x: 0, y: 0, z: 1 },
                width: 2.2,
                height: 2.2,
                depth: 2.2,
                segments: segments || 16,
                tension: 0.5,
                opacity: 0.85,
                active: true,
              };
              setActiveGuide(newGuide);
            }}
            onStartBendGuide={() => setIsBendingGuide(true)}
            isBendingGuide={isBendingGuide}
            onStartLoft={() => {
              const selectedStrokes = currentProject.strokes.filter((s) => selectedStrokeIds.has(s.id));
              if (selectedStrokes.length >= 2) {
                const geo = GeometryEngine.createLoftGeometry(selectedStrokes, loftTension);
                const mat = RenderEngine.createMaterial('shaded', color, opacity, pattern, 1, 0, 1, environment);
                const loftMesh = new THREE.Mesh(geo, mat);
                sceneRef.current?.add(loftMesh);
                showToast('Loft NURBS Surface Generated');
              }
            }}
            loftTension={loftTension}
            onChangeLoftTension={setLoftTension}
            stableStrokeAmount={stableStrokeAmount}
            onChangeStableStroke={setStableStrokeAmount}
            hasSelection={selectedStrokeIds.size > 0}
            onDuplicateSelection={() => {
              const duplicated = currentProject.strokes
                .filter((s) => selectedStrokeIds.has(s.id))
                .map((s) => ({
                  ...s,
                  id: 'stroke-' + Math.random().toString(36).substring(2, 9),
                  points: (s.points || []).map((p) => ({ ...p, x: (p?.x ?? 0) + 0.1, y: (p?.y ?? 0) + 0.1 })),
                  createdAt: Date.now(),
                }));
              pushHistory([...currentProject.strokes, ...duplicated]);
            }}
            onDuplicateSymmetricallyByView={() => {
              const duplicated = currentProject.strokes
                .filter((s) => selectedStrokeIds.has(s.id))
                .map((s) => ({
                  ...s,
                  id: 'stroke-' + Math.random().toString(36).substring(2, 9),
                  points: (s.points || []).map((p) => ({ ...p, x: -(p?.x ?? 0) })),
                  createdAt: Date.now(),
                }));
              pushHistory([...currentProject.strokes, ...duplicated]);
            }}
            onDuplicateSymmetricallyByMirror={() => {
              let nextStrokes = [...currentProject.strokes];
              currentProject.strokes
                .filter((s) => selectedStrokeIds.has(s.id))
                .forEach((s) => {
                  if (activeMirrorAxis?.x) nextStrokes.push(GeometryEngine.mirrorStroke(s, 'x'));
                  if (activeMirrorAxis?.y) nextStrokes.push(GeometryEngine.mirrorStroke(s, 'y'));
                  if (activeMirrorAxis?.z) nextStrokes.push(GeometryEngine.mirrorStroke(s, 'z'));
                });
              pushHistory(nextStrokes);
            }}
            onDeleteSelection={() => {
              const remaining = currentProject.strokes.filter((s) => !selectedStrokeIds.has(s.id));
              setSelectedStrokeIds(new Set());
              pushHistory(remaining);
            }}
            onSmoothSelection={handleSmoothSelection}
            onDecimateSelection={handleDecimateSelection}
            activeJoystickType={activeJoystickType}
            onToggleJoystickType={() =>
              setActiveJoystickType((prev) => (prev === '2d' ? '3d' : '2d'))
            }
            liquifyMode={liquifyMode}
            onSetLiquifyMode={setLiquifyMode}
            liquifySize={liquifySize}
            onChangeLiquifySize={setLiquifySize}
            liquifyStrength={liquifyStrength}
            onChangeLiquifyStrength={setLiquifyStrength}
            onApplyLiquify={() => setToolMode('select')}
            onCancelLiquify={() => setToolMode('select')}
          />

          {/* Transform 2D / 3D Joystick Widget */}
          <TransformJoystick
            type={activeJoystickType}
            onToggleType={setActiveJoystickType}
            onTranslateScreen={(delta) => {
              handleTransformScreenSpace(delta, 0, { x: 1, y: 1, z: 1 });
            }}
            onRotateScreen={(angleRad) => {
              handleTransformScreenSpace({ x: 0, y: 0 }, angleRad, { x: 1, y: 1, z: 1 });
            }}
            onScaleScreen={(scale) => {
              handleTransformScreenSpace({ x: 0, y: 0 }, 0, scale);
            }}
            onTranslateSpatial={(delta) => {
              handleTransformSpatial(delta, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
            }}
            onRotateSpatial={(axisRot) => {
              handleTransformSpatial({ x: 0, y: 0, z: 0 }, axisRot, { x: 1, y: 1, z: 1 });
            }}
            onScaleSpatial={(scale) => {
              handleTransformSpatial({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, scale);
            }}
            isOrthoView={isOrthographicMode}
            orthoDepthAxis={orthoDepthAxis}
            selectionCount={selectedStrokeIds.size}
            activeGroupName={currentProject.groups.find((g) => g.id === activeGroupId)?.name || 'Main Curves'}
            onSelectAllInGroup={() => {
              const groupStrokes = currentProject.strokes.filter((s) => s.groupId === activeGroupId);
              setSelectedStrokeIds(new Set(groupStrokes.map((s) => s.id)));
              showToast(`Selected ${groupStrokes.length} curves in group`);
            }}
            onActiveStateChange={setIsTransformActive}
            onResetTransform={() => {
              const targetStrokes = currentProject.strokes.filter(
                (s) => selectedStrokeIds.has(s.id) || (selectedStrokeIds.size === 0 && s.groupId === activeGroupId)
              );
              if (targetStrokes.length > 0) {
                const bbox = GeometryEngine.computeStrokesBoundingBox(targetStrokes);
                if (bbox) {
                  const delta = { x: -bbox.center.x, y: -bbox.center.y, z: -bbox.center.z };
                  handleTransformSpatial(delta, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
                  showToast('Centered Curves to Origin (0,0,0)');
                }
              }
            }}
          />

          {/* 3D Model Library Modal */}
          <ModelLibraryModal
            isOpen={isModelLibraryOpen}
            onClose={() => setIsModelLibraryOpen(false)}
            activeModelName={activeModelName}
            onSelectPreset={loadPresetModel}
            onImportCustomModel={handleImportCustomModel}
            onClearModel={clearModel}
            hasActiveModel={hasActiveModel}
          />

          {/* Stage Panel */}
          <StagePanel
            isOpen={isStagePanelOpen}
            onClose={() => setIsStagePanelOpen(false)}
            groups={currentProject.groups}
            activeGroupId={activeGroupId}
            onSelectGroup={setActiveGroupId}
            onAddGroup={() => {
              const newGroup: SpatialGroup = {
                id: 'g-' + Date.now(),
                name: `Group ${currentProject.groups.length + 1}`,
                visible: true,
                isolated: false,
                locked: false,
                colorTag: ['#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de'][currentProject.groups.length % 5],
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups.push(newGroup);
                return next;
              });
              setActiveGroupId(newGroup.id);
            }}
            onToggleGroupVisibility={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups = next[activeProjectIdx].groups.map((g) =>
                  g.id === id ? { ...g, visible: !g.visible } : g
                );
                return next;
              });
            }}
            onIsolateGroup={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups = next[activeProjectIdx].groups.map((g) => ({
                  ...g,
                  visible: g.id === id,
                }));
                return next;
              });
            }}
            onRenameGroup={(id, newName) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups = next[activeProjectIdx].groups.map((g) =>
                  g.id === id ? { ...g, name: newName } : g
                );
                return next;
              });
            }}
            onDuplicateGroup={(id) => {
              const target = currentProject.groups.find((g) => g.id === id);
              if (target) {
                const cloned: SpatialGroup = {
                  ...target,
                  id: 'g-' + Date.now(),
                  name: `${target.name} Copy`,
                };
                setProjects((prev) => {
                  const next = [...prev];
                  next[activeProjectIdx].groups.push(cloned);
                  return next;
                });
              }
            }}
            onMergeGroups={() => {
              const mergedGroup: SpatialGroup = {
                id: 'g-merged-' + Date.now(),
                name: 'Merged Group',
                visible: true,
                isolated: false,
                locked: false,
                colorTag: '#00e676',
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups = [mergedGroup];
                next[activeProjectIdx].strokes = next[activeProjectIdx].strokes.map((s) => ({
                  ...s,
                  groupId: mergedGroup.id,
                }));
                return next;
              });
              setActiveGroupId(mergedGroup.id);
            }}
            onDeleteGroup={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups = next[activeProjectIdx].groups.filter((g) => g.id !== id);
                next[activeProjectIdx].strokes = next[activeProjectIdx].strokes.filter((s) => s.groupId !== id);
                return next;
              });
            }}
            onImportCurvesToGroup={(targetId) => {
              const updated = currentProject.strokes.map((s) =>
                selectedStrokeIds.has(s.id) ? { ...s, groupId: targetId } : s
              );
              pushHistory(updated);
            }}
            resources={currentProject.resources}
            onImportImage={(file) => {
              const url = URL.createObjectURL(file);
              const newRes: ImportedResource = {
                id: 'res-img-' + Date.now(),
                name: file.name,
                type: 'image',
                url,
                state: 'active',
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [2, 2, 1],
                opacity: 1.0,
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].resources.push(newRes);
                return next;
              });
            }}
            onImportOBJ={(file) => {
              const newRes: ImportedResource = {
                id: 'res-obj-' + Date.now(),
                name: file.name,
                type: 'obj',
                url: URL.createObjectURL(file),
                state: 'active',
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
                opacity: 1.0,
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].resources.push(newRes);
                return next;
              });
            }}
            onToggleResourceState={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].resources = next[activeProjectIdx].resources.map((r) => {
                  if (r.id === id) {
                    const nextState = r.state === 'active' ? 'passive' : r.state === 'passive' ? 'hidden' : 'active';
                    return { ...r, state: nextState };
                  }
                  return r;
                });
                return next;
              });
            }}
            onDeleteResource={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].resources = next[activeProjectIdx].resources.filter((r) => r.id !== id);
                return next;
              });
            }}
            environment={environment}
            onUpdateEnvironment={(env) => setEnvironment((prev) => ({ ...prev, ...env }))}
            onSyncLightToCamera={() => {
              const thetaDeg = (cameraSphericalRef.current.theta * 180) / Math.PI;
              const phiDeg = (cameraSphericalRef.current.phi * 180) / Math.PI;
              setEnvironment((prev) => ({
                ...prev,
                lightAltitude: Math.round(90 - phiDeg),
                lightAzimuth: Math.round(thetaDeg),
              }));
            }}
          />

          {/* Floating Reference Clipboard Overlay */}
          <ClipboardOverlay
            isOpen={isClipboardOpen}
            onClose={() => setIsClipboardOpen(false)}
            onSampleColor={setColor}
            onImportToStage={(imgSrc) => {
              const newRes: ImportedResource = {
                id: 'res-clip-' + Date.now(),
                name: 'Clipboard Image',
                type: 'image',
                url: imgSrc,
                state: 'active',
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [2, 2, 1],
                opacity: 1.0,
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].resources.push(newRes);
                return next;
              });
              setIsClipboardOpen(false);
              showToast('Imported Reference to Stage');
            }}
          />

          {/* Single Hand Dual Navigation Widget */}
          <SingleHandDualNav
            isOpen={isDualNavOpen}
            onClose={() => setIsDualNavOpen(false)}
            cameraSpherical={cameraSphericalState}
            onOrbitCamera={(deltaTheta, deltaPhi) => {
              cameraSphericalRef.current.theta += deltaTheta;
              cameraSphericalRef.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cameraSphericalRef.current.phi + deltaPhi));
              updateCameraPosition();
            }}
            onSetCameraView={(newTheta, newPhi) => {
              cameraSphericalRef.current.theta = newTheta;
              cameraSphericalRef.current.phi = Math.max(0.05, Math.min(Math.PI - 0.05, newPhi));
              updateCameraPosition();
              showToast('Orthogonal View Snapped');
            }}
            onZoomCamera={(deltaRadius) => {
              cameraSphericalRef.current.radius = Math.max(0.5, Math.min(25, cameraSphericalRef.current.radius + deltaRadius));
              updateCameraPosition();
            }}
            activeGuide={activeGuide}
            onUpdateGuide={(g) => setActiveGuide(g)}
            onSpawnDefaultSurface={() => {
              const orbitTarget = environment.orbitPoint;
              const newGuide: Guide3D = {
                id: 'guide-' + Math.random().toString(36).substring(2, 7),
                name: 'Drawing Surface',
                type: 'plane',
                originPoint: { x: orbitTarget[0], y: orbitTarget[1], z: orbitTarget[2], pressure: 1 },
                normal: { x: 0, y: 0, z: 1 },
                rotation: { x: 0, y: 0, z: 0 },
                width: 2.5,
                height: 2.5,
                depth: 2.5,
                segments: 16,
                tension: 0.5,
                opacity: 0.85,
                active: true,
              };
              setActiveGuide(newGuide);
              showToast('3D Drawing Surface Activated');
            }}
            onResetSurface={() => {
              if (activeGuide) {
                setActiveGuide({
                  ...activeGuide,
                  rotation: { x: 0, y: 0, z: 0 },
                  originPoint: {
                    x: environment.orbitPoint[0],
                    y: environment.orbitPoint[1],
                    z: environment.orbitPoint[2],
                    pressure: 1,
                  },
                  opacity: 0.85,
                });
                showToast('Surface Reset');
              }
            }}
          />

          {/* Radial Squeeze Menu */}
          <RadialSqueezeMenu
            isOpen={radialMenu.isOpen}
            position={{ x: radialMenu?.x ?? 0, y: radialMenu?.y ?? 0 }}
            onClose={() => setRadialMenu((prev) => ({ ...prev, isOpen: false }))}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onAddNewGroup={() => {
              const newG: SpatialGroup = {
                id: 'g-' + Date.now(),
                name: `Group ${currentProject.groups.length + 1}`,
                visible: true,
                isolated: false,
                locked: false,
                colorTag: '#00e676',
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].groups.push(newG);
                return next;
              });
              setActiveGroupId(newG.id);
              showToast(`Created "${newG.name}"`);
            }}
            onFindGroup={() => {
              showToast(`Active Group: "${currentProject.groups.find((g) => g.id === activeGroupId)?.name}"`);
            }}
            onStampDuplicate={() => {
              const selected = currentProject.strokes.filter((s) => selectedStrokeIds.has(s.id));
              if (selected.length > 0) {
                const twist = radialMenu.twistAngle || 0;
                const stamped = selected.map((s) => ({
                  ...s,
                  id: 'stroke-' + Math.random().toString(36).substring(2, 9),
                  points: (s.points || []).map((p) => {
                    const angleRad = (twist * Math.PI) / 180;
                    const rx = p.x * Math.cos(angleRad) - p.y * Math.sin(angleRad) + 0.15;
                    const ry = p.x * Math.sin(angleRad) + p.y * Math.cos(angleRad) + 0.15;
                    return { ...p, x: rx, y: ry };
                  }),
                  createdAt: Date.now(),
                }));
                pushHistory([...currentProject.strokes, ...stamped]);
                showToast('Stamped Duplicate Along Gyroscope Axis');
              }
            }}
          />

          {/* Home Gallery Modal */}
          <HomeGalleryModal
            isOpen={isHomeGalleryOpen}
            onClose={() => setIsHomeGalleryOpen(false)}
            projects={projects}
            activeProjectId={currentProject.id}
            onSelectProject={(id) => {
              const idx = projects.findIndex((p) => p.id === id);
              if (idx !== -1) {
                setActiveProjectIdx(idx);
                setHistory([projects[idx].strokes]);
                setHistoryIndex(0);
                setEnvironment(projects[idx].environment);
                setActiveGroupId(projects[idx].groups[0]?.id || 'g-1');
              }
            }}
            onCreateNewProject={() => {
              const newNote: NoteProject = {
                id: 'note-' + Date.now(),
                title: `New 3D Sketch ${projects.length + 1}`,
                updatedAt: Date.now(),
                thumbnail: '',
                groups: [{ id: 'g-main', name: 'Main Curves', visible: true, isolated: false, locked: false, colorTag: '#00e676' }],
                strokes: [],
                guides: [],
                resources: [],
                environment: { ...environment },
                sequence: [],
              };
              setProjects((prev) => [...prev, newNote]);
              setActiveProjectIdx(projects.length);
              setHistory([[]]);
              setHistoryIndex(0);
              setActiveGroupId('g-main');
              setIsHomeGalleryOpen(false);
            }}
            onDuplicateProject={(id) => {
              const target = projects.find((p) => p.id === id);
              if (target) {
                const clone: NoteProject = {
                  ...target,
                  id: 'note-' + Date.now(),
                  title: `${target.title} Copy`,
                  updatedAt: Date.now(),
                };
                setProjects((prev) => [...prev, clone]);
              }
            }}
            onDeleteProject={(id) => {
              if (projects.length > 1) {
                setProjects((prev) => prev.filter((p) => p.id !== id));
                setActiveProjectIdx(0);
              }
            }}
            onLightenProject={(id) => {
              setProjects((prev) => {
                return prev.map((proj) => {
                  if (proj.id === id) {
                    const optimized = proj.strokes.map((s) => GeometryEngine.decimateStroke(s, 0.03));
                    return { ...proj, strokes: optimized };
                  }
                  return proj;
                });
              });
              showToast('Lightened Mesh Point Density');
            }}
            onExportProject={(proj) => {
              const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(proj, null, 2));
              const a = document.createElement('a');
              a.href = dataStr;
              a.download = `${proj.title.toLowerCase().replace(/\s+/g, '_')}.feather`;
              a.click();
            }}
            onOpenPublishModal={(proj) => {
              setPublishingProject(proj);
              setIsPublishModalOpen(true);
            }}
          />

          {/* Publish to Gallery Modal */}
          {publishingProject && (
            <PublishToGalleryModal
              isOpen={isPublishModalOpen}
              onClose={() => {
                setIsPublishModalOpen(false);
                setPublishingProject(null);
              }}
              currentProject={publishingProject}
              onSavePublishInfo={(info: GalleryPublishInfo) => {
                setProjects((prev) =>
                  prev.map((p) =>
                    p.id === publishingProject.id ? { ...p, publishInfo: info, updatedAt: Date.now() } : p
                  )
                );
                showToast('Published to Community Gallery');
              }}
              onCaptureFramedThumbnail={() => {
                if (!rendererRef.current) return '';
                return rendererRef.current.domElement.toDataURL('image/jpeg', 0.9);
              }}
            />
          )}

          {/* AR Viewport & Camera Sequence Modal */}
          <ARSequenceModal
            isOpen={isSequenceOpen}
            onClose={() => setIsSequenceOpen(false)}
            shots={currentProject.sequence}
            onAddShot={() => {
              if (!cameraRef.current) return;
              const newShot: SequenceShot = {
                id: 'shot-' + Date.now(),
                name: `Shot ${currentProject.sequence.length + 1}`,
                position: [cameraRef.current.position?.x ?? 0, cameraRef.current.position?.y ?? 0, cameraRef.current.position?.z ?? 0],
                target: [cameraTargetRef.current?.x ?? 0, cameraTargetRef.current?.y ?? 0, cameraTargetRef.current?.z ?? 0],
                fov: cameraRef.current.fov || 40,
                orthographic: false,
                duration: 2.0,
              };
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].sequence.push(newShot);
                return next;
              });
            }}
            onSelectShot={(shot) => {
              if (!cameraRef.current) return;
              cameraRef.current.position.set(...shot.position);
              cameraTargetRef.current.set(...shot.target);
              cameraRef.current.fov = shot.fov;
              cameraRef.current.updateProjectionMatrix();
            }}
            onDeleteShot={(id) => {
              setProjects((prev) => {
                const next = [...prev];
                next[activeProjectIdx].sequence = next[activeProjectIdx].sequence.filter((s) => s.id !== id);
                return next;
              });
            }}
            currentCameraInfo={{
              x: cameraRef.current?.position?.x || 0,
              y: cameraRef.current?.position?.y || 0,
              z: cameraRef.current?.position?.z || 0,
              fov: cameraRef.current?.fov || 40,
            }}
            bookmarks={currentProject.cameraBookmarks || []}
            onAddBookmark={handleAddBookmark}
            onSelectBookmark={handleSelectBookmark}
            onDeleteBookmark={handleDeleteBookmark}
            isRecordingTurntable={isRecordingTurntable}
            onStartTurntable={handleStartTurntableRecording}
            onStartTurntableRecording={handleStartTurntableRecording}
            strokes={currentProject.strokes}
            strokeCount={currentProject.strokes.length}
            timelapseVisibleCount={timelapseVisibleCount}
            isTimelapsePlaying={isTimelapsePlaying}
            onToggleTimelapse={() => setIsTimelapsePlaying((prev) => !prev)}
            onChangeTimelapseCount={setTimelapseVisibleCount}
            onStartTimelapse={handleStartTimelapseRecording}
            onStartTimelapseRecording={handleStartTimelapseRecording}
          />

          {/* Export Modal */}
          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            project={currentProject}
            onExportOBJ={() => {
              const objContent = GeometryEngine.exportToOBJ(currentProject.strokes);
              const blob = new Blob([objContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentProject.title.toLowerCase().replace(/\s+/g, '_')}.obj`;
              a.click();
              showToast('Exported OBJ File');
            }}
            onExportCanvasImage={(transparent) => {
              if (!rendererRef.current) return;
              const dataUrl = rendererRef.current.domElement.toDataURL(transparent ? 'image/png' : 'image/jpeg', 0.95);
              const a = document.createElement('a');
              a.href = dataUrl;
              a.download = `${currentProject.title.toLowerCase().replace(/\s+/g, '_')}.${transparent ? 'png' : 'jpg'}`;
              a.click();
              showToast(`Exported ${transparent ? 'PNG' : 'JPEG'} Image`);
            }}
          />
        </>
      )}
    </div>
  );
}
