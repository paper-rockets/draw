import React, { useState } from 'react';
import { StudioEngine } from '../core/studioEngine';
import { Download, Camera, Image, Box, X, Check, Loader2 } from 'lucide-react';

interface ExportModalProps {
  engine: StudioEngine | null;
  onClose: () => void;
  activeModelName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  engine,
  onClose,
  activeModelName,
}) => {
  const [exporting, setExporting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGLB = async () => {
    if (!engine) return;
    setExporting('glb');
    try {
      const blob = await engine.exportGLB();
      downloadBlob(blob, `${activeModelName.replace(/\s+/g, '_')}_painted.glb`);
      setSuccess('GLB export completed successfully!');
    } catch (e: any) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportOBJ = () => {
    if (!engine) return;
    setExporting('obj');
    try {
      const text = engine.exportOBJ();
      const blob = new Blob([text], { type: 'text/plain' });
      downloadBlob(blob, `${activeModelName.replace(/\s+/g, '_')}_painted.obj`);
      setSuccess('OBJ export completed successfully!');
    } catch (e: any) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportUVTexture = () => {
    if (!engine) return;
    setExporting('uv');
    try {
      const dataUrl = engine.uvEngine.exportPNG();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${activeModelName.replace(/\s+/g, '_')}_texture_2048.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccess('UV Texture map exported successfully!');
    } catch (e: any) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!engine) return;
    setExporting('snapshot');
    try {
      const dataUrl = engine.captureSnapshot();
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${activeModelName.replace(/\s+/g, '_')}_studio_render.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccess('Studio render snapshot captured!');
    } catch (e: any) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="export-modal-dialog"
        className="w-full max-w-lg flex flex-col p-6 rounded-3xl bg-neutral-900/95 border border-neutral-800 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5 text-neutral-100 font-semibold text-base">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Export 3D Artwork & Textures</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="space-y-3 my-5">
          {/* GLB Option */}
          <div
            onClick={handleExportGLB}
            className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/50 hover:bg-neutral-800/60 border border-neutral-800 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Box className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-100 group-hover:text-blue-400 transition-colors">
                  Combined 3D GLB Binary
                </span>
                <span className="text-xs text-neutral-400">
                  Full 3D model with integrated conformal stroke geometries
                </span>
              </div>
            </div>
            {exporting === 'glb' ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            ) : (
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-neutral-200" />
            )}
          </div>

          {/* OBJ Option */}
          <div
            onClick={handleExportOBJ}
            className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/50 hover:bg-neutral-800/60 border border-neutral-800 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Box className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-100 group-hover:text-purple-400 transition-colors">
                  Wavefront OBJ Mesh
                </span>
                <span className="text-xs text-neutral-400">
                  Standard OBJ geometry compatible with Blender, Maya, and Unity
                </span>
              </div>
            </div>
            {exporting === 'obj' ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            ) : (
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-neutral-200" />
            )}
          </div>

          {/* UV Map Texture PNG */}
          <div
            onClick={handleExportUVTexture}
            className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/50 hover:bg-neutral-800/60 border border-neutral-800 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-600/20 text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <Image className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-100 group-hover:text-amber-400 transition-colors">
                  2K UV Texture Map PNG
                </span>
                <span className="text-xs text-neutral-400">
                  2048x2048 dynamic UV painted surface texture map
                </span>
              </div>
            </div>
            {exporting === 'uv' ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            ) : (
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-neutral-200" />
            )}
          </div>

          {/* Studio Render Snapshot */}
          <div
            onClick={handleCaptureSnapshot}
            className="flex items-center justify-between p-4 rounded-2xl bg-neutral-950/50 hover:bg-neutral-800/60 border border-neutral-800 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Camera className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors">
                  Studio HD Screenshot
                </span>
                <span className="text-xs text-neutral-400">
                  High-resolution rendered PNG of current viewport
                </span>
              </div>
            </div>
            {exporting === 'snapshot' ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-neutral-500 group-hover:text-neutral-200" />
            )}
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
            <Check className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
