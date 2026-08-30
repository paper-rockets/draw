import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ToolType,
  BrushSettings,
  SymmetryMode,
  Layer,
  LightingPreset,
  PostProcessSettings,
} from './types';
import { StudioEngine } from './core/studioEngine';
import { Viewport } from './components/Viewport';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { BrushSettingsPanel } from './components/BrushSettingsPanel';
import { RenderSettingsPanel } from './components/RenderSettingsPanel';
import { ModelLibraryModal } from './components/ModelLibraryModal';
import { ExportModal } from './components/ExportModal';
import { HeaderBar } from './components/HeaderBar';
import { TransformJoystick } from './components/TransformJoystick';
import { ScreenCenterCrosshair } from './components/ScreenCenterCrosshair';
import { PerfectViewInfo } from './types';

const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 0.035,
  opacity: 1.0,
  color: '#38bdf8',
  roughness: 0.35,
  metalness: 0.15,
  emissiveIntensity: 0.0,
  pressureSensitivity: true,
  archSegments: 5,
  domeFactor: 0.22,
  surfaceOffset: 0.0025,
  taperLength: 0.05,
  silhouetteClamping: true,
  stencilMasking: true,
  autoRecalculateNormals: true,
  smoothingAlgorithm: 'one_euro',
  smoothingStrength: 0.55,
  predictiveTracking: true,
  predictionFactor: 0.4,
  materialType: 'shaded',
  profile: 'conformal',
  patternType: 'none',
  patternScale: 4.0,
  patternIntensity: 0.8,
  patternAngle: 45,
  patternContrast: 1.0,
  chiselAngle: 45,
  aspectRatio: 3.5,
};

const DEFAULT_POST_SETTINGS: PostProcessSettings = {
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

const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'layer_base_1',
    name: 'Layer 1',
    visible: true,
    locked: false,
    opacity: 1.0,
    strokeIds: [],
  },
];

