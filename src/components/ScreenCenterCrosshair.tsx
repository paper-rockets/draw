import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ScreenCenterCrosshairProps {
  active: boolean;
  mode: '2d' | '3d';
  actionLabel?: string;
  valueLabel?: string;
  isLocked?: boolean;
}

export const ScreenCenterCrosshair: React.FC<ScreenCenterCrosshairProps> = ({
  active,
  mode,
  actionLabel,
  valueLabel,
  isLocked = false,
}) => {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          id="screen-center-crosshair-overlay"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center select-none"
        >
          {/* Minimal Precision Reticle anchored to viewport center */}
          <div className="relative flex items-center justify-center">
            {/* Outer Precision Compass Ring */}
            <div
              className={`w-24 h-24 rounded-full border border-dashed transition-all duration-200 flex items-center justify-center ${
                isLocked
                  ? 'border-amber-400/50 bg-amber-400/5 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                  : 'border-cyan-400/40 bg-cyan-400/5 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
              }`}
            >
              {/* Inner Circle Ring */}
              <div
                className={`w-12 h-12 rounded-full border transition-colors ${
                  isLocked ? 'border-amber-400/40' : 'border-cyan-400/30'
                }`}
              />

              {/* 15-degree Snap Ticks */}
              {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345].map(
                (deg) => (
                  <div
                    key={deg}
                    style={{ transform: `rotate(${deg}deg)` }}
                    className="absolute inset-0 flex justify-center items-start pointer-events-none"
                  >
                    <div
                      className={`w-0.5 ${
                        deg % 90 === 0
                          ? isLocked ? 'h-2 bg-amber-400' : 'h-2 bg-cyan-400'
                          : deg % 45 === 0
                          ? 'h-1.5 bg-neutral-400/60'
                          : 'h-1 bg-neutral-600/40'
                      }`}
                    />
                  </div>
                )
              )}
            </div>

            {/* Horizontal Hairline across screen */}
            <div className="absolute w-44 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

            {/* Vertical Hairline across screen */}
            <div className="absolute h-44 w-px bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

            {/* Center Mathematical Pivot Dot */}
            <div
              className={`w-2 h-2 rounded-full ${
                isLocked ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
              }`}
            />

            {/* Dynamic Value Pill with Haptic & Delta Feedback */}
            {(actionLabel || valueLabel) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-16 px-3 py-1 rounded-full bg-neutral-950/90 border border-neutral-800 shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap"
              >
                {isLocked ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
                {actionLabel && (
                  <span className="text-xs text-neutral-300 font-medium">{actionLabel}</span>
                )}
                {valueLabel && (
                  <span className="text-xs font-mono font-bold text-cyan-300 tracking-tight">
                    {valueLabel}
                  </span>
                )}
                {isLocked && (
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Locked
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
