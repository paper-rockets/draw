import React, { useState } from 'react';
import { NoteProject } from '../types';

interface HomeGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: NoteProject[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateNewProject: () => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onLightenProject: (id: string) => void;
  onExportProject: (project: NoteProject) => void;
  onOpenPublishModal?: (project: NoteProject) => void;
}

export const HomeGalleryModal: React.FC<HomeGalleryModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateNewProject,
  onDuplicateProject,
  onDeleteProject,
  onLightenProject,
  onExportProject,
  onOpenPublishModal,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'projects' | 'community'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) => {
    if (activeTab === 'community') {
      if (!p.publishInfo) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchTags = p.publishInfo?.tags.some((t) => t.toLowerCase().includes(q));
      const matchAuthor = p.publishInfo?.author.toLowerCase().includes(q);
      return matchTitle || matchTags || matchAuthor;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 md:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] md:h-[85vh] rounded-3xl feather-panel shadow-2xl flex flex-col md:flex-row overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80">
        {/* Left Sidebar */}
        <div className="hidden md:flex w-64 p-5 bg-zinc-50 dark:bg-zinc-900/60 border-r border-zinc-200 dark:border-zinc-800 flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md">
                F
              </div>
              <div>
                <div className="font-bold text-sm text-zinc-900 dark:text-white">Feather 3D</div>
                <div className="text-[10px] text-zinc-400">Spatial Studio v2.0</div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <button
                onClick={() => setActiveTab('recent')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'recent'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span>Recent Sketches</span>
                <span className="text-[10px] text-emerald-500 font-mono">Recent</span>
              </button>

              <button
                onClick={() => setActiveTab('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'projects'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span>Projects and Folders</span>
                <span className="text-[10px] text-blue-500 font-mono">All</span>
              </button>

              <button
                onClick={() => setActiveTab('community')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'community'
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
              >
                <span>Community Gallery</span>
                <span className="text-[10px] text-amber-500 font-mono">Public</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="text-[10px] uppercase font-bold text-zinc-400 px-2">
              Multi-Touch and Shortcuts
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1 px-2 leading-relaxed font-mono">
              <div>- 1-Finger Hold: Pin Orbit</div>
              <div>- 3-Finger 2x Tap: Projection Toggle</div>
              <div>- 3-Finger Swipe: Lens FOV</div>
              <div>- Spacebar 2x Tap: Snap View</div>
              <div>- D / F Keys: Zoom and Pan</div>
              <div>- Tab 2x Tap: Isometric / Perspective</div>
            </div>
          </div>
        </div>

        {/* Right Main Gallery Grid */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {activeTab === 'community' ? 'Community Gallery Releases' : 'All Spatial 3D Notes'}
              </h2>
              <p className="text-xs text-zinc-400">
                {filteredProjects.length} notes found - auto-saved with IndexedDB snapshotting
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sketches..."
                className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
              />

              <button
                onClick={onCreateNewProject}
                className="px-3.5 py-1.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md feather-btn"
              >
                New Sketch
              </button>

              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filteredProjects.map((proj) => {
              const isSelected = activeProjectId === proj.id;
              const pub = proj.publishInfo;

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj.id);
                    onClose();
                  }}
                  className={`group relative rounded-3xl overflow-hidden border transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-transparent shadow-xl'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="relative aspect-4/3 bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden flex items-center justify-center">
                    <img
                      src={pub?.thumbnail || proj.thumbnail}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                      <span>{proj.strokes.length} curves</span>
                      {pub && <span>| {pub.license}</span>}
                    </div>

                    {pub && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-blue-500/90 backdrop-blur-xs text-[10px] font-bold text-white shadow-sm">
                        <span>Published</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 bg-white dark:bg-zinc-800/60 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {pub?.title || proj.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {pub ? `by ${pub.author}` : new Date(proj.updatedAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onOpenPublishModal && (
                        <button
                          onClick={() => onOpenPublishModal(proj)}
                          title="Publish to Community Gallery"
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-blue-500 feather-btn"
                        >
                          Share
                        </button>
                      )}

                      <button
                        onClick={() => onLightenProject(proj.id)}
                        title="Optimize vertex count"
                        className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-amber-500 feather-btn"
                      >
                        Light
                      </button>

                      <button
                        onClick={() => onDuplicateProject(proj.id)}
                        title="Duplicate Note"
                        className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-blue-500 feather-btn"
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => onExportProject(proj)}
                        title="Export 3D Model / Image"
                        className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-emerald-500 feather-btn"
                      >
                        Save
                      </button>

                      {projects.length > 1 && (
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          title="Delete Note"
                          className="px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-red-500 feather-btn"
                        >
                          Del
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
