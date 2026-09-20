export interface PartFitting {
  scale: number;        // Scale multiplier: 0.3 to 2.5 (default 1.0)
  rotation: number;     // Rotation angle in degrees: -180 to 180 (default 0)
  offsetX: number;      // Anchor offset X in px: -100 to 100 (default 0)
  offsetY: number;      // Anchor offset Y in px: -100 to 100 (default 0)
}

export type PuppetPartKey =
  | 'head'
  | 'torso'
  | 'upperArm'
  | 'forearm'
  | 'thigh'
  | 'shin'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'rightThigh'
  | 'rightShin';

export type PuppetFittings = Partial<Record<PuppetPartKey, PartFitting>>;

export const DEFAULT_PART_FITTING: PartFitting = {
  scale: 1.0,
  rotation: 0,
  offsetX: 0,
  offsetY: 0,
};

export const INITIAL_PUPPET_FITTINGS: PuppetFittings = {
  head: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  torso: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  upperArm: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  forearm: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  thigh: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  shin: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  rightUpperArm: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  rightForearm: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  rightThigh: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
  rightShin: { scale: 1.0, rotation: 0, offsetX: 0, offsetY: 0 },
};
