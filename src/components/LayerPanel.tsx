import React from 'react';
import { Layer } from '../types';
import {
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  X,
  RotateCcw,
} from 'lucide-react';

interface LayerPanelProps {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  onClose: () => void;
  onClearLayerStrokes: (layerId: string) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  setLayers,
  activeLayerId,
  setActiveLayerId,
  onClose,
  onClearLayerStrokes,
}) => {
  const handleAddLayer = () => {
    const newId = 'layer_' + Date.now().toString(36);
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      strokeIds: [],
    };
    setLayers((prev) => [newLayer, ...prev]);
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layers.length <= 1) return;
    onClearLayerStrokes(id);
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) {
      const remaining = layers.filter((l) => l.id !== id);
      setActiveLayerId(remaining[0].id);
    }
  };

  const handleToggleVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLock = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  const handleRename = (id: string, name: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name } : l))
    );
  };

  return (
    <div
      id="layer-manager-panel"
      className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-14 sm:top-16 right-auto sm:right-6 bottom-20 sm:bottom-auto w-auto sm:w-80 max-h-[calc(100vh-140px)] sm:max-h-[75vh] flex flex-col p-4 rounded-2xl bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 shadow-2xl z-30 select-none animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-neutral-200 font-semibold text-sm">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Layer System</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="btn-add-layer"
            onClick={handleAddLayer}
            title="Create New Layer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all active:scale-95 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1">
        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => setActiveLayerId(layer.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? 'bg-neutral-800/90 border-blue-500/60 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/30'
                  : 'bg-neutral-950/40 hover:bg-neutral-800/40 border-neutral-800/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => handleToggleVisibility(layer.id, e)}
                  title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                  className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4 text-neutral-300" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-neutral-600" />
                  )}
                </button>

                {/* Layer Name */}
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => handleRename(layer.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-xs font-medium text-neutral-200 focus:outline-none focus:border-b focus:border-blue-500 px-1"
                />

                {/* Lock Toggle */}
                <button
                  onClick={(e) => handleToggleLock(layer.id, e)}
                  title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                  className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
                >
                  {layer.locked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-neutral-600 hover:text-neutral-400" />
                  )}
                </button>

                {/* Clear Layer Strokes */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearLayerStrokes(layer.id);
                  }}
                  title="Clear Strokes on this layer"
                  className="p-1 text-neutral-500 hover:text-amber-400 rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Delete Layer */}
                {layers.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteLayer(layer.id, e)}
                    title="Delete Layer"
                    className="p-1 text-neutral-500 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Layer Opacity Slider */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-800/40">
                <span className="text-[10px] font-mono text-neutral-500">Opacity</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={layer.opacity}
                  onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 accent-blue-500 h-1 bg-neutral-800 rounded cursor-pointer"
                />
                <span className="text-[10px] font-mono text-neutral-400 w-7 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
