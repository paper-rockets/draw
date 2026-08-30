import React, { useState, useRef, useEffect } from 'react';
import { 
  ToolMode, 
  GuidePrimitiveType, 
  LiquifyMode, 
  Guide3D 
} from '../types';

interface BottomContextRibbonProps {
  toolMode: ToolMode;
  onSetToolMode: (mode: ToolMode) => void;
  activeGuide: Guide3D | null;
  onCloseGuide: () => void;
  onSaveGuideToResources: () => void;
  onChangeGuideOpacity: (opacity: number) => void;
  onSpawnGuide: (type: GuidePrimitiveType, segments?: number) => void;
  onStartBendGuide: () => void;
  isBendingGuide: boolean;
  onStartLoft: () => void;
  loftTension: number;
  onChangeLoftTension: (t: number) => void;
  stableStrokeAmount: number;
  onChangeStableStroke: (val: number) => void;
  hasSelection: boolean;
  onDuplicateSelection: () => void;
  onDuplicateSymmetricallyByView: () => void;
  onDuplicateSymmetricallyByMirror: () => void;
  onDeleteSelection: () => void;
  onSmoothSelection?: (strength: number) => void;
  onDecimateSelection?: () => void;
  activeJoystickType: '2d' | '3d';
  onToggleJoystickType: () => void;
  liquifyMode: LiquifyMode;
  onSetLiquifyMode: (mode: LiquifyMode) => void;
  liquifySize: number;
  onChangeLiquifySize: (s: number) => void;
  liquifyStrength: number;
  onChangeLiquifyStrength: (s: number) => void;
  onApplyLiquify: () => void;
  onCancelLiquify: () => void;
  onToggleCompareLiquify?: () => void;
  isComparingLiquify?: boolean;
}

