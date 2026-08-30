import React, { useState } from 'react';
import { SampleModelFactory, PresetModelDefinition } from '../core/sampleModels';
import { StudioEngine } from '../core/studioEngine';
import { Box, Upload, X, Check, FileUp } from 'lucide-react';

interface ModelLibraryModalProps {
  engine: StudioEngine | null;
  onClose: () => void;
  activeModelName: string;
}

export const ModelLibraryModal: React.FC<ModelLibraryModalProps> = ({
  engine,
  onClose,
  activeModelName,
}) => {
  const presets = SampleModelFactory.getPresets();
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetModelDefinition) => {
    if (!engine) return;
    engine.loadPresetModel(preset.id);
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    if (!engine) return;
    setLoading(true);
    setError(null);

    const ext = file.name.split('.').pop()?.toLowerCase();
    try {
      if (ext === 'glb' || ext === 'gltf') {
        const buffer = await file.arrayBuffer();
        await engine.loadGLTF(buffer, file.name);
        onClose();
      } else if (ext === 'obj') {
        const text = await file.text();
        await engine.loadOBJ(text, file.name);
        onClose();
      } else {
        setError('Unsupported format. Please upload a .glb, .gltf, or .obj file.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to parse 3D model file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="model-library-modal"
        className="w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-neutral-900/95 border border-neutral-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-neutral-100 font-semibold text-base">
            <Box className="w-5 h-5 text-blue-400" />
            <span>3D Model Library & Ingestion</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto my-4 space-y-5 pr-1">
          {/* File Drag & Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                : 'border-neutral-700/80 hover:border-neutral-600 bg-neutral-950/40'
            }`}
          >
            <input
              id="model-file-input"
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <FileUp className="w-8 h-8 text-blue-400 mb-2" />
            <span className="text-sm font-semibold text-neutral-200">
              {loading ? 'Processing 3D Geometry...' : 'Upload GLB, GLTF, or OBJ'}
            </span>
            <span className="text-xs text-neutral-400 mt-1">
              Drag & drop your 3D mesh here or click to browse
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Preset Models Grid */}
          <div>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-3">
              Built-in Benchmark Models
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const isSelected = activeModelName === preset.name;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`group p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
                        : 'bg-neutral-950/50 hover:bg-neutral-800/60 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-neutral-100 group-hover:text-blue-400 transition-colors">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
