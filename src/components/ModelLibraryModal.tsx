import React, { useRef } from 'react';
import { PresetModelDefinition } from '../types';
import { SampleModelFactory } from '../data/sampleModels';

interface ModelLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeModelName: string;
  onSelectPreset: (presetId: string) => void;
  onImportCustomModel: (file: File) => void;
  onClearModel: () => void;
  hasActiveModel: boolean;
}

export const ModelLibraryModal: React.FC<ModelLibraryModalProps> = ({
  isOpen,
  onClose,
  activeModelName,
  onSelectPreset,
  onImportCustomModel,
  onClearModel,
  hasActiveModel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presets = SampleModelFactory.getPresets();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCustomModel(file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold tracking-tight">3D Model Library</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select a benchmark 3D model or import an external GLB/GLTF/OBJ file to paint on
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Current Active Model Status */}
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Active Model: </span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {hasActiveModel ? activeModelName : 'None (Free 3D Spatial Canvas)'}
            </span>
          </div>
          {hasActiveModel && (
            <button
              onClick={() => {
                onClearModel();
                onClose();
              }}
              className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
            >
              Unload Model
            </button>
          )}
        </div>

        {/* Presets List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
            Preset 3D Models
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {presets.map((preset: PresetModelDefinition) => {
              const isSelected = hasActiveModel && activeModelName === preset.name;
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    onSelectPreset(preset.id);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 shadow-md ring-1 ring-blue-500'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {preset.name}
                    </span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      {isSelected ? 'Loaded' : 'Load Model'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Import External Model Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Supported formats: GLB, GLTF, OBJ
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md transition-colors"
          >
            Upload 3D File
          </button>
        </div>
      </div>
    </div>
  );
};
