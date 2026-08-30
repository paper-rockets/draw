import React, { useState, useRef } from 'react';

interface ClipboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSampleColor: (color: string) => void;
  onImportToStage: (imageSrc: string) => void;
}

export const ClipboardOverlay: React.FC<ClipboardOverlayProps> = ({
  isOpen,
  onClose,
  onSampleColor,
  onImportToStage,
}) => {
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&auto=format&fit=crop&q=60',
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [opacity, setOpacity] = useState(0.85);
  const [isLocked, setIsLocked] = useState(false);
  const [position, setPosition] = useState({ x: 200, y: 100 });
  const [size, setSize] = useState({ width: 290, height: 270 });
  const [isDragging, setIsDragging] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentImage = images[activeIdx] || null;

  const handlePointerDownHeader = (e: React.PointerEvent) => {
    if (isLocked) return;
    setIsDragging(true);
    const startX = e.clientX - (position?.x ?? 200);
    const startY = e.clientY - (position?.y ?? 100);

    const onPointerMove = (moveEvent: PointerEvent) => {
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - size.width - 10, moveEvent.clientX - startX)),
        y: Math.max(10, Math.min(window.innerHeight - size.height - 10, moveEvent.clientY - startY)),
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleAddImage = (file: File) => {
    if (images.length >= 2) {
      setLimitWarning('Max 2 reference images per note memory budget.');
      setTimeout(() => setLimitWarning(null), 3000);
      return;
    }
    const url = URL.createObjectURL(file);
    setImages((prev) => [...prev, url]);
    setActiveIdx(images.length);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
    onSampleColor(hex);
  };

  return (
    <div
      style={{
        left: position?.x ?? 200,
        top: position?.y ?? 100,
        width: size.width,
        opacity,
      }}
      className="absolute z-50 rounded-3xl feather-panel shadow-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80 select-none animate-in zoom-in-95 duration-150"
    >
      {/* Header Bar */}
      <div
        onPointerDown={handlePointerDownHeader}
        className={`flex items-center justify-between px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800/90 border-b border-zinc-200 dark:border-zinc-700 ${
          isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
          <span>Ref Board ({images.length}/2)</span>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="range"
            min="20"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-16 accent-blue-500"
            title="Adjust Reference Transparency"
          />

          <button
            onClick={() => setIsLocked(!isLocked)}
            className="px-1.5 py-0.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 text-[10px] font-bold"
            title={isLocked ? 'Unlock Position' : 'Lock Position'}
          >
            {isLocked ? 'Lock' : 'Free'}
          </button>

          <button
            onClick={onClose}
            className="px-1.5 py-0.5 rounded-lg hover:bg-red-500 hover:text-white text-zinc-500 text-[10px] font-bold"
          >
            X
          </button>
        </div>
      </div>

      {/* Warning Message */}
      {limitWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-3 py-1 text-[11px] text-amber-600 dark:text-amber-300 font-semibold">
          <span>{limitWarning}</span>
        </div>
      )}

      {/* Image Preview Canvas */}
      <div className="relative p-2 flex items-center justify-center bg-zinc-900/10 min-h-[160px] max-h-[220px] overflow-hidden">
        {currentImage ? (
          <img
            src={currentImage}
            alt="Reference"
            onClick={handleImageClick}
            className="max-h-[200px] object-contain rounded-xl cursor-crosshair shadow-xs"
            title="Click anywhere on reference to sample color"
          />
        ) : (
          <div className="text-xs text-zinc-400">No reference image added</div>
        )}

        {images.length > 1 && (
          <div className="absolute inset-x-2 flex justify-between pointer-events-none">
            <button
              onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              className="px-2 py-0.5 rounded-full bg-black/50 text-white pointer-events-auto hover:bg-black/70 text-xs font-bold"
            >
              Prev
            </button>
            <button
              onClick={() => setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              className="px-2 py-0.5 rounded-full bg-black/50 text-white pointer-events-auto hover:bg-black/70 text-xs font-bold"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 cursor-pointer feather-btn">
          <span>Add Image (2 max)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) handleAddImage(e.target.files[0]);
            }}
            className="hidden"
          />
        </label>

        {currentImage && (
          <button
            onClick={() => onImportToStage(currentImage)}
            title="Spawns 2D plane perpendicular to current camera angle"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white feather-btn"
          >
            <span>Import to View</span>
          </button>
        )}
      </div>
    </div>
  );
};
