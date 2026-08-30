import React, { useState, useMemo } from 'react';
import { Stroke, SpatialGroup, NoteProject } from '../types';
import { GeometryEngine } from '../engine/GeometryEngine';
import { ExportEngine, GLTFExportOptions } from '../engine/ExportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: NoteProject;
  currentProject?: NoteProject;
  onExportOBJ?: () => void;
  onExportCanvasImage: (transparent: boolean) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  currentProject: passedCurrentProject,
  onExportOBJ,
  onExportCanvasImage,
}) => {
  const activeProj = project || passedCurrentProject;
  const [exportFormat, setExportFormat] = useState<'glb' | 'gltf' | 'obj' | 'png' | 'jpg' | 'json'>('glb');
  const [customFilename, setCustomFilename] = useState<string>('');
  const [transparentBg, setTransparentBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  const [includeVertexColors, setIncludeVertexColors] = useState<boolean>(true);
  const [includeMaterials, setIncludeMaterials] = useState<boolean>(true);
  const [includeTextures, setIncludeTextures] = useState<boolean>(true);
  const [includeHierarchy, setIncludeHierarchy] = useState<boolean>(true);
  const [includeCameras, setIncludeCameras] = useState<boolean>(true);
  const [onlyVisibleLayers, setOnlyVisibleLayers] = useState<boolean>(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  const stats = useMemo(() => {
    if (!activeProj) {
      return { totalStrokes: 0, totalVertices: 0, totalTriangles: 0, totalLayers: 0, estimatedFileSizeKB: '0 KB' };
    }
    return ExportEngine.computeSceneStats(
      activeProj.strokes || [],
      activeProj.groups || [],
      onlyVisibleLayers
    );
  }, [activeProj?.strokes, activeProj?.groups, onlyVisibleLayers]);

  if (!isOpen || !activeProj) return null;

  const currentProject = activeProj;
  const defaultFilename = currentProject.title.toLowerCase().replace(/\s+/g, '_') || 'feather_sketch';

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);

    const filename = (customFilename.trim() || defaultFilename)
      .replace(/[^\w\d-_]/g, '_');

    try {
      if (exportFormat === 'glb' || exportFormat === 'gltf') {
        const options: GLTFExportOptions = {
          binary: exportFormat === 'glb',
          includeVertexColors,
          includeMaterials,
          includeHierarchy,
          includeTextures,
          includeCameras,
          onlyVisibleGroups: onlyVisibleLayers,
        };

        await ExportEngine.exportToGLTF(currentProject, currentProject.groups, options, filename);
        setExportSuccessMessage(`Exported ${filename}.${exportFormat} successfully`);
      } else if (exportFormat === 'obj') {
        if (onExportOBJ) {
          onExportOBJ();
        } else {
          const objContent = GeometryEngine.exportToOBJ(currentProject.strokes || []);
          const blob = new Blob([objContent], { type: 'text/plain;charset=utf-8' });
          ExportEngine.downloadFile(blob, `${filename}.obj`);
        }
        setExportSuccessMessage(`Exported ${filename}.obj successfully`);
      } else if (exportFormat === 'png' || exportFormat === 'jpg') {
        onExportCanvasImage(transparentBg && exportFormat === 'png');
        setExportSuccessMessage(`Exported ${exportFormat.toUpperCase()} image successfully`);
      } else if (exportFormat === 'json') {
        const jsonStr = JSON.stringify(currentProject, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        ExportEngine.downloadFile(blob, `${filename}.f3d.json`);
        setExportSuccessMessage(`Exported ${filename}.f3d.json project file`);
      }
    } catch (err: any) {
      console.error('Export Error:', err);
      alert(`Export Failed: ${err?.message || 'Unknown error occurred during export'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Export 3D Project
            </h2>
            <p className="text-xs text-zinc-400">
              Export high-fidelity 3D meshes, textures, and scenes
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl"
          >
            Close
          </button>
        </div>

        {/* Live Scene Statistics */}
        <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Scene Complexity & Statistics
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="text-[10px] text-zinc-400">Strokes</div>
              <div className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">{stats.totalStrokes}</div>
            </div>
            <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="text-[10px] text-zinc-400">Vertices</div>
              <div className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">{stats.totalVertices.toLocaleString()}</div>
            </div>
            <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="text-[10px] text-zinc-400">Polygons</div>
              <div className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">{stats.totalTriangles.toLocaleString()}</div>
            </div>
            <div className="p-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="text-[10px] text-zinc-400">Est. Size</div>
              <div className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.estimatedFileSizeKB}</div>
            </div>
          </div>
        </div>

        {/* Format Selectors */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Select Output Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'glb', label: 'GLB (Binary)', desc: 'glTF 2.0 Binary, Blender & Godot ready' },
              { id: 'gltf', label: 'glTF (JSON)', desc: 'glTF Embedded JSON with buffers' },
              { id: 'obj', label: 'Wavefront OBJ', desc: 'Universal 3D polygon mesh format' },
              { id: 'png', label: 'PNG Image', desc: 'Lossless with optional alpha background' },
              { id: 'jpg', label: 'JPEG Image', desc: 'Compressed 2D canvas snapshot' },
              { id: 'json', label: 'Feather Project', desc: 'Raw note project schema archive' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => {
                  setExportFormat(fmt.id as any);
                  setExportSuccessMessage(null);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  exportFormat === fmt.id
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white uppercase">
                    {fmt.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                    {fmt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced GLTF Export Options */}
        {(exportFormat === 'glb' || exportFormat === 'gltf') && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <div
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                glTF 2.0 Serialization Config
              </div>
              <button className="text-[10px] font-bold text-emerald-500">
                {showAdvancedSettings ? 'Hide Options' : 'Show Options'}
              </button>
            </div>

            {showAdvancedSettings && (
              <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Export Per-Vertex RGB Colors</span>
                    <p className="text-[10px] text-zinc-400">Embeds feather stroke colors directly into mesh vertex buffers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeVertexColors}
                    onChange={(e) => setIncludeVertexColors(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Export Standard PBR Materials</span>
                    <p className="text-[10px] text-zinc-400">Embeds roughness, metalness, and unlit shaders</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Preserve Group Graph Hierarchy</span>
                    <p className="text-[10px] text-zinc-400">Retains spatial layer folders in glTF scene tree</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeHierarchy}
                    onChange={(e) => setIncludeHierarchy(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between text-xs cursor-pointer select-none">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">Only Visible Layers</span>
                    <p className="text-[10px] text-zinc-400">Filter out hidden layers from the exported scene</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={onlyVisibleLayers}
                    onChange={(e) => setOnlyVisibleLayers(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* PNG Options */}
        {exportFormat === 'png' && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700">
            <div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Transparent Background (Alpha)
              </span>
              <p className="text-[10px] text-zinc-400">Remove environment sky and background color</p>
            </div>
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        )}

        {/* Custom Filename Field */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Export Filename
          </label>
          <div className="flex items-center rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs">
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={defaultFilename}
              className="flex-1 bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder-zinc-400"
            />
            <span className="text-zinc-400 font-mono font-bold text-[11px]">
              .{exportFormat === 'json' ? 'f3d.json' : exportFormat}
            </span>
          </div>
        </div>

        {/* Success Feedback Alert */}
        {exportSuccessMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Export Confirm Button */}
        <button
          disabled={isExporting}
          onClick={handleExport}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
        >
          {isExporting ? (
            <span>Serializing {exportFormat.toUpperCase()} Scene Data...</span>
          ) : (
            <span>Confirm and Export {exportFormat.toUpperCase()} File</span>
          )}
        </button>
      </div>
    </div>
  );
};
