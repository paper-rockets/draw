import React, { useState } from 'react';
import { LightingPreset, PostProcessSettings } from '../types';
import {
  Undo2,
  Redo2,
  Sun,
  Grid,
  Eye,
  Trash2,
  HelpCircle,
  Sparkles,
  Layers,
  Check,
  Wand2,
  MoreVertical,
} from 'lucide-react';

interface HeaderBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lightingPreset: LightingPreset;
  setLightingPreset: (preset: LightingPreset) => void;
  showWireframe: boolean;
  setShowWireframe: (show: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  postSettings: PostProcessSettings;
  onOpenRenderSettings: () => void;
  isRenderSettingsOpen: boolean;
  onClearAll: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lightingPreset,
  setLightingPreset,
  showWireframe,
  setShowWireframe,
  showGrid,
  setShowGrid,
  postSettings,
  onOpenRenderSettings,
  isRenderSettingsOpen,
  onClearAll,
}) => {
  const [showLightingMenu, setShowLightingMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const lightingOptions: { id: LightingPreset; label: string }[] = [
    { id: 'studio', label: 'Dark Studio' },
    { id: 'daylight', label: 'Daylight Sky' },
    { id: 'neon', label: 'Neon Cyberpunk' },
    { id: 'sunset', label: 'Warm Sunset' },
    { id: 'clay_neutral', label: 'Clay Neutral' },
  ];

  return (
    <header className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-between gap-1 sm:gap-3 px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 shadow-2xl max-w-5xl w-[96%] sm:w-auto">
      {/* Title & Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-3 border-r border-neutral-800 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
        <span className="text-[11px] sm:text-xs font-bold tracking-tight text-neutral-100 uppercase">
          <span className="hidden xs:inline">Zero-Clip </span>3D Studio
        </span>
      </div>

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 sm:gap-1 pr-1.5 sm:pr-3 border-r border-neutral-800">
        <button
          id="btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo Stroke (Ctrl+Z)"
          className={`min-w-[36px] min-h-[36px] p-1.5 rounded-xl transition-all flex items-center justify-center ${
            canUndo
              ? 'text-neutral-200 hover:bg-neutral-800 active:scale-90'
              : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          id="btn-redo"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo Stroke (Ctrl+Y)"
          className={`min-w-[36px] min-h-[36px] p-1.5 rounded-xl transition-all flex items-center justify-center ${
            canRedo
              ? 'text-neutral-200 hover:bg-neutral-800 active:scale-90'
              : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Lighting Presets */}
      <div className="relative">
        <button
          id="btn-lighting-menu"
          onClick={() => setShowLightingMenu(!showLightingMenu)}
          title="Lighting & Environment Preset"
          className="min-w-[36px] min-h-[36px] flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 text-xs font-medium text-neutral-200 transition-all active:scale-95"
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline capitalize">{lightingPreset.replace('_', ' ')}</span>
        </button>

        {showLightingMenu && (
          <div className="absolute top-11 left-0 w-44 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
            {lightingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setLightingPreset(opt.id);
                  setShowLightingMenu(false);
                }}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                  lightingPreset === opt.id
                    ? 'bg-blue-600 text-white'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <span>{opt.label}</span>
                {lightingPreset === opt.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Render Mode & Shaders Button */}
      <div className="flex items-center gap-1 pr-1 sm:pr-2 sm:border-r border-neutral-800">
        <button
          id="btn-open-render-settings"
          onClick={onOpenRenderSettings}
          title="Render Mode & Post-Processing Shaders (Bloom, Toon, DoF, Grain)"
          className={`min-w-[36px] min-h-[36px] flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
            postSettings.renderMode === 'render'
              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-sm'
              : isRenderSettingsOpen
              ? 'bg-neutral-800 border-neutral-700 text-white'
              : 'bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700 text-neutral-300'
          }`}
        >
          <Wand2
            className={`w-3.5 h-3.5 ${
              postSettings.renderMode === 'render' ? 'text-emerald-400' : 'text-neutral-400'
            }`}
          />
          <span className="hidden sm:inline uppercase text-[10px] tracking-wider">
            {postSettings.renderMode === 'render' ? 'Render' : 'Draft'}
          </span>
        </button>
      </div>

      {/* Desktop Toggles: Wireframe, Grid, Clear, Help (Hidden on small mobile, accessible via More button) */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          id="btn-toggle-wireframe"
          onClick={() => setShowWireframe(!showWireframe)}
          title="Toggle Wireframe"
          className={`min-w-[36px] min-h-[36px] p-1.5 rounded-xl text-xs transition-all flex items-center justify-center ${
            showWireframe
              ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
          }`}
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          id="btn-toggle-grid"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Floor Grid"
          className={`min-w-[36px] min-h-[36px] p-1.5 rounded-xl text-xs transition-all flex items-center justify-center ${
            showGrid
              ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 pl-2 border-l border-neutral-800">
          <button
            id="btn-clear-strokes"
            onClick={onClearAll}
            title="Clear All Paint Strokes"
            className="min-w-[36px] min-h-[36px] p-1.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            id="btn-help-toggle"
            onClick={() => setShowHelp(!showHelp)}
            title="Controls & Gesture Guide"
            className="min-w-[36px] min-h-[36px] p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all flex items-center justify-center"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Overflow Menu Button */}
      <div className="relative sm:hidden">
        <button
          id="btn-mobile-more-menu"
          title="More View Options"
          onClick={() => setShowMobileMore(!showMobileMore)}
          className="min-w-[36px] min-h-[36px] p-1.5 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all flex items-center justify-center"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMobileMore && (
          <div className="absolute top-11 right-0 w-48 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-30 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={() => {
                setShowWireframe(!showWireframe);
                setShowMobileMore(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 text-left"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>{showWireframe ? 'Hide Wireframe' : 'Show Wireframe'}</span>
            </button>

            <button
              onClick={() => {
                setShowGrid(!showGrid);
                setShowMobileMore(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 text-left"
            >
              <Grid className="w-4 h-4 text-blue-400" />
              <span>{showGrid ? 'Hide Floor Grid' : 'Show Floor Grid'}</span>
            </button>

            <button
              onClick={() => {
                setShowHelp(true);
                setShowMobileMore(false);
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-neutral-300 hover:bg-neutral-800 text-left"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Touch & Gestures</span>
            </button>

            <div className="my-1 border-t border-neutral-800/80" />

            <button
              onClick={() => {
                setShowMobileMore(false);
                onClearAll();
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-left"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Strokes</span>
            </button>
          </div>
        )}
      </div>

      {/* Help Modal Popover */}
      {showHelp && (
        <div className="fixed sm:absolute inset-x-4 top-16 sm:inset-x-auto sm:top-12 sm:right-0 sm:w-80 p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-40 text-xs text-neutral-300 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800 font-semibold text-neutral-100">
            <span>Controls & Touch Gestures</span>
            <button
              onClick={() => setShowHelp(false)}
              className="p-1 text-neutral-400 hover:text-neutral-200"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">1-Finger / Stylus</span>
              <span className="font-mono text-neutral-200">Paint Conformal Stroke</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">2 Fingers Drag</span>
              <span className="font-mono text-neutral-200">Orbit 3D Model</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">Pinch / Spread</span>
              <span className="font-mono text-neutral-200">Zoom In / Out</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">Camera Button</span>
              <span className="font-mono text-neutral-200">Toggle Orbit / Draw</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">Pen Mode Button</span>
              <span className="font-mono text-neutral-200">Stylus Paint, Finger Orbit</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-neutral-800/40">
              <span className="text-neutral-400">Undo / Redo</span>
              <span className="font-mono text-neutral-200">Header Bar or Ctrl+Z/Y</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

