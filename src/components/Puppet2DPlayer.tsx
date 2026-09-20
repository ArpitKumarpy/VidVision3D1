import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Layers,
  Camera,
  Download,
  Eye,
  Sliders,
  Sparkles,
  Palette,
  Upload,
  Film,
} from 'lucide-react';
import { parseBodyLandmarks, ParsedFrame, Vector3D } from '../utils/skeleton';
import { CustomPuppetModal, CustomPuppetParts } from './CustomPuppetModal';
import { Export2DVideoModal } from './Export2DVideoModal';
import { STARTER_PUPPET_SPRITES } from '../utils/defaultPuppetSprites';
import {
  PuppetFittings,
  PuppetPartKey,
  INITIAL_PUPPET_FITTINGS,
  DEFAULT_PART_FITTING,
} from '../types/puppetFitting';
import { RigFittingTuner } from './RigFittingTuner';

export interface Puppet2DPlayerProps {
  bodyLandmarksText?: string | null;
  onLoadSample?: () => void;
  sourceTitle?: string;
}

type CharacterSkin = 'wood_mannequin' | 'chibi_hero' | 'cyber_mech' | 'paper_cutout' | 'custom_uploaded';
type BackgroundTheme = 'grid' | 'greenscreen' | 'dark' | 'blueprint';

