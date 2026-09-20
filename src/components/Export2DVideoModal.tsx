import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Film,
  Download,
  CheckCircle,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Monitor,
  Maximize2,
  StopCircle,
} from 'lucide-react';
import {
  RESOLUTION_PRESETS,
  BACKGROUND_PRESETS,
  ResolutionPreset,
  checkVideoCodecSupport,
  exportPuppetVideo,
  ExportVideoResult,
  VideoFormatSupport,
} from '../utils/videoExporter';
import {
  PuppetSkinType,
  VideoBackgroundType,
  drawPuppetBackground,
  drawPuppetSkeleton,
  mapPointsToCanvas,
  calculateGlobalBounds,
} from '../utils/puppet2DRenderer';
import { CustomPuppetParts } from './CustomPuppetModal';
import { PuppetFittings } from '../types/puppetFitting';
import { Vector3D } from '../utils/skeleton';

interface Export2DVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: Array<{ points: Vector3D[] }>;
  currentFrameIndex: number;
  skin: PuppetSkinType;
  customParts: CustomPuppetParts;
  customFittings: PuppetFittings;
  loadedImages: Record<string, HTMLImageElement>;
  initialBgTheme?: string;
}

export const Export2DVideoModal: React.FC<Export2DVideoModalProps> = ({
  isOpen,
  onClose,
  frames,
  currentFrameIndex,
  skin,
  customParts,
  customFittings,
  loadedImages,
}) => {
  // Config state
  const [selectedBg, setSelectedBg] = useState<VideoBackgroundType>('chroma_green');
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'webm'>('mp4');
  const [selectedRes, setSelectedRes] = useState<ResolutionPreset>(RESOLUTION_PRESETS[0]);
  const [fps, setFps] = useState<number>(30);
  const [loops, setLoops] = useState<number>(3);
  const [framing, setFraming] = useState<'grounded' | 'dynamic'>('grounded');
  const [showJointPins, setShowJointPins] = useState<boolean>(false);
  const [showBoneOverlay, setShowBoneOverlay] = useState<boolean>(false);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(false);

  // System codec support
  const [codecSupport, setCodecSupport] = useState<VideoFormatSupport>({
    isMp4Supported: true,
    isWebmSupported: true,
    mp4MimeType: null,
    webmMimeType: null,
  });

  // Render pipeline state
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<{
    currentFrame: number;
    totalFrames: number;
    percent: number;
    statusText: string;
  }>({
    currentFrame: 0,
    totalFrames: 0,
    percent: 0,
    statusText: '',
  });
  const [exportResult, setExportResult] = useState<ExportVideoResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // References
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check browser codec support on mount
  useEffect(() => {
    if (isOpen) {
      const support = checkVideoCodecSupport();
      setCodecSupport(support);
      // If browser doesn't support MP4 natively in MediaRecorder, prefer webm
      if (!support.isMp4Supported && support.isWebmSupported) {
        setSelectedFormat('webm');
      } else {
        setSelectedFormat('mp4');
      }
      setRenderError(null);
    }
  }, [isOpen]);

  // Clean up object URL on close or unmount
  useEffect(() => {
    return () => {
      if (exportResult?.url) {
        URL.revokeObjectURL(exportResult.url);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [exportResult]);

  // Render static live framing preview on settings change
  useEffect(() => {
    if (!isOpen || isRendering || exportResult) return;

    const canvas = previewCanvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match aspect ratio preview
    const previewW = canvas.width;
    const previewH = canvas.height;

    // 1. Draw background
    drawPuppetBackground(ctx, previewW, previewH, selectedBg);

    // 2. Map coordinates
    const targetFrameIdx = Math.min(currentFrameIndex, frames.length - 1);
    const frameData = frames[targetFrameIdx];
    if (!frameData || !frameData.points) return;

    const globalBounds = calculateGlobalBounds(frames);
    const mapped = mapPointsToCanvas(
      frameData.points,
      previewW,
      previewH,
      framing === 'grounded' ? globalBounds : undefined
    );

    // 3. Draw Character
    drawPuppetSkeleton({
      ctx,
      points: mapped.points,
      scale: mapped.scale,
      skin,
      customParts,
      customFittings,
      loadedImages,
      showJointPins,
      showBoneOverlay,
      opacity: 1.0,
      isGhost: false,
    });
  }, [
    isOpen,
    isRendering,
    exportResult,
    frames,
    currentFrameIndex,
    selectedBg,
    selectedRes,
    framing,
    skin,
    customParts,
    customFittings,
    loadedImages,
    showJointPins,
    showBoneOverlay,
  ]);

  if (!isOpen) return null;

  const totalFramesPerLoop = frames.length;
  const totalFramesToExport = totalFramesPerLoop * loops;
  const estimatedDuration = Number((totalFramesToExport / fps).toFixed(2));

  // Trigger video export
  const handleStartRender = async () => {
    if (frames.length === 0) return;

    setIsRendering(true);
    setRenderError(null);
    setExportResult(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await exportPuppetVideo({
        frames,
        skin,
        customParts,
        customFittings,
        loadedImages,
        preferredFormat: selectedFormat,
        background: selectedBg,
        resolution: selectedRes,
        fps,
        loops,
        framing,
        showJointPins,
        showBoneOverlay,
        showMotionTrail,
        signal: abortController.signal,
        onProgress: (progress) => {
          setRenderProgress(progress);
        },
        onPreviewFrame: (canvas) => {
          const previewCanvas = previewCanvasRef.current;
          if (previewCanvas) {
            const pCtx = previewCanvas.getContext('2d');
            if (pCtx) {
              pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
              pCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
            }
          }
        },
      });

      setExportResult(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (!err.message.includes('cancelled')) {
          setRenderError(err.message);
        }
      } else {
        setRenderError('An unexpected error occurred during video rendering.');
      }
    } finally {
      setIsRendering(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelRender = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRendering(false);
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const a = document.createElement('a');
    a.href = exportResult.url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Export 2D Animation Video
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chroma & MP4 Studio
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate high-resolution video with Green Screen, Blue Screen, Alpha Transparency, or Studio Mats
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/70 transition-colors disabled:opacity-40"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Video Settings */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            {/* 1. Background / Chroma Key Selection */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Background & Chroma Keying
                </label>
                <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                  {BACKGROUND_PRESETS.find((b) => b.id === selectedBg)?.badge}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BACKGROUND_PRESETS.map((bg) => {
                  const isSelected = selectedBg === bg.id;
                  return (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBg(bg.id)}
                      disabled={isRendering}
                      className={`p-2.5 rounded-lg text-left transition-all border flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600/25 border-purple-400 ring-1 ring-purple-400/50 text-white'
                          : 'bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-4 h-4 rounded-full border border-slate-500/50 shadow-inner flex items-center justify-center text-[9px]"
                          style={{
                            backgroundColor:
                              bg.colorHex === 'transparent'
                                ? 'rgba(255,255,255,0.1)'
                                : bg.colorHex,
                            backgroundImage:
                              bg.colorHex === 'transparent'
                                ? 'linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%)'
                                : undefined,
                            backgroundSize: '8px 8px',
                          }}
                        />
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold leading-tight line-clamp-1">
                          {bg.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight line-clamp-1 mt-0.5">
                          {bg.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Chroma Key Guidance Pill */}
              <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-700/60 flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-purple-300">VFX Tip: </strong>
                  {BACKGROUND_PRESETS.find((b) => b.id === selectedBg)?.description}
                </span>
              </div>
            </div>

            {/* 2. Format & Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Format / Container */}
              <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  Video Format
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setSelectedFormat('mp4')}
                    disabled={isRendering}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                      selectedFormat === 'mp4'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    MP4 Video
                    <span className="block text-[10px] font-normal text-slate-300">
                      H.264 / AVC1
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedFormat('webm')}
                    disabled={isRendering}
                    className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                      selectedFormat === 'webm'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    WebM Video
                    <span className="block text-[10px] font-normal text-slate-300">
                      VP9 (Alpha)
                    </span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                  <span>Browser Encoding:</span>
                  <span className="text-emerald-400 font-medium">
                    {selectedFormat === 'mp4'
                      ? codecSupport.isMp4Supported
                        ? '✓ Native MP4 Ready'
                        : 'Auto WebM Container'
                      : '✓ VP9 Alpha Supported'}
                  </span>
                </div>
              </div>

              {/* Frame Rate (FPS) */}
              <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Monitor className="w-3.5 h-3.5 text-purple-400" />
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[24, 25, 30, 60].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setFps(rate)}
                      disabled={isRendering}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        fps === rate
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {rate}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                  <span>Standard:</span>
                  <span className="text-purple-300">
                    {fps === 24
                      ? 'Cinematic 24p'
                      : fps === 25
                      ? 'PAL / MediaPipe'
                      : fps === 30
                      ? 'Web / Broadcast'
                      : '60fps High Fluidity'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Resolution Presets */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                  Output Resolution & Aspect
                </span>
                <span className="text-[11px] font-mono text-purple-300">
                  {selectedRes.width} × {selectedRes.height} ({selectedRes.aspect})
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {RESOLUTION_PRESETS.map((res) => {
                  const isSelected = selectedRes.id === res.id;
                  return (
                    <button
                      key={res.id}
                      onClick={() => setSelectedRes(res)}
                      disabled={isRendering}
                      className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 text-white'
                          : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{res.label}</div>
                        <div className="text-[10px] text-slate-400">{res.badge}</div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700">
                        {res.aspect}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Animation Loops & Framing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Loop Count */}
              <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                    Animation Loops
                  </span>
                  <span className="text-[11px] text-purple-300">
                    {loops}x ({estimatedDuration}s)
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 5].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLoops(l)}
                      disabled={isRendering}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        loops === l
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {l}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Framing */}
              <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Camera Framing
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setFraming('grounded')}
                    disabled={isRendering}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      framing === 'grounded'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                    title="Locks ground and scale using global bounding box across all frames"
                  >
                    Stable Ground
                  </button>
                  <button
                    onClick={() => setFraming('dynamic')}
                    disabled={isRendering}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      framing === 'dynamic'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-slate-900/70 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                    title="Re-centers puppet dynamically frame by frame"
                  >
                    Dynamic Center
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Render Overlays */}
            <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Overlays in Video:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showJointPins}
                    onChange={(e) => setShowJointPins(e.target.checked)}
                    disabled={isRendering}
                    className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Joint Pins</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMotionTrail}
                    onChange={(e) => setShowMotionTrail(e.target.checked)}
                    disabled={isRendering}
                    className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Motion Trails</span>
                </label>
                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBoneOverlay}
                    onChange={(e) => setShowBoneOverlay(e.target.checked)}
                    disabled={isRendering}
                    className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Bone Rig</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Framing / Encoding / Finished Video Player */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-inner">
              {/* Canvas / Video Container */}
              <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
                {/* When Video is Ready */}
                {exportResult ? (
                  <video
                    src={exportResult.url}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                ) : (
                  /* Preview or Active Rendering Canvas */
                  <canvas
                    ref={previewCanvasRef}
                    width={selectedRes.width > selectedRes.height ? 800 : 450}
                    height={selectedRes.width > selectedRes.height ? 450 : 800}
                    className="max-w-full max-h-full object-contain"
                  />
                )}

                {/* Live Rendering Status Overlay */}
                {isRendering && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-400 animate-spin mb-4" />
                    <h4 className="text-white font-bold text-sm tracking-wide">
                      Rendering 2D Animation Video
                    </h4>
                    <p className="text-xs text-purple-300 mt-1 font-mono">
                      {renderProgress.statusText || 'Processing frames...'}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-64 bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full transition-all duration-150 rounded-full"
                        style={{ width: `${renderProgress.percent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 font-mono">
                      {renderProgress.percent}% Completed
                    </span>

                    <button
                      onClick={handleCancelRender}
                      className="mt-4 px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Abort Rendering</span>
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {renderError && (
                  <div className="absolute inset-x-4 top-4 p-3 bg-red-950/90 border border-red-500/60 rounded-xl text-red-200 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="flex-1">{renderError}</span>
                  </div>
                )}
              </div>

              {/* Under-Preview Video Specs or Action Bar */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3">
                {exportResult ? (
                  /* Completed State */
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">
                            Video Render Complete!
                          </div>
                          <div className="text-[11px] text-emerald-300">
                            {exportResult.width}×{exportResult.height} • {fps} FPS •{' '}
                            {exportResult.durationSec}s duration •{' '}
                            {(exportResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleDownload}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download {exportResult.format.toUpperCase()}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setExportResult(null)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-render / Change Settings</span>
                      </button>

                      <span className="text-[11px] text-slate-400 font-mono">
                        {exportResult.fileName}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Pre-render State: Summary & Action */
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                      <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Total Frames</span>
                        <span className="font-bold text-white">{totalFramesToExport}</span>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Duration</span>
                        <span className="font-bold text-emerald-300">{estimatedDuration} sec</span>
                      </div>
                      <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                        <span className="text-slate-400 block text-[10px]">Target Format</span>
                        <span className="font-bold text-purple-300 uppercase">
                          {selectedFormat} ({fps} FPS)
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleStartRender}
                      disabled={isRendering || frames.length === 0}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 transition-all disabled:opacity-50"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Video Render ({selectedFormat.toUpperCase()})</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chroma Key Workflow Guide */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3.5 text-xs text-slate-300 space-y-2">
              <div className="font-bold text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-purple-400" />
                How to Key in Video Editors
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 pl-4 list-disc marker:text-purple-400">
                <li>
                  <strong className="text-white">Adobe Premiere / After Effects:</strong> Add{' '}
                  <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">
                    Ultra Key
                  </code>{' '}
                  or <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">Keylight</code>,
                  eyedrop the green/blue backdrop.
                </li>
                <li>
                  <strong className="text-white">DaVinci Resolve:</strong> In Fusion page, add{' '}
                  <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded">Delta Keyer</code>{' '}
                  node and connect the background color picker.
                </li>
                <li>
                  <strong className="text-white">CapCut / Final Cut Pro:</strong> Select clip &gt;{' '}
                  <em>Cutout / Effects &gt; Chroma Key</em> &gt; sample color.
                </li>
                <li>
                  <strong className="text-white">WebM Transparent (Alpha):</strong> Drop directly onto
                  any timeline track with zero keying needed!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
