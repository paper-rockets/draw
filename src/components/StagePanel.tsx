import React, { useState } from 'react';
import { 
  SpatialGroup, 
  ImportedResource, 
  EnvironmentConfig 
} from '../types';
import { RenderEngine } from '../engine/RenderEngine';

interface StagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  groups: SpatialGroup[];
  activeGroupId: string;
  onSelectGroup: (id: string) => void;
  onAddGroup: () => void;
  onToggleGroupVisibility: (id: string) => void;
  onIsolateGroup: (id: string) => void;
  onRenameGroup: (id: string, newName: string) => void;
  onDuplicateGroup: (id: string) => void;
  onMergeGroups: () => void;
  onDeleteGroup: (id: string) => void;
  onImportCurvesToGroup: (targetGroupId: string) => void;
  resources: ImportedResource[];
  onImportImage: (file: File) => void;
  onImportOBJ: (file: File) => void;
  onToggleResourceState: (id: string) => void;
  onDeleteResource: (id: string) => void;
  environment: EnvironmentConfig;
  onUpdateEnvironment: (env: Partial<EnvironmentConfig>) => void;
  onSyncLightToCamera: () => void;
}

export const StagePanel: React.FC<StagePanelProps> = ({
  isOpen,
  onClose,
  groups,
  activeGroupId,
  onSelectGroup,
  onAddGroup,
  onToggleGroupVisibility,
  onIsolateGroup,
  onRenameGroup,
  onDuplicateGroup,
  onMergeGroups,
  onDeleteGroup,
  onImportCurvesToGroup,
  resources,
  onImportImage,
  onImportOBJ,
  onToggleResourceState,
  onDeleteResource,
  environment,
  onUpdateEnvironment,
  onSyncLightToCamera,
}) => {
  const [activeTab, setActiveTab] = useState<'group' | 'resource' | 'environment'>('group');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempGroupName, setTempGroupName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-4 z-40 w-[calc(100vw-32px)] sm:w-80 max-h-[80vh] sm:max-h-[85vh] rounded-3xl feather-panel shadow-2xl p-4 flex flex-col border border-zinc-200/80 dark:border-zinc-700/80 animate-in slide-in-from-right duration-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          {activeTab === 'group' && (
            <button
              onClick={onAddGroup}
              title="Add New Spatial Group"
              className="px-2 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 feather-btn text-xs font-bold"
            >
              Add
            </button>
          )}

          <span className="text-sm font-bold text-zinc-900 dark:text-white">Stage Panel</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateEnvironment({ renderMode: !environment.renderMode })}
            title="Toggle Drafting View vs Lit Render Mode"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 feather-btn ${
              environment.renderMode
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}
          >
            <span>{environment.renderMode ? 'Render ON' : 'Drafting'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-2 py-1 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl my-3">
        {(['group', 'resource', 'environment'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold capitalize rounded-xl transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {/* GROUP TAB */}
        {activeTab === 'group' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">
              <span>Spatial Groups ({groups.length})</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={onMergeGroups}
                  title="Merge Visible Groups"
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase font-bold"
                >
                  Merge
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    activeGroupId === group.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: group.colorTag || '#34c759' }}
                    />
                    {editingGroupId === group.id ? (
                      <input
                        type="text"
                        value={tempGroupName}
                        autoFocus
                        onChange={(e) => setTempGroupName(e.target.value)}
                        onBlur={() => {
                          if (tempGroupName.trim()) onRenameGroup(group.id, tempGroupName);
                          setEditingGroupId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (tempGroupName.trim()) onRenameGroup(group.id, tempGroupName);
                            setEditingGroupId(null);
                          }
                        }}
                        className="bg-zinc-200 dark:bg-zinc-700 text-xs px-1.5 py-0.5 rounded outline-none w-full"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          setEditingGroupId(group.id);
                          setTempGroupName(group.name);
                        }}
                        className="text-xs font-semibold truncate"
                      >
                        {group.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onImportCurvesToGroup(group.id)}
                      title="Import Selected Curves into this Group"
                      className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-emerald-500 feather-btn"
                    >
                      Import
                    </button>

                    <button
                      onClick={() => onToggleGroupVisibility(group.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        onIsolateGroup(group.id);
                      }}
                      title="Toggle visibility"
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md feather-btn ${
                        group.visible ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-400'
                      }`}
                    >
                      {group.visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESOURCE TAB */}
        {activeTab === 'resource' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <label className="flex-1 py-2 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 feather-btn">
                <span>Add Image (2D)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) onImportImage(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>

              <label className="flex-1 py-2 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 feather-btn">
                <span>Add 3D Model (OBJ)</span>
                <input
                  type="file"
                  accept=".obj"
                  onChange={(e) => {
                    if (e.target.files?.[0]) onImportOBJ(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              {resources.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-400">
                  No external resources or saved surfaces.
                </div>
              ) : (
                resources.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-semibold truncate text-zinc-800 dark:text-zinc-200">
                        {res.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleResourceState(res.id)}
                        title={`Collision State: ${res.state.toUpperCase()}`}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-200 dark:bg-zinc-700 uppercase"
                      >
                        {res.state}
                      </button>

                      <button
                        onClick={() => onDeleteResource(res.id)}
                        className="px-1.5 py-0.5 text-[10px] font-bold text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ENVIRONMENT TAB */}
        {activeTab === 'environment' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Atmosphere & Sky Presets
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'day', label: 'Daylight', desc: 'Sun & Clouds', color: '#38bdf8', preset: 'day' as const },
                  { id: 'dusk', label: 'Dusk', desc: 'Sunset Amber', color: '#fb923c', preset: 'dusk' as const },
                  { id: 'night', label: 'Night', desc: 'Starry Sky', color: '#3b82f6', preset: 'night' as const },
                  { id: 'dawn', label: 'Dawn', desc: 'Pastel Morning', color: '#f472b6', preset: 'dawn' as const },
                  { id: 'studio', label: 'Studio', desc: 'Clean Neutral', color: '#94a3b8', preset: 'studio' as const },
                  { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon Glow', color: '#d946ef', preset: 'cyberpunk' as const },
                ].map((item) => {
                  const isActive = environment.preset === item.id || (item.id === 'day' && environment.preset === 'daylight') || (item.id === 'dusk' && environment.preset === 'sunset') || (item.id === 'night' && environment.preset === 'darkroom');
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const presetConfig = RenderEngine.getEnvironmentPreset(item.preset);
                        onUpdateEnvironment(presetConfig);
                      }}
                      className={`p-2 rounded-2xl text-left border flex flex-col justify-between transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div
                          className="w-3 h-3 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-500">Active</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-white leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Background Mode Switcher */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Background Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateEnvironment({ backgroundType: 'procedural-sky' })}
                  className={`p-2 text-xs font-bold rounded-xl border flex items-center justify-center feather-btn ${
                    environment.backgroundType === 'procedural-sky' || (!environment.backgroundType && environment.preset !== 'studio')
                      ? 'bg-blue-600 text-white border-transparent shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  Procedural Sky
                </button>

                <button
                  onClick={() => onUpdateEnvironment({ backgroundType: 'solid' })}
                  className={`p-2 text-xs font-bold rounded-xl border flex items-center justify-center feather-btn ${
                    environment.backgroundType === 'solid' || (environment.preset === 'studio' && environment.backgroundType !== 'procedural-sky')
                      ? 'bg-blue-600 text-white border-transparent shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  Solid Color
                </button>
              </div>
            </div>

            {/* Procedural Sky & Cloud Settings */}
            {(environment.backgroundType === 'procedural-sky' || (!environment.backgroundType && environment.preset !== 'studio')) && (
              <div className="space-y-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Sky and Animated Clouds</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Procedural Shader</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span>Cloud Density</span>
                    <span className="font-semibold">{Math.round((environment.cloudDensity ?? 0.45) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.02"
                    value={environment.cloudDensity ?? 0.45}
                    onChange={(e) => onUpdateEnvironment({ cloudDensity: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span>Wind Speed</span>
                    <span className="font-semibold">{(environment.cloudSpeed ?? 0.8).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="3.0"
                    step="0.1"
                    value={environment.cloudSpeed ?? 0.8}
                    onChange={(e) => onUpdateEnvironment({ cloudSpeed: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                    <span>Cloud Scale</span>
                    <span className="font-semibold">{(environment.cloudScale ?? 1.5).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.5"
                    step="0.1"
                    value={environment.cloudScale ?? 1.5}
                    onChange={(e) => onUpdateEnvironment({ cloudScale: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-600">
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">Zenith</span>
                    <input
                      type="color"
                      value={environment.skyZenithColor || '#1e88e5'}
                      onChange={(e) => onUpdateEnvironment({ skyZenithColor: e.target.value })}
                      className="w-5 h-5 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between p-1.5 rounded-xl bg-white dark:bg-zinc-700/60 border border-zinc-200 dark:border-zinc-600">
                    <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300">Horizon</span>
                    <input
                      type="color"
                      value={environment.skyHorizonColor || '#bae6fd'}
                      onChange={(e) => onUpdateEnvironment({ skyHorizonColor: e.target.value })}
                      className="w-5 h-5 rounded-lg border-0 cursor-pointer overflow-hidden bg-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Solid Background Color */}
            {environment.backgroundType === 'solid' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Backdrop Color</span>
                  <input
                    type="color"
                    value={environment.backgroundColor}
                    onChange={(e) => onUpdateEnvironment({ backgroundColor: e.target.value })}
                    className="w-7 h-7 rounded-xl border-0 cursor-pointer overflow-hidden bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* Toon Shading Section */}
            <div className="space-y-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  <span>Toon and Cel Shading</span>
                </div>
                <button
                  onClick={() => onUpdateEnvironment({ toonShading: !environment.toonShading })}
                  className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                    environment.toonShading ? 'bg-emerald-500 text-white shadow-xs' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                  }`}
                >
                  {environment.toonShading ? 'ON' : 'OFF'}
                </button>
              </div>

              {environment.toonShading && (
                <div className="space-y-2.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                      <span>Cel Bands</span>
                      <span className="font-semibold">{environment.toonBands ?? 3} Bands</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[2, 3, 4, 5].map((b) => (
                        <button
                          key={b}
                          onClick={() => onUpdateEnvironment({ toonBands: b })}
                          className={`py-1 text-xs font-bold rounded-lg border ${
                            (environment.toonBands ?? 3) === b
                              ? 'bg-emerald-500 text-white border-transparent'
                              : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-600'
                          }`}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
                      <span>Anime Rim Highlight</span>
                      <span className="font-semibold">{Math.round((environment.toonRimIntensity ?? 0.6) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.5"
                      step="0.05"
                      value={environment.toonRimIntensity ?? 0.6}
                      onChange={(e) => onUpdateEnvironment({ toonRimIntensity: Number(e.target.value) })}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* World Overlays */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                World Overlays
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateEnvironment({ showAxes: !environment.showAxes })}
                  className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border feather-btn ${
                    environment.showAxes
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <span>Global Axis</span>
                  <span>{environment.showAxes ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  onClick={() => onUpdateEnvironment({ showGrid: !environment.showGrid })}
                  className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-between border feather-btn ${
                    environment.showGrid
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <span>Grid Floor</span>
                  <span>{environment.showGrid ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Sun and Light Controls */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>Sun and Lighting Angle</span>
                <button
                  onClick={onSyncLightToCamera}
                  title="Align Light Angle to View"
                  className="text-xs font-bold text-emerald-500 hover:text-emerald-600"
                >
                  Sync to View
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Sun Altitude ({environment.lightAltitude} deg)</span>
                  <span>Azimuth ({environment.lightAzimuth} deg)</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="85"
                  value={environment.lightAltitude}
                  onChange={(e) => onUpdateEnvironment({ lightAltitude: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={environment.lightAzimuth}
                  onChange={(e) => onUpdateEnvironment({ lightAzimuth: Number(e.target.value) })}
                  className="w-full accent-amber-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
