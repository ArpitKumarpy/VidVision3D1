import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  Sparkles,
  Download,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  Sliders,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Maximize2,
  Move
} from 'lucide-react';
import { STARTER_PUPPET_SPRITES, downloadPuppetArtistTemplate } from '../utils/defaultPuppetSprites';
import {
  PuppetFittings,
  PuppetPartKey,
  PartFitting,
  DEFAULT_PART_FITTING
} from '../types/puppetFitting';

export interface CustomPuppetParts {
  head?: string;
  torso?: string;
  upperArm?: string;
  forearm?: string;
  thigh?: string;
  shin?: string;
  // Optional distinct right side parts if unmirrored
  rightUpperArm?: string;
  rightForearm?: string;
  rightThigh?: string;
  rightShin?: string;
}

interface CustomPuppetModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: CustomPuppetParts;
  onUpdateParts: (parts: CustomPuppetParts) => void;
  fittings?: PuppetFittings;
  onUpdateFittings?: (fittings: PuppetFittings) => void;
}

interface PartConfig {
  key: keyof CustomPuppetParts;
  label: string;
  description: string;
  recommendedSize: string;
  anchorNote: string;
}

const BODY_PART_CONFIGS: PartConfig[] = [
  {
    key: 'head',
    label: 'Head / Mask',
    description: 'Face, avatar, cartoon head or helmet',
    recommendedSize: '200 × 200 px (PNG/SVG)',
    anchorNote: 'Rotates around neck joint',
  },
  {
    key: 'torso',
    label: 'Torso / Outfit',
    description: 'Shirt, jacket, vest or chestplate',
    recommendedSize: '220 × 260 px (PNG/SVG)',
    anchorNote: 'Pivots from hips to shoulders',
  },
  {
    key: 'upperArm',
    label: 'Upper Arm (Shoulder)',
    description: 'Bicep / shoulder sleeve',
    recommendedSize: '120 × 50 px (Horizontal)',
    anchorNote: 'Anchored at shoulder, points to elbow',
  },
  {
    key: 'forearm',
    label: 'Forearm & Hand',
    description: 'Lower arm, glove, or hand',
    recommendedSize: '120 × 50 px (Horizontal)',
    anchorNote: 'Anchored at elbow, points to wrist',
  },
  {
    key: 'thigh',
    label: 'Thigh (Upper Leg)',
    description: 'Pants, shorts, or mechanical thigh',
    recommendedSize: '120 × 60 px (Horizontal)',
    anchorNote: 'Anchored at hip, points to knee',
  },
  {
    key: 'shin',
    label: 'Shin & Foot (Lower Leg)',
    description: 'Calf, boot, or sneaker',
    recommendedSize: '130 × 60 px (Horizontal)',
    anchorNote: 'Anchored at knee, points to ankle',
  },
];

