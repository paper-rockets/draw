import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { StudioEngine } from '../core/studioEngine';
import { PerfectViewType } from '../types';
import { Compass, RotateCw } from 'lucide-react';

interface OrientationGizmoProps {
  engine: StudioEngine | null;
}

export const OrientationGizmo: React.FC<OrientationGizmoProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeView, setActiveView] = useState<string>('Free');
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Render 3D axis gizmo in real time
  useEffect(() => {
    if (!engine) return;
    let animId: number;

    const renderGizmo = () => {
      const canvas = canvasRef.current;
      if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const cx = width / 2;
          const cy = height / 2;
          const radius = (width / 2) * 0.72;

          ctx.clearRect(0, 0, width, height);

          // Get camera world direction and transform vectors
          const cam = engine.getCamera();
          const camDir = cam.getWorldDirection(new THREE.Vector3()).normalize();
          const camUp = cam.up.clone().normalize();
          const camRight = new THREE.Vector3().crossVectors(camDir, camUp).normalize();

          // Axis definitions in 3D: [name, color, vector3]
          const axes = [
            { name: 'X', color: '#ef4444', vec: new THREE.Vector3(1, 0, 0), negName: '-X' },
            { name: 'Y', color: '#22c55e', vec: new THREE.Vector3(0, 1, 0), negName: '-Y' },
            { name: 'Z', color: '#3b82f6', vec: new THREE.Vector3(0, 0, 1), negName: '-Z' },
          ];

          // Project each axis to 2D view plane
          const projected = axes.map((axis) => {
            const dotRight = axis.vec.dot(camRight);
            const dotUp = axis.vec.dot(camUp);
            const dotDepth = axis.vec.dot(camDir); // >0 towards camera, <0 away

            return {
              name: axis.name,
              color: axis.color,
              x: cx + dotRight * radius,
              y: cy - dotUp * radius,
              depth: dotDepth,
            };
          });

          // Sort back-to-front so closer axes render over farther ones
          projected.sort((a, b) => a.depth - b.depth);

          // Subtle background disc
          ctx.beginPath();
          ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(18, 20, 26, 0.75)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw axes and endpoint pills
          projected.forEach((p) => {
            const isBehind = p.depth > 0.2;
            const alpha = isBehind ? 0.35 : 0.95;

            // Axis line
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = isBehind ? 1.5 : 2.5;
            ctx.stroke();

            // Endpoint node
            ctx.beginPath();
            ctx.arc(p.x, p.y, isBehind ? 6 : 8, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.name, p.x, p.y);
          });

          ctx.globalAlpha = 1.0;

          // Center pivot point
          ctx.beginPath();
          ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fill();

          // Check perfect view status
          const perf = engine.getPerfectView();
          if (perf.isPerfect && perf.view) {
            setActiveView(perf.view.toUpperCase());
          } else {
            setActiveView('FREE');
          }
        }
      }
      animId = requestAnimationFrame(renderGizmo);
    };

    animId = requestAnimationFrame(renderGizmo);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Pointer drag to orbit camera smoothly from the gizmo
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !engine) return;
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    engine.orbit(dx * 1.5, dy * 1.5);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleSnap = (view: PerfectViewType) => {
    if (engine) {
      engine.snapToView(view);
    }
  };

  return (
    <div
      id="viewport-orientation-gizmo"
      className="flex flex-col items-end gap-1.5 select-none pointer-events-auto"
    >
      {/* 3D Axis Canvas Orb */}
      <div className="relative group flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={68}
          height={68}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag to orbit camera view"
          className="w-[68px] h-[68px] cursor-grab active:cursor-grabbing rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        />

        {/* Current View Badge */}
        <div className="absolute -bottom-1 right-0 px-1.5 py-0.2 rounded bg-neutral-900/90 border border-neutral-800 text-[9px] font-mono font-semibold text-neutral-300 shadow-sm pointer-events-none">
          {activeView}
        </div>
      </div>

      {/* Quick View Snap Chips */}
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-neutral-950/80 border border-neutral-800/80 backdrop-blur-md shadow-md">
        {(
          [
            { id: 'front', label: 'Front' },
            { id: 'top', label: 'Top' },
            { id: 'right', label: 'Right' },
            { id: 'isometric', label: 'Iso' },
          ] as { id: PerfectViewType; label: string }[]
        ).map(({ id, label }) => (
          <button
            key={id}
            id={`btn-snap-view-${id}`}
            onClick={() => handleSnap(id)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeView.toLowerCase() === id.toLowerCase()
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
