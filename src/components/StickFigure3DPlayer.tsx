import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Compass,
  Sparkles,
  Info
} from 'lucide-react';
import {
  parseLandmarksText,
  BODY_CONNECTIONS,
  LANDMARK_NAMES,
  getLandmarkColor,
  getConnectionColor,
  Vector3D
} from '../utils/skeleton';

interface StickFigure3DPlayerProps {
  bodyLandmarksText: string | null;
  leftHandLandmarksText?: string | null;
  rightHandLandmarksText?: string | null;
  onLoadSample?: () => void;
  sourceTitle?: string;
}

export const StickFigure3DPlayer: React.FC<StickFigure3DPlayerProps> = ({
  bodyLandmarksText,
  onLoadSample,
  sourceTitle
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState(true);
  const [depthScale, setDepthScale] = useState<number>(5.0); // Amplifies Z relative depth for clarity
  const [boneStyle, setBoneStyle] = useState<'cylinders' | 'lines'>('cylinders');
  const [showJoints, setShowJoints] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [activePreset, setActivePreset] = useState<'front' | 'side' | 'perspective' | 'top'>('perspective');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredLandmark, setHoveredLandmark] = useState<{ index: number; name: string; pos: Vector3D } | null>(null);

  // Parse frames
  const frames = useMemo(() => {
    if (!bodyLandmarksText) return [];
    return parseLandmarksText(bodyLandmarksText, 33);
  }, [bodyLandmarksText]);

  // Compute global center offset across all frames so animation stays centered
  const centerOffset = useMemo(() => {
    if (frames.length === 0) return { x: 0, y: 0, z: 0, scale: 1 };

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const frame of frames) {
      for (const pt of frame) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        if (pt.z < minZ) minZ = pt.z;
        if (pt.z > maxZ) maxZ = pt.z;
      }
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const height = Math.max(1, maxY - minY);

    return {
      x: centerX,
      y: centerY,
      z: centerZ,
      scale: 14 / height // Normalizes character to ~14 units height
    };
  }, [frames]);

  // Three.js scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Meshes references
  const jointMeshesRef = useRef<THREE.Mesh[]>([]);
  const boneMeshesRef = useRef<THREE.Mesh[]>([]);
  const boneLinesRef = useRef<THREE.LineSegments | null>(null);
  const headMeshRef = useRef<THREE.Mesh | null>(null);

  // Raycaster for hovering
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Initialize Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 520;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Tailwind slate-900
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(15, 8, 20);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.maxDistance = 60;
    controls.minDistance = 4;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight1.position.set(10, 20, 15);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf97316, 0.9);
    dirLight2.position.set(-15, -10, -10);
    scene.add(dirLight2);

    // Floor Grid
    const grid = new THREE.GridHelper(30, 30, 0x38bdf8, 0x1e293b);
    grid.position.y = -7.5;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Ground reflective ring
    const circleGeo = new THREE.CircleGeometry(15, 32);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0x090d16,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const circleMesh = new THREE.Mesh(circleGeo, circleMat);
    circleMesh.rotation.x = -Math.PI / 2;
    circleMesh.position.y = -7.52;
    scene.add(circleMesh);

    // Create 33 Joint Spheres
    const jointMeshes: THREE.Mesh[] = [];
    const jointGeo = new THREE.SphereGeometry(0.26, 16, 16);

    for (let i = 0; i < 33; i++) {
      const color = getLandmarkColor(i);
      const jointMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.45,
        roughness: 0.2,
        metalness: 0.5
      });
      const jointMesh = new THREE.Mesh(jointGeo, jointMat);
      jointMesh.userData = { landmarkIndex: i };
      scene.add(jointMesh);
      jointMeshes.push(jointMesh);
    }
    jointMeshesRef.current = jointMeshes;

    // Head representation (wireframe sphere at nose / landmark 0)
    const headGeo = new THREE.SphereGeometry(0.7, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.4,
      wireframe: true
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    scene.add(headMesh);
    headMeshRef.current = headMesh;

    // Create 3D Bone Cylinders
    const boneMeshes: THREE.Mesh[] = [];
    const cylinderGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);

    for (const [i1, i2] of BODY_CONNECTIONS) {
      const color = getConnectionColor(i1, i2);
      const boneMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.35,
        roughness: 0.3,
        metalness: 0.4
      });
      const boneMesh = new THREE.Mesh(cylinderGeo, boneMat);
      scene.add(boneMesh);
      boneMeshes.push(boneMesh);
    }
    boneMeshesRef.current = boneMeshes;

    // Create Line Segments as alternative mode
    const linePositions = new Float32Array(BODY_CONNECTIONS.length * 2 * 3);
    const lineColors = new Float32Array(BODY_CONNECTIONS.length * 2 * 3);

    let cIdx = 0;
    for (const [i1, i2] of BODY_CONNECTIONS) {
      const col = new THREE.Color(getConnectionColor(i1, i2));
      lineColors[cIdx++] = col.r;
      lineColors[cIdx++] = col.g;
      lineColors[cIdx++] = col.b;
      lineColors[cIdx++] = col.r;
      lineColors[cIdx++] = col.g;
      lineColors[cIdx++] = col.b;
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3
    });
    const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
    lineSegments.visible = false;
    scene.add(lineSegments);
    boneLinesRef.current = lineSegments;

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !renderer || !camera) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    });
    resizeObserver.observe(containerRef.current);

    // Mouse Move for Raycasting Tooltip
    const handleMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(jointMeshesRef.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const idx = hit.userData.landmarkIndex as number;
        if (typeof idx === 'number') {
          setHoveredLandmark({
            index: idx,
            name: LANDMARK_NAMES[idx] || `Landmark #${idx}`,
            pos: {
              x: Number(hit.position.x.toFixed(2)),
              y: Number(hit.position.y.toFixed(2)),
              z: Number(hit.position.z.toFixed(2))
            }
          });
          return;
        }
      }
      setHoveredLandmark(null);
    };

    const canvasElem = canvasRef.current;
    canvasElem.addEventListener('mousemove', handleMouseMove);

    // Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvasElem.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // Update Grid and Joint visibility on toggle
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  useEffect(() => {
    jointMeshesRef.current.forEach((m) => {
      m.visible = showJoints;
    });
    if (headMeshRef.current) {
      headMeshRef.current.visible = showJoints;
    }
  }, [showJoints]);

  useEffect(() => {
    const isCyl = boneStyle === 'cylinders';
    boneMeshesRef.current.forEach((m) => {
      m.visible = isCyl;
    });
    if (boneLinesRef.current) {
      boneLinesRef.current.visible = !isCyl;
    }
  }, [boneStyle]);

  // Reset to frame 0 and play when new animation landmarks are loaded
  useEffect(() => {
    setCurrentFrameIndex(0);
    setIsPlaying(true);
  }, [bodyLandmarksText]);

  // Frame Player Loop (Matches Unity's Thread.Sleep(40) = 40ms per frame, 25 FPS base)
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const baseFrameIntervalMs = 40 / playbackSpeed; // 40ms base (25 fps)
    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          return isLooping ? 0 : prev;
        }
        return next;
      });
    }, baseFrameIntervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, frames.length, playbackSpeed, isLooping]);

  // Update 3D skeleton positions whenever currentFrameIndex or frames change
  useEffect(() => {
    if (frames.length === 0 || !sceneRef.current) return;

    const clampedIndex = Math.min(currentFrameIndex, frames.length - 1);
    const frame = frames[clampedIndex];
    if (!frame || frame.length < 33) return;

    const { x: cx, y: cy, z: cz, scale } = centerOffset;

    const currentPoints: THREE.Vector3[] = [];

    for (let i = 0; i < 33; i++) {
      const pt = frame[i];
      const px = (pt.x - cx) * scale;
      const py = (pt.y - cy) * scale;
      const pz = (pt.z - cz) * scale * depthScale;

      const vec = new THREE.Vector3(px, py, pz);
      currentPoints.push(vec);

      const jointMesh = jointMeshesRef.current[i];
      if (jointMesh) {
        jointMesh.position.copy(vec);
      }
    }

    if (headMeshRef.current && currentPoints[0]) {
      headMeshRef.current.position.copy(currentPoints[0]);
    }

    const upAxis = new THREE.Vector3(0, 1, 0);

    BODY_CONNECTIONS.forEach(([i1, i2], idx) => {
      const p1 = currentPoints[i1];
      const p2 = currentPoints[i2];
      const boneMesh = boneMeshesRef.current[idx];

      if (p1 && p2 && boneMesh) {
        const distance = p1.distanceTo(p2);
        if (distance > 0.001) {
          boneMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
          boneMesh.scale.set(1, distance, 1);
          const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
          boneMesh.quaternion.setFromUnitVectors(upAxis, direction);
        }
      }
    });

    if (boneLinesRef.current) {
      const posAttr = boneLinesRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      let pIdx = 0;

      BODY_CONNECTIONS.forEach(([i1, i2]) => {
        const p1 = currentPoints[i1];
        const p2 = currentPoints[i2];
        if (p1 && p2) {
          posArray[pIdx++] = p1.x;
          posArray[pIdx++] = p1.y;
          posArray[pIdx++] = p1.z;
          posArray[pIdx++] = p2.x;
          posArray[pIdx++] = p2.y;
          posArray[pIdx++] = p2.z;
        }
      });
      posAttr.needsUpdate = true;
    }
  }, [currentFrameIndex, frames, centerOffset, depthScale]);

  // Set Camera Presets
  const setCameraPreset = (preset: 'front' | 'side' | 'perspective' | 'top') => {
    setActivePreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    switch (preset) {
      case 'front':
        camera.position.set(0, 0, 25);
        break;
      case 'side':
        camera.position.set(25, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 26, 0.01);
        break;
      case 'perspective':
      default:
        camera.position.set(15, 8, 20);
        break;
    }
    controls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    controls.update();
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col ${
        isFullscreen ? 'h-screen' : 'h-[640px]'
      }`}
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto bg-slate-900/85 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <span>Web 3D Stick Figure Player</span>
              <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {sourceTitle || 'Unity Equivalent'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {frames.length > 0
                ? `Frame ${currentFrameIndex + 1} of ${frames.length} (${(
                    (currentFrameIndex / Math.max(1, frames.length - 1)) *
                    100
                  ).toFixed(0)}%) • 25 FPS`
                : 'No animation loaded'}
            </p>
          </div>
        </div>

        {/* Camera Views & Fullscreen */}
        <div className="flex items-center space-x-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-lg">
          <button
            onClick={() => setCameraPreset('front')}
            title="Front View"
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activePreset === 'front'
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => setCameraPreset('side')}
            title="Side View"
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activePreset === 'side'
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Side
          </button>
          <button
            onClick={() => setCameraPreset('top')}
            title="Top View"
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activePreset === 'top'
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Top
          </button>
          <button
            onClick={() => setCameraPreset('perspective')}
            title="Perspective 3D"
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              activePreset === 'perspective'
                ? 'bg-primary-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            3D Orbit
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-1" />
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Tooltip / Telemetry Overlay */}
      <div className="absolute top-20 left-4 pointer-events-none">
        {hoveredLandmark ? (
          <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-cyan-500/40 shadow-xl text-xs space-y-1">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{hoveredLandmark.name}</span>
              <span className="text-slate-500 text-[10px]">#{hoveredLandmark.index}</span>
            </div>
            <div className="font-mono text-slate-300 text-[11px]">
              X: {hoveredLandmark.pos.x} | Y: {hoveredLandmark.pos.y} | Z: {hoveredLandmark.pos.z}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary-400" />
            <span>Hover over any joint to inspect 3D coordinates</span>
          </div>
        )}
      </div>

      {/* Floating Instructions Overlay */}
      <div className="absolute top-20 right-4 pointer-events-none hidden md:block">
        <div className="bg-slate-900/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <Compass className="w-3.5 h-3.5 text-primary-400" />
            <span>Left Click + Drag to rotate 360°</span>
          </div>
          <div>Right Click to Pan • Scroll to Zoom</div>
        </div>
      </div>

      {/* Empty State Banner if no landmarks loaded */}
      {frames.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
          <div className="max-w-md p-6 text-center bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">No Animation Loaded</h4>
            <p className="text-sm text-slate-400">
              Upload a video, record using your camera, or click below to load the bundled 66-frame sample animation and watch the 3D stick figure come alive!
            </p>
            {onLoadSample && (
              <button
                onClick={onLoadSample}
                className="btn btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl shadow-lg shadow-primary-600/30 inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Load Sample Animation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-lg border border-slate-800/90 p-4 rounded-2xl shadow-2xl space-y-3">
        {/* Timeline Scrubber Slider */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400 min-w-[50px]">
            {frames.length > 0 ? `${currentFrameIndex + 1}` : '0'}{' '}
            <span className="text-slate-600">/ {frames.length}</span>
          </span>

          <input
            type="range"
            min="0"
            max={Math.max(0, frames.length - 1)}
            value={currentFrameIndex}
            onChange={(e) => {
              setCurrentFrameIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            disabled={frames.length === 0}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary-500 disabled:opacity-40"
          />

          <span className="text-xs font-mono text-slate-400 min-w-[50px] text-right">
            {frames.length > 0
              ? `${(currentFrameIndex * 0.04).toFixed(2)}s`
              : '0.00s'}
          </span>
        </div>

        {/* Buttons & Sliders */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setCurrentFrameIndex(0);
              }}
              disabled={frames.length === 0}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Rewind to Frame 0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
                setIsPlaying(false);
              }}
              disabled={frames.length === 0}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Step Back 1 Frame"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={frames.length === 0}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-primary-600/30 disabled:opacity-30 transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span className="text-xs">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span className="text-xs">Play</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                setCurrentFrameIndex((prev) => Math.min(frames.length - 1, prev + 1));
                setIsPlaying(false);
              }}
              disabled={frames.length === 0}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
              title="Step Forward 1 Frame"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                isLooping
                  ? 'bg-primary-950 text-primary-400 border border-primary-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Loop Playback"
            >
              Loop: {isLooping ? 'On' : 'Off'}
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400">Speed:</span>
            {[0.5, 1.0, 1.5, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackSpeed(s)}
                className={`px-2 py-1 text-xs rounded-lg font-mono font-medium transition-colors ${
                  playbackSpeed === s
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Style & View Toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBoneStyle(boneStyle === 'cylinders' ? 'lines' : 'cylinders')}
              className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Toggle between 3D solid cylinders or wireframe lines"
            >
              Bones: {boneStyle === 'cylinders' ? '3D Sticks' : 'Laser Lines'}
            </button>

            <button
              onClick={() => setShowJoints(!showJoints)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                showJoints ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-slate-500'
              }`}
              title="Toggle Joint Spheres"
            >
              Joints
            </button>

            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                showGrid ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-slate-500'
              }`}
              title="Toggle Floor Grid"
            >
              Grid
            </button>

            {/* Depth Scale multiplier */}
            <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800 text-xs text-slate-400">
              <span title="Adjust 3D Z depth exaggeration">Z-Depth:</span>
              <select
                value={depthScale}
                onChange={(e) => setDepthScale(Number(e.target.value))}
                className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-none"
              >
                <option value="1">1x (Unity Raw)</option>
                <option value="3">3x</option>
                <option value="5">5x (Natural)</option>
                <option value="10">10x (Deep 3D)</option>
                <option value="20">20x</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickFigure3DPlayer;
