// MediaPipe Pose 33 Landmark Definitions & Connections

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface SkeletonFrame {
  body: Vector3D[];
  leftHand?: Vector3D[];
  rightHand?: Vector3D[];
}

export interface ParsedFrame {
  points: Vector3D[];
}

export const LANDMARK_NAMES = [
  'Nose', 'Left Eye Inner', 'Left Eye', 'Left Eye Outer',
  'Right Eye Inner', 'Right Eye', 'Right Eye Outer',
  'Left Ear', 'Right Ear', 'Mouth Left', 'Mouth Right',
  'Left Shoulder', 'Right Shoulder', 'Left Elbow', 'Right Elbow',
  'Left Wrist', 'Right Wrist', 'Left Pinky', 'Right Pinky',
  'Left Index', 'Right Index', 'Left Thumb', 'Right Thumb',
  'Left Hip', 'Right Hip', 'Left Knee', 'Right Knee',
  'Left Ankle', 'Right Ankle', 'Left Heel', 'Right Heel',
  'Left Foot Index', 'Right Foot Index'
];

export const BODY_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Shoulders & Torso
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  // Left Arm
  [11, 13],
  [13, 15],
  [15, 17],
  [15, 19],
  [15, 21],
  [17, 19],
  // Right Arm
  [12, 14],
  [14, 16],
  [16, 18],
  [16, 20],
  [16, 22],
  [18, 20],
  // Left Leg
  [23, 25],
  [25, 27],
  [27, 29],
  [29, 31],
  [27, 31],
  // Right Leg
  [24, 26],
  [26, 28],
  [28, 30],
  [30, 32],
  [28, 32]
];

// Hand connections (21 landmarks standard MediaPipe hand)
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17]
];

export function getLandmarkColor(index: number): string {
  // Left side landmarks
  if ([1, 2, 3, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31].includes(index)) {
    return '#38bdf8'; // Sky blue / cyan
  }
  // Right side landmarks
  if ([4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32].includes(index)) {
    return '#fb923c'; // Vibrant orange / coral
  }
  // Center / Nose
  return '#facc15'; // Amber yellow
}

export function getConnectionColor(i1: number, i2: number): string {
  const isLeft = [1, 2, 3, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31];
  const isRight = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];

  if (isLeft.includes(i1) && isLeft.includes(i2)) {
    return '#0284c7'; // Cyan/blue limb
  }
  if (isRight.includes(i1) && isRight.includes(i2)) {
    return '#ea580c'; // Orange limb
  }
  return '#10b981'; // Emerald / torso / chest
}

/**
 * Parses raw text formatted identical to the Unity C# script:
 * string[] points = lines[counter].Split(',');
 * float x = float.Parse(points[0+(i*3)])/100;
 * float y = float.Parse(points[1+(i*3)])/100;
 * float z = float.Parse(points[2+(i*3)])/100;
 */
export function parseLandmarksText(rawText: string, expectedLandmarks = 33): Vector3D[][] {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const frames: Vector3D[][] = [];

  for (const line of lines) {
    const rawTokens = line.split(',');
    const points: number[] = [];
    for (const tok of rawTokens) {
      const trimmed = tok.trim();
      if (trimmed.length > 0) {
        const val = parseFloat(trimmed);
        if (!isNaN(val)) {
          points.push(val);
        }
      }
    }

    if (points.length >= expectedLandmarks * 3) {
      const framePoints: Vector3D[] = [];
      for (let i = 0; i < expectedLandmarks; i++) {
        framePoints.push({
          x: points[i * 3 + 0] / 100,
          y: points[i * 3 + 1] / 100,
          z: points[i * 3 + 2] / 100,
        });
      }
      frames.push(framePoints);
    }
  }

  return frames;
}

export function parseBodyLandmarks(rawText: string): ParsedFrame[] {
  const frames = parseLandmarksText(rawText, 33);
  return frames.map((pts) => ({ points: pts }));
}
