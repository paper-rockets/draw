import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TransformJoystickMode,
  TransformTargetScope,
  PerfectViewInfo,
} from '../types';
import { StudioEngine } from '../core/studioEngine';
import {
  Lock,
  Unlock,
  Move,
  RotateCw,
  Scaling,
  Globe,
  Layers,
  Box,
  Spline,
  ChevronDown,
  Minimize2,
  Maximize2,
  Orbit,
  Compass,
  ShieldAlert,
  ArrowUp,
  ArrowRight,
  ArrowDownLeft,
} from 'lucide-react';

interface TransformJoystickProps {
  engine: StudioEngine | null;
  perfectView: PerfectViewInfo;
  onActiveTransformChange?: (active: boolean, actionLabel?: string, valueLabel?: string) => void;
}

type ActiveHandleType =
  | '2d_stick'
  | '2d_scale_y'
  | '2d_scale_x'
  | '2d_scale_free'
  | '2d_rotate'
  | '3d_cone_x'
  | '3d_cone_y'
  | '3d_cone_z'
  | '3d_arc_x'
  | '3d_arc_y'
  | '3d_arc_z'
  | '3d_trackball'
  | null;

// Tablet / Mobile subtle haptic feedback helper
const triggerHaptic = (type: 'tick' | 'snap' | 'lock') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'tick') navigator.vibrate(6);
      else if (type === 'snap') navigator.vibrate([10, 20, 10]);
      else if (type === 'lock') navigator.vibrate(15);
    } catch {}
  }
};

