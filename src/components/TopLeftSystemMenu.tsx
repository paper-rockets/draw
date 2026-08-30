import React, { useState } from 'react';
import { EnvironmentConfig } from '../types';

interface TopLeftSystemMenuProps {
  onOpenHome: () => void;
  onOpenModelLibrary?: () => void;
  onCaptureThumbnail: () => void;
  onToggleHideUI: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  isFingerPenMode: boolean;
  onToggleFingerPen: () => void;
  palmRejectionEnabled?: boolean;
  onTogglePalmRejection?: () => void;
  palmRejectionRadius?: number;
  onChangePalmRejectionRadius?: (radius: number) => void;
  onOpenSequence: () => void;
  onOpenExport: () => void;
  onOpenSnapshots?: () => void;
  lastSnapshotNotice?: string | null;
  environment: EnvironmentConfig;
  onUpdateEnvironment: (env: Partial<EnvironmentConfig>) => void;
  projectTitle?: string;
  isAutosaved?: boolean;
}

export const TopLeftSystemMenu: React.FC<TopLeftSystemMenuProps> = ({
  onOpenHome,
  onOpenModelLibrary,
  onCaptureThumbnail,
  onToggleHideUI,
  isDarkMode,
  onToggleDarkMode,
  isFingerPenMode,
  onToggleFingerPen,
  palmRejectionEnabled = true,
  onTogglePalmRejection,
  palmRejectionRadius = 160,
  onChangePalmRejectionRadius,
  onOpenSequence,
  onOpenExport,
  onOpenSnapshots,
  lastSnapshotNotice,
  environment,
  onUpdateEnvironment,
  projectTitle = 'Untitled Sketch',
  isAutosaved = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'view' | 'control'>('file');

  return (
    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-40 flex items-center gap-1.5 sm:gap-2">
      {/* Home Button */}
      <button
        id="btn-home"
        onClick={onOpenHome}
        title="Home Notes Gallery (IndexedDB Slots)"
        className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-2xl feather-panel flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 feather-btn shadow-md"
      >
        Home
      </button>

      {/* System Menu Dropdown Trigger */}
      <div className="relative">
        <button
          id="btn-system-menu"
          onClick={() => setIsOpen(!isOpen)}
          title="System and File Menu"
          className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-2xl feather-panel flex items-center justify-center text-xs font-bold feather-btn shadow-md ${
            isOpen 
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
              : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Menu
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-12 sm:top-14 left-0 w-72 rounded-3xl feather-panel p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-zinc-200/80 dark:border-zinc-700/80 z-50">
            {/* Tabs: File, View, Control */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl mb-3">
              {(['file', 'view', 'control'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'file' && (
              <div className="space-y-1">
                {onOpenModelLibrary && (
                  <button
                    onClick={() => {
                      onOpenModelLibrary();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                  >
                    <div>
                      <div className="text-sm font-medium">3D Model Library</div>
                      <div className="text-[10px] text-zinc-400 font-normal">Load preset or import GLB/OBJ</div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-500 uppercase">3D</span>
                  </button>
                )}

                {onOpenSnapshots && (
                  <button
                    onClick={() => {
                      onOpenSnapshots();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                  >
                    <div>
                      <div className="text-sm font-medium">Snapshots and Recovery</div>
                      <div className="text-[10px] text-zinc-400 font-normal">Auto 30s IndexedDB history</div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase">History</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onCaptureThumbnail();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Capture Thumbnail</span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Snap</span>
                </button>

                <button
                  onClick={() => {
                    onOpenExport();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Export 3D (GLB, GLTF, OBJ)</span>
                  <span className="text-[10px] font-bold text-blue-500 uppercase">Export</span>
                </button>
              </div>
            )}

            {activeTab === 'view' && (
              <div className="space-y-1">
                <button
                  onClick={() => {
                    onToggleHideUI();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Hide Interface (Zen Mode)</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Zen</span>
                </button>

                <button
                  onClick={() => {
                    onOpenSequence();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Camera Director and Turntable</span>
                  <span className="text-[10px] font-bold text-purple-500 uppercase">Director</span>
                </button>
              </div>
            )}

            {activeTab === 'control' && (
              <div className="space-y-1">
                <button
                  onClick={onToggleDarkMode}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Dark Mode</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    {isDarkMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={onToggleFingerPen}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Finger-Pen Draw Mode</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isFingerPenMode ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                    {isFingerPenMode ? 'LOCKED' : 'OFF'}
                  </span>
                </button>

                <button
                  onClick={() => onUpdateEnvironment({ renderMode: !environment.renderMode })}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                >
                  <span>Active Render on Open</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${environment.renderMode ? 'bg-rose-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                    {environment.renderMode ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Palm Rejection Settings */}
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <button
                    onClick={onTogglePalmRejection}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 feather-btn"
                  >
                    <div>
                      <div className="text-sm font-medium">Palm Rejection</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-normal">Discards touch near stylus tip</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${palmRejectionEnabled ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'}`}>
                      {palmRejectionEnabled ? 'ACTIVE' : 'OFF'}
                    </span>
                  </button>

                  {palmRejectionEnabled && onChangePalmRejectionRadius && (
                    <div className="px-3 pt-2 pb-1.5 space-y-2 bg-zinc-50 dark:bg-zinc-950/40 rounded-xl mt-1 border border-zinc-200/50 dark:border-zinc-800/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400 font-medium">Proximity Radius:</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{palmRejectionRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="320"
                        step="10"
                        value={palmRejectionRadius}
                        onChange={(e) => onChangePalmRejectionRadius(Number(e.target.value))}
                        className="w-full h-1.5 rounded-lg accent-blue-500 cursor-pointer"
                      />
                      <div className="flex gap-1.5 pt-0.5">
                        {[
                          { label: 'Tight', val: 90 },
                          { label: 'Balanced', val: 160 },
                          { label: 'Wide', val: 240 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => onChangePalmRejectionRadius(preset.val)}
                            className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${
                              palmRejectionRadius === preset.val
                                ? 'bg-blue-500 text-white shadow-2xs'
                                : 'bg-zinc-200/70 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300'
                            }`}
                          >
                            {preset.label} ({preset.val}px)
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Title and Autosaved Pill */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl feather-panel shadow-md border border-zinc-200/80 dark:border-zinc-700/80">
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 max-w-[140px] truncate">
          {projectTitle}
        </span>
        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          <span>Autosaved</span>
        </div>
      </div>
    </div>
  );
};