export default function App() {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [tool, setTool] = useState<ToolType>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH_SETTINGS);
  const [postSettings, setPostSettings] = useState<PostProcessSettings>(DEFAULT_POST_SETTINGS);
  const [symmetry, setSymmetry] = useState<SymmetryMode>('none');
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYERS[0].id);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [cameraInteracting, setCameraInteracting] = useState<boolean>(false);
  const [perfectView, setPerfectView] = useState<PerfectViewInfo>({
    isPerfect: false,
    view: null,
    depthAxis: null,
  });
  const [crosshairState, setCrosshairState] = useState<{
    active: boolean;
    mode: '2d' | '3d';
    actionLabel?: string;
    valueLabel?: string;
  }>({
    active: false,
    mode: '2d',
  });

  // Modals & Panels
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRenderSettingsOpen, setIsRenderSettingsOpen] = useState<boolean>(false);
  const [isModelsOpen, setIsModelsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const handleEngineReady = useCallback((inst: StudioEngine) => {
    setEngine(inst);
    inst.setPostProcessSettings(DEFAULT_POST_SETTINGS);
    inst.onHistoryChange = (u, r) => {
      setCanUndo(u);
      setCanRedo(r);
    };
    inst.onViewChange = (v) => {
      setPerfectView(v);
    };
  }, []);

  // Sync post process settings to engine
  useEffect(() => {
    if (engine) {
      engine.setPostProcessSettings(postSettings);
    }
  }, [engine, postSettings]);

  const handleUndo = useCallback(() => {
    engine?.undo();
  }, [engine]);

  const handleRedo = useCallback(() => {
    engine?.redo(layers);
  }, [engine, layers]);

  const handleClearAllStrokes = useCallback(() => {
    if (window.confirm('Clear all paint strokes on all layers?')) {
      engine?.clearAllStrokes();
    }
  }, [engine]);

  const handleClearLayerStrokes = useCallback(
    (layerId: string) => {
      engine?.deleteLayerStrokes(layerId);
    },
    [engine]
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === 'b') {
        setTool('brush');
      } else if (e.key.toLowerCase() === 'u') {
        setTool('uv_brush');
      } else if (e.key.toLowerCase() === 'e') {
        setTool('eraser');
      } else if (e.key.toLowerCase() === 'i') {
        setTool('eyedropper');
      } else if (e.key === '[') {
        setBrushSettings((prev) => ({
          ...prev,
          size: Math.max(0.01, prev.size - 0.005),
        }));
      } else if (e.key === ']') {
        setBrushSettings((prev) => ({
          ...prev,
          size: Math.min(0.25, prev.size + 0.005),
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="relative w-full h-full bg-[#0c0e14] overflow-hidden select-none">
      {/* Top Header Bar */}
      <HeaderBar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lightingPreset={lightingPreset}
        setLightingPreset={setLightingPreset}
        showWireframe={showWireframe}
        setShowWireframe={setShowWireframe}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        postSettings={postSettings}
        onOpenRenderSettings={() => {
          setIsRenderSettingsOpen(!isRenderSettingsOpen);
          setIsSettingsOpen(false);
          setIsLayersOpen(false);
        }}
        isRenderSettingsOpen={isRenderSettingsOpen}
        onClearAll={handleClearAllStrokes}
      />

      {/* Main 3D Viewport */}
      <Viewport
        tool={tool}
        brushSettings={brushSettings}
        activeLayer={activeLayer}
        layers={layers}
        symmetry={symmetry}
        lightingPreset={lightingPreset}
        showWireframe={showWireframe}
        showGrid={showGrid}
        onEngineReady={handleEngineReady}
        onColorPick={(hex) => setBrushSettings((prev) => ({ ...prev, color: hex }))}
        cameraInteracting={cameraInteracting}
        setCameraInteracting={setCameraInteracting}
      />

      {/* Floating Bottom Toolbar */}
      <Toolbar
        tool={tool}
        setTool={setTool}
        brushSettings={brushSettings}
        setBrushSettings={setBrushSettings}
        symmetry={symmetry}
        setSymmetry={setSymmetry}
        activeLayer={activeLayer}
        layers={layers}
        onOpenLayers={() => {
          setIsLayersOpen(!isLayersOpen);
          setIsSettingsOpen(false);
          setIsRenderSettingsOpen(false);
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(!isSettingsOpen);
          setIsLayersOpen(false);
          setIsRenderSettingsOpen(false);
        }}
        onOpenModels={() => setIsModelsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        isLayersOpen={isLayersOpen}
        isSettingsOpen={isSettingsOpen}
      />

      {/* Layer Panel */}
      {isLayersOpen && (
        <LayerPanel
          layers={layers}
          setLayers={setLayers}
          activeLayerId={activeLayerId}
          setActiveLayerId={setActiveLayerId}
          onClose={() => setIsLayersOpen(false)}
          onClearLayerStrokes={handleClearLayerStrokes}
        />
      )}

      {/* Brush, Material & Pattern Settings Panel */}
      {isSettingsOpen && (
        <BrushSettingsPanel
          brushSettings={brushSettings}
          setBrushSettings={setBrushSettings}
          onClose={() => setIsSettingsOpen(false)}
          onRecalculateNormals={() => engine?.recalculateMeshNormals()}
        />
      )}

      {/* Render Mode & Shaders Panel */}
      {isRenderSettingsOpen && (
        <RenderSettingsPanel
          settings={postSettings}
          setSettings={setPostSettings}
          onClose={() => setIsRenderSettingsOpen(false)}
          onRecalculateNormals={() => engine?.recalculateMeshNormals()}
        />
      )}

      {/* 3D Model Ingestion / Presets Modal */}
      {isModelsOpen && (
        <ModelLibraryModal
          engine={engine}
          onClose={() => setIsModelsOpen(false)}
          activeModelName="Cyber Helmet"
        />
      )}

      {/* Export 3D / Textures Modal */}
      {isExportOpen && (
        <ExportModal
          engine={engine}
          onClose={() => setIsExportOpen(false)}
          activeModelName="Cyber Helmet"
        />
      )}

      {/* Screen-Center Crosshair Mathematical Reticle Overlay */}
      <ScreenCenterCrosshair
        active={crosshairState.active}
        mode={crosshairState.mode}
        actionLabel={crosshairState.actionLabel}
        valueLabel={crosshairState.valueLabel}
      />

      {/* Feather 3D Primary Tool: Transform Joystick (Bottom-Right) */}
      <div className="absolute bottom-20 right-3 sm:bottom-24 sm:right-4 z-20 pointer-events-none">
        <TransformJoystick
          engine={engine}
          perfectView={perfectView}
          onActiveTransformChange={(active, actionLabel, valueLabel) => {
            setCrosshairState({
              active,
              mode: '2d',
              actionLabel,
              valueLabel,
            });
          }}
        />
      </div>
    </div>
  );
}
