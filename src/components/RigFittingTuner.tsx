import React from 'react';
import {
  Sliders,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Rotate3D,
  Move,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  PuppetFittings,
  PuppetPartKey,
  PartFitting,
  DEFAULT_PART_FITTING,
} from '../types/puppetFitting';
import { CustomPuppetParts } from './CustomPuppetModal';

interface RigFittingTunerProps {
  isOpen: boolean;
  onClose: () => void;
  fittings: PuppetFittings;
  onUpdateFittings: (updated: PuppetFittings) => void;
  selectedPart: PuppetPartKey;
  onSelectPart: (part: PuppetPartKey) => void;
  customParts: CustomPuppetParts;
  showBoneOverlay: boolean;
  onToggleBoneOverlay: (show: boolean) => void;
}

const PART_ITEMS: { key: PuppetPartKey; label: string; group: 'core' | 'arms' | 'legs' }[] = [
  { key: 'head', label: 'Head', group: 'core' },
  { key: 'torso', label: 'Torso', group: 'core' },
  { key: 'upperArm', label: 'L. Upper Arm', group: 'arms' },
  { key: 'forearm', label: 'L. Forearm', group: 'arms' },
  { key: 'rightUpperArm', label: 'R. Upper Arm', group: 'arms' },
  { key: 'rightForearm', label: 'R. Forearm', group: 'arms' },
  { key: 'thigh', label: 'L. Thigh', group: 'legs' },
  { key: 'shin', label: 'L. Shin', group: 'legs' },
  { key: 'rightThigh', label: 'R. Thigh', group: 'legs' },
  { key: 'rightShin', label: 'R. Shin', group: 'legs' },
];

