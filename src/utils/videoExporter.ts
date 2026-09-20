import {
  PuppetSkinType,
  VideoBackgroundType,
  calculateGlobalBounds,
  mapPointsToCanvas,
  drawPuppetBackground,
  drawPuppetSkeleton,
} from './puppet2DRenderer';
import { CustomPuppetParts } from '../components/CustomPuppetModal';
import { PuppetFittings } from '../types/puppetFitting';
import { Vector3D } from './skeleton';

export interface ResolutionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  aspect: string;
  badge: string;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  {
    id: '1080p_landscape',
    label: '1080p Full HD (Landscape)',
    width: 1920,
    height: 1080,
    aspect: '16:9',
    badge: 'YouTube / Broadcast',
  },
  {
    id: '1080p_portrait',
    label: '1080p Vertical (Portrait)',
    width: 1080,
    height: 1920,
    aspect: '9:16',
    badge: 'Reels / Shorts / TikTok',
  },
  {
    id: '1080p_square',
    label: '1080p Square (1:1)',
    width: 1080,
    height: 1080,
    aspect: '1:1',
    badge: 'Social / Feed',
  },
  {
    id: '720p_landscape',
    label: '720p HD (Landscape)',
    width: 1280,
    height: 720,
    aspect: '16:9',
    badge: 'Fast / Compact',
  },
  {
    id: 'canvas_native',
    label: 'Native Stage (800 × 600)',
    width: 800,
    height: 600,
    aspect: '4:3',
    badge: 'Standard',
  },
];

export interface BackgroundPreset {
  id: VideoBackgroundType;
  label: string;
  description: string;
  colorHex: string;
  badge: string;
  idealFor: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'chroma_green',
    label: 'Chroma Green (#00FF00)',
    description: 'VFX standard Green Screen for instant Ultra Keying in Premiere, DaVinci, AE, CapCut.',
    colorHex: '#00FF00',
    badge: 'VFX Industry Standard',
    idealFor: 'Adobe Premiere Ultra Key, DaVinci Delta Keyer, CapCut',
  },
  {
    id: 'chroma_blue',
    label: 'Chroma Blue (#0000FF)',
    description: 'Classic VFX Blue Screen. Ideal when character art has green clothing or hair.',
    colorHex: '#0000FF',
    badge: 'Alternate Keying',
    idealFor: 'Characters with green elements or green eyes',
  },
  {
    id: 'chroma_magenta',
    label: 'Chroma Magenta (#FF00FF)',
    description: 'High-contrast magenta background for characters with both blue & green colors.',
    colorHex: '#FF00FF',
    badge: 'High Contrast',
    idealFor: 'Complex multi-color puppets',
  },
  {
    id: 'transparent',
    label: 'Transparent (Alpha Channel)',
    description: 'Direct zero-keying transparent video export via WebM VP9 with native alpha channel.',
    colorHex: 'transparent',
    badge: 'Zero Keying Required',
    idealFor: 'OBS Overlays, Game UI, direct timeline drag-and-drop',
  },
  {
    id: 'studio_dark',
    label: 'Studio Obsidian Dark',
    description: 'Sleek #0b0f19 dark canvas for Luma Keying or direct social / product video presentation.',
    colorHex: '#0b0f19',
    badge: 'Dark Presentation',
    idealFor: 'Luma Keying / Modern Showcase',
  },
  {
    id: 'clean_white',
    label: 'Clean High-Key White',
    description: 'Pure #FFFFFF crisp commercial studio background for explainer videos and tutorials.',
    colorHex: '#FFFFFF',
    badge: 'Commercial White',
    idealFor: 'Explainer videos and light interfaces',
  },
  {
    id: 'blueprint',
    label: 'Blueprint Grid',
    description: 'Architectural blueprint navy canvas with cyan measurement coordinate grid.',
    colorHex: '#0f2744',
    badge: 'Technical Aesthetic',
    idealFor: 'Technical breakdown & motion showcase',
  },
];

export interface VideoFormatSupport {
  isMp4Supported: boolean;
  isWebmSupported: boolean;
  mp4MimeType: string | null;
  webmMimeType: string | null;
}

