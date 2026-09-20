import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarkerInstance: PoseLandmarker | null = null;
let isInitializing = false;

export interface ExtractionProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
  status: string;
}

/**
 * Lazily initializes Google MediaPipe Pose Landmarker in WebAssembly / WebGL
 */
export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarkerInstance) {
    return poseLandmarkerInstance;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    if (poseLandmarkerInstance) return poseLandmarkerInstance;
  }

  isInitializing = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    // First try GPU acceleration; if WebGL fails in container/browser, fallback to CPU
    try {
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch (gpuErr) {
      console.warn('GPU delegate failed, attempting CPU delegate:', gpuErr);
      poseLandmarkerInstance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    }

    return poseLandmarkerInstance;
  } finally {
    isInitializing = false;
  }
}

/**
 * Extracts 33 body landmarks frame-by-frame from a video Blob or File in the browser.
 * Formats the output identically to the Python app.py / Unity C# format:
 * comma-separated floats for 33 landmarks (x, y, z) per line.
 */
export async function extractLandmarksFromVideoBlob(
  videoBlob: Blob,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<{ body: string; frameCount: number }> {
  if (onProgress) {
    onProgress({
      currentFrame: 0,
      totalFrames: 100,
      percent: 5,
      status: 'Loading AI Pose model in browser...',
    });
  }

  const landmarker = await getPoseLandmarker();

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  const videoUrl = URL.createObjectURL(videoBlob);
  video.src = videoUrl;

  // Wait for video metadata to load duration & dimensions
  await new Promise<void>((resolve, reject) => {
    const onMeta = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      resolve();
    };
    video.addEventListener('loadedmetadata', onMeta);
    video.onerror = () => reject(new Error('Unable to decode video format'));
    // 5-second timeout safeguard for metadata
    setTimeout(() => resolve(), 5000);
  });

  let duration = video.duration;
  if (!duration || isNaN(duration) || !isFinite(duration)) {
    duration = 4; // Fallback for WebM stream recordings where duration is Infinity/NaN
  }
  duration = Math.min(Math.max(duration, 1), 25); // Cap at 25s for responsive client-side performance

  const fps = 25; // 25 frames per second matching Unity 40ms interval
  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const frameIntervalSec = 1 / fps;

  const landmarkLines: string[] = [];

  // Canvas to capture raster frame for detection
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(video.videoWidth || 640, 640);
  canvas.height = Math.min(video.videoHeight || 480, 480);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  let lastTimestampMs = -1;

  for (let f = 0; f < totalFrames; f++) {
    const targetTime = Math.min(f * frameIntervalSec, (video.duration || duration) - 0.05);
    video.currentTime = Math.max(0, targetTime);

    // Wait until video has seeked to current target time
    await new Promise<void>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, 250); // 250ms timeout to prevent hanging

      const onSeeked = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      };
      video.addEventListener('seeked', onSeeked);
    });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Monotonically increasing timestamp requirement for MediaPipe
    const calcTimestamp = Math.round(targetTime * 1000);
    const timestampMs = Math.max(lastTimestampMs + 1, calcTimestamp);
    lastTimestampMs = timestampMs;

    try {
      const result = landmarker.detectForVideo(canvas, timestampMs);

      if (result && result.landmarks && result.landmarks[0] && result.landmarks[0].length >= 33) {
        const pose = result.landmarks[0];
        const tokens: string[] = [];

        for (let i = 0; i < 33; i++) {
          const lm = pose[i];
          // Transform coordinates to the BodyLandmarks.txt scale expected by Unity C# script:
          // x centered around 0 in pixels e.g. (lm.x - 0.5) * 800
          // y inverted (-y is down, +y is up) e.g. -(lm.y - 0.5) * 1100
          // z depth relative e.g. lm.z * 10
          const x = ((lm.x - 0.5) * 800).toFixed(2);
          const y = (-(lm.y - 0.5) * 1100).toFixed(2);
          const z = (lm.z * 10).toFixed(4);

          tokens.push(`${x},${y},${z}`);
        }
        landmarkLines.push(tokens.join(',') + ',');
      } else if (landmarkLines.length > 0) {
        // Carry over previous frame if pose is briefly obscured
        landmarkLines.push(landmarkLines[landmarkLines.length - 1]);
      }
    } catch (detectErr) {
      console.warn(`Frame ${f} detection skipped:`, detectErr);
    }

    if (onProgress) {
      onProgress({
        currentFrame: f + 1,
        totalFrames,
        percent: Math.round(((f + 1) / totalFrames) * 100),
        status: `Analyzing frame ${f + 1} of ${totalFrames}...`,
      });
    }

    // Yield to main thread every few frames
    if (f % 3 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  URL.revokeObjectURL(videoUrl);

  return {
    body: landmarkLines.join('\n'),
    frameCount: landmarkLines.length,
  };
}
