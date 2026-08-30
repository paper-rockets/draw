import React, { useEffect, useState } from 'react';
import { ProjectSnapshot, NoteProject } from '../types';
import { StorageEngine } from '../utils/storage';

interface SnapshotHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: NoteProject;
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
}

export const SnapshotHistoryModal: React.FC<SnapshotHistoryModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onRestoreSnapshot,
}) => {
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadSnapshots = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    try {
      const list = await StorageEngine.getSnapshots(currentProject.id);
      setSnapshots(list);
      if (list.length > 0 && !selectedSnapshotId) {
        setSelectedSnapshotId(list[0].id);
      }
    } catch (e) {
      console.warn('Failed to load snapshots:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, currentProject?.id]);

  if (!isOpen) return null;

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await StorageEngine.deleteSnapshot(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
      if (selectedSnapshotId === id) {
        setSelectedSnapshotId(null);
      }
    } catch (err) {
      console.error('Failed to delete snapshot:', err);
    }
  };

  const handleConfirmRestore = (snapshot: ProjectSnapshot) => {
    onRestoreSnapshot(snapshot);
    setSuccessToast(`Restored checkpoint "${snapshot.title}"`);
    setConfirmRestoreId(null);
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 1200);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[85vh] rounded-3xl feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              IndexedDB Snapshot Timeline
            </h2>
            <p className="text-xs text-zinc-400">
              Recover previous versions and checkpoint snapshots for "{currentProject?.title}"
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl"
          >
            Close
          </button>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in">
            {successToast}
          </div>
        )}

        {/* Body Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Timeline List */}
          <div className="w-full md:w-5/12 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto p-3 space-y-2 bg-zinc-50/30 dark:bg-zinc-900/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1">
              Snapshots Available ({snapshots.length})
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-xs text-zinc-400">Loading timeline...</div>
            ) : snapshots.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 px-4">
                No automatic snapshots stored yet. Changes are recorded periodically as you draw.
              </div>
            ) : (
              snapshots.map((snap) => {
                const isSelected = snap.id === selectedSnapshotId;
                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`group p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                        : 'bg-white dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {snap.title}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {formatTimestamp(snap.timestamp)}
                      </div>
                      <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                        {snap.strokeCount} curves | {snap.layerCount} layers
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(snap.id, e)}
                      title="Delete Snapshot"
                      className="px-1.5 py-1 text-xs font-bold text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Del
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Snapshot Detail & Restore */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-zinc-850 flex flex-col justify-between">
            {selectedSnapshot ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 font-mono">
                      Checkpoint Metadata
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                      {selectedSnapshot.title}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Recorded: {formatTimestamp(selectedSnapshot.timestamp)}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-700/60">
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-white">{selectedSnapshot.strokeCount}</div>
                      <div className="text-[10px] text-zinc-400">Total Curves</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-white">{selectedSnapshot.layerCount}</div>
                      <div className="text-[10px] text-zinc-400">Spatial Layers</div>
                    </div>
                    <div>
                      <div className="text-base font-bold text-zinc-900 dark:text-white">
                        {selectedSnapshot.projectData.cameraBookmarks?.length || 0}
                      </div>
                      <div className="text-[10px] text-zinc-400">Camera Bookmarks</div>
                    </div>
                  </div>

                  {selectedSnapshot.thumbnail && (
                    <div className="rounded-2xl overflow-hidden aspect-16/9 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50">
                      <img
                        src={selectedSnapshot.thumbnail}
                        alt="Snapshot preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40">
                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Restoring this snapshot will replace your current workspace canvas with this saved state and record an undo history milestone.
                  </p>
                </div>

                {confirmRestoreId === selectedSnapshot.id ? (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      <span>Confirm Project Restoration?</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmRestore(selectedSnapshot)}
                        className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                      >
                        Yes, Restore Canvas State
                      </button>
                      <button
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-300 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRestoreId(selectedSnapshot.id)}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center cursor-pointer transition-all"
                  >
                    <span>Restore to this Snapshot</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 space-y-2">
                <p className="text-sm font-semibold">Select a Snapshot</p>
                <p className="text-xs max-w-xs">
                  Choose a timeline checkpoint on the left to inspect its parameters or restore your canvas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