export const CustomPuppetModal: React.FC<CustomPuppetModalProps> = ({
  isOpen,
  onClose,
  parts,
  onUpdateParts,
  fittings = {},
  onUpdateFittings,
}) => {
  const [activeTab, setActiveTab] = useState<'parts' | 'guide'>('parts');
  const [mirrorLimbs, setMirrorLimbs] = useState(true);
  const [expandedFitKey, setExpandedFitKey] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  if (!isOpen) return null;

  const handleUpdatePartFitting = (key: PuppetPartKey, updates: Partial<PartFitting>) => {
    if (!onUpdateFittings) return;
    const current = fittings[key] || DEFAULT_PART_FITTING;
    const updated: PuppetFittings = {
      ...fittings,
      [key]: {
        ...current,
        ...updates,
      },
    };
    if (mirrorLimbs) {
      if (key === 'upperArm') updated.rightUpperArm = { ...(updated.upperArm || DEFAULT_PART_FITTING) };
      if (key === 'forearm') updated.rightForearm = { ...(updated.forearm || DEFAULT_PART_FITTING) };
      if (key === 'thigh') updated.rightThigh = { ...(updated.thigh || DEFAULT_PART_FITTING) };
      if (key === 'shin') updated.rightShin = { ...(updated.shin || DEFAULT_PART_FITTING) };
    }
    onUpdateFittings(updated);
  };

  const handleFileUpload = (key: keyof CustomPuppetParts, file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const updated = { ...parts, [key]: result };
      if (mirrorLimbs) {
        if (key === 'upperArm') updated.rightUpperArm = result;
        if (key === 'forearm') updated.rightForearm = result;
        if (key === 'thigh') updated.rightThigh = result;
        if (key === 'shin') updated.rightShin = result;
      }
      onUpdateParts(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleClearPart = (key: keyof CustomPuppetParts) => {
    const updated = { ...parts };
    delete updated[key];
    if (mirrorLimbs) {
      if (key === 'upperArm') delete updated.rightUpperArm;
      if (key === 'forearm') delete updated.rightForearm;
      if (key === 'thigh') delete updated.rightThigh;
      if (key === 'shin') delete updated.rightShin;
    }
    onUpdateParts(updated);
  };

  const handleLoadStarterPack = () => {
    onUpdateParts({
      head: STARTER_PUPPET_SPRITES.head,
      torso: STARTER_PUPPET_SPRITES.torso,
      upperArm: STARTER_PUPPET_SPRITES.upperArm,
      forearm: STARTER_PUPPET_SPRITES.forearm,
      thigh: STARTER_PUPPET_SPRITES.thigh,
      shin: STARTER_PUPPET_SPRITES.shin,
      rightUpperArm: STARTER_PUPPET_SPRITES.upperArm,
      rightForearm: STARTER_PUPPET_SPRITES.forearm,
      rightThigh: STARTER_PUPPET_SPRITES.thigh,
      rightShin: STARTER_PUPPET_SPRITES.shin,
    });
  };

  const handleClearAll = () => {
    onUpdateParts({});
  };

  const totalUploaded = Object.values(parts).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Custom 2D Cutout Puppet Rig Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300">
                  Method B
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload transparent PNG or SVG sprites for body segments to create your own animated character.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('parts')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'parts'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Body Parts ({totalUploaded}/6)
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Rigging Guide &amp; Template
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer mr-2 select-none">
              <input
                type="checkbox"
                checked={mirrorLimbs}
                onChange={(e) => setMirrorLimbs(e.target.checked)}
                className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-800"
              />
              <span>Auto-Mirror Left/Right Limbs</span>
            </label>

            <button
              onClick={handleLoadStarterPack}
              className="px-3 py-1.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-sm transition-all"
              title="Instantly load sample starter character sprites"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Character</span>
            </button>

            <button
              onClick={downloadPuppetArtistTemplate}
              className="px-3 py-1.5 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Download SVG template blueprint for drawing sprites"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template (.SVG)</span>
            </button>

            {totalUploaded > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/50 flex items-center gap-1.5 transition-colors"
                title="Clear all uploaded body parts"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'parts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BODY_PART_CONFIGS.map((config) => {
                const spriteSrc = parts[config.key];
                const hasSprite = Boolean(spriteSrc);

                return (
                  <div
                    key={config.key}
                    className={`relative p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      hasSprite
                        ? 'bg-slate-800/80 border-purple-500/50 shadow-md shadow-purple-900/10'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {config.label}
                          {hasSprite && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                        </span>
                        {hasSprite && (
                          <button
                            onClick={() => handleClearPart(config.key)}
                            className="text-xs text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-700/50"
                            title="Remove sprite"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-1">{config.description}</p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-3">
                        <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{config.anchorNote}</span>
                      </div>
                    </div>

                    {/* Preview or Upload Dropzone */}
                    <div
                      onClick={() => fileInputRefs.current[config.key]?.click()}
                      className={`h-36 rounded-lg border-2 border-dashed flex flex-col items-center justify-center p-3 cursor-pointer transition-all ${
                        hasSprite
                          ? 'border-purple-500/30 bg-slate-900/60 hover:bg-slate-900/90'
                          : 'border-slate-700 bg-slate-900/20 hover:border-purple-500/60 hover:bg-slate-800/50'
                      }`}
                    >
                      <input
                        ref={(el) => (fileInputRefs.current[config.key] = el)}
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(config.key, file);
                        }}
                      />

                      {hasSprite ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
                          {(() => {
                            const partFit = fittings[config.key as PuppetPartKey] || DEFAULT_PART_FITTING;
                            return (
                              <img
                                src={spriteSrc}
                                alt={config.label}
                                className="max-h-24 max-w-full object-contain filter drop-shadow-md transition-transform duration-100"
                                style={{
                                  transform: `scale(${partFit.scale}) rotate(${partFit.rotation}deg)`,
                                }}
                              />
                            );
                          })()}
                          <span className="text-[10px] text-purple-300 mt-2 hover:underline">
                            Click to replace image
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center">
                          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-medium text-slate-300">
                            Upload Sprite PNG
                          </span>
                          <span className="text-[10px] text-slate-500 mt-1">
                            {config.recommendedSize}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Manual Size & Rotation Tuning Controls */}
                    {hasSprite && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                        {(() => {
                          const partKey = config.key as PuppetPartKey;
                          const partFit = fittings[partKey] || DEFAULT_PART_FITTING;
                          const isExpanded = expandedFitKey === config.key;

                          return (
                            <div>
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setExpandedFitKey(isExpanded ? null : config.key)}
                                  className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition-colors"
                                >
                                  <Sliders className="w-3 h-3 text-purple-400" />
                                  <span>{isExpanded ? 'Hide Fit Controls' : 'Adjust Size & Rotation'}</span>
                                </button>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                  <span>{Math.round(partFit.scale * 100)}%</span>
                                  <span>•</span>
                                  <span>{partFit.rotation >= 0 ? `+${partFit.rotation}` : partFit.rotation}°</span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 space-y-2 text-xs">
                                  {/* Scale */}
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                                      <span className="flex items-center gap-1">
                                        <Maximize2 className="w-2.5 h-2.5 text-purple-400" /> Size / Scale
                                      </span>
                                      <span className="font-mono text-purple-300">{Math.round(partFit.scale * 100)}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0.3"
                                      max="2.5"
                                      step="0.05"
                                      value={partFit.scale}
                                      onChange={(e) =>
                                        handleUpdatePartFitting(partKey, { scale: parseFloat(e.target.value) })
                                      }
                                      className="w-full accent-purple-500 h-1 bg-slate-800 rounded cursor-pointer"
                                    />
                                    <div className="flex items-center justify-between gap-1 pt-0.5 text-[9px] text-slate-400">
                                      <button
                                        onClick={() =>
                                          handleUpdatePartFitting(partKey, {
                                            scale: Math.max(0.3, parseFloat((partFit.scale - 0.1).toFixed(2))),
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      >
                                        -10%
                                      </button>
                                      <button
                                        onClick={() => handleUpdatePartFitting(partKey, { scale: 1.0 })}
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      >
                                        100%
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleUpdatePartFitting(partKey, {
                                            scale: Math.min(2.5, parseFloat((partFit.scale + 0.1).toFixed(2))),
                                          })
                                        }
                                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      >
                                        +10%
                                      </button>
                                    </div>
                                  </div>

                                  {/* Rotation */}
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                                      <span className="flex items-center gap-1">
                                        <RotateCw className="w-2.5 h-2.5 text-indigo-400" /> Rotation Angle
                                      </span>
                                      <span className="font-mono text-indigo-300">
                                        {partFit.rotation >= 0 ? `+${partFit.rotation}` : partFit.rotation}°
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min="-180"
                                      max="180"
                                      step="1"
                                      value={partFit.rotation}
                                      onChange={(e) =>
                                        handleUpdatePartFitting(partKey, { rotation: parseInt(e.target.value, 10) })
                                      }
                                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded cursor-pointer"
                                    />
                                    <div className="flex items-center justify-between gap-1 pt-0.5 text-[9px]">
                                      <button
                                        onClick={() =>
                                          handleUpdatePartFitting(partKey, {
                                            rotation: (partFit.rotation - 90 < -180 ? partFit.rotation - 90 + 360 : partFit.rotation - 90),
                                          })
                                        }
                                        className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-0.5"
                                      >
                                        <RotateCcw className="w-2.5 h-2.5" /> -90°
                                      </button>
                                      <button
                                        onClick={() => handleUpdatePartFitting(partKey, { rotation: 0 })}
                                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      >
                                        0°
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleUpdatePartFitting(partKey, {
                                            rotation: (partFit.rotation + 90 > 180 ? partFit.rotation + 90 - 360 : partFit.rotation + 90),
                                          })
                                        }
                                        className="flex-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-0.5"
                                      >
                                        <RotateCw className="w-2.5 h-2.5" /> +90°
                                      </button>
                                    </div>
                                  </div>

                                  {/* Pivot Offsets */}
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                                      <span className="flex items-center gap-1">
                                        <Move className="w-2.5 h-2.5 text-pink-400" /> Pivot Offset (X / Y)
                                      </span>
                                      <button
                                        onClick={() => handleUpdatePartFitting(partKey, { offsetX: 0, offsetY: 0 })}
                                        className="text-[9px] text-slate-400 hover:text-white"
                                      >
                                        Reset (0,0)
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="1"
                                        title={`X: ${partFit.offsetX}px`}
                                        value={partFit.offsetX}
                                        onChange={(e) =>
                                          handleUpdatePartFitting(partKey, { offsetX: parseInt(e.target.value, 10) })
                                        }
                                        className="w-full accent-pink-500 h-1 bg-slate-800 rounded cursor-pointer"
                                      />
                                      <input
                                        type="range"
                                        min="-60"
                                        max="60"
                                        step="1"
                                        title={`Y: ${partFit.offsetY}px`}
                                        value={partFit.offsetY}
                                        onChange={(e) =>
                                          handleUpdatePartFitting(partKey, { offsetY: parseInt(e.target.value, 10) })
                                        }
                                        className="w-full accent-pink-500 h-1 bg-slate-800 rounded cursor-pointer"
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-1 flex justify-end">
                                    <button
                                      onClick={() => handleUpdatePartFitting(partKey, { ...DEFAULT_PART_FITTING })}
                                      className="text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                                    >
                                      <RefreshCw className="w-2.5 h-2.5" /> Reset Element Fit
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Artist Guide & Blueprint Tab */
            <div className="space-y-6 text-sm">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-white">How Cutout Rigging Works:</p>
                  <p>
                    Each body part is an individual transparent PNG image. As MediaPipe tracks the actor&apos;s motion,
                    the studio automatically solves the 2D bone vector angle (atan2 of delta y and delta x)
                    and stretches/rotates the sprite to seamlessly follow your joints!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">1</span>
                    Drawing Orientation Rules
                  </h3>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li><strong className="text-cyan-300">Head:</strong> Drawn upright, centered. Pivot point will sit at the bottom center (neck base).</li>
                    <li><strong className="text-cyan-300">Torso:</strong> Drawn upright. Anchored between hips at the bottom and shoulders at the top.</li>
                    <li><strong className="text-cyan-300">Arms &amp; Legs:</strong> Draw them <strong>horizontally from left to right</strong>. The left edge is the root pivot (shoulder or hip), and the right edge connects to the next joint (elbow or knee).</li>
                    <li><strong className="text-cyan-300">Background:</strong> Ensure your PNGs have a transparent background so limbs can cleanly overlap.</li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">2</span>
                    Quick Workflow Tip
                  </h3>
                  <p className="text-xs text-slate-300">
                    Don't have custom sprites ready yet? Click the <strong className="text-purple-300">Load Sample Character</strong> button at the top right to instantly load a complete pre-rigged character with head, torso, arm sleeves, gloves, and sneakers.
                  </p>
                  <button
                    onClick={downloadPuppetArtistTemplate}
                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Vector Template Blueprint (.SVG)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {totalUploaded > 0 ? (
              <span className="text-emerald-400 font-medium">
                ✓ {totalUploaded} custom sprite{totalUploaded > 1 ? 's' : ''} loaded &amp; ready to animate!
              </span>
            ) : (
              <span>Upload sprites or click &ldquo;Load Sample Character&rdquo; to test</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-purple-900/20"
          >
            Apply &amp; Animate Puppet
          </button>
        </div>
      </div>
    </div>
  );
};