/**
 * Detect browser MediaRecorder codec capabilities
 */
export function checkVideoCodecSupport(): VideoFormatSupport {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return {
      isMp4Supported: false,
      isWebmSupported: false,
      mp4MimeType: null,
      webmMimeType: null,
    };
  }

  const mp4Candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4;codecs=h264',
    'video/mp4',
  ];

  const webmCandidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  let mp4MimeType: string | null = null;
  for (const m of mp4Candidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      mp4MimeType = m;
      break;
    }
  }

  let webmMimeType: string | null = null;
  for (const m of webmCandidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      webmMimeType = m;
      break;
    }
  }

  return {
    isMp4Supported: Boolean(mp4MimeType),
    isWebmSupported: Boolean(webmMimeType),
    mp4MimeType,
    webmMimeType,
  };
}

export interface ExportVideoOptions {
  frames: Array<{ points: Vector3D[] }>;
  skin: PuppetSkinType;
  customParts: CustomPuppetParts;
  customFittings: PuppetFittings;
  loadedImages: Record<string, HTMLImageElement>;
  preferredFormat: 'mp4' | 'webm';
  background: VideoBackgroundType;
  resolution: ResolutionPreset;
  fps: number;
  loops: number;
  framing: 'grounded' | 'dynamic';
  showJointPins: boolean;
  showBoneOverlay: boolean;
  showMotionTrail: boolean;
  onProgress?: (progress: {
    currentFrame: number;
    totalFrames: number;
    percent: number;
    statusText: string;
  }) => void;
  onPreviewFrame?: (canvas: HTMLCanvasElement) => void;
  signal?: AbortSignal;
}

export interface ExportVideoResult {
  blob: Blob;
  url: string;
  format: 'mp4' | 'webm';
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  frameCount: number;
  fileName: string;
}

/**
 * Deterministic frame-by-frame 2D animation video renderer
 */