export const TransformJoystick: React.FC<TransformJoystickProps> = ({
  engine,
  perfectView,
  onActiveTransformChange,
}) => {
  const [mode, setMode] = useState<TransformJoystickMode>('2d');
  const [targetScope, setTargetScope] = useState<TransformTargetScope>('all');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<ActiveHandleType>(null);
  const [showScopeMenu, setShowScopeMenu] = useState<boolean>(false);

  // 2D Stick visual offset for elastic stretching & spring-back
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tracking refs
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const accumulatedValue = useRef<number>(0);
  const lastHapticAngleRef = useRef<number>(0);
  const activeHandleRef = useRef<ActiveHandleType>(null);
  activeHandleRef.current = activeHandle;

  // Cleanup on unmount or pointer release
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (activeHandleRef.current) {
        if (engine) {
          engine.endTransform();
        }
        setActiveHandle(null);
        setStickOffset({ x: 0, y: 0 });
        accumulatedValue.current = 0;
        lastHapticAngleRef.current = 0;
        onActiveTransformChange?.(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [engine, onActiveTransformChange]);

  // Start gesture handler
  const handlePointerDown = (
    e: React.PointerEvent,
    handle: ActiveHandleType,
    actionName: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    accumulatedValue.current = 0;
    lastHapticAngleRef.current = 0;
    setActiveHandle(handle);

    triggerHaptic('snap');
    engine.beginTransform(targetScope);
    onActiveTransformChange?.(true, actionName, '0.00');
  };

  // Move gesture handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !engine) return;
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - lastPointerPos.current.x;
    const dy = e.clientY - lastPointerPos.current.y;
    const totalDx = e.clientX - dragStartPos.current.x;
    const totalDy = e.clientY - dragStartPos.current.y;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };

    switch (activeHandle) {
      // ----------------------------------------------------
      // 1. 2D VIEW MODE HANDLERS
      // ----------------------------------------------------
      case '2d_stick': {
        // Central Move Stick: Elastic stretch & translation
        let currentOffX = totalDx;
        let currentOffY = totalDy;

        if (isLocked) {
          // Restrict to 4 absolute vectors (up, down, left, right)
          if (Math.abs(totalDx) > Math.abs(totalDy)) {
            currentOffY = 0;
          } else {
            currentOffX = 0;
          }
        }

        // Limit stretch radius smoothly
        const dist = Math.hypot(currentOffX, currentOffY);
        const maxDist = 52;
        const clampedDist = Math.min(dist, maxDist + Math.log(Math.max(1, dist - maxDist + 1)) * 6);
        const angle = Math.atan2(currentOffY, currentOffX);

        setStickOffset({
          x: Math.cos(angle) * clampedDist,
          y: Math.sin(angle) * clampedDist,
        });

        engine.translateScreenSpace(dx, dy, targetScope, isLocked);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Orthogonal Move (4-Way)' : 'Planar Screen Move',
          `ΔX: ${totalDx >= 0 ? '+' : ''}${Math.round(totalDx)}px, ΔY: ${-totalDy >= 0 ? '+' : ''}${Math.round(-totalDy)}px`
        );
        break;
      }

      case '2d_scale_y': {
        // Vertical Height Scaling (Anchored to Screen Center Crosshair)
        const factor = 1.0 - dy * 0.015;
        accumulatedValue.current += -dy;
        engine.scaleScreenSpace(1.0, factor, targetScope, isLocked);
        const percent = Math.round((1 + accumulatedValue.current * 0.015) * 100);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Uniform Scale' : 'Height Scale (Y)',
          `${percent}%`
        );
        break;
      }

      case '2d_scale_x': {
        // Horizontal Width Scaling (Anchored to Screen Center Crosshair)
        const factor = 1.0 + dx * 0.015;
        accumulatedValue.current += dx;
        engine.scaleScreenSpace(factor, 1.0, targetScope, isLocked);
        const percent = Math.round((1 + accumulatedValue.current * 0.015) * 100);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Uniform Scale' : 'Width Scale (X)',
          `${percent}%`
        );
        break;
      }

      case '2d_scale_free': {
        // Unconstrained / Proportional Free Scale
        const delta = (dx - dy) * 0.6;
        const factor = 1.0 + delta * 0.015;
        accumulatedValue.current += delta;
        engine.scaleScreenSpace(factor, factor, targetScope, true);
        const percent = Math.round((1 + accumulatedValue.current * 0.015) * 100);
        onActiveTransformChange?.(
          true,
          'Uniform Proportional Scale',
          `${percent}%`
        );
        break;
      }

      case '2d_rotate': {
        // Rotate Handle: Spins selection around screen's center crosshair
        const angleRad = (dx + dy) * 0.02;
        accumulatedValue.current += angleRad;
        engine.rotateScreenSpace(angleRad, targetScope, isLocked);
        const deg = Math.round((accumulatedValue.current * 180) / Math.PI);

        // Haptic feedback tick on each 15-degree crossing
        const currentStep = Math.floor(Math.abs(deg) / 15);
        if (currentStep !== lastHapticAngleRef.current) {
          lastHapticAngleRef.current = currentStep;
          triggerHaptic('tick');
        }

        onActiveTransformChange?.(
          true,
          isLocked ? 'Snapped 15° Screen Spin' : 'Screen Spin',
          `${deg >= 0 ? '+' : ''}${deg}°`
        );
        break;
      }

      // ----------------------------------------------------
      // 2. 3D SPATIAL MODE HANDLERS (Red X, Green Y, Blue Z)
      // ----------------------------------------------------
      case '3d_cone_x': {
        // World Translation X (Red)
        const factor = dx * 0.015;
        accumulatedValue.current += factor;
        engine.translateWorldAxis('x', factor, targetScope);
        onActiveTransformChange?.(
          true,
          'Translate X (World Red)',
          `${accumulatedValue.current >= 0 ? '+' : ''}${accumulatedValue.current.toFixed(2)}m`
        );
        break;
      }

      case '3d_cone_y': {
        // World Translation Y (Green)
        const factor = -dy * 0.015;
        accumulatedValue.current += factor;
        engine.translateWorldAxis('y', factor, targetScope);
        onActiveTransformChange?.(
          true,
          'Translate Y (World Green)',
          `${accumulatedValue.current >= 0 ? '+' : ''}${accumulatedValue.current.toFixed(2)}m`
        );
        break;
      }

      case '3d_cone_z': {
        // World Translation Z (Blue)
        const factor = (dx - dy) * 0.015;
        accumulatedValue.current += factor;
        engine.translateWorldAxis('z', factor, targetScope);
        onActiveTransformChange?.(
          true,
          'Translate Z (World Blue)',
          `${accumulatedValue.current >= 0 ? '+' : ''}${accumulatedValue.current.toFixed(2)}m`
        );
        break;
      }

      case '3d_arc_x': {
        // Local Rotation Rx (Pitch - Red Arc) around Geometric Center
        const angle = -dy * 0.025;
        accumulatedValue.current += angle;
        engine.rotateWorldAxis('x', angle, targetScope, isLocked);
        const deg = Math.round((accumulatedValue.current * 180) / Math.PI);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Pitch Rx (15° Snapped)' : 'Pitch Rx (Red Arc)',
          `${deg >= 0 ? '+' : ''}${deg}°`
        );
        break;
      }

      case '3d_arc_y': {
        // Local Rotation Ry (Yaw - Green Arc) around Geometric Center
        const angle = dx * 0.025;
        accumulatedValue.current += angle;
        engine.rotateWorldAxis('y', angle, targetScope, isLocked);
        const deg = Math.round((accumulatedValue.current * 180) / Math.PI);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Yaw Ry (15° Snapped)' : 'Yaw Ry (Green Arc)',
          `${deg >= 0 ? '+' : ''}${deg}°`
        );
        break;
      }

      case '3d_arc_z': {
        // Local Rotation Rz (Roll - Blue Arc) around Geometric Center
        const angle = (dx - dy) * 0.025;
        accumulatedValue.current += angle;
        engine.rotateWorldAxis('z', angle, targetScope, isLocked);
        const deg = Math.round((accumulatedValue.current * 180) / Math.PI);
        onActiveTransformChange?.(
          true,
          isLocked ? 'Roll Rz (15° Snapped)' : 'Roll Rz (Blue Arc)',
          `${deg >= 0 ? '+' : ''}${deg}°`
        );
        break;
      }

      case '3d_trackball': {
        // Central Freeform Trackball around Geometric Center
        engine.rotateTrackball(dx, dy, targetScope);
        onActiveTransformChange?.(true, 'Free Spatial Trackball', '3D Freeform Orbit');
        break;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (engine && activeHandle) {
      engine.endTransform();
    }
    setActiveHandle(null);
    setStickOffset({ x: 0, y: 0 });
    accumulatedValue.current = 0;
    lastHapticAngleRef.current = 0;
    onActiveTransformChange?.(false);
  };

  // Scope labels
  const scopeLabels: Record<TransformTargetScope, { label: string; icon: React.ReactNode }> = {
    all: { label: 'All', icon: <Globe className="w-3 h-3 text-cyan-400" /> },
    active_layer: { label: 'Layer', icon: <Layers className="w-3 h-3 text-emerald-400" /> },
    model: { label: 'Model', icon: <Box className="w-3 h-3 text-amber-400" /> },
    strokes: { label: 'Curves', icon: <Spline className="w-3 h-3 text-purple-400" /> },
  };

  // Orthographic safety checks
  const isDepthAxisCollapsed = (axis: 'x' | 'y' | 'z') => {
    if (!perfectView.isPerfect || !perfectView.depthAxis) return false;
    return perfectView.depthAxis === axis;
  };

  if (isMinimized) {
    return (
      <button
        id="btn-expand-transform-joystick"
        onClick={() => setIsMinimized(false)}
        title="Expand Transform Joystick Navigator"
        className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white shadow-2xl backdrop-blur-xl transition-all active:scale-95 text-xs font-semibold pointer-events-auto"
      >
        <Move className="w-4 h-4 text-cyan-400" />
        <span>Transform HUD</span>
        <Maximize2 className="w-3.5 h-3.5 text-neutral-500" />
      </button>
    );
  }

  return (
    <div
      id="feather-transform-joystick"
      className="relative flex flex-col p-3 rounded-3xl bg-neutral-950/90 border border-neutral-800/80 shadow-2xl backdrop-blur-2xl select-none w-60 pointer-events-auto text-neutral-200"
    >
      {/* Top Header: Pill Segmented Control + Lock Button + Minimize */}
      <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-neutral-800/60 mb-2">
        {/* Pill-Shaped Mode Switcher */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-neutral-900 border border-neutral-800 shadow-inner">
          <button
            id="btn-mode-2d"
            onClick={() => {
              setMode('2d');
              triggerHaptic('tick');
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 ${
              mode === '2d'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            2D View
          </button>
          <button
            id="btn-mode-3d"
            onClick={() => {
              setMode('3d');
              triggerHaptic('tick');
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 ${
              mode === '3d'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            3D Space
          </button>
        </div>

        {/* Right Tools: Strict Constraint Lock & Minimize */}
        <div className="flex items-center gap-1">
          {/* Lock Icon Button */}
          <button
            id="btn-toggle-transform-lock"
            onClick={() => {
              const next = !isLocked;
              setIsLocked(next);
              triggerHaptic('lock');
            }}
            title={
              isLocked
                ? 'Constraints Active: 4-Way Orthogonal Move, Uniform Scale, 15° Snapped Rotation'
                : 'Click to Lock Constraints (4-Way Move, Uniform Scale, 15° Snapping)'
            }
            className={`p-1.5 rounded-full border transition-all duration-150 ${
              isLocked
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Minimize Button */}
          <button
            id="btn-minimize-transform-joystick"
            onClick={() => setIsMinimized(true)}
            title="Minimize Panel"
            className="p-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Target Scope Dropdown Row */}
      <div className="relative mb-2">
        <button
          id="btn-select-target-scope"
          onClick={() => setShowScopeMenu(!showScopeMenu)}
          className="w-full flex items-center justify-between px-2.5 py-1 rounded-xl bg-neutral-900/80 hover:bg-neutral-800/80 border border-neutral-800 text-[11px] text-neutral-300 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {scopeLabels[targetScope].icon}
            <span className="font-medium">Transform: {scopeLabels[targetScope].label}</span>
          </div>
          <ChevronDown className="w-3 h-3 text-neutral-500" />
        </button>

        {showScopeMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl z-30 flex flex-col gap-0.5">
            {(Object.keys(scopeLabels) as TransformTargetScope[]).map((scopeKey) => (
              <button
                key={scopeKey}
                onClick={() => {
                  setTargetScope(scopeKey);
                  setShowScopeMenu(false);
                  triggerHaptic('tick');
                }}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-left transition-colors ${
                  targetScope === scopeKey
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {scopeLabels[scopeKey].icon}
                <span>{scopeLabels[scopeKey].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. 2D VIEW MODE (Screen-Space Manipulation)                               */}
      {/* ========================================================================= */}
      {mode === '2d' && (
        <div className="relative flex flex-col items-center justify-center p-2">
          {/* Main 2D Joypad Stage */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Background Socket & Compass Rings */}
            <div className="absolute inset-0 rounded-full border border-neutral-800/80 bg-neutral-900/30 flex items-center justify-center pointer-events-none">
              <div className="w-32 h-32 rounded-full border border-dashed border-neutral-800/60" />
              <div className="w-20 h-20 rounded-full border border-neutral-800/40" />

              {/* 4-Way Cardinal Guide Hairlines */}
              <div className="absolute w-full h-px bg-neutral-800/40" />
              <div className="absolute h-full w-px bg-neutral-800/40" />
            </div>

            {/* Elastic Rubber-Band SVG Membrane Tether connecting Center to Moving Stick */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
              <defs>
                <linearGradient id="elasticGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {activeHandle === '2d_stick' && (stickOffset.x !== 0 || stickOffset.y !== 0) && (
                <g>
                  {/* Origin Socket Anchor Dot */}
                  <circle cx="88" cy="88" r="4" fill="#3b82f6" opacity="0.6" />
                  {/* Elastic Connecting Tether */}
                  <line
                    x1="88"
                    y1="88"
                    x2={88 + stickOffset.x}
                    y2={88 + stickOffset.y}
                    stroke="url(#elasticGradient)"
                    strokeWidth={Math.max(2, 6 - Math.hypot(stickOffset.x, stickOffset.y) * 0.05)}
                    strokeLinecap="round"
                  />
                  {/* Subtle expansion ring at origin */}
                  <circle
                    cx="88"
                    cy="88"
                    r={Math.min(24, Math.hypot(stickOffset.x, stickOffset.y) * 0.5)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.5"
                  />
                </g>
              )}
            </svg>

            {/* Vertical Height Scale Handle (Positioned ABOVE central stick) */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
              <button
                id="handle-2d-scale-y"
                onPointerDown={(e) => handlePointerDown(e, '2d_scale_y', 'Height Scale (Y)')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Height Scale (Vertical): Drag up/down (Anchored to Screen Center Crosshair)"
                className={`w-12 h-5 rounded-full border flex items-center justify-center gap-1 cursor-ns-resize shadow-lg transition-all ${
                  activeHandle === '2d_scale_y'
                    ? 'bg-cyan-500 border-white text-white scale-110 shadow-cyan-500/50'
                    : 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[9px] font-bold tracking-tighter">↕ Y</span>
              </button>
            </div>

            {/* Horizontal Width Scale Handle (Positioned TO THE LEFT of central stick) */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 z-10">
              <button
                id="handle-2d-scale-x"
                onPointerDown={(e) => handlePointerDown(e, '2d_scale_x', 'Width Scale (X)')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Width Scale (Horizontal): Drag left/right (Anchored to Screen Center Crosshair)"
                className={`w-5 h-12 rounded-full border flex flex-col items-center justify-center gap-1 cursor-ew-resize shadow-lg transition-all ${
                  activeHandle === '2d_scale_x'
                    ? 'bg-cyan-500 border-white text-white scale-110 shadow-cyan-500/50'
                    : 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="text-[9px] font-bold tracking-tighter">↔ X</span>
              </button>
            </div>

            {/* Unconstrained Free/Proportional Scale Handle (Positioned TOP-LEFT diagonal) */}
            <div className="absolute top-2 left-2 z-10">
              <button
                id="handle-2d-scale-free"
                onPointerDown={(e) => handlePointerDown(e, '2d_scale_free', 'Uniform Proportional Scale')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Uniform / Free Scale: Drag diagonally (Anchored to Screen Center Crosshair)"
                className={`w-7 h-7 rounded-xl border flex items-center justify-center cursor-nwse-resize shadow-lg transition-all ${
                  activeHandle === '2d_scale_free'
                    ? 'bg-cyan-500 border-white text-white scale-110 shadow-cyan-500/50'
                    : 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <Scaling className="w-3.5 h-3.5 text-cyan-300" />
              </button>
            </div>

            {/* Rotate Handle (Positioned ON THE RIGHT SIDE of the central stick) */}
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 z-10">
              <button
                id="handle-2d-rotate"
                onPointerDown={(e) => handlePointerDown(e, '2d_rotate', 'Screen Center Rotation')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Screen Rotate: Drag to spin around screen center crosshair (15° snap when Locked)"
                className={`w-9 h-9 rounded-full border flex items-center justify-center cursor-ew-resize shadow-lg transition-all ${
                  activeHandle === '2d_rotate'
                    ? 'bg-indigo-500 border-white text-white scale-110 shadow-indigo-500/50'
                    : 'bg-neutral-800/90 border-neutral-700 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <RotateCw className="w-4 h-4 text-indigo-300" />
              </button>
            </div>

            {/* Central Move Stick: Elastic Stretch & Instant Snap-Back on Release */}
            <div
              id="handle-2d-move-stick"
              onPointerDown={(e) => handlePointerDown(e, '2d_stick', 'Planar Move')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title="Central Move Stick: Drag to translate in screen-plane (stretches elastically, snaps back on release)"
              style={{
                transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                transition: activeHandle === '2d_stick' ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
              className={`relative z-20 w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl border-2 transition-colors ${
                activeHandle === '2d_stick'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-700 border-white text-white shadow-blue-500/60 scale-105'
                  : 'bg-gradient-to-b from-neutral-800 to-neutral-900 border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:scale-105'
              }`}
            >
              {/* Joypad Center Grip */}
              <div className="w-6 h-6 rounded-full border border-neutral-600/60 bg-neutral-900/60 flex items-center justify-center">
                <Move className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-[8px] font-black tracking-wider uppercase mt-0.5 text-neutral-300">
                Move
              </span>
            </div>
          </div>

          {/* Sub-label info */}
          <div className="text-[10px] text-neutral-400 font-medium mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {isLocked ? 'Strict Constraints: 4-Way Move & 15° Snapping' : 'Screen-Space Anchored to Crosshair'}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 3D SPATIAL MODE (World/Local Axis Manipulation)                         */}
      {/* ========================================================================= */}
      {mode === '3d' && (
        <div className="relative flex flex-col items-center justify-center p-2">
          {/* Orthographic Safety Notification if camera is in Perfect View */}
          {perfectView.isPerfect && perfectView.depthAxis && (
            <div className="w-full mb-2 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5 text-[10px] text-amber-300">
              <ShieldAlert className="w-3 h-3 flex-shrink-0 text-amber-400" />
              <span className="font-medium truncate">
                Ortho Safety: {perfectView.depthAxis.toUpperCase()}-Axis Locked in {perfectView.view?.toUpperCase()} View
              </span>
            </div>
          )}

          {/* 3D Circular Navigator Stage */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* Concentric Rotation Arcs (SVG) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Outer Red Arc (Rx - Pitch) */}
              {!isDepthAxisCollapsed('x') && (
                <circle
                  cx="88"
                  cy="88"
                  r="72"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeDasharray="14 6"
                  opacity={activeHandle === '3d_arc_x' ? '1.0' : '0.45'}
                />
              )}

              {/* Middle Green Arc (Ry - Yaw) */}
              {!isDepthAxisCollapsed('y') && (
                <circle
                  cx="88"
                  cy="88"
                  r="56"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  strokeDasharray="12 5"
                  opacity={activeHandle === '3d_arc_y' ? '1.0' : '0.45'}
                />
              )}

              {/* Inner Blue Arc (Rz - Roll) */}
              {!isDepthAxisCollapsed('z') && (
                <circle
                  cx="88"
                  cy="88"
                  r="40"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="10 4"
                  opacity={activeHandle === '3d_arc_z' ? '1.0' : '0.45'}
                />
              )}
            </svg>

            {/* Translation Cones on Outer Perimeter (Red X, Green Y, Blue Z) */}

            {/* Red Cone (X-axis Translation - Right/East) */}
            {!isDepthAxisCollapsed('x') ? (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                <button
                  id="handle-3d-cone-x"
                  onPointerDown={(e) => handlePointerDown(e, '3d_cone_x', 'Translate X (World Red)')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Translate X (Red): Drag along global X axis"
                  className={`w-7 h-8 rounded-r-full rounded-l-md border flex items-center justify-center cursor-ew-resize shadow-lg transition-all ${
                    activeHandle === '3d_cone_x'
                      ? 'bg-red-500 border-white text-white scale-110 shadow-red-500/50'
                      : 'bg-red-950/80 border-red-500/50 text-red-300 hover:bg-red-600 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black">X►</span>
                </button>
              </div>
            ) : null}

            {/* Green Cone (Y-axis Translation - Top/North) */}
            {!isDepthAxisCollapsed('y') ? (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
                <button
                  id="handle-3d-cone-y"
                  onPointerDown={(e) => handlePointerDown(e, '3d_cone_y', 'Translate Y (World Green)')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Translate Y (Green): Drag along global Y axis"
                  className={`w-8 h-7 rounded-t-full rounded-b-md border flex items-center justify-center cursor-ns-resize shadow-lg transition-all ${
                    activeHandle === '3d_cone_y'
                      ? 'bg-green-500 border-white text-white scale-110 shadow-green-500/50'
                      : 'bg-green-950/80 border-green-500/50 text-green-300 hover:bg-green-600 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-black">▲Y</span>
                </button>
              </div>
            ) : null}

            {/* Blue Cone (Z-axis Translation - Southwest Diagonal) */}
            {!isDepthAxisCollapsed('z') ? (
              <div className="absolute bottom-1 left-1 z-10">
                <button
                  id="handle-3d-cone-z"
                  onPointerDown={(e) => handlePointerDown(e, '3d_cone_z', 'Translate Z (World Blue)')}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  title="Translate Z (Blue): Drag along global Z axis"
                  className={`w-8 h-8 rounded-bl-2xl rounded-tr-md border flex items-center justify-center cursor-nwse-resize shadow-lg transition-all ${
                    activeHandle === '3d_cone_z'
                      ? 'bg-blue-500 border-white text-white scale-110 shadow-blue-500/50'
                      : 'bg-blue-950/80 border-blue-500/50 text-blue-300 hover:bg-blue-600 hover:text-white'
                  }`}
                >
                  <span className="text-[9px] font-black">↙Z</span>
                </button>
              </div>
            ) : null}

            {/* Rotation Arc Grips (Rx Pitch, Ry Yaw, Rz Roll) */}

            {/* Rx Red Arc Spin Button */}
            {!isDepthAxisCollapsed('x') ? (
              <button
                id="handle-3d-arc-x"
                onPointerDown={(e) => handlePointerDown(e, '3d_arc_x', 'Pitch Rx (Red Arc)')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Rotate Rx (Pitch - Red Arc) around Geometric Center"
                className={`absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded-full border text-[9px] font-mono font-bold cursor-ns-resize shadow-md transition-all ${
                  activeHandle === '3d_arc_x'
                    ? 'bg-red-500 border-white text-white scale-110 shadow-red-500/50'
                    : 'bg-neutral-900 border-red-500/60 text-red-300 hover:bg-red-900'
                }`}
              >
                Rx
              </button>
            ) : null}

            {/* Ry Green Arc Spin Button */}
            {!isDepthAxisCollapsed('y') ? (
              <button
                id="handle-3d-arc-y"
                onPointerDown={(e) => handlePointerDown(e, '3d_arc_y', 'Yaw Ry (Green Arc)')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Rotate Ry (Yaw - Green Arc) around Geometric Center"
                className={`absolute top-2 left-9 z-10 px-1.5 py-0.5 rounded-full border text-[9px] font-mono font-bold cursor-ew-resize shadow-md transition-all ${
                  activeHandle === '3d_arc_y'
                    ? 'bg-green-500 border-white text-white scale-110 shadow-green-500/50'
                    : 'bg-neutral-900 border-green-500/60 text-green-300 hover:bg-green-900'
                }`}
              >
                Ry
              </button>
            ) : null}

            {/* Rz Blue Arc Spin Button */}
            {!isDepthAxisCollapsed('z') ? (
              <button
                id="handle-3d-arc-z"
                onPointerDown={(e) => handlePointerDown(e, '3d_arc_z', 'Roll Rz (Blue Arc)')}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="Rotate Rz (Roll - Blue Arc) around Geometric Center"
                className={`absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-full border text-[9px] font-mono font-bold cursor-ew-resize shadow-md transition-all ${
                  activeHandle === '3d_arc_z'
                    ? 'bg-blue-500 border-white text-white scale-110 shadow-blue-500/50'
                    : 'bg-neutral-900 border-blue-500/60 text-blue-300 hover:bg-blue-900'
                }`}
              >
                Rz
              </button>
            ) : null}

            {/* Central Freeform Trackball Sphere (3D Free Orbit around Geometric Center) */}
            <div
              id="handle-3d-trackball"
              onPointerDown={(e) => handlePointerDown(e, '3d_trackball', '3D Freeform Trackball')}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title="Central Trackball: Drag sphere for freeform 3D rotation around object geometric center"
              className={`relative z-20 w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl border-2 transition-all ${
                activeHandle === '3d_trackball'
                  ? 'bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 border-white text-white shadow-blue-500/60 scale-110'
                  : 'bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 border-neutral-500 text-neutral-200 hover:border-neutral-300 hover:scale-105'
              }`}
            >
              {/* Latitude / Longitude lines styling */}
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                <Orbit className="w-5 h-5 text-cyan-300 drop-shadow" />
              </div>
              <span className="text-[7px] font-black tracking-widest uppercase text-neutral-300">
                Trackball
              </span>
            </div>
          </div>

          {/* Color Code Legend */}
          <div className="flex items-center gap-3 text-[10px] font-medium text-neutral-400 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> X
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Y
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Z
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
