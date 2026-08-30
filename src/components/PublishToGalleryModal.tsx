import React, { useState } from 'react';
import { NoteProject, GalleryPublishInfo, CreativeCommonsLicense } from '../types';

interface PublishToGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: NoteProject;
  onSavePublishInfo: (info: GalleryPublishInfo) => void;
  onCaptureFramedThumbnail: () => string;
}

export const PublishToGalleryModal: React.FC<PublishToGalleryModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  onSavePublishInfo,
  onCaptureFramedThumbnail,
}) => {
  const existing = currentProject.publishInfo;

  const [title, setTitle] = useState(existing?.title || currentProject.title || 'Untitled 3D Note');
  const [author, setAuthor] = useState(existing?.author || 'Spatial Creator');
  const [description, setDescription] = useState(
    existing?.description || 'A 3D spatial sketch crafted in Feather 3D studio.'
  );
  const [license, setLicense] = useState<CreativeCommonsLicense>(existing?.license || 'CC-BY-4.0');
  const [isWip, setIsWip] = useState(existing?.isWip ?? false);
  const [isDownloadable, setIsDownloadable] = useState(existing?.isDownloadable ?? true);
  const [tags, setTags] = useState<string[]>(existing?.tags || ['3D Sketch', 'Feather3D', 'Concept Design']);
  const [newTagInput, setNewTagInput] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(existing?.thumbnail || currentProject.thumbnail || '');
  const [showThirdsGrid, setShowThirdsGrid] = useState(true);
  const [isPublishedSuccess, setIsPublishedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCaptureNewFrame = () => {
    const dataUrl = onCaptureFramedThumbnail();
    if (dataUrl) {
      setThumbnailUrl(dataUrl);
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmitPublish = () => {
    const publishData: GalleryPublishInfo = {
      title: title.trim() || currentProject.title,
      author: author.trim() || 'Anonymous',
      description: description.trim(),
      license,
      isWip,
      isDownloadable,
      tags,
      thumbnail: thumbnailUrl || currentProject.thumbnail,
      publishedAt: Date.now(),
    };

    onSavePublishInfo(publishData);
    setIsPublishedSuccess(true);
    setTimeout(() => {
      setIsPublishedSuccess(false);
      onClose();
    }, 1200);
  };

  const licenseDescriptions: Record<CreativeCommonsLicense, string> = {
    'CC-BY-4.0': 'Attribution 4.0 International - Free sharing and adaptation with credit given.',
    'CC-BY-SA-4.0': 'Attribution-ShareAlike 4.0 - Free sharing under the same license terms.',
    'CC0-1.0': 'Public Domain Dedication - Free for any purpose without restrictions.',
    'All-Rights-Reserved': 'All Rights Reserved - Viewer view-only, commercial use restricted.',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl feather-panel shadow-2xl flex flex-col overflow-hidden border border-zinc-200/80 dark:border-zinc-700/80">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Publish to Community Gallery
            </h2>
            <p className="text-xs text-zinc-400">
              Share your 3D spatial note with license terms and thumbnail framing
            </p>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl"
          >
            Close
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="md:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cyberpunk Hoverbike"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                  Creator / Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your Name or Handle"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                Project Description & Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your spatial workflow, brushes used, or inspiration..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs font-normal text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                Creative Commons & Usage License
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0', 'All-Rights-Reserved'] as CreativeCommonsLicense[]).map((lic) => (
                  <button
                    key={lic}
                    type="button"
                    onClick={() => setLicense(lic)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      license === lic
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-xs'
                    }`}
                  >
                    <div className="text-xs font-bold">{lic}</div>
                    <div className="text-[10px] opacity-75 truncate">{lic === 'CC0-1.0' ? 'Public Domain' : lic === 'All-Rights-Reserved' ? 'Restricted' : 'Open Sharing'}</div>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 leading-tight">
                {licenseDescriptions[license]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isWip}
                  onChange={(e) => setIsWip(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 accent-blue-500"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Work in Progress</div>
                  <div className="text-[10px] text-zinc-400">Mark note as active draft</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDownloadable}
                  onChange={(e) => setIsDownloadable(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Allow 3D Download</div>
                  <div className="text-[10px] text-zinc-400">Let others download .glb model</div>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-zinc-400 mb-1">
                Keywords & Category Tags
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag (e.g. Architecture, Anime, Vehicle)..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-blue-500 hover:text-white text-xs font-bold transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200/60 dark:border-blue-800/60"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 font-bold"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-zinc-400">
                Thumbnail Framing
              </label>
              <button
                type="button"
                onClick={() => setShowThirdsGrid(!showThirdsGrid)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  showThirdsGrid
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300'
                    : 'text-zinc-400 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <span>3x3 Grid</span>
              </button>
            </div>

            <div className="relative aspect-4/3 rounded-2xl bg-zinc-950 overflow-hidden border border-zinc-300 dark:border-zinc-700 shadow-inner flex items-center justify-center group">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-zinc-500 flex flex-col items-center gap-2">
                  <span>No Thumbnail Captured</span>
                </div>
              )}

              {showThirdsGrid && (
                <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                  <div className="border-r border-b border-white/80" />
                  <div className="border-r border-b border-white/80" />
                  <div className="border-b border-white/80" />
                  <div className="border-r border-b border-white/80" />
                  <div className="border-r border-b border-white/80" />
                  <div className="border-b border-white/80" />
                  <div className="border-r border-b border-white/80" />
                  <div className="border-r border-b border-white/80" />
                  <div />
                </div>
              )}

              <button
                type="button"
                onClick={handleCaptureNewFrame}
                className="absolute bottom-2 right-2 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 shadow-lg flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <span>Frame Viewport</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Community Card Preview</span>
                <span className="font-mono">{currentProject.strokes.length} strokes</span>
              </div>
              <div className="font-bold text-xs text-zinc-800 dark:text-zinc-100 truncate">
                {title}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <span>by {author}</span>
                <span>|</span>
                <span className="font-semibold text-blue-500">{license}</span>
                {isWip && <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-500 rounded text-[9px] font-bold">WIP</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-xs text-zinc-400">
            {isPublishedSuccess ? (
              <span className="text-emerald-500 font-bold">
                Published to Community Gallery!
              </span>
            ) : (
              <span>Your sketch will be indexed in local and shared project galleries.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmitPublish}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg feather-btn active:scale-95 transition-all"
            >
              Publish 3D Note
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
