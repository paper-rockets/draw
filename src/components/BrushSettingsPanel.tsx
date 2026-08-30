import React, { useState } from 'react';
import { BrushSettings, MaterialType, StrokeProfile, PatternType, SmoothingAlgorithm } from '../types';
import {
  Sliders,
  Sparkles,
  Shield,
  Layers,
  Zap,
  X,
  Compass,
  Cpu,
  Info,
  Sun,
  Palette,
  Shapes,
  Grid3X3,
  Flame,
  Scissors,
  EyeOff,
  Cylinder,
  Activity,
  Gauge,
  RefreshCw,
  Check,
} from 'lucide-react';

interface BrushSettingsPanelProps {
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  onClose: () => void;
  onRecalculateNormals?: () => number | void;
}

export const BrushSettingsPanel: React.FC<BrushSettingsPanelProps> = ({
  brushSettings,
  setBrushSettings,
  onClose,
  onRecalculateNormals,
}) => {
  const [recalcFeedback, setRecalcFeedback] = useState<string | null>(null);

  const updateSetting = <K extends keyof BrushSettings>(key: K, value: BrushSettings[K]) => {
    setBrushSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleManualRecalculate = () => {
    if (onRecalculateNormals) {
      const count = onRecalculateNormals();
      setRecalcFeedback(typeof count === 'number' ? `Smooth normals updated (${count} meshes)` : 'Normals recalculated & smoothed');
      setTimeout(() => setRecalcFeedback(null), 2500);
    }
  };

  const smoothingAlgorithms: { id: SmoothingAlgorithm; label: string; desc: string; badge: string }[] = [
    {
      id: 'one_euro',
      label: '1€ Adaptive Filter',
      desc: 'Dynamic cutoff frequency eliminating jitter at low speeds with zero lag on rapid flicks',
      badge: 'Recommended',
    },
    {
      id: 'kalman',
      label: 'Kalman Predictive',
      desc: 'Velocity state estimator pre-calculating contact points ahead of stylus motion',
      badge: 'Lowest Latency',
    },
    {
      id: 'streamline',
      label: 'Streamline Lead String',
      desc: 'Exponentially weighted pull-string smoothing for buttery calligraphic strokes',
      badge: 'Smooth Curves',
    },
    {
      id: 'exponential',
      label: 'Adaptive EWMA',
      desc: 'Fast velocity-weighted exponential moving average for fluid responsiveness',
      badge: 'Responsive',
    },
    {
      id: 'none',
      label: 'Raw Direct (Off)',
      desc: 'Direct unfiltered hardware coordinates with zero smoothing overhead',
      badge: 'Raw',
    },
  ];

  const materialTypes: { id: MaterialType; label: string; desc: string; icon: any }[] = [
    { id: 'shaded', label: 'Shaded', desc: 'PBR lit volume responding to dynamic scene lights & shadows', icon: Sun },
    { id: 'shadeless', label: 'Shadeless', desc: 'Flat unlit material for graphic line art & anime fills', icon: Palette },
    { id: 'glow', label: 'Glow', desc: 'Self-illuminated emissive material triggering bloom aura', icon: Flame },
    { id: 'cutout', label: 'Cutout', desc: 'Spatial transparency punching negative space through overlapping curves', icon: Scissors },
  ];

  const strokeProfiles: { id: StrokeProfile; label: string; desc: string }[] = [
    { id: 'conformal', label: 'Conformal', desc: 'Arched dome cross-section snapped to surface curvature' },
    { id: 'tube', label: 'Tube (3D)', desc: '360° cylindrical 3D mesh with spherical end-caps' },
    { id: 'ribbon', label: 'Ribbon', desc: 'Flat tape-like cross-section aligned with drawing plane' },
    { id: 'marker', label: 'Marker/Chisel', desc: 'Asymmetric calligraphic rectangular profile' },
  ];

  const patternTypes: { id: PatternType; label: string }[] = [
    { id: 'none', label: 'Solid Paint (None)' },
    { id: 'dot', label: 'Halftone Dot' },
    { id: 'line', label: 'Line Hatch' },
    { id: 'cross', label: 'Crosshatch' },
    { id: 'terrazzo', label: 'Terrazzo Marble' },
    { id: 'stipple', label: 'Stippled Noise' },
  ];

  return (
    <div
      id="brush-settings-panel"
      className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-16 right-auto sm:right-6 bottom-20 sm:bottom-auto w-auto sm:w-96 max-h-[calc(100vh-140px)] sm:max-h-[85vh] flex flex-col p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-30 select-none animate-in fade-in zoom-in-95 duration-150 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span>Material, Geometry & Pattern</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 my-3 pr-1 text-xs">
        {/* 1. Core Material Types */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <Sun className="w-3.5 h-3.5" />
            <span>1. Core Material Type</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {materialTypes.map((mat) => {
              const Icon = mat.icon;
              const isSelected = brushSettings.materialType === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => updateSetting('materialType', mat.id)}
                  className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/80 text-amber-300 shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-neutral-100">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span>{mat.label}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 line-clamp-2 mt-0.5 leading-tight">
                    {mat.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Stroke Geometry Profiles */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-blue-400">
            <Shapes className="w-3.5 h-3.5" />
            <span>2. Stroke Geometry Profile</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {strokeProfiles.map((prof) => {
              const isSelected = brushSettings.profile === prof.id;
              return (
                <button
                  key={prof.id}
                  onClick={() => updateSetting('profile', prof.id)}
                  className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  <span className="font-semibold text-xs text-neutral-100">{prof.label}</span>
                  <span className="text-[10px] text-neutral-500 line-clamp-2 mt-0.5 leading-tight">
                    {prof.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Marker Specific Controls */}
          {brushSettings.profile === 'marker' && (
            <div className="pt-2 border-t border-neutral-800/60 space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Chisel Angle</span>
                  <span className="font-mono text-neutral-400">{brushSettings.chiselAngle ?? 45}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={brushSettings.chiselAngle ?? 45}
                  onChange={(e) => updateSetting('chiselAngle', parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Aspect Ratio</span>
                  <span className="font-mono text-neutral-400">{(brushSettings.aspectRatio ?? 3.5).toFixed(1)}:1</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="6.0"
                  step="0.5"
                  value={brushSettings.aspectRatio ?? 3.5}
                  onChange={(e) => updateSetting('aspectRatio', parseFloat(e.target.value))}
                  className="w-full accent-blue-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Procedural Surface Patterns */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <Grid3X3 className="w-3.5 h-3.5" />
            <span>3. Procedural Surface Patterns</span>
          </div>

          {/* Pattern Type Dropdown */}
          <div className="space-y-1">
            <span className="text-neutral-400 text-[11px]">Pattern Overlay</span>
            <select
              value={brushSettings.patternType || 'none'}
              onChange={(e) => updateSetting('patternType', e.target.value as PatternType)}
              className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              {patternTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {brushSettings.patternType !== 'none' && (
            <div className="space-y-2 pt-2 border-t border-neutral-800/60">
              {/* Pattern Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Pattern Scale / Density</span>
                  <span className="font-mono text-neutral-400">{(brushSettings.patternScale ?? 4).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="0.5"
                  value={brushSettings.patternScale ?? 4}
                  onChange={(e) => updateSetting('patternScale', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              {/* Pattern Intensity */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Pattern Intensity</span>
                  <span className="font-mono text-neutral-400">{((brushSettings.patternIntensity ?? 0.8) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={brushSettings.patternIntensity ?? 0.8}
                  onChange={(e) => updateSetting('patternIntensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              {/* Pattern Angle */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Pattern Angle</span>
                  <span className="font-mono text-neutral-400">{brushSettings.patternAngle ?? 45}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="5"
                  value={brushSettings.patternAngle ?? 45}
                  onChange={(e) => updateSetting('patternAngle', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              {/* Pattern Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Pattern Contrast</span>
                  <span className="font-mono text-neutral-400">{(brushSettings.patternContrast ?? 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={brushSettings.patternContrast ?? 1.0}
                  onChange={(e) => updateSetting('patternContrast', parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Conformal Surface Decal & Snapping */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-purple-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>4. Surface Snapping & Depth Bias</span>
          </div>

          {/* Silhouette Clamping Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-neutral-200 font-medium">Silhouette Contour Clamping</span>
              <span className="text-[10px] text-neutral-500">Clamps overhanging fins at mesh boundaries</span>
            </div>
            <input
              type="checkbox"
              checked={brushSettings.silhouetteClamping}
              onChange={(e) => updateSetting('silhouetteClamping', e.target.checked)}
              className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Stencil Masking Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-neutral-200 font-medium">Stencil Buffer Occlusion</span>
              <span className="text-[10px] text-neutral-500">Masks strokes strictly to model pixels</span>
            </div>
            <input
              type="checkbox"
              checked={brushSettings.stencilMasking}
              onChange={(e) => updateSetting('stencilMasking', e.target.checked)}
              className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Dome Height Factor */}
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-300">
              <span>Arched Dome Factor</span>
              <span className="font-mono text-neutral-400">{(brushSettings.domeFactor * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.01"
              value={brushSettings.domeFactor}
              onChange={(e) => updateSetting('domeFactor', parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
          </div>

          {/* Surface Offset */}
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-300">
              <span>Base Surface Offset</span>
              <span className="font-mono text-neutral-400">{(brushSettings.surfaceOffset * 1000).toFixed(1)} mm</span>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.010"
              step="0.0005"
              value={brushSettings.surfaceOffset}
              onChange={(e) => updateSetting('surfaceOffset', parseFloat(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
          </div>

          {/* Auto Mesh Normal Recalculation Toggle */}
          <div className="pt-2.5 border-t border-neutral-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col pr-2">
                <div className="flex items-center gap-1.5 text-neutral-100 font-medium">
                  <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Auto Recalculate Mesh Normals</span>
                </div>
                <span className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                  Smooths vertex normals after drawing to keep PBR shading uncreased & seamless under heavy paint accumulation
                </span>
              </div>
              <input
                id="toggle-auto-recalculate-normals"
                type="checkbox"
                checked={brushSettings.autoRecalculateNormals !== false}
                onChange={(e) => updateSetting('autoRecalculateNormals', e.target.checked)}
                className="accent-purple-500 w-4 h-4 rounded cursor-pointer shrink-0"
              />
            </div>

            {/* Manual Recalculate Now Button */}
            {onRecalculateNormals && (
              <button
                id="btn-manual-recalculate-normals"
                type="button"
                onClick={handleManualRecalculate}
                className="w-full mt-1.5 py-1.5 px-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 text-purple-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-sm cursor-pointer"
              >
                {recalcFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{recalcFeedback}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                    <span>Recalculate & Smooth All Normals Now</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 5. Dynamics & Tapering */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center gap-1.5 font-semibold text-pink-400">
            <Zap className="w-3.5 h-3.5" />
            <span>5. Dynamics & Tapering</span>
          </div>

          {/* Stylus Pressure Sensitivity */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-neutral-200 font-medium">Stylus / Touch Pressure</span>
              <span className="text-[10px] text-neutral-500">Dynamic stroke width with stylus pressure</span>
            </div>
            <input
              type="checkbox"
              checked={brushSettings.pressureSensitivity}
              onChange={(e) => updateSetting('pressureSensitivity', e.target.checked)}
              className="accent-pink-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Sinusoidal Taper Length */}
          <div className="space-y-1">
            <div className="flex justify-between text-neutral-300">
              <span>Sinusoidal Tip Tapering</span>
              <span className="font-mono text-neutral-400">{(brushSettings.taperLength * 100).toFixed(0)}% length</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.25"
              step="0.01"
              value={brushSettings.taperLength}
              onChange={(e) => updateSetting('taperLength', parseFloat(e.target.value))}
              className="w-full accent-pink-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* 6. Smoothing & Low-Latency Contact Point Calculation */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
              <Activity className="w-3.5 h-3.5" />
              <span>6. Stroke Smoothing & Latency</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
              Fast Surface Snapping
            </span>
          </div>

          {/* Algorithm Selection */}
          <div className="space-y-1.5">
            <span className="text-neutral-400 text-[11px]">Contact Calculation Filter</span>
            <div className="space-y-1">
              {smoothingAlgorithms.map((alg) => {
                const isSelected = (brushSettings.smoothingAlgorithm || 'one_euro') === alg.id;
                return (
                  <button
                    key={alg.id}
                    onClick={() => updateSetting('smoothingAlgorithm', alg.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/80 text-cyan-200 shadow-sm'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col pr-2">
                      <span className="font-semibold text-xs text-neutral-100">{alg.label}</span>
                      <span className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{alg.desc}</span>
                    </div>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-neutral-800 text-neutral-500'
                      }`}
                    >
                      {alg.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {brushSettings.smoothingAlgorithm !== 'none' && (
            <div className="space-y-3 pt-2 border-t border-neutral-800/60">
              {/* Smoothing Strength */}
              <div className="space-y-1">
                <div className="flex justify-between text-neutral-300">
                  <span>Smoothing Strength</span>
                  <span className="font-mono text-neutral-400">
                    {((brushSettings.smoothingStrength ?? 0.55) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={brushSettings.smoothingStrength ?? 0.55}
                  onChange={(e) => updateSetting('smoothingStrength', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                />
              </div>

              {/* Predictive Low-Latency Tracking */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-neutral-200 font-medium">Predictive Velocity Compensation</span>
                  <span className="text-[10px] text-neutral-500">Pre-calculates contact points ahead during fast sweeps</span>
                </div>
                <input
                  type="checkbox"
                  checked={brushSettings.predictiveTracking ?? true}
                  onChange={(e) => updateSetting('predictiveTracking', e.target.checked)}
                  className="accent-cyan-500 w-4 h-4 rounded cursor-pointer"
                />
              </div>

              {brushSettings.predictiveTracking && (
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-300">
                    <span>Forward Prediction Factor</span>
                    <span className="font-mono text-neutral-400">
                      {((brushSettings.predictionFactor ?? 0.4) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={brushSettings.predictionFactor ?? 0.4}
                    onChange={(e) => updateSetting('predictionFactor', parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

