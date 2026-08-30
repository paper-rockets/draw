import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrushSettings,
  Layer,
  ModelMetadata,
  SymmetryMode,
  ToolType,
  LightingPreset,
} from '../types';
import { StudioEngine } from '../core/studioEngine';
import { OrientationGizmo } from './OrientationGizmo';
import {
  RotateCw,
  Maximize2,
  Compass,
  Eye,
  ShieldAlert,
  Cpu,
  Hand,
  Paintbrush,
  ZoomIn,
  ZoomOut,
  PenTool,
  Move,
} from 'lucide-react';

interface ViewportProps {
  tool: ToolType;
  brushSettings: BrushSettings;
  activeLayer: Layer;
  layers: Layer[];
  symmetry: SymmetryMode;
  lightingPreset: LightingPreset;
  showWireframe: boolean;
  showGrid: boolean;
  onEngineReady: (engine: StudioEngine) => void;
  onColorPick?: (hex: string) => void;
  cameraInteracting: boolean;
  setCameraInteracting: (val: boolean) => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  tool,
  brushSettings,
  activeLayer,
  layers,
  symmetry,
  lightingPreset,
  showWireframe,
  showGrid,
  onEngineReady,
  onColorPick,
  cameraInteracting,
  setCameraInteracting,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const [engineInstance, setEngineInstance] = useState<StudioEngine | null>(null);

  const [fps, setFps] = useState<number>(60);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [touchDist, setTouchDist] = useState<number | null>(null);
  const [stylusOnlyMode, setStylusOnlyMode] = useState<boolean>(false);
  const [isStylusDetected, setIsStylusDetected] = useState<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDown = useRef<boolean>(false);
  const activePointers = useRef<Map<number, { x: number; y: number; pointerType: string }>>(new Map());
  const strokeStartTime = useRef<number>(0);

  // Initialize Three.js Studio Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new StudioEngine(containerRef.current);
    engineRef.current = engine;
    setEngineInstance(engine);

    engine.onFpsUpdate = (f) => setFps(f);
    engine.onMetadataUpdate = (m) => setMetadata(m);

    onEngineReady(engine);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update lighting preset
  useEffect(() => {
    engineRef.current?.setLightingPreset(lightingPreset);
  }, [lightingPreset]);

  // Update wireframe
  useEffect(() => {
    engineRef.current?.toggleWireframe(showWireframe);
  }, [showWireframe]);

  // Update grid
  useEffect(() => {
    engineRef.current?.toggleGrid(showGrid);
  }, [showGrid]);

  // Sync layer properties
  useEffect(() => {
    engineRef.current?.syncLayers(layers);
  }, [layers]);

  // Automatically reset camera orbit/pan mode when switching to drawing tools
  useEffect(() => {
    if (tool === 'brush' || tool === 'uv_brush' || tool === 'eraser') {
      setIsPanMode(false);
      setCameraInteracting(false);
    }
  }, [tool, setCameraInteracting]);

