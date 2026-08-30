import React, { useState } from 'react';
import { PostProcessSettings, RenderMode } from '../types';
import {
  Sparkles,
  Sun,
  Flame,
  Camera,
  Film,
  Grid,
  X,
  Layers,
  Wand2,
  Tv,
  RefreshCw,
  Check,
} from 'lucide-react';

interface RenderSettingsPanelProps {
  settings: PostProcessSettings;
  setSettings: React.Dispatch<React.SetStateAction<PostProcessSettings>>;
  onClose: () => void;
  onRecalculateNormals?: () => number | void;
}

export const RenderSettingsPanel: React.FC<RenderSettingsPanelProps> = ({
  settings,
  setSettings,
  onClose,
  onRecalculateNormals,
}) => {
  const [recalcFeedback, setRecalcFeedback] = useState<string | null>(null);

  const update = <K extends keyof PostProcessSettings>(key: K, val: PostProcessSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleManualRecalculate = () => {
    if (onRecalculateNormals) {
      const count = onRecalculateNormals();
      setRecalcFeedback(typeof count === 'number' ? `Normals smoothed (${count} meshes)` : 'Normals recalculated & smoothed');
      setTimeout(() => setRecalcFeedback(null), 2500);
    }
  };

  return (
    <div
      id="render-settings-panel"
      className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-16 right-auto sm:right-6 bottom-20 sm:bottom-auto w-auto sm:w-96 max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-30 select-none animate-in fade-in zoom-in-95 duration-150 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
          <Wand2 className="w-4 h-4 text-emerald-400" />
          <span>Render Mode & Shaders</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 my-3 pr-1 text-xs">
        {/* Render Mode Segmented Switch */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5">
          <div className="flex justify-between items-center text-neutral-200 font-semibold text-xs">
            <span>Viewport Render Mode</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
              {settings.renderMode === 'draft' ? 'Draft (Fast)' : 'Render (Composited)'}
            </span>
          </div>

          <div className="grid grid-cols-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800 gap-1">
            <button
              onClick={() => update('renderMode', 'draft')}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.renderMode === 'draft'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Draft Mode
            </button>
            <button
              onClick={() => update('renderMode', 'render')}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.renderMode === 'render'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Render Mode
            </button>
          </div>
        </div>

        {/* 1. Bloom & Neon Glow Halo */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <Flame className="w-3.5 h-3.5" />
              <span>Glow & Bloom Halo</span>
            </div>
            <input
              type="checkbox"
              checked={settings.bloom}
              onChange={(e) => update('bloom', e.target.checked)}
              className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {settings.bloom && (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Bloom Intensity</span>
                  <span className="font-mono text-neutral-400">{(settings.bloomIntensity).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={settings.bloomIntensity}
                  onChange={(e) => update('bloomIntensity', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Bloom Radius</span>
                  <span className="font-mono text-neutral-400">{(settings.bloomRadius).toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={settings.bloomRadius}
                  onChange={(e) => update('bloomRadius', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Toon / Cel Shading */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Toon / Cel Shading</span>
            </div>
            <input
              type="checkbox"
              checked={settings.toonShading}
              onChange={(e) => update('toonShading', e.target.checked)}
              className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {settings.toonShading && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-neutral-300">
                <span>Luminance Steps</span>
                <span className="font-mono text-neutral-400">{settings.toonSteps} bands</span>
              </div>
              <input
                type="range"
                min="2"
                max="6"
                step="1"
                value={settings.toonSteps}
                onChange={(e) => update('toonSteps', parseInt(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 3. Depth of Field (DoF) */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-purple-400">
              <Camera className="w-3.5 h-3.5" />
              <span>Depth of Field (DoF)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.dof}
              onChange={(e) => update('dof', e.target.checked)}
              className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {settings.dof && (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Aperture Blur Radius</span>
                  <span className="font-mono text-neutral-400">{(settings.dofAperture * 100).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.040"
                  step="0.005"
                  value={settings.dofAperture}
                  onChange={(e) => update('dofAperture', parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Film Grain Noise */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-rose-400">
              <Film className="w-3.5 h-3.5" />
              <span>Cinematic Film Grain</span>
            </div>
            <input
              type="checkbox"
              checked={settings.grain}
              onChange={(e) => update('grain', e.target.checked)}
              className="accent-rose-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {settings.grain && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-neutral-300">
                <span>Grain Intensity</span>
                <span className="font-mono text-neutral-400">{((settings.grainIntensity) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.30"
                step="0.02"
                value={settings.grainIntensity}
                onChange={(e) => update('grainIntensity', parseFloat(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 5. Retro Pixelation */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
              <Tv className="w-3.5 h-3.5" />
              <span>Retro Pixelation Grid</span>
            </div>
            <input
              type="checkbox"
              checked={settings.pixelation}
              onChange={(e) => update('pixelation', e.target.checked)}
              className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {settings.pixelation && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-neutral-300">
                <span>Pixel Size</span>
                <span className="font-mono text-neutral-400">{settings.pixelSize} px</span>
              </div>
              <input
                type="range"
                min="2"
                max="16"
                step="1"
                value={settings.pixelSize}
                onChange={(e) => update('pixelSize', parseInt(e.target.value))}
                className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 6. Mesh Normals & Shading Smoothness */}
        {onRecalculateNormals && (
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-purple-400">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mesh Normals & Smooth Shading</span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-tight">
              Recalculates vertex normal vectors across accumulated strokes & model meshes to eliminate faceting and restore smooth PBR lighting.
            </p>
            <button
              id="btn-render-recalculate-normals"
              type="button"
              onClick={handleManualRecalculate}
              className="w-full py-2 px-3 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/60 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm cursor-pointer"
            >
              {recalcFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">{recalcFeedback}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  <span>Recalculate & Smooth All Normals Now</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
