import React, { useState, useEffect } from 'react';
import { SequenceShot, CameraBookmark, Stroke } from '../types';

interface SequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  shots: SequenceShot[];
  onAddShot: () => void;
  onSelectShot: (shot: SequenceShot) => void;
  onDeleteShot: (id: string) => void;
  currentCameraInfo: { x: number; y: number; z: number; fov: number };
  bookmarks: CameraBookmark[];
  onAddBookmark: (name: string) => void;
  onSelectBookmark: (bm: CameraBookmark) => void;
  onDeleteBookmark: (id: string) => void;
  isRecordingTurntable: boolean;
  onStartTurntableRecording?: (durationSec: number) => void;
  onStartTurntable?: (durationSec: number) => void;
  strokes?: Stroke[];
  strokeCount?: number;
  timelapseVisibleCount?: number;
  isTimelapsePlaying?: boolean;
  onToggleTimelapse?: () => void;
  onChangeTimelapseCount?: (count: number) => void;
  onStartTimelapseRecording?: () => void;
  onStartTimelapse?: () => void;
}

export const ARSequenceModal: React.FC<SequenceModalProps> = ({
  isOpen,
  onClose,
  shots = [],
  onAddShot,
  onSelectShot,
  onDeleteShot,
  currentCameraInfo,
  bookmarks = [],
  onAddBookmark,
  onSelectBookmark,
  onDeleteBookmark,
  isRecordingTurntable,
  onStartTurntableRecording,
  onStartTurntable,
  strokes,
  strokeCount,
  timelapseVisibleCount = 0,
  isTimelapsePlaying = false,
  onToggleTimelapse,
  onChangeTimelapseCount,
  onStartTimelapseRecording,
  onStartTimelapse,
}) => {
  const triggerTurntable = onStartTurntableRecording || onStartTurntable || (() => {});
  const triggerTimelapse = onStartTimelapseRecording || onStartTimelapse || (() => {});
  const totalStrokes = strokes ? strokes.length : (strokeCount ?? 0);
  const [activeTab, setActiveTab] = useState<'ar' | 'bookmarks' | 'turntable' | 'timelapse' | 'shots'>('ar');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentShotIdx, setCurrentShotIdx] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [showThirdsGrid, setShowThirdsGrid] = useState(false);
  const [showCameraInfo, setShowCameraInfo] = useState(false);
  const [newBookmarkName, setNewBookmarkName] = useState('');
  const [turntableDuration, setTurntableDuration] = useState<4 | 8 | 12>(8);

  useEffect(() => {
    let timer: any;
    if (isPlaying && shots.length > 1) {
      timer = setInterval(() => {
        setCurrentShotIdx((prev) => {
          const next = (prev + 1) % shots.length;
          onSelectShot(shots[next]);
          return next;
        });
      }, 2000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, shots, playbackSpeed, onSelectShot]);

  if (!isOpen) return null;

  return (
    <>
      {/* 3x3 Composition Grid Overlay */}
      {showThirdsGrid && (
        <div className="fixed inset-0 pointer-events-none z-30 grid grid-cols-3 grid-rows-3 opacity-30">
          <div className="border-r border-b border-white/60" />
          <div className="border-r border-b border-white/60" />
          <div className="border-b border-white/60" />
          <div className="border-r border-b border-white/60" />
          <div className="border-r border-b border-white/60" />
          <div className="border-b border-white/60" />
          <div className="border-r border-b border-white/60" />
          <div className="border-r border-b border-white/60" />
          <div />
        </div>
      )}

      {/* Top Bar with Camera Tools & Close */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] overflow-x-auto flex items-center gap-2 p-1.5 rounded-full feather-panel shadow-2xl border border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setShowThirdsGrid(!showThirdsGrid)}
          title="Toggle 3x3 Composition Grid"
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 feather-btn ${
            showThirdsGrid ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <span>3x3 Grid</span>
        </button>

        <button
          onClick={() => setShowCameraInfo(!showCameraInfo)}
          title="Show Camera Coordinates"
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 feather-btn ${
            showCameraInfo ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
          }`}
        >
          <span>Camera Info</span>
        </button>

        <button
          onClick={onClose}
          className="px-2.5 py-1 text-xs font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-red-500 hover:text-white transition-colors"
        >
          Close
        </button>
      </div>

      {/* Camera Coordinates Overlay Card */}
      {showCameraInfo && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 p-3 rounded-2xl feather-panel shadow-xl text-xs font-mono space-y-1 border border-zinc-200 dark:border-zinc-700">
          <div>Pos: X: {(currentCameraInfo?.x ?? 0).toFixed(2)}, Y: {(currentCameraInfo?.y ?? 0).toFixed(2)}, Z: {(currentCameraInfo?.z ?? 0).toFixed(2)}</div>
          <div>Lens FOV: {Math.round(currentCameraInfo?.fov ?? 40)}mm</div>
        </div>
      )}

      {/* Bottom Main Controller Suite */}
      <div className="fixed bottom-6 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-40 w-full max-w-2xl p-4 rounded-3xl feather-panel shadow-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-3 animate-in slide-in-from-bottom duration-200">
        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl overflow-x-auto">
          {[
            { id: 'ar', label: 'AR Controls' },
            { id: 'bookmarks', label: 'Bookmarks' },
            { id: 'turntable', label: '360 Turntable' },
            { id: 'timelapse', label: 'Timelapse' },
            { id: 'shots', label: 'Keyframes' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-1.5 px-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 0. AR VIEWPORT OVERRIDES TAB */}
        {activeTab === 'ar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <span>AR Viewport Touch and Gesture Controls</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Spatial Tracking Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                  <span>Y-Axis Levitation</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  2-finger pan gesture is converted into vertical levitation to raise or lower 3D drawings along physical Y coordinates.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                  <span>1-Finger Relocation</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  1-finger press and hold returns drawing to a semi-transparent state for repositioning before single-tap re-pinning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 1. CAMERA BOOKMARKS TAB */}
        {activeTab === 'bookmarks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Saved Viewpoints ({bookmarks.length})
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Bookmark name..."
                  value={newBookmarkName}
                  onChange={(e) => setNewBookmarkName(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    const name = newBookmarkName.trim() || `View ${bookmarks.length + 1}`;
                    onAddBookmark(name);
                    setNewBookmarkName('');
                  }}
                  className="px-3 py-1 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 feather-btn"
                >
                  Save View
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { name: 'Front', pos: [0, 0, 5], target: [0, 0, 0], fov: 45 },
                { name: 'Top', pos: [0, 6, 0.01], target: [0, 0, 0], fov: 45 },
                { name: 'Side', pos: [5, 0, 0], target: [0, 0, 0], fov: 45 },
                { name: 'Perspective', pos: [3.5, 2.5, 3.5], target: [0, 0, 0], fov: 45 },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    onSelectBookmark({
                      id: `preset-${idx}`,
                      name: preset.name,
                      position: preset.pos as any,
                      target: preset.target as any,
                      fov: preset.fov,
                    })
                  }
                  className="shrink-0 px-3 py-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold feather-btn"
                >
                  {preset.name}
                </button>
              ))}

              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => onSelectBookmark(bm)}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 cursor-pointer text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:scale-105 transition-transform"
                >
                  <span>{bm.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(bm.id);
                    }}
                    className="p-0.5 text-zinc-400 hover:text-red-500 font-bold"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. TURNTABLE TAB */}
        {activeTab === 'turntable' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Automatic 360 Orbit Studio Turntable</span>
              <div className="flex items-center gap-1">
                {[4, 8, 12].map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setTurntableDuration(dur as any)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                      turntableDuration === dur
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={isRecordingTurntable}
                onClick={() => triggerTurntable(turntableDuration)}
                className={`flex-1 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 feather-btn shadow-lg ${
                  isRecordingTurntable
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <span>
                  {isRecordingTurntable
                    ? `Recording 360 Video (${turntableDuration}s)...`
                    : 'Record and Export 360 Video (.webm)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 3. TIMELAPSE TAB */}
        {activeTab === 'timelapse' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <span>Drawing Creation Timelapse</span>
              <span className="font-mono text-emerald-500">
                {timelapseVisibleCount} / {totalStrokes} strokes
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={totalStrokes}
              value={timelapseVisibleCount}
              onChange={(e) => onChangeTimelapseCount && onChangeTimelapseCount(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={onToggleTimelapse}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold feather-btn shadow-md"
              >
                <span>{isTimelapsePlaying ? 'Pause Replay' : 'Play Timelapse'}</span>
              </button>

              <button
                onClick={triggerTimelapse}
                className="px-4 py-2 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold feather-btn shadow-md"
              >
                <span>Export Timelapse</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. KEYFRAME SEQUENCE TAB */}
        {activeTab === 'shots' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1.5 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-bold shadow-md feather-btn"
                >
                  {isPlaying ? 'Pause' : 'Play Sequence'}
                </button>

                <button
                  onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 0.5 : 1)}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                >
                  {playbackSpeed}x Speed
                </button>
              </div>

              <button
                onClick={onAddShot}
                className="px-3 py-1.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-bold shadow-sm feather-btn"
              >
                Capture Shot
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {shots.map((shot, idx) => (
                <div
                  key={shot.id}
                  onClick={() => {
                    setCurrentShotIdx(idx);
                    onSelectShot(shot);
                  }}
                  className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer transition-all ${
                    currentShotIdx === idx
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-sm'
                      : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <span className="text-xs font-bold">Shot {idx + 1}</span>
                  <span className="text-[10px] opacity-70">{Math.round(shot.fov)}mm</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteShot(shot.id);
                    }}
                    className="p-0.5 hover:text-red-400 opacity-60 hover:opacity-100 font-bold text-xs"
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
