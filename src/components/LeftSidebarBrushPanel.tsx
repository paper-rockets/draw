import React, { useState } from 'react';
import { 
  BrushType, 
  StrokeProfile,
  SmoothingAlgorithm,
  MaterialType, 
  ProceduralPattern, 
  BrushPreset 
} from '../types';

interface LeftSidebarBrushPanelProps {
  brushType: BrushType;
  onSetBrushType: (type: BrushType) => void;
  strokeProfile?: StrokeProfile;
  onSetStrokeProfile?: (profile: StrokeProfile) => void;
  smoothingAlgorithm?: SmoothingAlgorithm;
  onChangeSmoothingAlgorithm?: (algo: SmoothingAlgorithm) => void;
  smoothingStrength?: number;
  onChangeSmoothingStrength?: (str: number) => void;
  domeFactor?: number;
  onChangeDomeFactor?: (df: number) => void;
  silhouetteClamping?: boolean;
  onToggleSilhouetteClamping?: () => void;
  color: string;
  onChangeColor: (color: string) => void;
  brushSize: number; // in mm
  onChangeBrushSize: (size: number) => void;
  opacity: number; // 0 to 1
  onChangeOpacity: (opacity: number) => void;
  jitter: number; // 0 to 1 (Noise Jitter)
  onChangeJitter: (jitter: number) => void;
  pressureSensitive: boolean;
  onTogglePressure: () => void;
  palmRejectionEnabled?: boolean;
  onTogglePalmRejection?: () => void;
  palmRejectionRadius?: number;
  material: MaterialType;
  onChangeMaterial: (mat: MaterialType) => void;
  pattern: ProceduralPattern;
  onChangePattern: (pat: ProceduralPattern) => void;
  patternScale: number;
  onChangePatternScale: (s: number) => void;
  patternAngle: number;
  onChangePatternAngle: (a: number) => void;
  patternContrast: number;
  onChangePatternContrast: (c: number) => void;
  isInjectorActive: boolean;
  onToggleInjector: () => void;
  isEyedropperActive: boolean;
  onToggleEyedropper: () => void;
  presets: BrushPreset[];
  onSavePreset: () => void;
  onLoadPreset: (p: BrushPreset) => void;
  onDeletePreset: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const LeftSidebarBrushPanel: React.FC<LeftSidebarBrushPanelProps> = ({
  brushType,
  onSetBrushType,
  strokeProfile = 'tube',
  onSetStrokeProfile,
  smoothingAlgorithm = 'one_euro',
  onChangeSmoothingAlgorithm,
  smoothingStrength = 0.5,
  onChangeSmoothingStrength,
  domeFactor = 0.22,
  onChangeDomeFactor,
  silhouetteClamping = true,
  onToggleSilhouetteClamping,
  color,
  onChangeColor,
  brushSize,
  onChangeBrushSize,
  opacity,
  onChangeOpacity,
  jitter,
  onChangeJitter,
  pressureSensitive,
  onTogglePressure,
  palmRejectionEnabled = true,
  onTogglePalmRejection,
  palmRejectionRadius = 160,
  material,
  onChangeMaterial,
  pattern,
  onChangePattern,
  patternScale,
  onChangePatternScale,
  patternAngle,
  onChangePatternAngle,
  patternContrast,
  onChangePatternContrast,
  isInjectorActive,
  onToggleInjector,
  isEyedropperActive,
  onToggleEyedropper,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [colorTab, setColorTab] = useState<'color' | 'material' | 'pattern' | 'profile'>('color');
  const [showPresetsDrawer, setShowPresetsDrawer] = useState(false);
  const [activeNumpad, setActiveNumpad] = useState<'size' | 'opacity' | 'jitter' | null>(null);
  const [numpadValue, setNumpadValue] = useState('');

  const brushProfiles: { id: StrokeProfile; label: string; short: string }[] = [
    { id: 'tube', label: '3D Tube', short: 'Tube' },
    { id: 'ribbon', label: 'Ribbon Tape', short: 'Ribbon' },
    { id: 'marker', label: 'Chisel Marker', short: 'Marker' },
    { id: 'conformal', label: 'Conformal Dome', short: 'Dome' },
  ];

  const handleNumpadDigit = (digit: string) => {
    if (digit === 'C') {
      setNumpadValue('');
      return;
    }
    if (digit === 'OK') {
      const val = parseFloat(numpadValue);
      if (!isNaN(val)) {
        if (activeNumpad === 'size') {
          onChangeBrushSize(Math.max(1, Math.min(300, val)));
        } else if (activeNumpad === 'opacity') {
          onChangeOpacity(Math.max(0, Math.min(100, val)) / 100);
        } else if (activeNumpad === 'jitter') {
          onChangeJitter(Math.max(0, Math.min(100, val)) / 100);
        }
      }
      setActiveNumpad(null);
      setNumpadValue('');
      return;
    }
    setNumpadValue((prev) => (prev.length < 5 ? prev + digit : prev));
  };

  const currentProfile = strokeProfile || (brushType === 'conformal' ? 'conformal' : (brushType as StrokeProfile) || 'tube');

  return (
    <div className="hidden md:flex absolute top-16 sm:top-20 left-3 sm:left-4 z-40 items-start gap-2 max-h-[calc(100vh-90px)]">
      {/* Presets Slideout Drawer */}
      {showPresetsDrawer && (
        <div className="w-52 p-3 rounded-3xl feather-panel shadow-2xl space-y-3 animate-in slide-in-from-left duration-200 border border-zinc-200/80 dark:border-zinc-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Brush Presets
            </span>
            <button
              onClick={onSavePreset}
              title="Save current brush as preset"
              className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 feather-btn text-xs font-bold"
            >
              Add
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="group flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 transition-colors"
              >
                <button
                  onClick={() => onLoadPreset(preset)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-black/20"
                    style={{ backgroundColor: preset.color }}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {preset.size}mm | {Math.round(preset.opacity * 100)}%
                      {preset.jitter ? ` | ${Math.round(preset.jitter * 100)}% jit` : ''}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => onDeletePreset(preset.id)}
                  className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] text-red-500 hover:text-red-600 feather-btn font-bold"
                >
                  Del
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Vertical Tool Strip */}
      <div className="flex flex-col items-center gap-2 sm:gap-2.5 p-1.5 sm:p-2 rounded-3xl feather-panel shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 max-h-[calc(100vh-100px)] overflow-y-auto">
        {/* Presets Toggle Arrow */}
        <button
          onClick={() => setShowPresetsDrawer(!showPresetsDrawer)}
          title="Toggle Brush Presets"
          className="w-8 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 feather-btn"
        >
          {showPresetsDrawer ? 'Left' : 'Presets'}
        </button>

        {/* Brush Profile Switcher */}
        <button
          onClick={() => {
            const nextIdx = (brushProfiles.findIndex((b) => b.id === currentProfile) + 1) % brushProfiles.length;
            const nextP = brushProfiles[nextIdx].id;
            if (onSetStrokeProfile) onSetStrokeProfile(nextP);
            onSetBrushType(nextP as BrushType);
          }}
          title={`Active Profile: ${currentProfile.toUpperCase()} (Click to cycle)`}
          className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-200 hover:scale-105 feather-btn shadow-xs"
        >
          {brushProfiles.find((b) => b.id === currentProfile)?.short || 'Tube'}
        </button>

        {/* Active Color Swatch (Opens Color & Settings Panel) */}
        <button
          onClick={() => setShowColorPanel(!showColorPanel)}
          title="Open Color, Profile, Material Panel"
          className="relative w-10 h-10 rounded-2xl p-0.5 border-2 border-white dark:border-zinc-700 shadow-md hover:scale-105 feather-btn"
        >
          <div
            className="w-full h-full rounded-xl"
            style={{ backgroundColor: color }}
          />
          {material === 'glow' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          )}
        </button>

        {/* Size Slider */}
        <div className="relative flex flex-col items-center">
          <input
            type="range"
            min="1"
            max="300"
            value={brushSize}
            onChange={(e) => onChangeBrushSize(Number(e.target.value))}
            className="h-24 w-1.5 accent-emerald-500 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
          />
          <button
            onClick={() => {
              setActiveNumpad(activeNumpad === 'size' ? null : 'size');
              setNumpadValue(brushSize.toString());
            }}
            title="Exact metric size (mm)"
            className="mt-1 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded-md"
          >
            {brushSize}mm
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="relative flex flex-col items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => onChangeOpacity(Number(e.target.value) / 100)}
            className="h-20 w-1.5 accent-blue-500 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
          />
          <button
            onClick={() => {
              setActiveNumpad(activeNumpad === 'opacity' ? null : 'opacity');
              setNumpadValue(Math.round(opacity * 100).toString());
            }}
            title="Exact opacity percentage"
            className="mt-1 text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded-md"
          >
            {Math.round(opacity * 100)}%
          </button>
        </div>

        {/* Noise Jitter Slider */}
        <div className="relative flex flex-col items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(jitter * 100)}
            onChange={(e) => onChangeJitter(Number(e.target.value) / 100)}
            className="h-20 w-1.5 accent-amber-500 bg-zinc-200 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
            title={`Noise Jitter: ${Math.round(jitter * 100)}%`}
          />
          <button
            onClick={() => {
              setActiveNumpad(activeNumpad === 'jitter' ? null : 'jitter');
              setNumpadValue(Math.round(jitter * 100).toString());
            }}
            title="Noise Jitter (% spline variance)"
            className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/50 px-1 py-0.5 rounded-md"
          >
            {Math.round(jitter * 100)}%
          </button>
        </div>

        {/* Pressure Sensitivity Toggle */}
        <button
          onClick={onTogglePressure}
          title={pressureSensitive ? 'Stylus Pressure: ON' : 'Stylus Pressure: OFF'}
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
            pressureSensitive
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
          }`}
        >
          P
        </button>

        {/* Palm Rejection Toggle */}
        {onTogglePalmRejection && (
          <button
            onClick={onTogglePalmRejection}
            title={palmRejectionEnabled ? `Palm Rejection: ON (${palmRejectionRadius}px)` : 'Palm Rejection: OFF'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
              palmRejectionEnabled
                ? 'bg-blue-500 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
            }`}
          >
            PR
          </button>
        )}

        {/* Injector Sampling Tool */}
        <button
          onClick={onToggleInjector}
          title="Injector Tool (Sample full brush DNA)"
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
            isInjectorActive
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ring-2 ring-emerald-500'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          DNA
        </button>

        {/* Eyedropper Color Tool */}
        <button
          onClick={onToggleEyedropper}
          title="Eyedropper (Sample color)"
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
            isEyedropperActive
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 ring-2 ring-blue-500'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          Eye
        </button>

        {/* Divider */}
        <div className="w-6 h-px bg-zinc-200 dark:bg-zinc-700" />

        {/* Undo / Redo */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 disabled:opacity-30 feather-btn"
          >
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 disabled:opacity-30 feather-btn"
          >
            Redo
          </button>
        </div>
      </div>

      {/* Floating Numpad for Size/Opacity Metric Input */}
      {activeNumpad && (
        <div className="w-48 p-3 rounded-3xl feather-panel shadow-2xl space-y-2 animate-in zoom-in-95 duration-150 border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
            <span>
              {activeNumpad === 'size'
                ? 'Brush Size (mm)'
                : activeNumpad === 'opacity'
                ? 'Opacity (%)'
                : 'Noise Jitter (%)'}
            </span>
            <span className="text-emerald-500 text-sm font-mono">{numpadValue || '0'}</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumpadDigit(key)}
                className={`py-2 text-xs font-bold rounded-xl feather-btn ${
                  key === 'OK'
                    ? 'bg-emerald-500 text-white col-span-1'
                    : key === 'C'
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color, Material, Profile, & Smoothing Settings Modal */}
      {showColorPanel && (
        <div className="w-80 p-4 rounded-3xl feather-panel shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-zinc-200 dark:border-zinc-700 max-h-[85vh] overflow-y-auto">
          {/* Header Tabs */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl gap-1">
            {(['color', 'profile', 'material', 'pattern'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setColorTab(tab)}
                className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-xl transition-all ${
                  colorTab === tab
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Color Tab */}
          {colorTab === 'color' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="w-12 h-12 rounded-2xl border-0 cursor-pointer overflow-hidden bg-transparent"
                />
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Hex Code</div>
                  <input
                    type="text"
                    value={color.toUpperCase()}
                    onChange={(e) => onChangeColor(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-6 gap-1.5">
                {[
                  '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#00c7be', '#007aff',
                  '#5856d6', '#af52de', '#ff2d55', '#ffffff', '#8e8e93', '#1c1c1e',
                  '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'
                ].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => onChangeColor(hex)}
                    className={`w-7 h-7 rounded-xl border border-black/10 transition-transform active:scale-90 ${
                      color.toLowerCase() === hex.toLowerCase() ? 'ring-2 ring-emerald-500 scale-105' : ''
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Profile & Smoothing Tab */}
          {colorTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-zinc-500 mb-2">Geometric Stroke Profile</div>
                <div className="grid grid-cols-2 gap-2">
                  {brushProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (onSetStrokeProfile) onSetStrokeProfile(p.id);
                        onSetBrushType(p.id as BrushType);
                      }}
                      className={`p-2.5 rounded-2xl text-left border feather-btn ${
                        currentProfile === p.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Smoothing Algorithm */}
              {onChangeSmoothingAlgorithm && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs font-bold text-zinc-500 mb-2">Real-time Smoothing Filter</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'one_euro', label: '1-Euro' },
                      { id: 'kalman', label: 'Kalman' },
                      { id: 'streamline', label: 'Streamline' },
                      { id: 'exponential', label: 'Exp' },
                      { id: 'none', label: 'None' },
                    ].map((algo) => (
                      <button
                        key={algo.id}
                        onClick={() => onChangeSmoothingAlgorithm(algo.id as SmoothingAlgorithm)}
                        className={`py-1.5 px-2 text-xs font-bold rounded-xl feather-btn ${
                          smoothingAlgorithm === algo.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        {algo.label}
                      </button>
                    ))}
                  </div>

                  {onChangeSmoothingStrength && smoothingAlgorithm !== 'none' && (
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Smoothing Strength</span>
                        <span className="font-mono">{Math.round(smoothingStrength * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(smoothingStrength * 100)}
                        onChange={(e) => onChangeSmoothingStrength(Number(e.target.value) / 100)}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Conformal Parameters */}
              {currentProfile === 'conformal' && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="text-xs font-bold text-zinc-500">Conformal Surface Parameters</div>
                  {onChangeDomeFactor && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Dome Height Factor</span>
                        <span className="font-mono">{domeFactor.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.01"
                        value={domeFactor}
                        onChange={(e) => onChangeDomeFactor(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                  {onToggleSilhouetteClamping && (
                    <button
                      onClick={onToggleSilhouetteClamping}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border feather-btn ${
                        silhouetteClamping
                          ? 'bg-emerald-500 text-white border-transparent'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {silhouetteClamping ? 'Silhouette Clamping: Active' : 'Silhouette Clamping: Off'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Material Tab */}
          {colorTab === 'material' && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'shaded', label: 'Shaded', desc: 'Reacts to lights and 3D shadows' },
                { id: 'shadeless', label: 'Shadeless', desc: 'Flat 2D graphic illustration' },
                { id: 'glow', label: 'Glow', desc: 'Emissive neon bloom aura' },
                { id: 'cutout', label: 'Cutout', desc: 'Spatial negative-space mask' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onChangeMaterial(m.id as MaterialType)}
                  className={`p-3 rounded-2xl text-left border feather-btn ${
                    material === m.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{m.label}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Pattern Tab */}
          {colorTab === 'pattern' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'none', label: 'Solid' },
                  { id: 'dot', label: 'Dot' },
                  { id: 'line', label: 'Line' },
                  { id: 'cross', label: 'Cross' },
                  { id: 'terrazzo', label: 'Terrazzo' },
                  { id: 'stipple', label: 'Stipple' },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => onChangePattern(pat.id as ProceduralPattern)}
                    className={`py-2 text-xs font-bold rounded-xl capitalize feather-btn ${
                      pattern === pat.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    {pat.label}
                  </button>
                ))}
              </div>

              {pattern !== 'none' && (
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Pattern Scale</span>
                    <span className="font-mono">{patternScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={patternScale}
                    onChange={(e) => onChangePatternScale(Number(e.target.value))}
                    className="w-full"
                  />

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Pattern Angle</span>
                    <span className="font-mono">{patternAngle} deg</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={patternAngle}
                    onChange={(e) => onChangePatternAngle(Number(e.target.value))}
                    className="w-full"
                  />

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Pattern Contrast</span>
                    <span className="font-mono">{Math.round(patternContrast * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={patternContrast}
                    onChange={(e) => onChangePatternContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
