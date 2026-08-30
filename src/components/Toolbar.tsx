import React, { useState } from 'react';
import {
  ToolType,
  BrushSettings,
  SymmetryMode,
  Layer,
} from '../types';
import {
  Paintbrush,
  Sparkles,
  Layers,
  Sliders,
  Box,
  Download,
  Pipette,
  Eraser,
  Split,
  ChevronUp,
  ChevronDown,
  Circle,
  SlidersHorizontal,
} from 'lucide-react';

interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  symmetry: SymmetryMode;
  setSymmetry: (sym: SymmetryMode) => void;
  activeLayer: Layer;
  layers: Layer[];
  onOpenLayers: () => void;
  onOpenSettings: () => void;
  onOpenModels: () => void;
  onOpenExport: () => void;
  isLayersOpen: boolean;
  isSettingsOpen: boolean;
}

const PRESET_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f8fafc', // White
  '#0f172a', // Black
  '#e2e8f0', // Silver
  '#d97706', // Amber
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  brushSettings,
  setBrushSettings,
  symmetry,
  setSymmetry,
  activeLayer,
  layers,
  onOpenLayers,
  onOpenSettings,
  onOpenModels,
  onOpenExport,
  isLayersOpen,
  isSettingsOpen,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSymmetryMenu, setShowSymmetryMenu] = useState(false);
  const [showMobileSliders, setShowMobileSliders] = useState(false);

  const handleColorChange = (hex: string) => {
    setBrushSettings((prev) => ({ ...prev, color: hex }));
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSettings((prev) => ({ ...prev, size: parseFloat(e.target.value) }));
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSettings((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }));
  };

  return (
    <>
      {/* Mobile Quick Brush Sliders Drawer */}
      {showMobileSliders && (
        <div className="sm:hidden absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-[92%] p-3 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between text-xs text-neutral-300 font-semibold pb-1 border-b border-neutral-800">
            <span>Quick Brush Adjust</span>
            <button
              onClick={() => setShowMobileSliders(false)}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400 w-12">Size</span>
            <input
              type="range"
              min="0.01"
              max="0.25"
              step="0.005"
              value={brushSettings.size}
              onChange={handleSizeChange}
              className="flex-1 accent-blue-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-neutral-300 w-8 text-right">
              {Math.round(brushSettings.size * 200)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-neutral-400 w-12">Opacity</span>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={brushSettings.opacity}
              onChange={handleOpacityChange}
              className="flex-1 accent-blue-500 h-2 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-neutral-300 w-8 text-right">
              {Math.round(brushSettings.opacity * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Floating Bottom Center Main Toolbar */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-neutral-900/90 backdrop-blur-xl border border-neutral-800 shadow-2xl max-w-[98vw] sm:max-w-none overflow-x-auto scrollbar-none">
        {/* Tool Selectors */}
        <div className="flex items-center gap-0.5 sm:gap-1 pr-1 sm:pr-2 border-r border-neutral-800 shrink-0">
          <button
            id="tool-conformal-brush"
            title="Conformal Surface Decal Bead (Zero-Clipping 3D Stroke)"
            onClick={() => setTool('brush')}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              tool === 'brush'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            <span className="hidden sm:inline">Conformal 3D</span>
          </button>

          <button
            id="tool-uv-brush"
            title="UV Texture Map Painting: Paints directly onto the 3D model's 2D UV texture map. (Note: shared or overlapping UV islands in the 3D model's geometry will mirror/repeat the texture. Use Conformal 3D for direct 3D surface painting)."
            onClick={() => setTool('uv_brush')}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 ${
              tool === 'uv_brush'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">UV Canvas</span>
          </button>

          <button
            id="tool-eraser"
            title="Eraser Tool"
            onClick={() => setTool('eraser')}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
              tool === 'eraser'
                ? 'bg-red-600 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>

          <button
            id="tool-eyedropper"
            title="Eyedropper Color Picker"
            onClick={() => setTool('eyedropper')}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
              tool === 'eyedropper'
                ? 'bg-amber-600 text-white'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            <Pipette className="w-4 h-4" />
          </button>
        </div>

        {/* Color Swatch & Quick Palette Button */}
        <div className="relative shrink-0">
          <button
            id="btn-color-picker-toggle"
            title="Color Palette & Hex Picker"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowSymmetryMenu(false);
              setShowMobileSliders(false);
            }}
            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 transition-all active:scale-95"
          >
            <div
              className="w-5 h-5 rounded-lg shadow-inner border border-white/20 shrink-0"
              style={{ backgroundColor: brushSettings.color }}
            />
            <span className="text-xs font-mono text-neutral-200 hidden md:inline">
              {brushSettings.color.toUpperCase()}
            </span>
          </button>

          {/* Responsive Color Popover */}
          {showColorPicker && (
            <div className="fixed sm:absolute bottom-20 sm:bottom-14 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 w-[90vw] max-w-xs sm:w-64 p-3.5 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-neutral-300">Color Palette</span>
                <input
                  id="input-native-color"
                  type="color"
                  value={brushSettings.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>

              {/* Swatches */}
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {PRESET_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => handleColorChange(hex)}
                    className={`h-7 rounded-lg border transition-all active:scale-90 ${
                      brushSettings.color.toLowerCase() === hex.toLowerCase()
                        ? 'border-white ring-2 ring-blue-500 scale-105'
                        : 'border-white/10 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono">HEX</span>
                <input
                  id="input-hex-code"
                  type="text"
                  value={brushSettings.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sliders Quick Toggle Button */}
        <button
          id="btn-mobile-sliders-toggle"
          title="Quick Brush Size & Opacity"
          onClick={() => {
            setShowMobileSliders(!showMobileSliders);
            setShowColorPicker(false);
            setShowSymmetryMenu(false);
          }}
          className={`sm:hidden min-w-[40px] min-h-[40px] p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center ${
            showMobileSliders
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-neutral-800 border-neutral-700 text-neutral-300'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Desktop Quick Size & Opacity Controls */}
        <div className="hidden sm:flex items-center gap-3 px-2 border-l border-r border-neutral-800 shrink-0">
          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400">Size</span>
            <input
              id="slider-quick-size"
              type="range"
              min="0.01"
              max="0.25"
              step="0.005"
              value={brushSettings.size}
              onChange={handleSizeChange}
              className="w-18 accent-blue-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-neutral-300 w-6 text-right">
              {Math.round(brushSettings.size * 200)}
            </span>
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400">Opacity</span>
            <input
              id="slider-quick-opacity"
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={brushSettings.opacity}
              onChange={handleOpacityChange}
              className="w-18 accent-blue-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-neutral-300 w-8 text-right">
              {Math.round(brushSettings.opacity * 100)}%
            </span>
          </div>
        </div>

        {/* Symmetry Selector */}
        <div className="relative shrink-0">
          <button
            id="btn-symmetry-toggle"
            title="Symmetry & Mirror Modes"
            onClick={() => {
              setShowSymmetryMenu(!showSymmetryMenu);
              setShowColorPicker(false);
              setShowMobileSliders(false);
            }}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
              symmetry !== 'none'
                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                : 'bg-neutral-800 hover:bg-neutral-700/80 border-neutral-700 text-neutral-300'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden md:inline capitalize">
              {symmetry === 'none' ? 'Sym: Off' : symmetry.replace('_', ' ')}
            </span>
          </button>

          {showSymmetryMenu && (
            <div className="fixed sm:absolute bottom-20 sm:bottom-14 left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 w-48 p-2 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-40 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
              {(
                [
                  ['none', 'No Symmetry'],
                  ['mirror_x', 'Mirror X (Bilateral)'],
                  ['mirror_y', 'Mirror Y'],
                  ['mirror_z', 'Mirror Z'],
                  ['radial_4x', 'Radial 4X'],
                  ['radial_8x', 'Radial 8X'],
                ] as [SymmetryMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => {
                    setSymmetry(mode);
                    setShowSymmetryMenu(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                    symmetry === mode
                      ? 'bg-indigo-600 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Panels & Modals Triggers */}
        <div className="flex items-center gap-0.5 sm:gap-1 pl-1 border-l border-neutral-800 shrink-0">
          <button
            id="btn-open-layers"
            title="Layer System"
            onClick={onOpenLayers}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 relative p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
              isLayersOpen
                ? 'bg-blue-600 text-white'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-[9px] font-bold text-white">
              {layers.length}
            </span>
          </button>

          <button
            id="btn-open-settings"
            title="Advanced Brush & PBR Settings"
            onClick={onOpenSettings}
            className={`min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
              isSettingsOpen
                ? 'bg-blue-600 text-white'
                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            id="btn-open-models"
            title="Load 3D Models (GLB / OBJ)"
            onClick={onOpenModels}
            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all active:scale-95 flex items-center justify-center"
          >
            <Box className="w-4 h-4" />
          </button>

          <button
            id="btn-open-export"
            title="Export 3D Model & Textures"
            onClick={onOpenExport}
            className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-all active:scale-95 flex items-center justify-center"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