export const Puppet2DPlayer: React.FC<Puppet2DPlayerProps> = ({
  bodyLandmarksText,
  onLoadSample,
  sourceTitle = '2D Puppet Studio',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(true);

  // 2D Animator Controls
  const [skin, setSkin] = useState<CharacterSkin>('chibi_hero');
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>('grid');
  const [onionSkin, setOnionSkin] = useState<boolean>(true);
  const [onionFramesCount, setOnionFramesCount] = useState<number>(2);
  const [showJointPins, setShowJointPins] = useState<boolean>(true);
  const [showMotionTrail, setShowMotionTrail] = useState<boolean>(false);

  // Method B: Custom Cutout Puppet Sprites & Fittings
  const [customParts, setCustomParts] = useState<CustomPuppetParts>(() => ({
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
  }));
  const [customFittings, setCustomFittings] = useState<PuppetFittings>(() => {
    try {
      const saved = localStorage.getItem('stick_puppet_fittings');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_PUPPET_FITTINGS;
  });
  const [selectedTunerPart, setSelectedTunerPart] = useState<PuppetPartKey>('head');
  const [isTunerOpen, setIsTunerOpen] = useState<boolean>(false);
  const [showBoneOverlay, setShowBoneOverlay] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const loadedImagesRef = useRef<{ [key: string]: HTMLImageElement }>({});

  // Auto-persist fittings to local storage
  useEffect(() => {
    try {
      localStorage.setItem('stick_puppet_fittings', JSON.stringify(customFittings));
    } catch {
      // ignore
    }
  }, [customFittings]);

  // Preload custom sprite images for 60fps canvas rendering
  useEffect(() => {
    const images: { [key: string]: HTMLImageElement } = {};
    const keys = Object.keys(customParts) as (keyof CustomPuppetParts)[];
    for (const key of keys) {
      const src = customParts[key];
      if (src) {
        const img = new Image();
        img.src = src;
        images[key] = img;
      }
    }
    loadedImagesRef.current = images;
  }, [customParts]);

  // Parse landmarks into frames
  const frames: ParsedFrame[] = useMemo(() => {
    if (!bodyLandmarksText || bodyLandmarksText.trim() === '') {
      return [];
    }
    return parseBodyLandmarks(bodyLandmarksText);
  }, [bodyLandmarksText]);

  const totalFrames = frames.length;

  // Reset to frame 0 and play on new data
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(true);
  }, [bodyLandmarksText]);

  // Frame Loop (25 FPS standard)
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;

    const intervalMs = Math.round(40 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev + 1 >= totalFrames) {
          return isLooping ? 0 : prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, totalFrames, playbackSpeed, isLooping]);

  // Calculate 2D Screen Bounds & Center for current frame
  const get2DPoints = useCallback(
    (frameIndex: number, width: number, height: number) => {
      if (!frames[frameIndex] || !frames[frameIndex].points) return null;
      const rawPts = frames[frameIndex].points;

      // Find bounding box to center & auto-scale to canvas
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

      for (let i = 0; i < 33; i++) {
        const pt = rawPts[i];
        if (pt) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
      }

      const spanX = Math.max(maxX - minX, 1);
      const spanY = Math.max(maxY - minY, 1);
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      // Canvas scale with margin
      const scale = Math.min((width * 0.7) / spanX, (height * 0.75) / spanY);

      // Convert to canvas coordinates (X right, Y down)
      const mapped = rawPts.map((p: Vector3D) => ({
        x: width / 2 + (p.x - midX) * scale,
        y: height / 2 - (p.y - midY) * scale, // invert Y because in our 3D parser +Y is up
        z: p.z,
      }));

      return { points: mapped, scale };
    },
    [frames]
  );

  // Render 2D Frame onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 1. Draw Background
    ctx.clearRect(0, 0, width, height);

    if (bgTheme === 'greenscreen') {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, width, height);
    } else if (bgTheme === 'dark') {
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);
    } else if (bgTheme === 'blueprint') {
      ctx.fillStyle = '#0f2744';
      ctx.fillRect(0, 0, width, height);
      // Grid lines
      ctx.strokeStyle = '#1b3f6d';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else {
      // Studio Grid
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const step = 30;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Center axes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }

    if (totalFrames === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No motion landmarks loaded. Upload a video or load sample.', width / 2, height / 2);
      return;
    }

    // Helper to draw a stylized bone limb
    const drawLimb = (
      p1: { x: number; y: number },
      p2: { x: number; y: number },
      thickness: number,
      color: string,
      outlineColor = '#000000',
      opacity = 1
    ) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;

      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(p1.x, p1.y);
      ctx.rotate(angle);

      // Draw capsule/rounded limb
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

    // Helper to draw character puppet on a given frame
    const drawPuppet = (frameIdx: number, opacity: number, isGhost = false) => {
      const data = get2DPoints(frameIdx, width, height);
      if (!data) return;
      const pts = data.points;
      const s = data.scale;

      // Joint reference indices
      // 0: nose, 11: L_shoulder, 12: R_shoulder, 13: L_elbow, 14: R_elbow
      // 15: L_wrist, 16: R_wrist, 23: L_hip, 24: R_hip, 25: L_knee, 26: R_knee
      // 27: L_ankle, 28: R_ankle

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
        torsoColor = isGhost ? '#dc2626' : '#ef4444'; // Red t-shirt
        limbColorL = isGhost ? '#2563eb' : '#3b82f6'; // Denim jeans
        limbColorR = isGhost ? '#1d4ed8' : '#2563eb';
        headColor = '#fed7aa'; // Skin tone
        outline = '#1e293b';
      }

      if (isGhost) {
        torsoColor = '#64748b';
        limbColorL = '#06b6d4';
        limbColorR = '#f43f5e';
        headColor = '#94a3b8';
      }

      const boneWidth = Math.max(8, s * 0.04);

      // Method B: Sprite limb renderer for custom cutout puppets
      const drawSpriteLimb = (
        p1: { x: number; y: number },
        p2: { x: number; y: number },
        imgKey: string,
        thickness: number,
        fallbackColor: string,
        opacityVal: number,
        widthMultiplier = 1.0
      ) => {
        const img = loadedImagesRef.current[imgKey];
        if (skin === 'custom_uploaded' && !isGhost && img && img.complete && img.naturalWidth > 0) {
          const fit = customFittings[imgKey as PuppetPartKey] || DEFAULT_PART_FITTING;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) return;
          const angle = Math.atan2(dy, dx);
          ctx.save();
          ctx.globalAlpha = opacityVal;
          ctx.translate(p1.x, p1.y);
          // Apply kinematic rotation + manual fitting rotation
          ctx.rotate(angle + (fit.rotation * Math.PI) / 180);
          // Apply manual anchor / pivot offsets
          ctx.translate(fit.offsetX, fit.offsetY);

          // Horizontal sprite: drawn from left anchor to right
          const aspect = img.naturalHeight / img.naturalWidth;
          const scaledLen = len * fit.scale;
          const h = Math.max(thickness * 1.5 * widthMultiplier, scaledLen * aspect);
          ctx.drawImage(img, 0, -h / 2, scaledLen, h);
          ctx.restore();
        } else {
          drawLimb(p1, p2, thickness, fallbackColor, outline, opacityVal);
        }
      };

      // Draw Back Limbs (Right side typically for 3/4 view)
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
      const torsoImg = loadedImagesRef.current['torso'];

      if (skin === 'custom_uploaded' && !isGhost && torsoImg && torsoImg.complete && torsoImg.naturalWidth > 0) {
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
      const headImg = loadedImagesRef.current['head'];
      if (skin === 'custom_uploaded' && !isGhost && headImg && headImg.complete && headImg.naturalWidth > 0) {
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

        // Head Base
        ctx.beginPath();
        ctx.arc(0, 0, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = headColor;
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(2, boneWidth * 0.15);
        ctx.stroke();

        // Expressive facial features based on skin
        if (skin === 'chibi_hero' && !isGhost) {
          // Eyes
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-headRadius * 0.35, -headRadius * 0.1, headRadius * 0.15, 0, Math.PI * 2);
          ctx.arc(headRadius * 0.35, -headRadius * 0.1, headRadius * 0.15, 0, Math.PI * 2);
          ctx.fill();
          // Eye reflections
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-headRadius * 0.38, -headRadius * 0.13, headRadius * 0.05, 0, Math.PI * 2);
          ctx.arc(headRadius * 0.32, -headRadius * 0.13, headRadius * 0.05, 0, Math.PI * 2);
          ctx.fill();
          // Smile
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, headRadius * 0.15, headRadius * 0.3, 0.2, Math.PI - 0.2);
          ctx.stroke();
        } else if (skin === 'cyber_mech' && !isGhost) {
          // Visor line
          ctx.fillStyle = '#00ffff';
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 8;
          ctx.fillRect(-headRadius * 0.6, -headRadius * 0.15, headRadius * 1.2, headRadius * 0.3);
        } else if (skin === 'wood_mannequin' && !isGhost) {
          // Wooden sphere cross
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

      // Optional: Draw Joint Pins (screws / brass rivets)
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

      // Optional: Visual Bone Rig Overlay for precise sprite alignment
      if (showBoneOverlay && skin === 'custom_uploaded' && !isGhost) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#38bdf8'; // Sky cyan fluorescent dashed bone
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);

        const drawRigBone = (pA: { x: number; y: number }, pB: { x: number; y: number }) => {
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();

          // Joint pivot indicators
          ctx.save();
          ctx.setLineDash([]);
          ctx.fillStyle = '#f43f5e'; // Rose pivot pin
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

        // Torso / Spine
        drawRigBone(midHip, midShoulder);
        // Arms
        drawRigBone(pts[11], pts[13]);
        drawRigBone(pts[13], pts[15]);
        drawRigBone(pts[12], pts[14]);
        drawRigBone(pts[14], pts[16]);
        // Legs
        drawRigBone(pts[23], pts[25]);
        drawRigBone(pts[25], pts[27]);
        drawRigBone(pts[24], pts[26]);
        drawRigBone(pts[26], pts[28]);
        // Neck to head
        drawRigBone(midShoulder, pts[0]);

        ctx.restore();
      }
    };

    // 2. Draw Onion Skins (Past frames in transparent ghost tints)
    if (onionSkin && currentFrameIndex > 0) {
      for (let offset = onionFramesCount; offset >= 1; offset--) {
        const ghostIdx = currentFrameIndex - offset;
        if (ghostIdx >= 0) {
          const ghostOpacity = (0.25 / onionFramesCount) * (onionFramesCount - offset + 1);
          drawPuppet(ghostIdx, ghostOpacity, true);
        }
      }
    }

    // 3. Draw Active Puppet Frame
    drawPuppet(currentFrameIndex, 1.0, false);

    // 4. Motion Trails for Hands & Feet
    if (showMotionTrail && currentFrameIndex > 3) {
      const trailIndices = [15, 16, 27, 28]; // hands and feet
      ctx.save();
      ctx.lineWidth = 2;
      for (const tIdx of trailIndices) {
        ctx.beginPath();
        for (let fi = Math.max(0, currentFrameIndex - 8); fi <= currentFrameIndex; fi++) {
          const data = get2DPoints(fi, width, height);
          if (data && data.points[tIdx]) {
            const p = data.points[tIdx];
            if (fi === Math.max(0, currentFrameIndex - 8)) {
              ctx.moveTo(p.x, p.y);
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
        }
        ctx.strokeStyle = tIdx < 20 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(249, 115, 22, 0.4)';
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [
    currentFrameIndex,
    totalFrames,
    skin,
    bgTheme,
    onionSkin,
    onionFramesCount,
    showJointPins,
    showMotionTrail,
    get2DPoints,
    customParts,
    customFittings,
    showBoneOverlay,
  ]);

  // Export 2D Animation JSON (Angles and Keyframes for Spine2D / DragonBones)
  const exportAnimationJSON = () => {
    if (totalFrames === 0) return;

    const exportData = {
      generator: 'VidVision3D 2D Puppet Studio',
      fps: 25,
      frameCount: totalFrames,
      bones: [
        'root',
        'torso',
        'head',
        'left_upper_arm',
        'left_forearm',
        'right_upper_arm',
        'right_forearm',
        'left_thigh',
        'left_shin',
        'right_thigh',
        'right_shin',
      ],
      frames: frames.map((f, i) => {
        const pts = f.points;
        const angle = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
          Number(((Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI).toFixed(2));

        return {
          frame: i,
          timeSec: Number((i / 25).toFixed(3)),
          root: { x: pts[23].x, y: pts[23].y },
          angles: {
            torso: angle(pts[23], pts[11]),
            head: angle(pts[11], pts[0]),
            left_upper_arm: angle(pts[11], pts[13]),
            left_forearm: angle(pts[13], pts[15]),
            right_upper_arm: angle(pts[12], pts[14]),
            right_forearm: angle(pts[14], pts[16]),
            left_thigh: angle(pts[23], pts[25]),
            left_shin: angle(pts[25], pts[27]),
            right_thigh: angle(pts[24], pts[26]),
            right_shin: angle(pts[26], pts[28]),
          },
        };
      }),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puppet_animation_${totalFrames}frames.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current frame as PNG snapshot
  const exportFramePNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `puppet_frame_${currentFrameIndex + 1}.png`;
    a.click();
  };

  return (
    <div
      ref={containerRef}
      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-sm"
    >
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide">2D Puppet Studio</h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {sourceTitle}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Skeletal cutout puppet animated by MediaPipe body kinematics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalFrames === 0 && onLoadSample && (
            <button
              onClick={onLoadSample}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Data</span>
            </button>
          )}

          {/* Custom Puppet Rig Button (Method B) */}
          <button
            onClick={() => {
              setSkin('custom_uploaded');
              setIsCustomModalOpen(true);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            title="Upload your own custom 2D cutout puppet sprites (Method B)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Puppet</span>
          </button>

          {/* Manual Sprite Fitting Tuner Toggle */}
          {skin === 'custom_uploaded' && (
            <button
              onClick={() => setIsTunerOpen(!isTunerOpen)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                isTunerOpen
                  ? 'bg-purple-600 text-white shadow-purple-900/40 ring-1 ring-purple-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/50'
              }`}
              title="Manually size, rotate, and offset sprite elements on the rig"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-300" />
              <span>Tune Rig Fit</span>
            </button>
          )}

          {/* Export Actions */}
          <button
            onClick={() => setIsVideoModalOpen(true)}
            disabled={totalFrames === 0}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
            title="Export animation as MP4 video with Chroma Green, Blue Screen, or Transparent Alpha"
          >
            <Film className="w-3.5 h-3.5 text-emerald-200" />
            <span>Export MP4 / Chroma</span>
          </button>

          <button
            onClick={exportFramePNG}
            disabled={totalFrames === 0}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Download PNG snapshot of current frame"
          >
            <Camera className="w-3.5 h-3.5 text-purple-400" />
            <span>Snap PNG</span>
          </button>

          <button
            onClick={exportAnimationJSON}
            disabled={totalFrames === 0}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="Download 2D Animation JSON with bone angles and coordinates"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export 2D JSON</span>
          </button>
        </div>
      </div>

      {/* Main 2D Stage Canvas */}
      <div className="relative w-full aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full object-contain"
        />

        {/* Interactive Rig Fitting Tuner (Manual Size, Rotation, Offset Panel) */}
        {skin === 'custom_uploaded' && (
          <RigFittingTuner
            isOpen={isTunerOpen}
            onClose={() => setIsTunerOpen(false)}
            fittings={customFittings}
            onUpdateFittings={setCustomFittings}
            selectedPart={selectedTunerPart}
            onSelectPart={setSelectedTunerPart}
            customParts={customParts}
            showBoneOverlay={showBoneOverlay}
            onToggleBoneOverlay={setShowBoneOverlay}
          />
        )}

        {/* Floating Quick Controls Overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          {/* Skin Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-lg space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Puppet Skin</span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  ['chibi_hero', 'Chibi Hero'],
                  ['wood_mannequin', 'Mannequin'],
                  ['cyber_mech', 'Cyber Mech'],
                  ['paper_cutout', 'Cutout'],
                  ['custom_uploaded', 'Custom Rig'],
                ] as [CharacterSkin, string][]
              ).map(([sKey, sLabel]) => (
                <button
                  key={sKey}
                  onClick={() => {
                    setSkin(sKey);
                    if (sKey === 'custom_uploaded') {
                      setIsCustomModalOpen(true);
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-colors text-left ${
                    skin === sKey
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sLabel}
                </button>
              ))}
            </div>
            {skin === 'custom_uploaded' && (
              <div className="flex gap-1 mt-1.5">
                <button
                  onClick={() => setIsCustomModalOpen(true)}
                  className="flex-1 px-2 py-1 rounded bg-purple-950/90 border border-purple-700/60 text-purple-200 hover:bg-purple-900 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  title="Upload or change sprite images"
                >
                  <Upload className="w-3 h-3" />
                  <span>Sprites</span>
                </button>
                <button
                  onClick={() => setIsTunerOpen(!isTunerOpen)}
                  className={`flex-1 px-2 py-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
                    isTunerOpen
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-slate-800/90 border-slate-700 text-purple-300 hover:bg-slate-700'
                  }`}
                  title="Fine-tune scale, rotation angle, and pivot offsets"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Fit Tuner</span>
                </button>
              </div>
            )}
          </div>

          {/* Background Theme Selector */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2 shadow-lg space-y-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block px-1">Stage Backdrop</span>
            <div className="flex gap-1">
              {(
                [
                  ['grid', 'Grid'],
                  ['greenscreen', 'Chroma'],
                  ['dark', 'Dark'],
                  ['blueprint', 'Blue'],
                ] as [BackgroundTheme, string][]
              ).map(([bgKey, bgLabel]) => (
                <button
                  key={bgKey}
                  onClick={() => setBgTheme(bgKey)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    bgTheme === bgKey
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {bgLabel}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Animator Features Toggles (Bottom Left) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-lg text-xs z-10">
          <button
            onClick={() => {
              if (!onionSkin) {
                setOnionSkin(true);
                setOnionFramesCount(2);
              } else if (onionFramesCount === 2) {
                setOnionFramesCount(3);
              } else {
                setOnionSkin(false);
                setOnionFramesCount(2);
              }
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              onionSkin
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Onion Skinning (Ghosting previous frames)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Onion Skin {onionSkin ? `(${onionFramesCount})` : ''}</span>
          </button>

          <button
            onClick={() => setShowJointPins(!showJointPins)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showJointPins
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle visual joint hinge pins"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Joint Pins</span>
          </button>

          <button
            onClick={() => setShowMotionTrail(!showMotionTrail)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showMotionTrail
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Show motion arcs for hands and feet"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Trails</span>
          </button>

          {/* Custom Rig Alignment & Bone Overlay Toggles */}
          {skin === 'custom_uploaded' && (
            <>
              <button
                onClick={() => setIsTunerOpen(!isTunerOpen)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isTunerOpen
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-800 text-purple-300 hover:text-white border border-purple-500/40'
                }`}
                title="Toggle Sprite Fitting Tuner (Size, Rotation & Pivot Offsets)"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-300" />
                <span>Fit Tuner</span>
              </button>

              <button
                onClick={() => setShowBoneOverlay(!showBoneOverlay)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  showBoneOverlay
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/40'
                }`}
                title="Show underlying skeletal bone axes for alignment"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                <span>Bone Overlay</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Timeline Scrubber & Playback Controls */}
      <div className="px-5 py-4 bg-slate-800/60 border-t border-slate-700/60 space-y-3">
        {/* Scrubber Bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-purple-400 w-12 text-right">
            F:{currentFrameIndex + 1}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(totalFrames - 1, 0)}
            value={currentFrameIndex}
            onChange={(e) => {
              setCurrentFrameIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            disabled={totalFrames === 0}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <span className="text-xs font-mono text-slate-400 w-12">
            /{totalFrames}
          </span>
        </div>

        {/* Playback Button Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentFrameIndex(0);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Rewind to frame 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Previous Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all text-xs"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex((prev) => Math.min(totalFrames - 1, prev + 1));
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Next Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isLooping
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Loop: {isLooping ? 'On' : 'Off'}
            </button>
          </div>

          {/* Speed Selection */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Speed:</span>
            {[0.5, 1.0, 1.5, 2.0].map((sVal) => (
              <button
                key={sVal}
                onClick={() => setPlaybackSpeed(sVal)}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  playbackSpeed === sVal
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {sVal}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Puppet Cutout Builder Modal (Method B) */}
      <CustomPuppetModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        parts={customParts}
        onUpdateParts={(updated) => {
          setCustomParts(updated);
          setSkin('custom_uploaded');
        }}
        fittings={customFittings}
        onUpdateFittings={setCustomFittings}
      />

      {/* 2D Video & Chroma Export Modal */}
      <Export2DVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        frames={frames}
        currentFrameIndex={currentFrameIndex}
        skin={skin}
        customParts={customParts}
        customFittings={customFittings}
        loadedImages={loadedImagesRef.current}
        initialBgTheme={bgTheme}
      />
    </div>
  );
};
