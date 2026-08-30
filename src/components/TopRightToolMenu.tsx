import React, { useState } from 'react';
import { ToolMode } from '../types';

interface TopRightToolMenuProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  isStagePanelOpen: boolean;
  onToggleStagePanel: () => void;
  isClipboardOpen: boolean;
  onToggleClipboard: () => void;
  isDualNavOpen?: boolean;
  onToggleDualNav?: () => void;
  activeMirrorAxis: { x: boolean; y: boolean; z: boolean };
  onToggleMirrorAxis: (axis: 'x' | 'y' | 'z') => void;
  radialSymmetry: { count: number; axis: 'x' | 'y' | 'z' };
  onChangeRadialSymmetry: (radial: { count: number; axis: 'x' | 'y' | 'z' }) => void;
}

export const TopRightToolMenu: React.FC<TopRightToolMenuProps> = ({
  toolMode,
  onSetToolMode,
  isStagePanelOpen,
  onToggleStagePanel,
  isClipboardOpen,
  onToggleClipboard,
  isDualNavOpen,
  onToggleDualNav,
  activeMirrorAxis,
  onToggleMirrorAxis,
  radialSymmetry,
  onChangeRadialSymmetry,
}) => {
  const [showMirrorMenu, setShowMirrorMenu] = useState(false);

  const handleDrawClick = () => {
    if (toolMode === 'draw') {
      onSetToolMode('draw_shape');
    } else {
      onSetToolMode('draw');
    }
  };

  const handleEraseClick = () => {
    if (toolMode === 'erase') {
      onSetToolMode('vacuum');
    } else {
      onSetToolMode('erase');
    }
  };

  const handleSelectClick = () => {
    if (toolMode === 'select') {
      onSetToolMode('deselect');
    } else {
      onSetToolMode('select');
    }
  };

  const isMirrorActive = (activeMirrorAxis?.x ?? false) || (activeMirrorAxis?.y ?? false) || (activeMirrorAxis?.z ?? false) || (radialSymmetry?.count ?? 0) > 0;

  return (
    <div className="hidden md:flex absolute top-3 sm:top-4 right-3 sm:right-4 z-40 items-center gap-1 sm:gap-1.5 p-1 rounded-2xl feather-panel shadow-lg border border-zinc-200/80 dark:border-zinc-700/80">
      {/* 1. Draw / Draw Shape Button */}
      <button
        id="btn-tool-draw"
        onClick={handleDrawClick}
        title={toolMode === 'draw_shape' ? 'Draw Shape (Line and Arc Snapping)' : 'Draw Freeform 3D Splines'}
        className={`relative px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
          toolMode === 'draw' || toolMode === 'draw_shape'
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <span>{toolMode === 'draw_shape' ? 'Shape' : 'Draw'}</span>
      </button>

      {/* 2. Erase / Vacuum Button */}
      <button
        id="btn-tool-erase"
        onClick={handleEraseClick}
        title={toolMode === 'vacuum' ? 'Vacuum (Area-of-Effect Deletion)' : 'Precision Centerline Eraser'}
        className={`px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
          toolMode === 'erase' || toolMode === 'vacuum'
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <span>{toolMode === 'vacuum' ? 'Vacuum' : 'Erase'}</span>
      </button>

      {/* 3. Select / Deselect Button */}
      <button
        id="btn-tool-select"
        onClick={handleSelectClick}
        title={toolMode === 'deselect' ? 'Deselect Lasso' : 'Select Lasso / 3D Transform'}
        className={`px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
          toolMode === 'select' || toolMode === 'deselect' || toolMode === 'liquify'
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <span>{toolMode === 'deselect' ? 'Deselect' : 'Select'}</span>
      </button>

      {/* 4. Symmetry and Radial Array Button */}
      <div className="relative">
        <button
          id="btn-tool-mirror"
          onClick={() => setShowMirrorMenu(!showMirrorMenu)}
          title="Symmetry and Radial Array Engine"
          className={`relative px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
            isMirrorActive
              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>Symmetry</span>
          {radialSymmetry.count > 0 && (
            <span className="ml-1 px-1 bg-emerald-500 text-white text-[9px] font-bold rounded-full">
              {radialSymmetry.count}X
            </span>
          )}
        </button>

        {/* Symmetry and Radial Dropdown */}
        {showMirrorMenu && (
          <div className="absolute top-12 right-0 w-52 p-3 rounded-2xl feather-panel shadow-2xl border border-zinc-200 dark:border-zinc-700 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Mirror Planes */}
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider px-1 text-zinc-400">
                Mirror Planes
              </div>
              {(['x', 'y', 'z'] as const).map((axis) => (
                <button
                  key={axis}
                  onClick={() => onToggleMirrorAxis(axis)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold feather-btn ${
                    activeMirrorAxis[axis]
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{axis.toUpperCase()} Plane</span>
                  <span>{activeMirrorAxis[axis] ? 'ON' : 'OFF'}</span>
                </button>
              ))}
            </div>

            {/* Radial Array Symmetry */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider px-1 text-zinc-400">
                <span>Radial Symmetry</span>
                <span className="text-emerald-500 font-mono">
                  {radialSymmetry.count > 0 ? `${radialSymmetry.count}X (${radialSymmetry.axis.toUpperCase()})` : 'OFF'}
                </span>
              </div>

              {/* Radial Multipliers */}
              <div className="grid grid-cols-5 gap-1">
                {[0, 3, 4, 6, 8, 12].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() =>
                      onChangeRadialSymmetry({
                        ...radialSymmetry,
                        count: cnt,
                      })
                    }
                    className={`py-1 text-[11px] font-bold rounded-lg ${
                      radialSymmetry.count === cnt
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {cnt === 0 ? 'OFF' : `${cnt}X`}
                  </button>
                ))}
              </div>

              {/* Radial Axis Selection */}
              {radialSymmetry.count > 0 && (
                <div className="flex items-center justify-between gap-1 pt-1">
                  {(['x', 'y', 'z'] as const).map((ax) => (
                    <button
                      key={ax}
                      onClick={() =>
                        onChangeRadialSymmetry({
                          ...radialSymmetry,
                          axis: ax,
                        })
                      }
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg ${
                        radialSymmetry.axis === ax
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {ax}-Axis
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Clipboard Reference Floating Overlay Toggle */}
      <button
        id="btn-tool-clipboard"
        onClick={onToggleClipboard}
        title="Clipboard Reference Board"
        className={`px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
          isClipboardOpen
            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <span>Board</span>
      </button>

      {/* 6. Single Hand Dual Navigator Toggle */}
      {onToggleDualNav && (
        <button
          id="btn-tool-dual-nav"
          onClick={onToggleDualNav}
          title="Single-Hand Dual Navigator (Camera and Drawing Surface)"
          className={`px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
            isDualNavOpen
              ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
              : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>Nav</span>
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

      {/* 7. Stage Panel Toggle */}
      <button
        id="btn-stage-panel"
        onClick={onToggleStagePanel}
        title="Stage Panel (Groups, Resources, Environment)"
        className={`px-3 h-9 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold feather-btn ${
          isStagePanelOpen
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        <span>Stage</span>
      </button>
    </div>
  );
};