export async function exportPuppetVideo(
  options: ExportVideoOptions
): Promise<ExportVideoResult> {
  const {
    frames,
    skin,
    customParts,
    customFittings,
    loadedImages,
    preferredFormat,
    background,
    resolution,
    fps,
    loops,
    framing,
    showJointPins,
    showBoneOverlay,
    showMotionTrail,
    onProgress,
    onPreviewFrame,
    signal,
  } = options;

  if (!frames || frames.length === 0) {
    throw new Error('No motion landmarks available to export.');
  }

  // Codec resolution
  const codecSupport = checkVideoCodecSupport();
  let selectedMimeType = '';
  let resolvedFormat: 'mp4' | 'webm' = preferredFormat;

  if (preferredFormat === 'mp4' && codecSupport.isMp4Supported && codecSupport.mp4MimeType) {
    selectedMimeType = codecSupport.mp4MimeType;
    resolvedFormat = 'mp4';
  } else if (preferredFormat === 'mp4' && !codecSupport.isMp4Supported) {
    // If MP4 not natively supported by browser MediaRecorder, fallback to WebM
    selectedMimeType = codecSupport.webmMimeType || 'video/webm';
    resolvedFormat = 'webm';
  } else if (preferredFormat === 'webm') {
    selectedMimeType = codecSupport.webmMimeType || 'video/webm;codecs=vp9';
    resolvedFormat = 'webm';
  } else {
    selectedMimeType = codecSupport.webmMimeType || 'video/webm';
    resolvedFormat = 'webm';
  }

  // Create dedicated offscreen rendering canvas
  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext('2d', {
    alpha: background === 'transparent',
    willReadFrequently: false,
  });

  if (!ctx) {
    throw new Error('Could not initialize 2D rendering context for export.');
  }

  // Calculate global extents for rock-solid grounded framing
  const globalBounds = calculateGlobalBounds(frames);

  // Initialize MediaRecorder stream
  const stream = canvas.captureStream(fps);
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: 12_000_000, // 12 Mbps for crisp 1080p broadcast detail
  };
  if (selectedMimeType) {
    recorderOptions.mimeType = selectedMimeType;
  }

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions);
  } catch {
    // Fallback without explicit mimeType if browser rejects codec string
    recorder = new MediaRecorder(stream);
  }

  const recordedChunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const outputBlob = new Blob(recordedChunks, {
        type: selectedMimeType || 'video/mp4',
      });
      resolve(outputBlob);
    };
    recorder.onerror = (e) => reject(e);
  });

  // Start recorder
  recorder.start(100);

  const totalFramesPerLoop = frames.length;
  const totalFramesToRender = totalFramesPerLoop * loops;
  const frameIntervalMs = Math.max(16, Math.floor(1000 / fps));

  let renderedCount = 0;

  try {
    for (let loopIdx = 0; loopIdx < loops; loopIdx++) {
      for (let frameIdx = 0; frameIdx < totalFramesPerLoop; frameIdx++) {
        if (signal?.aborted) {
          try {
            recorder.stop();
          } catch {
            // ignore
          }
          throw new Error('Video rendering was cancelled by user.');
        }

        // 1. Draw Background / Chroma Matte
        drawPuppetBackground(ctx, canvas.width, canvas.height, background);

        // 2. Map coordinates
        const frameData = frames[frameIdx];
        const mapped = mapPointsToCanvas(
          frameData.points,
          canvas.width,
          canvas.height,
          framing === 'grounded' ? globalBounds : undefined
        );

        // 3. Motion Trails (if enabled)
        if (showMotionTrail && frameIdx > 3) {
          const trailIndices = [15, 16, 27, 28]; // hands and feet
          ctx.save();
          ctx.lineWidth = Math.max(2, mapped.scale * 0.01);
          for (const tIdx of trailIndices) {
            ctx.beginPath();
            const startFi = Math.max(0, frameIdx - 8);
            for (let fi = startFi; fi <= frameIdx; fi++) {
              const trailMapped = mapPointsToCanvas(
                frames[fi].points,
                canvas.width,
                canvas.height,
                framing === 'grounded' ? globalBounds : undefined
              );
              const p = trailMapped.points[tIdx];
              if (p) {
                if (fi === startFi) {
                  ctx.moveTo(p.x, p.y);
                } else {
                  ctx.lineTo(p.x, p.y);
                }
              }
            }
            ctx.strokeStyle =
              tIdx < 20 ? 'rgba(6, 182, 212, 0.45)' : 'rgba(249, 115, 22, 0.45)';
            ctx.stroke();
          }
          ctx.restore();
        }

        // 4. Draw Character Puppet
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

        renderedCount++;

        // Update progress callback
        if (onProgress) {
          const pct = Math.min(
            99,
            Math.round((renderedCount / totalFramesToRender) * 100)
          );
          onProgress({
            currentFrame: renderedCount,
            totalFrames: totalFramesToRender,
            percent: pct,
            statusText: `Encoding frame ${renderedCount} of ${totalFramesToRender} (${pct}%)`,
          });
        }

        // Feed preview thumbnail to UI
        if (onPreviewFrame) {
          onPreviewFrame(canvas);
        }

        // Accurate pacing for encoder
        await new Promise((resolve) => setTimeout(resolve, frameIntervalMs));
      }
    }

    // Flush encoder buffer
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Finish recording
    recorder.stop();
    const finalBlob = await recordingPromise;

    if (onProgress) {
      onProgress({
        currentFrame: totalFramesToRender,
        totalFrames: totalFramesToRender,
        percent: 100,
        statusText: 'Encoding complete!',
      });
    }

    const objectUrl = URL.createObjectURL(finalBlob);
    const durationSec = Number((totalFramesToRender / fps).toFixed(2));
    const cleanSkinName = skin.replace('_', '-');
    const fileName = `puppet_${cleanSkinName}_${background}_${resolution.width}x${resolution.height}_${fps}fps.${resolvedFormat}`;

    return {
      blob: finalBlob,
      url: objectUrl,
      format: resolvedFormat,
      mimeType: finalBlob.type || selectedMimeType,
      sizeBytes: finalBlob.size,
      durationSec,
      width: resolution.width,
      height: resolution.height,
      frameCount: totalFramesToRender,
      fileName,
    };
  } catch (error) {
    try {
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    } catch {
      // ignore
    }
    throw error;
  }
}