export const RigFittingTuner: React.FC<RigFittingTunerProps> = ({
  isOpen,
  onClose,
  fittings,
  onUpdateFittings,
  selectedPart,
  onSelectPart,
  customParts,
  showBoneOverlay,
  onToggleBoneOverlay,
}) => {
  const [isMinimized, setIsMinimized] = React.useState(false);

  if (!isOpen) return null;

  const currentFitting: PartFitting = fittings[selectedPart] || DEFAULT_PART_FITTING;
  const currentImage = customParts[selectedPart as keyof CustomPuppetParts] ||
    (selectedPart.startsWith('right')
      ? customParts[selectedPart.replace('right', '').replace(/^[A-Z]/, (c) => c.toLowerCase()) as keyof CustomPuppetParts]
      : undefined);

  const updateSelectedPart = (changes: Partial<PartFitting>) => {
    const updated: PuppetFittings = {
      ...fittings,
      [selectedPart]: {
        ...currentFitting,
        ...changes,
      },
    };
    onUpdateFittings(updated);
  };

  const handleResetCurrent = () => {
    updateSelectedPart({ ...DEFAULT_PART_FITTING });
  };

  const handleResetAll = () => {
    const cleared: PuppetFittings = {};
    for (const item of PART_ITEMS) {
      cleared[item.key] = { ...DEFAULT_PART_FITTING };
    }
    onUpdateFittings(cleared);
  };

  const nudge = (dx: number, dy: number) => {
    updateSelectedPart({
      offsetX: Math.max(-100, Math.min(100, (currentFitting.offsetX || 0) + dx)),
      offsetY: Math.max(-100, Math.min(100, (currentFitting.offsetY || 0) + dy)),
    });
  };

  return (
    <div
      className={`absolute top-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md border border-purple-500/40 rounded-2xl shadow-2xl transition-all duration-200 text-slate-100 flex flex-col ${
        isMinimized ? 'w-64' : 'w-80 sm:w-88'
      } max-h-[calc(100%-24px)] overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Sliders className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
            Rig Sprite Fitting
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 font-normal">
              Manual Tuner
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expand panel' : 'Minimize panel'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Close Tuner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[75vh] text-xs">
          {/* Part Selection Pills */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-1.5">
              <span>Select Body Element:</span>
              <span className="text-purple-400 capitalize font-bold">
                {PART_ITEMS.find((p) => p.key === selectedPart)?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {PART_ITEMS.map((part) => {
                const isSelected = selectedPart === part.key;
                const hasImg = Boolean(
                  customParts[part.key as keyof CustomPuppetParts] ||
                  (part.key.startsWith('right') &&
                    customParts[part.key.replace('right', '').replace(/^[A-Z]/, (c) => c.toLowerCase()) as keyof CustomPuppetParts])
                );
                return (
                  <button
                    key={part.key}
                    onClick={() => onSelectPart(part.key)}
                    className={`px-2 py-1.5 rounded-lg text-left text-[11px] font-medium flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-purple-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{part.label}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        hasImg ? (isSelected ? 'bg-white' : 'bg-emerald-400') : 'bg-slate-600'
                      }`}
                      title={hasImg ? 'Custom sprite loaded' : 'Default fallback'}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Part Preview Card */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
            <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={selectedPart}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${currentFitting.scale}) rotate(${currentFitting.rotation}deg)`,
                    transition: 'transform 0.1s ease',
                  }}
                />
              ) : (
                <span className="text-[10px] text-slate-500 text-center leading-tight">No Sprite</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {PART_ITEMS.find((p) => p.key === selectedPart)?.label}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {Math.round(currentFitting.scale * 100)}% Size
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {currentFitting.rotation >= 0 ? `+${currentFitting.rotation}` : currentFitting.rotation}°
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                  X:{currentFitting.offsetX} Y:{currentFitting.offsetY}
                </span>
              </div>
            </div>
            <button
              onClick={handleResetCurrent}
              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset this part to default fit"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. SIZE / SCALE SLIDER */}
          <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-purple-400" /> Size / Scale
              </span>
              <span className="font-mono text-purple-300 font-bold">
                {Math.round(currentFitting.scale * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={currentFitting.scale}
              onChange={(e) => updateSelectedPart({ scale: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    updateSelectedPart({ scale: Math.max(0.3, parseFloat((currentFitting.scale - 0.1).toFixed(2))) })
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  -10%
                </button>
                <button
                  onClick={() =>
                    updateSelectedPart({ scale: Math.min(2.5, parseFloat((currentFitting.scale + 0.1).toFixed(2))) })
                  }
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                >
                  +10%
                </button>
              </div>
              <button
                onClick={() => updateSelectedPart({ scale: 1.0 })}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
              >
                100% (Default)
              </button>
            </div>
          </div>

          {/* 2. ROTATION SLIDER & QUICK 90° BUTTONS */}
          <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Rotate3D className="w-3 h-3 text-indigo-400" /> Rotation Angle
              </span>
              <span className="font-mono text-indigo-300 font-bold">
                {currentFitting.rotation > 0 ? `+${currentFitting.rotation}` : currentFitting.rotation}°
              </span>
            </div>

            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={currentFitting.rotation}
              onChange={(e) => updateSelectedPart({ rotation: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between pt-0.5 gap-1">
              <button
                onClick={() =>
                  updateSelectedPart({
                    rotation: (currentFitting.rotation - 90 < -180 ? currentFitting.rotation - 90 + 360 : currentFitting.rotation - 90),
                  })
                }
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center justify-center gap-0.5"
                title="Rotate 90 degrees counter-clockwise"
              >
                <RotateCcw className="w-2.5 h-2.5" /> -90°
              </button>
              <button
                onClick={() => updateSelectedPart({ rotation: 0 })}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
              >
                0°
              </button>
              <button
                onClick={() =>
                  updateSelectedPart({
                    rotation: (currentFitting.rotation + 90 > 180 ? currentFitting.rotation + 90 - 360 : currentFitting.rotation + 90),
                  })
                }
                className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 flex items-center justify-center gap-0.5"
                title="Rotate 90 degrees clockwise"
              >
                <RotateCw className="w-2.5 h-2.5" /> +90°
              </button>
            </div>
          </div>

          {/* 3. PIVOT / ANCHOR OFFSET (X & Y) */}
          <div className="space-y-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Move className="w-3 h-3 text-pink-400" /> Pivot / Joint Anchor Offset
              </span>
              <button
                onClick={() => updateSelectedPart({ offsetX: 0, offsetY: 0 })}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Center (0,0)
              </button>
            </div>

            {/* Directional Nudge Pad & Sliders */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Along Bone (X)</span>
                  <span className="font-mono text-slate-200">{currentFitting.offsetX}px</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={currentFitting.offsetX}
                  onChange={(e) => updateSelectedPart({ offsetX: parseInt(e.target.value, 10) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Across Bone (Y)</span>
                  <span className="font-mono text-slate-200">{currentFitting.offsetY}px</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  step="1"
                  value={currentFitting.offsetY}
                  onChange={(e) => updateSelectedPart({ offsetY: parseInt(e.target.value, 10) })}
                  className="w-full accent-pink-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Nudge Buttons */}
            <div className="flex items-center justify-center gap-1 pt-1">
              <button
                onClick={() => nudge(-4, 0)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                title="Nudge Left (-4px)"
              >
                ← Left
              </button>
              <button
                onClick={() => nudge(0, -4)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                title="Nudge Up (-4px)"
              >
                ↑ Up
              </button>
              <button
                onClick={() => nudge(0, 4)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                title="Nudge Down (+4px)"
              >
                ↓ Down
              </button>
              <button
                onClick={() => nudge(4, 0)}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                title="Nudge Right (+4px)"
              >
                → Right
              </button>
            </div>
          </div>

          {/* 4. HELPER TOGGLE: SHOW SKELETAL RIG OVERLAY */}
          <div className="flex items-center justify-between p-2 bg-purple-950/30 border border-purple-800/40 rounded-xl">
            <div className="flex items-center gap-2">
              {showBoneOverlay ? (
                <Eye className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              )}
              <div className="text-[11px]">
                <p className="font-semibold text-white">Bone Rig Overlay</p>
                <p className="text-[10px] text-slate-400">See skeleton joints while fitting</p>
              </div>
            </div>

            <button
              onClick={() => onToggleBoneOverlay(!showBoneOverlay)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                showBoneOverlay
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {showBoneOverlay ? 'Enabled' : 'Hidden'}
            </button>
          </div>

          {/* Global Reset */}
          <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-[10px] text-slate-400">
            <span>Fine-tuned values auto-save</span>
            <button
              onClick={handleResetAll}
              className="text-red-400 hover:text-red-300 hover:underline"
            >
              Reset All Elements
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
