import React, { useState, useRef, useEffect } from 'react';

export type OrthoDepthAxis = 'none' | 'x' | 'y' | 'z';

export interface CameraBasisVectors {
  right: { x: number; y: number; z: number };
  up: { x: number; y: number; z: number };
  forward: { x: number; y: number; z: number };
  position?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
}

interface TransformJoystickProps {
  type: '2d' | '3d';
  onToggleType: (newType: '2d' | '3d') => void;
  onTranslateScreen: (delta: { x: number; y: number }) => void;
  onRotateScreen: (angleRad: number) => void;
  onScaleScreen: (scale: { x: number; y: number; z: number }) => void;
  onTranslateSpatial: (delta: { x: number; y: number; z: number }) => void;
  onRotateSpatial: (axisRot: { x: number; y: number; z: number }) => void;
  onScaleSpatial: (scale: { x: number; y: number; z: number }) => void;
  isOrthoView?: boolean;
  orthoDepthAxis?: OrthoDepthAxis;
  cameraBasis?: CameraBasisVectors;
  selectionCount: number;
  activeGroupName?: string;
  onSelectAllInGroup?: () => void;
  onResetTransform?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  onActiveStateChange?: (isActive: boolean) => void;
}

export const TransformJoystick: React.FC<TransformJoystickProps> = ({
  type,
  onToggleType,
  onTranslateScreen,
  onRotateScreen,
  onScaleScreen,
  onTranslateSpatial,
  onRotateSpatial,
  onScaleSpatial,
  isOrthoView = false,
  orthoDepthAxis = 'none',
  cameraBasis,
  selectionCount,
  activeGroupName = 'Active Group',
  onSelectAllInGroup,
  onResetTransform,
  isLocked: externalIsLocked,
  onToggleLock,
  onActiveStateChange,
}) => {
  const [internalIsLocked, setInternalIsLocked] = useState(false);
  const isLocked = externalIsLocked !== undefined ? externalIsLocked : internalIsLocked;

  const [isMinimized, setIsMinimized] = useState(false);
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeHandleRef = useRef<string | null>(null);

  const toggleLock = () => {
    if (onToggleLock) {
      onToggleLock();
    } else {
      setInternalIsLocked((prev) => !prev);
    }
  };

  useEffect(() => {
    if (onActiveStateChange) {
      onActiveStateChange(isDraggingStick || activeHandleRef.current !== null);
    }
  }, [isDraggingStick, onActiveStateChange]);

  const handlePointerDownStick = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDraggingStick(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveStick = (e: React.PointerEvent) => {
    if (!isDraggingStick) return;
    let dx = e.clientX - dragStartRef.current.x;
    let dy = e.clientY - dragStartRef.current.y;

    const maxDist = 45;
    const dist = Math.hypot(dx, dy);

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    if (isLocked) {
      if (Math.abs(dx) > Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    setStickPos({ x: dx, y: dy });

    const sens = 0.003;
    onTranslateScreen({ x: dx * sens, y: -dy * sens });
  };

  const handlePointerUpStick = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDraggingStick(false);
    setStickPos({ x: 0, y: 0 });
  };

  const handlePointerDownScale = (axis: 'width' | 'height' | 'free', e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activeHandleRef.current = `scale-${axis}`;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveScale = (e: React.PointerEvent) => {
    if (!activeHandleRef.current || !activeHandleRef.current.startsWith('scale-')) return;
    const axis = activeHandleRef.current.replace('scale-', '');
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    let scaleFactor = 1.0;
    if (axis === 'height') {
      scaleFactor = Math.max(0.1, 1.0 - dy * 0.02);
      onScaleScreen({ x: 1.0, y: scaleFactor, z: 1.0 });
    } else if (axis === 'width') {
      scaleFactor = Math.max(0.1, 1.0 + dx * 0.02);
      onScaleScreen({ x: scaleFactor, y: 1.0, z: 1.0 });
    } else {
      scaleFactor = Math.max(0.1, 1.0 + (dx - dy) * 0.015);
      onScaleScreen({ x: scaleFactor, y: scaleFactor, z: scaleFactor });
    }

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerDownRotate2D = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activeHandleRef.current = 'rotate-2d';
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveRotate2D = (e: React.PointerEvent) => {
    if (activeHandleRef.current !== 'rotate-2d') return;
    const dy = e.clientY - dragStartRef.current.y;
    let angleRad = dy * 0.025;
    if (isLocked) {
      const snapStep = (15 * Math.PI) / 180;
      angleRad = Math.round(angleRad / snapStep) * snapStep;
    }
    onRotateScreen(angleRad);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerDownNode = (axis: 'x' | 'y' | 'z', dir: 1 | -1, e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activeHandleRef.current = `node-${axis}-${dir}`;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveNode = (e: React.PointerEvent) => {
    if (!activeHandleRef.current || !activeHandleRef.current.startsWith('node-')) return;
    const parts = activeHandleRef.current.split('-');
    const axis = parts[1] as 'x' | 'y' | 'z';
    const dir = parseInt(parts[2], 10) as 1 | -1;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const delta = (axis === 'y' ? -dy : dx) * 0.006 * dir;

    const deltaVec = { x: 0, y: 0, z: 0 };
    deltaVec[axis] = delta;
    onTranslateSpatial(deltaVec);

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerDownArc = (axis: 'x' | 'y' | 'z', e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activeHandleRef.current = `arc-${axis}`;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveArc = (e: React.PointerEvent) => {
    if (!activeHandleRef.current || !activeHandleRef.current.startsWith('arc-')) return;
    const axis = activeHandleRef.current.split('-')[1] as 'x' | 'y' | 'z';
    const dy = e.clientY - dragStartRef.current.y;
    let angleRad = dy * 0.025;

    if (isLocked) {
      const snapStep = (15 * Math.PI) / 180;
      angleRad = Math.round(angleRad / snapStep) * snapStep;
    }

    const rotVec = { x: 0, y: 0, z: 0 };
    rotVec[axis] = angleRad;
    onRotateSpatial(rotVec);

    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerDownTrackball = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activeHandleRef.current = 'trackball';
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMoveTrackball = (e: React.PointerEvent) => {
    if (activeHandleRef.current !== 'trackball') return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const rotY = dx * 0.02;
    const rotX = dy * 0.02;

    onRotateSpatial({ x: rotX, y: rotY, z: 0 });
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUpAny = (e: React.PointerEvent) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    activeHandleRef.current = null;
  };

  const isDepthAxisCollapsed = (axis: 'x' | 'y' | 'z') => {
    return isOrthoView && orthoDepthAxis === axis;
  };

  return (
    <>
      <div 
        onPointerUp={handlePointerUpAny}
        className="hidden md:block absolute bottom-6 right-6 z-40 select-none animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="w-56 rounded-3xl bg-[#1c1c1f]/90 backdrop-blur-xl border border-white/15 p-3 shadow-2xl text-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center bg-black/40 p-0.5 rounded-full border border-white/10">
              <button
                type="button"
                id="btn-transform-2d-mode"
                onClick={() => onToggleType('2d')}
                className={`py-1 px-2.5 rounded-full text-[11px] font-bold transition-all ${
                  type === '2d'
                    ? 'bg-white text-zinc-950 shadow-md scale-100'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Screen-Space 2D Manipulation"
              >
                2D View
              </button>
              <button
                type="button"
                id="btn-transform-3d-mode"
                onClick={() => onToggleType('3d')}
                className={`py-1 px-2.5 rounded-full text-[11px] font-bold transition-all ${
                  type === '3d'
                    ? 'bg-white text-zinc-950 shadow-md scale-100'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Spatial Global 3D Manipulation"
              >
                3D Spatial
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                id="btn-transform-lock"
                onClick={toggleLock}
                title={
                  isLocked 
                    ? 'Constraints Active (4-Way Move, Uniform Scale)' 
                    : 'Freeform Transformation'
                }
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  isLocked
                    ? 'bg-amber-500 text-white'
                    : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
              >
                {isLocked ? 'Lock' : 'Free'}
              </button>

              {onResetTransform && (
                <button
                  type="button"
                  id="btn-transform-reset"
                  onClick={onResetTransform}
                  title="Reset Selection Origin to Center"
                  className="px-1.5 py-0.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all text-[9px] font-bold"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                id="btn-transform-minimize"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Expand Joystick' : 'Collapse Joystick'}
                className="px-1.5 py-0.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all text-[9px] font-bold"
              >
                {isMinimized ? 'Expand' : 'Hide'}
              </button>
            </div>
          </div>

          {isMinimized ? (
            <button
              onClick={() => setIsMinimized(false)}
              className="w-full pt-2 flex items-center justify-between text-[11px] text-white/80 font-medium hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span className="truncate max-w-[110px]">
                  {selectionCount > 0 ? `${selectionCount} selected` : activeGroupName}
                </span>
              </div>
              <span className="text-[10px] text-white/40 font-mono uppercase bg-white/5 px-2 py-0.5 rounded-full">
                {type === '2d' ? '2D View' : '3D Spatial'}
              </span>
            </button>
          ) : (
            <div className="pt-2 flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-[10px] text-white/50 px-1 mb-2 font-medium">
                <span className="truncate max-w-[110px]">
                  {selectionCount > 0 ? `${selectionCount} curves active` : activeGroupName}
                </span>
                {selectionCount === 0 && onSelectAllInGroup && (
                  <button
                    onClick={onSelectAllInGroup}
                    className="text-emerald-400 hover:text-emerald-300 text-[9px] font-bold underline"
                  >
                    Select Group
                  </button>
                )}
              </div>

              {type === '2d' && (
                <div className="relative w-40 h-40 rounded-full border border-white/10 bg-[#141416] flex items-center justify-center overflow-visible shadow-inner">
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                    <div className="w-full h-px bg-white" />
                    <div className="absolute h-full w-px bg-white" />
                  </div>
                  <div className="absolute w-26 h-26 rounded-full border border-dashed border-white/10 pointer-events-none" />

                  {/* Top Handle: Height Scaling */}
                  <div
                    id="handle-scale-height"
                    onPointerDown={(e) => handlePointerDownScale('height', e)}
                    onPointerMove={handlePointerMoveScale}
                    title="Scale Height"
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-zinc-950 flex items-center justify-center font-black text-[9px] shadow-xl cursor-ns-resize hover:scale-115 active:scale-90 z-20 border border-white transition-transform"
                  >
                    H
                  </div>

                  {/* Left Handle: Width Scaling */}
                  <div
                    id="handle-scale-width"
                    onPointerDown={(e) => handlePointerDownScale('width', e)}
                    onPointerMove={handlePointerMoveScale}
                    title="Scale Width"
                    className="absolute -left-3.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-white text-zinc-950 flex items-center justify-center font-black text-[9px] shadow-xl cursor-ew-resize hover:scale-115 active:scale-90 z-20 border border-white transition-transform"
                  >
                    W
                  </div>

                  {/* Top-Left: Free Scaling */}
                  <div
                    id="handle-scale-free"
                    onPointerDown={(e) => handlePointerDownScale('free', e)}
                    onPointerMove={handlePointerMoveScale}
                    title="Unconstrained Free Scaling"
                    className="absolute top-0.5 left-0.5 px-1.5 py-0.5 rounded-full bg-[#3b82f6] text-white flex items-center justify-center font-bold text-[8px] shadow-lg cursor-nwse-resize hover:scale-115 active:scale-90 z-20 border border-blue-400 transition-transform"
                  >
                    S
                  </div>

                  {/* Right Handle: Rotation */}
                  <div
                    id="handle-rotate-2d"
                    onPointerDown={handlePointerDownRotate2D}
                    onPointerMove={handlePointerMoveRotate2D}
                    title="Rotate Around View Center"
                    className="absolute -right-3.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing hover:scale-115 active:scale-90 z-20 border border-orange-400 transition-transform text-[8px] font-bold"
                  >
                    Rot
                  </div>

                  {/* Dynamic Tether Line */}
                  {isDraggingStick && (stickPos.x !== 0 || stickPos.y !== 0) && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
                      <line
                        x1="80"
                        y1="80"
                        x2={80 + stickPos.x}
                        y2={80 + stickPos.y}
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeDasharray="4 3"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                    </svg>
                  )}

                  {/* Central Move Stick */}
                  <div
                    id="handle-move-stick-2d"
                    onPointerDown={handlePointerDownStick}
                    onPointerMove={handlePointerMoveStick}
                    onPointerUp={handlePointerUpStick}
                    style={{
                      transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
                      transition: isDraggingStick ? 'none' : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                    title="Drag to Move in Screen Space"
                    className={`w-14 h-14 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing z-30 transition-shadow select-none ${
                      isDraggingStick
                        ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.8)] ring-4 ring-blue-500/40 scale-105'
                        : 'bg-[#252528] text-white border border-white/20 shadow-2xl hover:border-blue-400 hover:shadow-blue-500/20'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Move
                    </span>
                  </div>
                </div>
              )}

              {type === '3d' && (
                <div className="relative w-40 h-40 rounded-full border border-white/10 bg-[#141416] flex items-center justify-center overflow-visible shadow-inner">
                  {(isOrthoView || orthoDepthAxis !== 'none') && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-[8px] font-mono font-bold whitespace-nowrap z-30">
                      {orthoDepthAxis.toUpperCase()} Depth Hidden
                    </div>
                  )}

                  {/* Red X-Axis Nodes */}
                  {!isDepthAxisCollapsed('x') && (
                    <>
                      <div
                        id="node-translate-plus-x"
                        onPointerDown={(e) => handlePointerDownNode('x', 1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate +X"
                        className="absolute -right-3.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-full bg-[#ef4444] text-white text-[9px] font-black shadow-lg cursor-ew-resize hover:scale-115 active:scale-90 z-20 border border-red-300 transition-transform"
                      >
                        +X
                      </div>
                      <div
                        id="node-translate-minus-x"
                        onPointerDown={(e) => handlePointerDownNode('x', -1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate -X"
                        className="absolute -left-3.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-full bg-[#ef4444] text-white text-[9px] font-black shadow-lg cursor-ew-resize hover:scale-115 active:scale-90 z-20 border border-red-300 transition-transform"
                      >
                        -X
                      </div>
                    </>
                  )}

                  {/* Green Y-Axis Nodes */}
                  {!isDepthAxisCollapsed('y') && (
                    <>
                      <div
                        id="node-translate-plus-y"
                        onPointerDown={(e) => handlePointerDownNode('y', 1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate +Y"
                        className="absolute -top-3.5 left-1/2 -translate-x-1/2 py-1 px-2 rounded-full bg-[#22c55e] text-white text-[9px] font-black shadow-lg cursor-ns-resize hover:scale-115 active:scale-90 z-20 border border-green-300 transition-transform"
                      >
                        +Y
                      </div>
                      <div
                        id="node-translate-minus-y"
                        onPointerDown={(e) => handlePointerDownNode('y', -1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate -Y"
                        className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 py-1 px-2 rounded-full bg-[#22c55e] text-white text-[9px] font-black shadow-lg cursor-ns-resize hover:scale-115 active:scale-90 z-20 border border-green-300 transition-transform"
                      >
                        -Y
                      </div>
                    </>
                  )}

                  {/* Blue Z-Axis Nodes */}
                  {!isDepthAxisCollapsed('z') && (
                    <>
                      <div
                        id="node-translate-plus-z"
                        onPointerDown={(e) => handlePointerDownNode('z', 1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate +Z"
                        className="absolute top-1 right-1 px-1.5 py-1 rounded-full bg-[#3b82f6] text-white text-[8px] font-black shadow-lg cursor-pointer hover:scale-115 active:scale-90 z-20 border border-blue-300 transition-transform"
                      >
                        +Z
                      </div>
                      <div
                        id="node-translate-minus-z"
                        onPointerDown={(e) => handlePointerDownNode('z', -1, e)}
                        onPointerMove={handlePointerMoveNode}
                        title="Translate -Z"
                        className="absolute bottom-1 left-1 px-1.5 py-1 rounded-full bg-[#3b82f6] text-white text-[8px] font-black shadow-lg cursor-pointer hover:scale-115 active:scale-90 z-20 border border-blue-300 transition-transform"
                      >
                        -Z
                      </div>
                    </>
                  )}

                  {/* Rotation Arcs */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 160 160">
                    {!isDepthAxisCollapsed('x') && (
                      <circle cx="80" cy="80" r="62" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="12 28" className="opacity-70" />
                    )}
                    {!isDepthAxisCollapsed('y') && (
                      <circle cx="80" cy="80" r="50" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="14 24" className="opacity-70" />
                    )}
                    {!isDepthAxisCollapsed('z') && (
                      <circle cx="80" cy="80" r="38" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="10 18" className="opacity-70" />
                    )}
                  </svg>

                  {/* Arc Triggers */}
                  {!isDepthAxisCollapsed('x') && (
                    <div
                      id="arc-rotate-rx"
                      onPointerDown={(e) => handlePointerDownArc('x', e)}
                      onPointerMove={handlePointerMoveArc}
                      title="Spin X Axis"
                      className="absolute right-3.5 top-3.5 w-5 h-5 rounded-full bg-[#ef4444]/20 border border-[#ef4444] text-[#ef4444] flex items-center justify-center text-[8px] font-black cursor-grab active:cursor-grabbing hover:scale-120 z-20 shadow-md transition-transform"
                    >
                      Rx
                    </div>
                  )}

                  {!isDepthAxisCollapsed('y') && (
                    <div
                      id="arc-rotate-ry"
                      onPointerDown={(e) => handlePointerDownArc('y', e)}
                      onPointerMove={handlePointerMoveArc}
                      title="Spin Y Axis"
                      className="absolute left-3.5 top-3.5 w-5 h-5 rounded-full bg-[#22c55e]/20 border border-[#22c55e] text-[#22c55e] flex items-center justify-center text-[8px] font-black cursor-grab active:cursor-grabbing hover:scale-120 z-20 shadow-md transition-transform"
                    >
                      Ry
                    </div>
                  )}

                  {!isDepthAxisCollapsed('z') && (
                    <div
                      id="arc-rotate-rz"
                      onPointerDown={(e) => handlePointerDownArc('z', e)}
                      onPointerMove={handlePointerMoveArc}
                      title="Spin Z Axis"
                      className="absolute right-3.5 bottom-3.5 w-5 h-5 rounded-full bg-[#3b82f6]/20 border border-[#3b82f6] text-[#3b82f6] flex items-center justify-center text-[8px] font-black cursor-grab active:cursor-grabbing hover:scale-120 z-20 shadow-md transition-transform"
                    >
                      Rz
                    </div>
                  )}

                  {/* Center Trackball */}
                  <div
                    id="trackball-center-sphere"
                    onPointerDown={handlePointerDownTrackball}
                    onPointerMove={handlePointerMoveTrackball}
                    title="Trackball: Freeform 3D Orbit"
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2c2c30] via-[#1c1c1e] to-[#121214] border border-white/20 text-white shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 z-30 transition-transform select-none text-[10px] font-bold uppercase tracking-wider"
                  >
                    Orbit
                  </div>
                </div>
              )}

              <div className="text-[9px] text-white/40 text-center mt-2 font-mono tracking-tight">
                {type === '2d'
                  ? 'Screen View Aligned | Center Crosshair'
                  : 'Spatial Global XYZ | Centroid Pivot'}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
