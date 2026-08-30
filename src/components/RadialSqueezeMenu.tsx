import React from 'react';

interface RadialSqueezeMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddNewGroup: () => void;
  onFindGroup: () => void;
  onStampDuplicate: () => void;
}

export const RadialSqueezeMenu: React.FC<RadialSqueezeMenuProps> = ({
  isOpen,
  position,
  onClose,
  onUndo,
  onRedo,
  onAddNewGroup,
  onFindGroup,
  onStampDuplicate,
}) => {
  if (!isOpen) return null;

  const items = [
    { label: 'Undo', short: 'Undo', onClick: onUndo, color: 'text-zinc-700 dark:text-zinc-200' },
    { label: 'Redo', short: 'Redo', onClick: onRedo, color: 'text-zinc-700 dark:text-zinc-200' },
    { label: 'New Group', short: '+Grp', onClick: onAddNewGroup, color: 'text-emerald-500' },
    { label: 'Find Group', short: 'Find', onClick: onFindGroup, color: 'text-blue-500' },
    { label: 'Stamp & Roll', short: 'Copy', onClick: onStampDuplicate, color: 'text-purple-500' },
  ];

  const radius = 64;

  return (
    <div
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      className="fixed z-50 -translate-x-1/2 -translate-y-1/2 select-none animate-in zoom-in-75 duration-150"
    >
      {/* Center Close */}
      <button
        onClick={onClose}
        className="w-12 h-12 rounded-full feather-panel shadow-2xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:scale-110 active:scale-95 feather-btn border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
      >
        Menu
      </button>

      {/* Orbiting Radial Action Buttons */}
      {items.map((item, idx) => {
        const angle = (idx / items.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            style={{
              transform: `translate(${x}px, ${y}px)`,
            }}
            title={item.label}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full feather-panel shadow-xl flex items-center justify-center hover:scale-125 active:scale-90 feather-btn border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold ${item.color}`}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
};
