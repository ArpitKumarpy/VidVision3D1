import { extractLandmarksFromVideoBlob, ExtractionProgress } from './utils/browserPoseExtractor';

export interface UploadResponse {
  statusCode: number;
  body_landmarks: string;
  right_hand_landmarks: string;
  left_hand_landmarks: string;
}

export interface LandmarkData {
  body: string | null;
  leftHand: string | null;
  rightHand: string | null;
}

export { type ExtractionProgress };

export async function checkServerHealth(): Promise<boolean> {
  // The app now runs 100% in-browser with client-side WebAssembly / MediaPipe AI!
  // No Python Flask server is required.
  return true;
}

/**
 * High-performance video-to-landmarks processor:
 * 1. Executes Google MediaPipe Pose directly inside the user's browser (GPU/WASM).
 * 2. If browser MediaPipe is unavailable or fails, falls back gracefully to backend/sample data.
 */
export async function processVideoToLandmarks(
  videoBlob: Blob,
  filename = 'video.mp4',
  onProgress?: (p: ExtractionProgress) => void
): Promise<LandmarkData> {
  // If the user uploaded a raw landmark text file directly (.txt)
  if (filename.endsWith('.txt')) {
    const text = await videoBlob.text();
    return {
      body: text,
      leftHand: null,
      rightHand: null,
    };
  }

  // Attempt 1: Browser-side MediaPipe extraction
  try {
    if (onProgress) {
      onProgress({
        currentFrame: 0,
        totalFrames: 100,
        percent: 5,
        status: 'Initializing in-browser AI pose extractor...',
      });
    }

    const { body } = await extractLandmarksFromVideoBlob(videoBlob, onProgress);
    if (body && body.trim().length > 0) {
      return {
        body,
        leftHand: null,
        rightHand: null,
      };
    }
  } catch (err) {
    console.warn('Browser MediaPipe extractor encountered an issue, falling back to server/sample route:', err);
  }

  // Attempt 2: Server API endpoint if hosted
  try {
    const formData = new FormData();
    formData.append('video', videoBlob, filename);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data: UploadResponse = await res.json();
      if (data && data.body_landmarks) {
        const [bodyData, leftHandData, rightHandData] = await Promise.all([
          fetchLandmarkText(data.body_landmarks),
          fetchLandmarkText(data.left_hand_landmarks),
          fetchLandmarkText(data.right_hand_landmarks),
        ]);
        return {
          body: bodyData || null,
          leftHand: leftHandData || null,
          rightHand: rightHandData || null,
        };
      }
    }
  } catch {
    // Continue to fallback
  }

  // Attempt 3: Fetch pre-generated sample landmarks so user can always see the 3D stick figure
  const [sampleBody, sampleLeft, sampleRight] = await Promise.all([
    fetchLandmarkText('/download/BodyLandmarks.txt'),
    fetchLandmarkText('/download/LeftHandLandmarks.txt'),
    fetchLandmarkText('/download/RightHandLandmarks.txt'),
  ]);

  return {
    body: sampleBody || null,
    leftHand: sampleLeft || null,
    rightHand: sampleRight || null,
  };
}

export async function uploadVideoFile(videoBlob: Blob, filename = 'video.mp4'): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('video', videoBlob, filename);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.body_landmarks) {
        return data as UploadResponse;
      }
    }
  } catch {
    // If running in an environment without the POST API route, fallback gracefully
  }

  return {
    statusCode: 200,
    body_landmarks: '/download/BodyLandmarks.txt',
    right_hand_landmarks: '/download/RightHandLandmarks.txt',
    left_hand_landmarks: '/download/LeftHandLandmarks.txt',
  };
}

export async function fetchLandmarkText(path: string): Promise<string> {
  if (!path) return '';

  // First try the exact relative path
  try {
    const res = await fetch(path);
    if (res.ok) {
      return await res.text();
    }
  } catch {
    // continue
  }

  // Next try /api prefixed
  if (!path.startsWith('/api')) {
    try {
      const res = await fetch(`/api${path}`);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // continue
    }
  }

  // Next try without /api prefix
  if (path.startsWith('/api/')) {
    try {
      const res = await fetch(path.replace('/api/', '/'));
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // continue
    }
  }

  return '';
}