  // Safe Haptic feedback helper
  const triggerHaptic = (ms: number = 10) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (_) {}
  };

  // Convert client pointer coordinate to normalized device coordinates (-1 to 1)
  const getNormalizedCoords = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    if (e.pointerType === 'pen') {
      setIsStylusDetected(true);
    }

    const engine = engineRef.current;
    if (!engine) return;

    // Check if finger touch should orbit in Stylus-Only mode
    const isFingerInStylusMode = stylusOnlyMode && e.pointerType === 'touch';

    // Multi-touch gestures (2+ fingers) always orbit/pan & cancel any pending single-finger stroke
    if (activePointers.current.size >= 2) {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        engine.cancelStroke();
      }
      setIsOrbiting(true);
      return;
    }

    // Check for right-click, middle-click, Alt key, or camera toggle mode active
    const isCameraAction =
      e.button === 2 ||
      e.button === 1 ||
      e.altKey ||
      cameraInteracting ||
      isFingerInStylusMode ||
      isPanMode;

    if (isCameraAction) {
      setIsOrbiting(true);
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Eyedropper tool
    if (tool === 'eyedropper') {
      const coords = getNormalizedCoords(e);
      const hit = engine.raycastModel(coords.x, coords.y);
      if (hit && onColorPick) {
        onColorPick(brushSettings.color);
        triggerHaptic(20);
      }
      return;
    }

    // Painting action
    isPointerDown.current = true;
    strokeStartTime.current = performance.now();
    const coords = getNormalizedCoords(e);
    const pressure = e.pressure > 0 ? e.pressure : 1.0;

    engine.startStroke(coords.x, coords.y, brushSettings, tool, activeLayer, pressure, symmetry);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const engine = engineRef.current;
    if (!engine) return;

    const coords = getNormalizedCoords(e);
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    // Handle 2-finger multi-touch gestures (pinch-zoom, pan, and rotation)
    if (activePointers.current.size >= 2) {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        engine.cancelStroke();
      }

      const pts: { x: number; y: number; pointerType: string }[] = Array.from(
        activePointers.current.values()
      );
      const p1 = pts[0];
      const p2 = pts[1];
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      if (touchDist !== null) {
        const deltaDist = touchDist - dist;
        engine.zoom(deltaDist * 1.8);
      }
      setTouchDist(dist);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      if (lastPointerPos.current) {
        const deltaX = midX - lastPointerPos.current.x;
        const deltaY = midY - lastPointerPos.current.y;
        engine.pan(deltaX * 1.2, deltaY * 1.2);
      }
      lastPointerPos.current = { x: midX, y: midY };
      return;
    }

    // Camera orbit / pan
    if (isOrbiting) {
      const deltaX = e.clientX - lastPointerPos.current.x;
      const deltaY = e.clientY - lastPointerPos.current.y;

      if (e.buttons === 4 || e.shiftKey || isPanMode) {
        engine.pan(deltaX * 1.2, deltaY * 1.2);
      } else {
        engine.orbit(deltaX * 1.2, deltaY * 1.2);
      }

      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Painting stroke
    if (isPointerDown.current) {
      // Process coalesced hardware events for high-rate stylus / high-speed touch sweeps
      const coalescedEvents: Array<{ clientX: number; clientY: number; pressure: number }> = [];
      const native = e.nativeEvent as any;
      if (native && typeof native.getCoalescedEvents === 'function') {
        const cEvents = native.getCoalescedEvents();
        if (cEvents && cEvents.length > 0) {
          for (let i = 0; i < cEvents.length; i++) {
            const ev = cEvents[i];
            coalescedEvents.push({
              clientX: ev.clientX,
              clientY: ev.clientY,
              pressure: ev.pressure > 0 ? ev.pressure : e.pressure > 0 ? e.pressure : 1.0,
            });
          }
        }
      }

      if (coalescedEvents.length > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        for (const ev of coalescedEvents) {
          const cx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          const cy = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
          engine.addStrokePoint(cx, cy, brushSettings, tool, ev.pressure, symmetry);
        }
      } else {
        const pressure = e.pressure > 0 ? e.pressure : 1.0;
        engine.addStrokePoint(coords.x, coords.y, brushSettings, tool, pressure, symmetry);
      }
    } else {
      // Update 3D cursor decal when hovering
      engine.updateCursor(coords.x, coords.y, brushSettings.size);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2) {
      setTouchDist(null);
    }

    if (activePointers.current.size === 0) {
      setIsOrbiting(false);
    }

    const engine = engineRef.current;
    if (!engine) return;

    if (isPointerDown.current) {
      isPointerDown.current = false;
      engine.endStroke(brushSettings, tool, activeLayer.id, symmetry);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    engineRef.current?.zoom(e.deltaY * 0.8);
  };

  const handleZoomIn = () => {
    triggerHaptic(8);
    engineRef.current?.zoom(-120);
  };

  const handleZoomOut = () => {
    triggerHaptic(8);
    engineRef.current?.zoom(120);
  };

  const handleResetView = () => {
    triggerHaptic(15);
    engineRef.current?.resetView();
  };

  return (
    <div
      id="viewport-canvas-container"
      ref={containerRef}
      className="relative w-full h-full bg-[#0c0e14] touch-none cursor-crosshair overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={() => engineRef.current?.hideCursor()}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Left Status Overlay (Responsive: Compact on mobile) */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 flex items-center gap-1.5 sm:gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-neutral-900/85 backdrop-blur-md border border-neutral-800 text-[11px] sm:text-xs text-neutral-300 font-mono shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-neutral-100">{fps} FPS</span>
          <span className="text-neutral-600 hidden xs:inline">|</span>
          <span className="hidden xs:inline truncate max-w-[80px] sm:max-w-none">
            {metadata?.name || 'Model'}
          </span>
          <span className="text-neutral-600">|</span>
          <span>
            {metadata?.triangleCount
              ? `${(metadata.triangleCount / 1000).toFixed(0)}k tris`
              : '0 tris'}
          </span>
        </div>

        {symmetry !== 'none' && (
          <div className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-indigo-950/85 border border-indigo-700/60 text-indigo-300 text-[10px] sm:text-xs font-mono backdrop-blur-md">
            <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="uppercase">{symmetry.replace('_', ' ')}</span>
          </div>
        )}
      </div>

      {/* Top Right 3D Orientation Gizmo */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        <OrientationGizmo engine={engineInstance} />
      </div>

      {/* Floating View & Mobile Camera Controls on Right */}
      <div className="absolute top-28 right-3 sm:top-32 sm:right-4 z-10 flex flex-col gap-1.5">
        {/* Draw Mode Button (Active when not in Pan or Orbit mode) */}
        <button
          id="btn-switch-draw-mode"
          title={
            !cameraInteracting && !isPanMode
              ? 'Draw Mode Active (1-finger / Stylus paints)'
              : 'Switch to Draw Mode (Paint on 3D Model)'
          }
          onClick={() => {
            triggerHaptic(12);
            setCameraInteracting(false);
            setIsPanMode(false);
          }}
          className={`min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center ${
            !cameraInteracting && !isPanMode
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-600/30'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Paintbrush className="w-4 h-4" />
        </button>

        {/* Orbit Camera Mode Toggle */}
        <button
          id="btn-toggle-camera-mode"
          title={cameraInteracting ? 'Orbit Camera Mode Active' : 'Orbit 3D Camera Mode'}
          onClick={() => {
            triggerHaptic(12);
            setCameraInteracting(!cameraInteracting);
            setIsPanMode(false);
          }}
          className={`min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center ${
            cameraInteracting
              ? 'bg-blue-600 border-blue-400 text-white shadow-blue-600/30 ring-2 ring-blue-400/50'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-neutral-100'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Camera Pan Mode Toggle */}
        <button
          id="btn-toggle-pan-mode"
          title={isPanMode ? 'Pan Camera Mode Active' : 'Pan Camera Mode'}
          onClick={() => {
            triggerHaptic(12);
            setIsPanMode(!isPanMode);
            setCameraInteracting(false);
          }}
          className={`min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center ${
            isPanMode
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/50'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-neutral-100'
          }`}
        >
          <Move className="w-4 h-4" />
        </button>

        {/* Reset Camera View */}
        <button
          id="btn-reset-view"
          title="Reset Camera View"
          onClick={handleResetView}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-neutral-100 backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Mobile Quick Zoom Buttons */}
        <button
          id="btn-quick-zoom-in"
          title="Zoom In"
          onClick={handleZoomIn}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-neutral-100 backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          id="btn-quick-zoom-out"
          title="Zoom Out"
          onClick={handleZoomOut}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-neutral-100 backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Stylus Palm-Rejection / Pen-Only Mode Toggle */}
        <button
          id="btn-toggle-stylus-mode"
          title={
            stylusOnlyMode
              ? 'Stylus Only Mode (Finger: Orbit, Pen: Draw)'
              : 'Touch Draw Mode (Finger & Pen draw)'
          }
          onClick={() => {
            triggerHaptic(12);
            setStylusOnlyMode(!stylusOnlyMode);
          }}
          className={`min-w-[44px] min-h-[44px] p-2.5 rounded-2xl border backdrop-blur-md transition-all active:scale-95 shadow-lg flex items-center justify-center ${
            stylusOnlyMode
              ? 'bg-amber-600 border-amber-400 text-white shadow-amber-600/30'
              : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <PenTool className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Status Notification Pill if Camera Orbit or Pan Mode is Active */}
      {(cameraInteracting || isPanMode) && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => {
              triggerHaptic(12);
              setCameraInteracting(false);
              setIsPanMode(false);
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/95 border border-indigo-500/80 text-white text-xs shadow-2xl backdrop-blur-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-medium text-neutral-200">
              {isPanMode ? 'Pan Mode Active' : 'Orbit Mode Active'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white">
              Tap to Paint
            </span>
          </button>
        </div>
      )}

      {/* Touch / Stylus Mode Indicator Pill */}
      <div className="absolute bottom-24 sm:bottom-4 left-3 sm:left-4 z-10 pointer-events-none hidden md:block">
        <div className="px-3 py-1 rounded-xl bg-neutral-950/70 backdrop-blur-md border border-neutral-800/80 text-[11px] text-neutral-400 font-mono shadow-md">
          {stylusOnlyMode ? (
            <span className="text-amber-400">
              Stylus Mode Active: Use Pen to Paint • Finger to Orbit
            </span>
          ) : (
            <span>Tip: 2-finger drag to Orbit/Pan • Pinch to Zoom • Draw with 1 finger</span>
          )}
        </div>
      </div>
    </div>
  );
};

