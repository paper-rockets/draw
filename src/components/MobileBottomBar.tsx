import React, { useState } from 'react';
import { 
  ToolMode, 
  BrushType, 
  MaterialType, 
  ProceduralPattern, 
  BrushPreset 
} from '../types';

interface MobileBottomBarProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  brushType: BrushType;
  onSetBrushType: (type: BrushType) => void;
  color: string;
  onChangeColor: (color: string) => void;
  brushSize: number;
  onChangeBrushSize: (size: number) => void;
  opacity: number;
  onChangeOpacity: (opacity: number) => void;
  jitter: number;
  onChangeJitter: (jitter: number) => void;
  pressureSensitive: boolean;
  onTogglePressure: () => void;
  palmRejectionEnabled?: boolean;
  onTogglePalmRejection?: () => void;
  palmRejectionRadius?: number;
  onChangePalmRejectionRadius?: (radius: number) => void;
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
  isFingerPenMode: boolean;
  onToggleFingerPen: () => void;
  isDualNavOpen?: boolean;
  onToggleDualNav?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleStagePanel: () => void;
  isStagePanelOpen: boolean;
  onToggleHideUI: () => void;
  presets: BrushPreset[];
  onSavePreset: () => void;
  onLoadPreset: (p: BrushPreset) => void;
  onDeletePreset: (id: string) => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  toolMode,
  onSetToolMode,
  brushType,
  onSetBrushType,
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
  onChangePalmRejectionRadius,
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
  isFingerPenMode,
  onToggleFingerPen,
  isDualNavOpen,
  onToggleDualNav,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleStagePanel,
  isStagePanelOpen,
  onToggleHideUI,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}) => {
  const [isBrushSheetOpen, setIsBrushSheetOpen] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<'brush' | 'color' | 'material' | 'pattern' | 'presets'>('brush');

  const paletteColors = [
    '#ffffff', '#18191c', '#ff3b30', '#ff9500', '#ffcc00', 
    '#34c759', '#00e676', '#007aff', '#5856d6', '#af52de', 
    '#ff2d55', '#a2845e', '#8e8e93', '#636366', '#00f2fe'
  ];

  const brushTypes: { id: BrushType; label: string; tag: string }[] = [
    { id: 'tube', label: '3D Tube', tag: 'Tube' },
    { id: 'ribbon', label: 'Ribbon Tape', tag: 'Ribbon' },
    { id: 'marker', label: 'Chisel Nib', tag: 'Marker' },
    { id: 'conformal', label: 'Conformal Dome', tag: 'Dome' },
    { id: 'flat', label: 'Flat Pen', tag: 'Flat' },
  ];

  return (
    <>
      {/* Mobile Floating Bottom Bar */}
      <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-16px)] max-w-md">
        <div className="flex items-center justify-between gap-1 p-1 rounded-full feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 backdrop-blur-xl overflow-x-auto">
          {/* 1. Draw Tool */}
          <button
            id="mobile-btn-draw"
            onClick={() => {
              if (toolMode === 'draw') onSetToolMode('draw_shape');
              else onSetToolMode('draw');
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex flex-col items-center justify-center feather-btn text-[10px] font-bold ${
              toolMode === 'draw' || toolMode === 'draw_shape'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Draw Tool"
          >
            <span>Draw</span>
          </button>

          {/* 2. Erase Tool */}
          <button
            id="mobile-btn-erase"
            onClick={() => {
              if (toolMode === 'erase') onSetToolMode('vacuum');
              else onSetToolMode('erase');
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center feather-btn text-[10px] font-bold ${
              toolMode === 'erase' || toolMode === 'vacuum'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Erase / Vacuum"
          >
            <span>{toolMode === 'vacuum' ? 'Vac' : 'Erase'}</span>
          </button>

          {/* 3. Select Tool */}
          <button
            id="mobile-btn-select"
            onClick={() => {
              if (toolMode === 'select') onSetToolMode('deselect');
              else onSetToolMode('select');
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center feather-btn text-[10px] font-bold ${
              toolMode === 'select' || toolMode === 'deselect' || toolMode === 'liquify'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Select Tool"
          >
            <span>Select</span>
          </button>

          {/* 4. Brush & Color Quick Sheet Trigger */}
          <button
            id="mobile-btn-brush-sheet"
            onClick={() => setIsBrushSheetOpen(!isBrushSheetOpen)}
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full p-0.5 flex items-center justify-center feather-btn relative hover:scale-105"
            title="Brush and Color Settings"
          >
            <div 
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white dark:border-zinc-800 shadow-md flex items-center justify-center text-[9px] font-black"
              style={{ backgroundColor: color }}
            >
              <span className="sr-only">Color</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center text-[7px] sm:text-[8px] font-bold shadow-xs">
              {Math.round(brushSize)}
            </div>
          </button>

          {/* 5. Finger Mode Toggle */}
          <button
            id="mobile-btn-finger-mode"
            onClick={onToggleFingerPen}
            className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex flex-col items-center justify-center feather-btn ${
              isFingerPenMode 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
            title={isFingerPenMode ? 'Finger Drawing Active' : '3D Orbit Mode Active'}
          >
            <span className="text-[7px] sm:text-[8px] font-bold uppercase leading-none">
              {isFingerPenMode ? 'Draw' : 'Orbit'}
            </span>
          </button>

          {/* 5b. Dual Nav Toggle */}
          {onToggleDualNav && (
            <button
              id="mobile-btn-dual-nav"
              onClick={onToggleDualNav}
              className={`w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full flex flex-col items-center justify-center feather-btn ${
                isDualNavOpen
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
              title="Single-Hand Dual Navigator"
            >
              <span className="text-[7px] sm:text-[8px] font-bold uppercase leading-none">1-Hand</span>
            </button>
          )}

          {/* 6. Undo Button */}
          <button
            id="mobile-btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center feather-btn text-zinc-700 dark:text-zinc-200 disabled:opacity-30 active:scale-90 text-[10px] font-bold"
            title="Undo"
          >
            Undo
          </button>

          {/* 7. Redo Button */}
          <button
            id="mobile-btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center feather-btn text-zinc-700 dark:text-zinc-200 disabled:opacity-30 active:scale-90 text-[10px] font-bold"
            title="Redo"
          >
            Redo
          </button>

          {/* 8. Stage Panel Toggle */}
          <button
            id="mobile-btn-stage"
            onClick={onToggleStagePanel}
            className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full flex items-center justify-center feather-btn text-[10px] font-bold ${
              isStagePanelOpen 
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
                : 'text-zinc-600 dark:text-zinc-300'
            }`}
            title="Stage and Layers"
          >
            Stage
          </button>
        </div>
      </div>

      {/* Mobile Brush and Color Bottom Sheet */}
      {isBrushSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="w-full bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl p-4 space-y-4 max-h-[80vh] overflow-y-auto border-t border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom duration-250">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div 
                  className="w-5 h-5 rounded-full border border-black/20"
                  style={{ backgroundColor: color }}
                />
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  Brush and Style Studio
                </span>
              </div>
              <button
                onClick={() => setIsBrushSheetOpen(false)}
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 feather-btn"
              >
                Close
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
              {(['brush', 'color', 'material', 'pattern', 'presets'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSheetTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg capitalize transition-all ${
                    activeSheetTab === tab
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs font-bold'
                      : 'text-zinc-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB 1: BRUSH */}
            {activeSheetTab === 'brush' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-4 gap-2">
                  {brushTypes.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onSetBrushType(b.id)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 feather-btn ${
                        brushType === b.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md font-bold'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="text-xs font-bold">{b.tag}</span>
                      <span className="text-[10px] truncate">{b.label}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <span>Stroke Size</span>
                    <span className="font-mono text-emerald-500">{brushSize} mm</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    value={brushSize}
                    onChange={(e) => onChangeBrushSize(Number(e.target.value))}
                    className="w-full h-2 rounded-lg accent-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <span>Opacity</span>
                    <span className="font-mono text-emerald-500">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={Math.round(opacity * 100)}
                    onChange={(e) => onChangeOpacity(Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-lg accent-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <span>Organic Jitter</span>
                    <span className="font-mono text-emerald-500">{Math.round(jitter * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(jitter * 100)}
                    onChange={(e) => onChangeJitter(Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-lg accent-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Stylus Pressure Dynamics
                  </div>
                  <button
                    onClick={onTogglePressure}
                    className={`px-3 py-1 rounded-full text-xs font-bold feather-btn ${
                      pressureSensitive 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {pressureSensitive ? 'ENABLED' : 'OFF'}
                  </button>
                </div>

                {onTogglePalmRejection && (
                  <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Palm Rejection</div>
                        <div className="text-[10px] text-zinc-400">Discards touches near stylus tip</div>
                      </div>
                      <button
                        onClick={onTogglePalmRejection}
                        className={`px-3 py-1 rounded-full text-xs font-bold feather-btn ${
                          palmRejectionEnabled 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {palmRejectionEnabled ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    {palmRejectionEnabled && onChangePalmRejectionRadius && (
                      <div className="space-y-1.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                        <div className="flex justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          <span>Proximity Threshold</span>
                          <span className="font-mono text-blue-500">{palmRejectionRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="320"
                          step="10"
                          value={palmRejectionRadius}
                          onChange={(e) => onChangePalmRejectionRadius(Number(e.target.value))}
                          className="w-full h-2 rounded-lg accent-blue-500 cursor-pointer"
                        />
                        <div className="flex gap-1.5 pt-1">
                          {[
                            { label: 'Tight', val: 90 },
                            { label: 'Balanced', val: 160 },
                            { label: 'Wide', val: 240 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => onChangePalmRejectionRadius(preset.val)}
                              className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                                palmRejectionRadius === preset.val
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                              }`}
                            >
                              {preset.label} ({preset.val}px)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COLOR */}
            {activeSheetTab === 'color' && (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => onChangeColor(e.target.value)}
                    className="w-14 h-14 rounded-2xl cursor-pointer bg-transparent border-0"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-xs text-zinc-400">Selected Hex:</span>
                    <div className="font-mono font-bold text-sm uppercase text-zinc-800 dark:text-zinc-100">
                      {color}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-3 pt-2">
                  {paletteColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => onChangeColor(c)}
                      className={`h-11 rounded-2xl border-2 feather-btn transition-transform ${
                        color.toLowerCase() === c.toLowerCase()
                          ? 'border-emerald-500 scale-110 shadow-md'
                          : 'border-black/10 dark:border-white/10'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: MATERIAL */}
            {activeSheetTab === 'material' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { id: 'shaded', label: 'Shaded', desc: 'Reacts to lights and 3D shadows' },
                  { id: 'shadeless', label: 'Shadeless', desc: 'Flat 2D graphic illustration' },
                  { id: 'glow', label: 'Glow', desc: 'Emissive neon bloom aura' },
                  { id: 'cutout', label: 'Cutout', desc: 'Spatial negative-space mask' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onChangeMaterial(m.id as MaterialType)}
                    className={`p-3 rounded-2xl text-left feather-btn transition-all ${
                      material === m.id
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md ring-2 ring-emerald-500'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="font-bold text-xs capitalize">{m.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 4: PATTERN */}
            {activeSheetTab === 'pattern' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'None' },
                    { id: 'dot', label: 'Dot Halftone' },
                    { id: 'line', label: 'Line Hatch' },
                    { id: 'cross', label: 'Crosshatch' },
                    { id: 'terrazzo', label: 'Terrazzo' },
                    { id: 'stipple', label: 'Stipple Noise' },
                  ].map((pat) => (
                    <button
                      key={pat.id}
                      onClick={() => onChangePattern(pat.id as ProceduralPattern)}
                      className={`p-2.5 rounded-xl text-center feather-btn ${
                        pattern === pat.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-md'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="text-xs">{pat.label}</span>
                    </button>
                  ))}
                </div>

                {pattern !== 'none' && (
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Pattern Scale</span>
                        <span className="font-mono">{patternScale.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="4.0"
                        step="0.1"
                        value={patternScale}
                        onChange={(e) => onChangePatternScale(Number(e.target.value))}
                        className="w-full h-2 accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Pattern Angle</span>
                        <span className="font-mono">{patternAngle} deg</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={patternAngle}
                        onChange={(e) => onChangePatternAngle(Number(e.target.value))}
                        className="w-full h-2 accent-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
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
                        className="w-full h-2 accent-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: PRESETS */}
            {activeSheetTab === 'presets' && (
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-zinc-500">Saved Presets</span>
                  <button
                    onClick={onSavePreset}
                    className="px-3 py-1 rounded-xl bg-emerald-500 text-white text-xs font-bold feather-btn"
                  >
                    Save Current
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800"
                    >
                      <button
                        onClick={() => {
                          onLoadPreset(preset);
                          setIsBrushSheetOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-black/20"
                          style={{ backgroundColor: preset.color }}
                        />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                            {preset.name}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {preset.size}mm | {Math.round(preset.opacity * 100)}%
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => onDeletePreset(preset.id)}
                        className="px-2 py-0.5 text-xs font-bold text-red-500 feather-btn"
                      >
                        Del
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
