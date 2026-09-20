import { CustomPuppetParts } from '../components/CustomPuppetModal';
import {
  PuppetFittings,
  DEFAULT_PART_FITTING,
} from '../types/puppetFitting';
import { Vector3D } from './skeleton';

export type PuppetSkinType =
  | 'chibi_hero'
  | 'wood_mannequin'
  | 'cyber_mech'
  | 'paper_cutout'
  | 'custom_uploaded';

export type VideoBackgroundType =
  | 'chroma_green'
  | 'chroma_blue'
  | 'chroma_magenta'
  | 'transparent'
  | 'studio_dark'
  | 'clean_white'
  | 'blueprint'
  | 'grid';

export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Calculates global bounding box across all frames for grounded, jitter-free camera framing
 */
export function calculateGlobalBounds(
  frames: Array<{ points: Vector3D[] }>
): BoundingBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const frame of frames) {
    if (!frame.points) continue;
    for (let i = 0; i < 33; i++) {
      const pt = frame.points[i];
      if (pt) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
  }

  if (minX === Infinity) {
    return { minX: -0.5, maxX: 0.5, minY: -0.8, maxY: 0.8 };
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Maps 3D vector points to 2D canvas coordinates
 */
export function mapPointsToCanvas(
  rawPts: Vector3D[],
  width: number,
  height: number,
  globalBounds?: BoundingBox
): { points: Array<{ x: number; y: number; z?: number }>; scale: number } {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  if (globalBounds) {
    minX = globalBounds.minX;
    maxX = globalBounds.maxX;
    minY = globalBounds.minY;
    maxY = globalBounds.maxY;
  } else {
    for (let i = 0; i < 33; i++) {
      const pt = rawPts[i];
      if (pt) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    }
  }

  const spanX = Math.max(maxX - minX, 0.2);
  const spanY = Math.max(maxY - minY, 0.2);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // Scale with 20% margin
  const scale = Math.min((width * 0.72) / spanX, (height * 0.75) / spanY);

  const mapped = rawPts.map((p) => ({
    x: width / 2 + (p.x - midX) * scale,
    y: height / 2 - (p.y - midY) * scale,
    z: p.z,
  }));

  return { points: mapped, scale };
}

/**
 * Draw video background or chroma canvas
 */
export function drawPuppetBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: VideoBackgroundType
) {
  ctx.clearRect(0, 0, width, height);

  switch (theme) {
    case 'chroma_green':
      // Broadcast standard pure chroma key green
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'chroma_blue':
      // Broadcast standard chroma key blue
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'chroma_magenta':
      // High-contrast magenta screen
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'transparent':
      // Clean transparent canvas (cleared by clearRect)
      break;

    case 'clean_white':
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'studio_dark':
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'blueprint':
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#1b3f6d';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'grid':
    default:
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      break;
  }
}

export interface DrawPuppetSkeletonOptions {
  ctx: CanvasRenderingContext2D;
  points: Array<{ x: number; y: number; z?: number }>;
  scale: number;
  skin: PuppetSkinType;
  customParts: CustomPuppetParts;
  customFittings: PuppetFittings;
  loadedImages: Record<string, HTMLImageElement>;
  showJointPins?: boolean;
  showBoneOverlay?: boolean;
  opacity?: number;
  isGhost?: boolean;
}

/**
 * Draws the 2D puppet character onto any canvas rendering context
 */
export function drawPuppetSkeleton({
  ctx,
  points: pts,
  scale: s,
  skin,
  customParts,
  customFittings,
  loadedImages,
  showJointPins = false,
  showBoneOverlay = false,
  opacity = 1.0,
  isGhost = false,
}: DrawPuppetSkeletonOptions) {
  if (!pts || pts.length < 29) return;

  // Determine palette based on skin
  let torsoColor = '#3b82f6';
  let limbColorL = '#06b6d4';
  let limbColorR = '#f97316';
  let headColor = '#fde047';
  let outline = '#0f172a';
  let jointPinColor = '#ffffff';

  if (skin === 'wood_mannequin') {
    torsoColor = isGhost ? '#b45309' : '#d97706';
    limbColorL = isGhost ? '#b45309' : '#f59e0b';
    limbColorR = isGhost ? '#92400e' : '#b45309';
    headColor = '#fbbf24';
    outline = '#78350f';
    jointPinColor = '#d97706';
  } else if (skin === 'cyber_mech') {
    torsoColor = '#1e293b';
    limbColorL = isGhost ? '#0891b2' : '#22d3ee';
    limbColorR = isGhost ? '#4f46e5' : '#818cf8';
    headColor = '#06b6d4';
    outline = '#0284c7';
    jointPinColor = '#38bdf8';
  } else if (skin === 'paper_cutout') {
    torsoColor = '#e2e8f0';
    limbColorL = '#94a3b8';
    limbColorR = '#cbd5e1';
    headColor = '#f1f5f9';
    outline = '#334155';
    jointPinColor = '#eab308';
  } else if (skin === 'custom_uploaded') {
    torsoColor = '#8b5cf6';
    limbColorL = '#a855f7';
    limbColorR = '#7c3aed';
    headColor = '#f5d0fe';
    outline = '#3b0764';
    jointPinColor = '#facc15';
  } else {
    // Chibi Hero
    torsoColor = isGhost ? '#dc2626' : '#ef4444';
    limbColorL = isGhost ? '#2563eb' : '#3b82f6';
    limbColorR = isGhost ? '#1d4ed8' : '#2563eb';
    headColor = '#fed7aa';
    outline = '#1e293b';
  }

  if (isGhost) {
    torsoColor = '#64748b';
    limbColorL = '#06b6d4';
    limbColorR = '#f43f5e';
    headColor = '#94a3b8';
  }

  const boneWidth = Math.max(8, s * 0.04);

  // Helper to draw a stylized vector limb
  const drawLimb = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    thickness: number,
    color: string,
    outlineColor = '#000000',
    opacityVal = 1
  ) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.globalAlpha = opacityVal;
    ctx.translate(p1.x, p1.y);
    ctx.rotate(angle);

    const r = thickness / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.arc(len, 0, r, (3 * Math.PI) / 2, Math.PI / 2);
    ctx.closePath();

    ctx.fillStyle = color;
    ctx.fill();
    if (outlineColor && outlineColor !== 'none') {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = Math.max(1.5, thickness * 0.12);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Sprite limb renderer for custom cutout puppets
  const drawSpriteLimb = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    imgKey: string,
    thickness: number,
    fallbackColor: string,
    opacityVal: number,
    widthMultiplier = 1.0
  ) => {
    const img = loadedImages[imgKey];
    const fit = customFittings[imgKey as keyof PuppetFittings] || DEFAULT_PART_FITTING;

    if (
      skin === 'custom_uploaded' &&
      !isGhost &&
      img &&
      img.complete &&
      img.naturalWidth > 0
    ) {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const angle = Math.atan2(dy, dx);
      ctx.save();
      ctx.globalAlpha = opacityVal;
      ctx.translate(p1.x, p1.y);
      ctx.rotate(angle + (fit.rotation * Math.PI) / 180);
      ctx.translate(fit.offsetX, fit.offsetY);

      const aspect = img.naturalHeight / img.naturalWidth;
      const scaledLen = len * fit.scale;
      const h = Math.max(thickness * 1.5 * widthMultiplier, scaledLen * aspect);
      ctx.drawImage(img, 0, -h / 2, scaledLen, h);
      ctx.restore();
    } else {
      drawLimb(p1, p2, thickness, fallbackColor, outline, opacityVal);
    }
  };

  // Draw Back Limbs (Right side typically)
  const rThighKey = customParts.rightThigh ? 'rightThigh' : 'thigh';
  const rShinKey = customParts.rightShin ? 'rightShin' : 'shin';
  const rUArmKey = customParts.rightUpperArm ? 'rightUpperArm' : 'upperArm';
  const rFArmKey = customParts.rightForearm ? 'rightForearm' : 'forearm';

  drawSpriteLimb(pts[24], pts[26], rThighKey, boneWidth * 1.2, limbColorR, opacity, 1.2);
  drawSpriteLimb(pts[26], pts[28], rShinKey, boneWidth * 1.0, limbColorR, opacity, 1.0);
  drawSpriteLimb(pts[12], pts[14], rUArmKey, boneWidth * 0.9, limbColorR, opacity, 0.9);
  drawSpriteLimb(pts[14], pts[16], rFArmKey, boneWidth * 0.8, limbColorR, opacity, 0.8);

  // Draw Torso
  const midShoulder = { x: (pts[11].x + pts[12].x) / 2, y: (pts[11].y + pts[12].y) / 2 };
  const midHip = { x: (pts[23].x + pts[24].x) / 2, y: (pts[23].y + pts[24].y) / 2 };
  const torsoImg = loadedImages['torso'];

  if (
    skin === 'custom_uploaded' &&
    !isGhost &&
    torsoImg &&
    torsoImg.complete &&
    torsoImg.naturalWidth > 0
  ) {
    const torsoFit = customFittings.torso || DEFAULT_PART_FITTING;
    const dx = midShoulder.x - midHip.x;
    const dy = midShoulder.y - midHip.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) - Math.PI / 2 + (torsoFit.rotation * Math.PI) / 180;
    const w = Math.max(len * 1.35, boneWidth * 3.5) * torsoFit.scale;
    const h = len * 1.25 * torsoFit.scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate((midHip.x + midShoulder.x) / 2, (midHip.y + midShoulder.y) / 2);
    ctx.rotate(angle);
    ctx.translate(torsoFit.offsetX, torsoFit.offsetY);
    ctx.drawImage(torsoImg, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    drawLimb(midHip, midShoulder, boneWidth * 2.2, torsoColor, outline, opacity);
  }

  // Draw Front Limbs (Left side)
  drawSpriteLimb(pts[23], pts[25], 'thigh', boneWidth * 1.2, limbColorL, opacity, 1.2);
  drawSpriteLimb(pts[25], pts[27], 'shin', boneWidth * 1.0, limbColorL, opacity, 1.0);
  drawSpriteLimb(pts[11], pts[13], 'upperArm', boneWidth * 0.9, limbColorL, opacity, 0.9);
  drawSpriteLimb(pts[13], pts[15], 'forearm', boneWidth * 0.8, limbColorL, opacity, 0.8);

  // Draw Feet
  const drawFoot = (ankle: { x: number; y: number }, color: string) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(ankle.x, ankle.y + 4, boneWidth * 0.8, boneWidth * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(ankle.x, ankle.y + 3, boneWidth * 0.7, boneWidth * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const hasCustomShin = skin === 'custom_uploaded' && Boolean(customParts.shin);
  if (!hasCustomShin || isGhost) {
    drawFoot(pts[27], limbColorL);
    drawFoot(pts[28], limbColorR);
  }

  // Draw Hands
  const hasCustomForearm = skin === 'custom_uploaded' && Boolean(customParts.forearm);
  const drawHand = (wrist: { x: number; y: number }, color: string) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(wrist.x, wrist.y, boneWidth * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  };
  if (!hasCustomForearm || isGhost) {
    drawHand(pts[15], headColor);
    drawHand(pts[16], headColor);
  }

  // Draw Head
  const headImg = loadedImages['head'];
  if (
    skin === 'custom_uploaded' &&
    !isGhost &&
    headImg &&
    headImg.complete &&
    headImg.naturalWidth > 0
  ) {
    const headFit = customFittings.head || DEFAULT_PART_FITTING;
    const headSize = Math.max(48, boneWidth * 4.2) * headFit.scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    const neckX = (pts[11].x + pts[12].x) / 2;
    const neckY = (pts[11].y + pts[12].y) / 2;
    const headAngle =
      (Math.atan2(pts[0].y - neckY, pts[0].x - neckX) - Math.PI / 2) * 0.4 +
      (headFit.rotation * Math.PI) / 180;
    ctx.translate(pts[0].x, pts[0].y);
    ctx.rotate(headAngle);
    ctx.translate(headFit.offsetX, headFit.offsetY);
    ctx.drawImage(headImg, -headSize / 2, -headSize * 0.65, headSize, headSize);
    ctx.restore();
  } else {
    const headRadius = Math.max(16, boneWidth * 1.8);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(pts[0].x, pts[0].y);

    ctx.beginPath();
    ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = headColor;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2, boneWidth * 0.15);
    ctx.stroke();

    if (skin === 'chibi_hero' && !isGhost) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(-headRadius * 0.35, -headRadius * 0.1, headRadius * 0.15, 0, Math.PI * 2);
      ctx.arc(headRadius * 0.35, -headRadius * 0.1, headRadius * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-headRadius * 0.38, -headRadius * 0.13, headRadius * 0.05, 0, Math.PI * 2);
      ctx.arc(headRadius * 0.32, -headRadius * 0.13, headRadius * 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, headRadius * 0.15, headRadius * 0.3, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else if (skin === 'cyber_mech' && !isGhost) {
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8;
      ctx.fillRect(-headRadius * 0.6, -headRadius * 0.15, headRadius * 1.2, headRadius * 0.3);
    } else if (skin === 'wood_mannequin' && !isGhost) {
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -headRadius);
      ctx.lineTo(0, headRadius);
      ctx.moveTo(-headRadius, 0);
      ctx.lineTo(headRadius, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Joint Pins
  if (showJointPins && !isGhost) {
    const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    ctx.save();
    ctx.globalAlpha = opacity;
    for (const idx of jointIndices) {
      const pt = pts[idx];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, boneWidth * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = jointPinColor;
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Visual Bone Rig Overlay
  if (showBoneOverlay && skin === 'custom_uploaded' && !isGhost) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);

    const drawRigBone = (pA: { x: number; y: number }, pB: { x: number; y: number }) => {
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      ctx.save();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f43f5e';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pA.x, pA.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pB.x, pB.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    drawRigBone(midHip, midShoulder);
    drawRigBone(pts[11], pts[13]);
    drawRigBone(pts[13], pts[15]);
    drawRigBone(pts[12], pts[14]);
    drawRigBone(pts[14], pts[16]);
    drawRigBone(pts[23], pts[25]);
    drawRigBone(pts[25], pts[27]);
    drawRigBone(pts[24], pts[26]);
    drawRigBone(pts[26], pts[28]);
    drawRigBone(midShoulder, pts[0]);

    ctx.restore();
  }
}