export const BottomContextRibbon: React.FC<BottomContextRibbonProps> = ({
  toolMode,
  onSetToolMode,
  activeGuide,
  onCloseGuide,
  onSaveGuideToResources,
  onChangeGuideOpacity,
  onSpawnGuide,
  onStartBendGuide,
  isBendingGuide,
  onStartLoft,
  loftTension,
  onChangeLoftTension,
  stableStrokeAmount,
  onChangeStableStroke,
  hasSelection,
  onDuplicateSelection,
  onDuplicateSymmetricallyByView,
  onDuplicateSymmetricallyByMirror,
  onDeleteSelection,
  onSmoothSelection,
  onDecimateSelection,
  activeJoystickType,
  onToggleJoystickType,
  liquifyMode,
  onSetLiquifyMode,
  liquifySize,
  onChangeLiquifySize,
  liquifyStrength,
  onChangeLiquifyStrength,
  onApplyLiquify,
  onCancelLiquify,
  onToggleCompareLiquify,
  isComparingLiquify = false,
}) => {
  const [showPrimitivesModal, setShowPrimitivesModal] = useState(false);
  const [primitiveSegments, setPrimitiveSegments] = useState(16);
  const [showStableSlider, setShowStableSlider] = useState(false);
  const [showLoftSlider, setShowLoftSlider] = useState(false);
  const [showSmoothSlider, setShowSmoothSlider] = useState(false);
  const [showLightenModal, setShowLightenModal] = useState(false);
  const [smoothAmount, setSmoothAmount] = useState(0.5);

  const sandboxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sandboxPoints, setSandboxPoints] = useState<{ x: number; y: number }[]>([]);
  const isSandboxDrawingRef = useRef(false);

  useEffect(() => {
    if (!showStableSlider || !sandboxCanvasRef.current) return;
    const canvas = sandboxCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(150, 150, 150, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    if (sandboxPoints.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(sandboxPoints[0].x, sandboxPoints[0].y);
    for (let i = 1; i < sandboxPoints.length; i++) {
      ctx.lineTo(sandboxPoints[i].x, sandboxPoints[i].y);
    }
    ctx.strokeStyle = 'rgba(160, 174, 192, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const smoothed: { x: number; y: number }[] = [];
    const filterWeight = 1 - stableStrokeAmount * 0.85;

    let prevX = sandboxPoints[0].x;
    let prevY = sandboxPoints[0].y;
    smoothed.push({ x: prevX, y: prevY });

    for (let i = 1; i < sandboxPoints.length; i++) {
      const curX = sandboxPoints[i].x;
      const curY = sandboxPoints[i].y;
      prevX = prevX + (curX - prevX) * filterWeight;
      prevY = prevY + (curY - prevY) * filterWeight;
      smoothed.push({ x: prevX, y: prevY });
    }

    ctx.beginPath();
    ctx.moveTo(smoothed[0].x, smoothed[0].y);
    for (let i = 1; i < smoothed.length; i++) {
      const xc = (smoothed[i].x + smoothed[i - 1].x) / 2;
      const yc = (smoothed[i].y + smoothed[i - 1].y) / 2;
      ctx.quadraticCurveTo(smoothed[i - 1].x, smoothed[i - 1].y, xc, yc);
    }
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, [showStableSlider, sandboxPoints, stableStrokeAmount]);

  const handleSandboxPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isSandboxDrawingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    setSandboxPoints([{ x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleSandboxPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isSandboxDrawingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSandboxPoints((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top }]);
  };

  const handleSandboxPointerUp = () => {
    isSandboxDrawingRef.current = false;
  };

  // 1. Active 3D Guide Close/Opacity/Save Widget
  if (activeGuide) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] overflow-x-auto flex items-center gap-2 px-3 py-2 rounded-full feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
          <span>Guide: {activeGuide.type.toUpperCase()}</span>
        </div>

        {/* Opacity Slider */}
        <div className="flex items-center gap-2 px-2 border-l border-r border-zinc-200 dark:border-zinc-700">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Opacity</span>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(activeGuide.opacity * 100)}
            onChange={(e) => onChangeGuideOpacity(Number(e.target.value) / 100)}
            className="w-20 accent-emerald-500"
          />
          <span className="text-xs font-mono w-7 text-right">
            {Math.round(activeGuide.opacity * 100)}%
          </span>
        </div>

        {/* Bend Guide Trigger */}
        <button
          onClick={onStartBendGuide}
          className={`px-3 py-1 text-xs font-bold rounded-full feather-btn ${
            isBendingGuide
              ? 'bg-amber-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200'
          }`}
        >
          {isBendingGuide ? 'Drawing Bend...' : 'Bend Guide'}
        </button>

        {/* Save to Resources */}
        <button
          onClick={onSaveGuideToResources}
          title="Save surface to Resource Tab"
          className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white hover:bg-blue-600 feather-btn"
        >
          Save
        </button>

        {/* Close Button */}
        <button
          onClick={onCloseGuide}
          title="Dismiss 3D Guide"
          className="px-2.5 py-1 text-xs font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-red-500 hover:text-white feather-btn"
        >
          Close
        </button>
      </div>
    );
  }

  // 2. Liquify Active State Ribbon
  if (toolMode === 'liquify') {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] overflow-x-auto flex items-center gap-3 px-4 py-2.5 rounded-full feather-panel shadow-2xl border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom duration-200">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full">
          {(['push', 'pinch', 'comb'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSetLiquifyMode(mode)}
              className={`px-3 py-1 text-xs font-bold capitalize rounded-full transition-all ${
                liquifyMode === mode
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Size</span>
          <input
            type="range"
            min="0.1"
            max="1.5"
            step="0.05"
            value={liquifySize}
            onChange={(e) => onChangeLiquifySize(Number(e.target.value))}
            className="w-16 accent-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Strength</span>
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={liquifyStrength}
            onChange={(e) => onChangeLiquifyStrength(Number(e.target.value))}
            className="w-16 accent-emerald-500"
          />
        </div>

        {onToggleCompareLiquify && (
          <button
            onClick={onToggleCompareLiquify}
            title="A/B Compare"
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              isComparingLiquify
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200'
            }`}
          >
            <span>{isComparingLiquify ? 'Original' : 'Compare A/B'}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onCancelLiquify}
            title="Cancel Liquify"
            className="px-3 py-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 text-xs font-bold feather-btn"
          >
            Cancel
          </button>
          <button
            onClick={onApplyLiquify}
            title="Commit Liquify Changes"
            className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold shadow-md feather-btn"
          >
            Apply
          </button>
        </div>
      </div>
    );
  }

  // 3. Selection Active Ribbon
  if (toolMode === 'select' && hasSelection) {
    return (
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] overflow-x-auto flex items-center gap-2 p-1.5 rounded-full feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 animate-in slide-in-from-bottom duration-200">
        <button
          onClick={onToggleJoystickType}
          title={`Transform Joystick: ${activeJoystickType.toUpperCase()} Mode`}
          className="px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold feather-btn"
        >
          <span>{activeJoystickType === '2d' ? '2D Joystick' : '3D Joystick'}</span>
        </button>

        <button
          onClick={() => onSetToolMode('liquify')}
          title="3D Curve Liquify"
          className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 feather-btn"
        >
          <span>Liquify</span>
        </button>

        <button
          onClick={onDuplicateSelection}
          title="Duplicate Selection"
          className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 feather-btn"
        >
          Duplicate
        </button>

        <button
          onClick={onDuplicateSymmetricallyByView}
          title="Duplicate Symmetrically by View Center"
          className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 feather-btn"
        >
          Sym. View
        </button>

        <button
          onClick={onDuplicateSymmetricallyByMirror}
          title="Duplicate Symmetrically by Active Mirror Axis"
          className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 feather-btn"
        >
          Sym. Mirror
        </button>

        {onSmoothSelection && (
          <div className="relative">
            <button
              onClick={() => setShowSmoothSlider(!showSmoothSlider)}
              title="Smooth Selected Curves"
              className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 feather-btn"
            >
              <span>Smooth</span>
            </button>

            {showSmoothSlider && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 p-3 rounded-2xl feather-panel shadow-2xl space-y-2 border border-zinc-200 dark:border-zinc-700">
                <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  <span>Curve Smooth</span>
                  <span>{Math.round(smoothAmount * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={smoothAmount}
                  onChange={(e) => setSmoothAmount(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <button
                  onClick={() => {
                    onSmoothSelection(smoothAmount);
                    setShowSmoothSlider(false);
                  }}
                  className="w-full py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs feather-btn"
                >
                  Apply Smoothing
                </button>
              </div>
            )}
          </div>
        )}

        {onDecimateSelection && (
          <div className="relative">
            <button
              onClick={() => setShowLightenModal(!showLightenModal)}
              title="Lighten Tool: Mesh decimation"
              className="px-2.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-200 feather-btn"
            >
              <span>Lighten</span>
            </button>

            {showLightenModal && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-52 p-3 rounded-2xl feather-panel shadow-2xl space-y-2.5 border border-zinc-200 dark:border-zinc-700">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  <span>Lighten Selection</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Decimates spline vertices to optimize rendering performance.
                </p>
                <button
                  onClick={() => {
                    onDecimateSelection();
                    setShowLightenModal(false);
                  }}
                  className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs feather-btn"
                >
                  Run Decimation
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onDeleteSelection}
          title="Delete Selected Geometry"
          className="px-2.5 py-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-xs font-semibold feather-btn"
        >
          Delete
        </button>
      </div>
    );
  }

  // 4. Default Bottom Context Ribbon
  return (
    <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] overflow-x-auto items-center gap-2 p-1.5 rounded-full feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80">
      <button
        id="btn-draw-guide"
        onClick={() => onSpawnGuide('plane', 16)}
        title="Spawn 3D Guide Plane"
        className="px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 feather-btn"
      >
        <span>Draw 3D Guide</span>
      </button>

      <div className="relative">
        <button
          id="btn-loft-curves"
          onClick={() => {
            onStartLoft();
            setShowLoftSlider(!showLoftSlider);
          }}
          title="Loft Surfaces between Selected Curves"
          className="px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 feather-btn"
        >
          <span>Loft</span>
        </button>

        {showLoftSlider && (
          <div className="absolute bottom-12 left-0 w-48 p-3 rounded-2xl feather-panel shadow-xl space-y-2 border border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300">
              <span>Loft Tension</span>
              <span>{Math.round(loftTension * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(loftTension * 100)}
              onChange={(e) => onChangeLoftTension(Number(e.target.value) / 100)}
              className="w-full accent-blue-500"
            />
            <p className="text-[10px] text-zinc-400 leading-tight">
              Adjusts curvature smoothness and angular tension between NURBS surface contours.
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          id="btn-primitives"
          onClick={() => setShowPrimitivesModal(!showPrimitivesModal)}
          title="Procedural 3D Primitives Generator"
          className="px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 feather-btn"
        >
          <span>Primitives</span>
        </button>

        {showPrimitivesModal && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-64 p-3 rounded-3xl feather-panel shadow-2xl space-y-3 border border-zinc-200 dark:border-zinc-700 animate-in zoom-in-95 duration-150">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
              Insert 3D Primitive
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['cube', 'pyramid', 'sphere', 'tube'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    onSpawnGuide(type, primitiveSegments);
                    setShowPrimitivesModal(false);
                  }}
                  className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold capitalize text-left hover:bg-emerald-500 hover:text-white feather-btn"
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Segments Resolution</span>
                <span className="font-mono">{primitiveSegments}</span>
              </div>
              <input
                type="range"
                min="3"
                max="64"
                value={primitiveSegments}
                onChange={(e) => setPrimitiveSegments(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setShowStableSlider(!showStableSlider)}
          title="Stable Stroke Filter and Sandbox"
          className={`px-3 py-1.5 rounded-full text-xs font-bold feather-btn ${
            showStableSlider
              ? 'bg-emerald-500 text-white shadow-md'
              : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
          }`}
        >
          <span>Stabilize</span>
        </button>

        {showStableSlider && (
          <div className="absolute bottom-12 right-0 w-64 p-3.5 rounded-3xl feather-panel shadow-2xl space-y-3 border border-zinc-200 dark:border-zinc-700 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-800 dark:text-zinc-100">
              <span>Stable Stroke Filter</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {Math.round(stableStrokeAmount * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(stableStrokeAmount * 100)}
              onChange={(e) => onChangeStableStroke(Number(e.target.value) / 100)}
              className="w-full accent-emerald-500"
            />

            {/* Sandbox Testing Canvas */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>Interactive Testing Pad</span>
                <button
                  type="button"
                  onClick={() => setSandboxPoints([])}
                  className="text-emerald-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="relative w-full h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden touch-none">
                <canvas
                  ref={sandboxCanvasRef}
                  width={230}
                  height={96}
                  onPointerDown={handleSandboxPointerDown}
                  onPointerMove={handleSandboxPointerMove}
                  onPointerUp={handleSandboxPointerUp}
                  className="w-full h-full cursor-crosshair"
                />
                {sandboxPoints.length === 0 && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-[10px] text-zinc-400 italic">
                    Draw here to test smoothing response
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
