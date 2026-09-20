# VidVision3D — Technical Approaches & Architecture Evolution

This document outlines all technical decisions, bug fixes, and architectural upgrades implemented across this session to modernize **VidVision3D** from a fragmented, multi-environment setup into a 100% web-native, zero-backend 3D animation application.

---

## 1. Initial State & Triage

The project was originally imported from the `ArpitKumarpy/VidVision3D1` repository, which required three separate, disconnected environments to function:
1. **Frontend**: Legacy React client expecting backend routes.
2. **Backend**: Python Flask server (`app.py`) running OpenCV and MediaPipe locally to extract pose landmarks from uploaded videos.
3. **Desktop Player**: External Unity project requiring Unity Hub, the Unity Editor, and a C# script (`AnimationCode.cs`) to render and play the 3D stick figure.

### Immediate Critical Fix: `window.fetch` TypeError
- **Error**: `Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter`.
- **Cause**: An invasive `window.fetch = ...` monkey-patching statement in `src/main.tsx` attempted to overwrite the read-only window fetch property in standard modern browser environments.
- **Resolution**: Removed the monkey patch and introduced a clean, type-safe API module (`src/api.ts`) for all network requests and fallback handlers.

---

## 2. Phase 1: Replacing External Unity with Web-Native 3D WebGL (Three.js)

### The Problem
The original design forced end users to:
1. Download a multi-gigabyte ZIP file from Google Drive.
2. Install Unity Hub and the Unity Editor.
3. Open a Unity scene and press Play to view stick figure motion from `BodyLandmarks.txt`.

### The WebGL Approach
We eliminated the Unity requirement entirely by implementing a native WebGL 3D player inside the React application using **Three.js**:

1. **Reverse-Engineering the C# Animation Script (`AnimationCode.cs`)**:
   - The C# script parsed comma-separated landmark values in triplets $(X, Y, Z)$ for 33 MediaPipe pose keypoints:
     $$\text{localPosition} = \left(\frac{x}{100}, \frac{y}{100}, \frac{z}{100}\right)$$
   - The script animated lines at 25 FPS using `Thread.Sleep(40)` (40ms per frame).
   - We recreated this parsing logic in `src/utils/skeleton.ts`, normalizing and scaling coordinates while maintaining true anatomical proportions.

2. **Building the 3D Player (`src/components/StickFigure3DPlayer.tsx`)**:
   - **Scene & Camera**: Perspective camera with `OrbitControls` allowing 360° rotation, panning, and zoom.
   - **Camera Presets**: Quick-action buttons for **Front**, **Side**, **Top**, and **Perspective Orbit** views.
   - **Anatomical Skeleton**:
     - 33 illuminated 3D joint spheres with distinct limb color coding (Cyan for left, Coral for right, Amber for torso/head).
     - 3D cylindrical limbs dynamically calculated by distance and orientation between connected joints.
     - Alternative wireframe "Laser Lines" mode.
     - Head wireframe sphere and spatial grounded floor grid with shadow base.
   - **Interactive Playback Controls**:
     - Timeline scrubber with elapsed time and frame counters.
     - Play, Pause, Step Forward, Step Backward, Loop toggle.
     - Speed multipliers: `0.5x`, `1.0x` (25 FPS), `1.5x`, and `2.0x`.
     - Z-Depth multipliers (`1x`, `3x`, `5x`, `10x`, `20x`) to enhance 3D volume perception.
     - Raycasting tooltip: Hover over any joint to inspect its name (e.g., *Left Shoulder #11*) and live coordinates.

---

## 3. Phase 2: Eliminating the Python Flask (`app.py`) Dependency

### The Problem
The video processing workflow required `app.py` running on `localhost:5000`. The frontend displayed a blocking error:
> *"Flask server is not running. Please start the server using: `python app.py`"*

Because dedicated Python servers require ongoing hosting costs, maintenance, and complex container orchestration, this blocked serverless or static hosting.

### The Client-Side AI Approach
We transitioned pose detection directly into the client browser using Google's official **MediaPipe Tasks Vision** library (`@mediapipe/tasks-vision`):

1. **In-Browser WebAssembly + WebGL Engine (`src/utils/browserPoseExtractor.ts`)**:
   - Lazily loads the Google MediaPipe `pose_landmarker_lite` model on demand.
   - **Dual-Delegate Resilience**: Defaults to WebGL hardware acceleration (`delegate: 'GPU'`). If the client environment restricts WebGL contexts, it automatically falls back to WebAssembly CPU execution (`delegate: 'CPU'`).
   - Analyzes video frames sequentially at 25 FPS using an offscreen canvas and seek synchronization.
   - Converts the normalized $[0, 1]$ screen coordinates into the centered coordinate system matching the original `BodyLandmarks.txt` format.

2. **Benefits of this Approach**:
   - **Zero Backend Required**: No Python, no Flask, no Docker container, no hosting fees.
   - **100% Static Compatibility**: The app can be hosted for free on GitHub Pages, Vercel, Netlify, or Google AI Studio.
   - **Privacy First**: Video files and camera streams are processed locally on the user's device and never transmitted to an external server.

---

## 4. Phase 3: End-to-End Pipeline & Real-Time Feedback

To connect the browser-side AI extractor to the 3D player, we refined the user flow:

1. **Unified Upload & Record Components (`UploadSection.tsx`, `CameraSection.tsx`)**:
   - Removed all hardcoded server checks and unblocked upload controls.
   - Added live extraction progress reporting (`ExtractionProgress`):
     - Displays current frame vs. total frames (`Frame 18 / 60`).
     - Real-time percentage progress bar.
     - Informational badges: *"In-Browser AI Processing (Zero Backend Required)"*.

2. **Automated Handoff to 3D Player**:
   - When a video is processed, `onLandmarksReceived` updates `landmarks.body` in `App.tsx`.
   - The page smoothly auto-scrolls to the 3D player.
   - `StickFigure3DPlayer` detects the new landmark text, automatically resets the scrubber to Frame 0, switches to the playing state, and updates the header badge to **"Newly Processed Animation"**.

3. **Sample Testing & Direct Landmark Support**:
   - Added a **"Process Sample Video (MP4)"** one-click button in `UploadSection.tsx` utilizing a bundled demo video (`/public/sample-video.mp4`), allowing users to test the full extraction pipeline immediately without uploading their own video.
   - Added direct drag-and-drop support for `.txt` files so users can load pre-existing landmark files directly.

---

## 5. Architectural Summary: Before vs. After

| Feature | Original Implementation | Upgraded Implementation |
| :--- | :--- | :--- |
| **3D Rendering** | External Unity desktop software | Native WebGL Three.js inside the browser |
| **User Setup** | Install Unity Hub + Editor + open scenes | Zero install; works instantly in any web browser |
| **Pose Detection** | Python Flask (`app.py`) + OpenCV + MediaPipe | In-browser MediaPipe (WebAssembly + WebGL) |
| **Server Requirement** | Dedicated Python backend host | Zero server / 100% static client-side |
| **Hosting Cost** | Requires paid VM / Python container hosting | $0 / Free static hosting (Vercel, Netlify, GitHub Pages, AI Studio) |
| **Video Privacy** | Transmitted over network to Flask server | Processed locally on client device; never uploaded |
| **Inspection Tools** | None (static Unity game view) | 360° Orbit, joint tooltips, speed controls, Z-depth scaling |
| **Extensibility** | Closed desktop scene | Modular React + TypeScript components |

---

## 6. Phase 4: Path 2 (2D Puppet Studio) & Path 3 (Universal MoCap .BVH Exporter)

To bridge raw MediaPipe motion points with real-world animation and game development pipelines, two new major studio modes were added:

### Path 2: 2D Puppet & Skeletal Animator (`src/components/Puppet2DPlayer.tsx`)
- **2D Kinematics Solver**: Solves planar orientation angles $\theta = \text{atan2}(\Delta y, \Delta x)$ for 11 body segments (Torso, Head, Upper Arms, Forearms, Hands, Thighs, Shins, Feet).
- **Stylized Puppet Skins**:
  - *Chibi Hero*: Expressive anime/cartoon face with animated eyes, red t-shirt, and sneakers.
  - *Wood Mannequin*: Classic artist drawing doll with wooden ball-joints and crosshair head.
  - *Cyber Mech*: Futuristic cyan energy visor and armor plates.
  - *Paper Cutout*: Handcrafted cardstock puppet aesthetic with brass joint hinge rivets.
- **Animator Workflow Tools**:
  - **Onion Skinning**: Ghosting for preceding frames in translucent tints to visualize movement arcs.
  - **Stage Backdrops**: Animation Studio Grid, Blueprint, Dark Stage, and **Chroma Green Screen** (`#00FF00`) for instant video overlay.
  - **Export 2D Animation JSON**: Exports keyframed bone angles and normalized coordinates for 2D game engines (Godot, Phaser) and 2D skeletal rigs (Spine2D / DragonBones).
  - **Snap PNG**: Captures transparent or backdrop-rendered PNG frames.

### Path 3: Universal MoCap Exporter (`src/utils/bvhExporter.ts`, `src/components/MoCapExportPanel.tsx`)
- **Standards-Compliant Biovision Hierarchy (.BVH) Generator**:
  - Formats standard 3D skeletal hierarchy (`ROOT Hips` through `Head`, `Hands`, and `Feet`).
  - Solves 3D rotational Euler angles (Z, X, Y) from vector differences between connected joints across all frames.
  - Formats `MOTION` channel blocks at 25 FPS (0.040s interval).
- **Universal Software Compatibility**:
  - **Blender**: Direct native import via *File > Import > Motion Capture (.bvh)* creates an active armature ready to retarget onto custom 3D models with *Copy Rotation* or *Rokoko Studio*.
  - **Unity**: Drag into *Assets/* and switch Animation Type to *Humanoid*.
  - **Unreal Engine**: FBX animation sequence pipeline with *IK Retargeter*.
- **Interactive Inspector**: Live syntax-highlighted preview of the BVH stream, file size/duration metrics, and one-click copy & download buttons.

---

## 7. Phase 5: Custom 2D Cutout Puppet Uploads (Method B)

To allow users to animate their own original 2D artwork and characters using MediaPipe video kinematics, we implemented **Method B (Multi-Part Cutout Rig)**:

### Architecture & Sprite Rigging
- **Multi-Part Cutout Rig Modal (`src/components/CustomPuppetModal.tsx`)**:
  - Upload interface for individual body part sprites: **Head**, **Torso**, **Upper Arm**, **Forearm**, **Thigh**, and **Shin** (with optional asymmetric right-side overrides).
  - Drag-and-drop or file picker accepting transparent PNG or SVG assets.
  - Live real-time visual preview of uploaded sprites arranged in a humanoid figure hierarchy.
  - **Starter Character Pack**: One-click "Load 'Pixel Robot' Sample" for instant demonstration.
  - **Artist Template Guide Generator**: One-click SVG template download (`puppet_rig_artist_template.svg`) providing reference dimensions, rotation origins, and horizontal alignment guides for 2D illustrators.
- **Dynamic 60 FPS Canvas Sprite Renderer (`src/components/Puppet2DPlayer.tsx`)**:
  - Image preloader (`loadedImagesRef`) caching `HTMLImageElement` instances as data URLs update, preventing frame stutter.
  - **Affine Transformation Engine (`drawSpriteLimb`)**: For each bone segment, calculates the dynamic angle $\theta = \text{atan2}(\Delta y, \Delta x)$ and distance $L = \sqrt{\Delta x^2 + \Delta y^2}$, translating the canvas origin to the parent joint ($P_1$) and rotating to automatically align and scale the custom cutout sprite to the child joint ($P_2$).
  - Torso sprite anchored between the mid-shoulder and mid-hip landmarks with proportional scaling.
  - Head sprite anchored to the MediaPipe nose landmark with adaptive rotation based on neck orientation.
  - Fallback mechanism ensuring un-uploaded body parts gracefully render using the default skeletal style while uploaded parts render as high-resolution custom sprites.

### Manual Sprite Element Sizing & Rotation Tuning (`RigFittingTuner.tsx`, `puppetFitting.ts`)
- **Interactive Rig Fitting Tuner**:
  - Real-time adjustment of individual body part scale (30% to 250%), rotation offset angle (-180° to +180° with quick ±90° rotation buttons), and 2D pivot point offsets ($\Delta X, \Delta Y$ in pixels).
  - **Dual Access Interfaces**: Accessible both directly within each sprite card in `CustomPuppetModal` and as a live floating inspector directly over the active 2D animation stage.
  - **Bone Overlay Alignment Guide**: Fluorescent cyan skeletal vector overlay with joint anchor pins (`showBoneOverlay`) enabling exact visual alignment between custom artwork features and the underlying kinematics.
  - **Automatic Persistence**: Custom fit profiles are preserved across sessions in `localStorage`.

---

## 8. Phase 6: Broadcast 2D Video & Chroma Key Studio (`Export2DVideoModal.tsx`, `videoExporter.ts`, `puppet2DRenderer.ts`)

To support professional video creators, game animators, and VFX artists, we implemented a dedicated **2D Animation Video Export Studio**:

### Background & Keying Formats
1. **Chroma Green Screen (`#00FF00`)**: Broadcast-standard green screen for Adobe Premiere Pro (*Ultra Key*), DaVinci Resolve (*Delta Keyer*), After Effects (*Keylight*), Final Cut Pro, and CapCut.
2. **Chroma Blue Screen (`#0000FF`)**: Classic blue screen option for characters containing green artwork or clothing.
3. **Chroma Magenta Screen (`#FF00FF`)**: High-contrast matte for characters with both green and blue tones.
4. **Transparent Alpha Channel (WebM VP9)**: Generates true transparent video with an alpha channel that can be dragged directly onto any video editor timeline or OBS overlay with zero keying needed.
5. **Studio Dark (`#0b0f19`) & Clean White (`#FFFFFF`)**: High-contrast solid backgrounds for Luma Keying or direct product/social video presentation.
6. **Blueprint Grid (`#0f2744`)**: Architectural blueprint coordinate grid for motion analysis showcases.

### Codecs, Containers & Precision Framing
- **Native MP4 (H.264 / AVC1)**: Modern Chromium & Safari hardware-accelerated MP4 container output (`video/mp4;codecs=avc1.42E01E,mp4a.40.2` or `video/mp4`).
- **WebM (VP9 with Alpha)**: High-efficiency container supporting transparent backgrounds (`video/webm;codecs=vp9,opus` or `video/webm`).
- **Codec Auto-Detection**: Probes client capabilities at runtime via `MediaRecorder.isTypeSupported` and dynamically marks codecs with "Supported" / "Fallback" badges.
- **Resolution Presets**:
  - **1080p Full HD** (1920 × 1080, 16:9 Landscape) for desktop, TV, and YouTube.
  - **1080p Vertical** (1080 × 1920, 9:16 Portrait) for TikTok, Instagram Reels, and YouTube Shorts.
  - **1080p Square** (1080 × 1080, 1:1) for social feeds.
  - **720p HD** (1280 × 720) for lightweight assets.
  - **Native Stage** (800 × 600) for standard working viewports.
- **Framing & Camera Stabilization Modes**:
  - **Sequentially Grounded (Global Bounding)**: Pre-computes bounding boxes across all frames in the animation clip to calculate static global minimum/maximum extents. Locks the floor line and zoom scale so jumping, walking, and dancing figures remain solidly anchored in physical space without distracting camera jitter.
  - **Dynamic Center Tracking**: Re-computes the bounding center frame-by-frame, keeping fast-moving acrobatic figures centered in frame.
- **Deterministic Offscreen Video Renderer (`exportPuppetVideo`)**:
  - Employs an isolated offscreen canvas (`document.createElement('canvas')`) decoupled from screen DOM rendering.
  - Leverages HTML5 `canvas.captureStream(fps)` with manual deterministic frame dispatching (`track.requestFrame()` when supported) to guarantee zero dropped frames regardless of background tab throttling or client UI load.
  - Encodes at high bitrate (12,000,000 bps / 12 Mbps) for broadcast-quality crisp edges without compression artifacts or chroma fringe bleeding.
  - Multi-cycle loop multiplier (`1x`, `2x`, `3x`, `5x`) enabling short motion clips (e.g., 2-second dance loops) to export as ready-to-use 6-second or 10-second video clips.
- **Integrated Video Reviewer**:
  - Immediately plays back the generated video in-modal with native seek controls.
  - Displays actual output metrics: Resolution (W × H), Duration (seconds), Total Frames, and File Size (MB).
  - Direct download button generating clean semantic filenames (e.g., `puppet_animation_chroma_green_1080p.mp4`).

---

## 9. Comprehensive System Architecture & Data Flow

The diagram below details how data flows from user input through browser-native AI extraction to the three primary output pipelines:

```
[ User Input Channels ]
   │
   ├─► Video File (.mp4, .webm, .mov) via Drag & Drop / File Picker
   ├─► Live Camera Recording (HTML5 MediaRecorder @ 25 FPS)
   ├─► One-Click Sample Video (/sample-video.mp4)
   └─► Pre-computed Landmarks File (.txt comma-separated)
            │
            ▼
[ In-Browser AI Extraction Engine ] (browserPoseExtractor.ts)
   │
   ├─► Google MediaPipe Vision Wasm + pose_landmarker_lite model
   ├─► Hardware Acceleration: WebGL GPU delegate (with CPU Wasm fallback)
   ├─► Deterministic Offscreen Canvas Video Frame Stepping @ 25 FPS
   └─► Coordinate Normalization: [0, 1] normalized -> centered body triplets
            │
            ▼
[ Central React State Container ] (App.tsx)
   │
   ├─► landmarks.body: Vector3D[][] (33 keypoints × N frames)
   ├─► Custom Puppet Part Sprites (PNG/SVG Base64 Data URLs)
   └─► Custom Joint Fitting & Transform Offsets (PuppetFittings)
            │
            ├───► [ Studio 1: 3D WebGL Stick Figure ] (StickFigure3DPlayer.tsx)
            │        • Three.js WebGLRenderer & OrbitControls (360° pan/tilt/zoom)
            │        • 33 color-coded joint spheres (Left cyan, Right coral, Spine amber)
            │        • Dynamic cylindrical 3D limb meshes with orientation quaternions
            │        • Laser line mode, ground plane shadow grid, Z-depth scaling (1x-20x)
            │
            ├───► [ Studio 2: 2D Puppet & Skeletal Rig ] (Puppet2DPlayer.tsx)
            │        • 2D Kinematics angle solver θ = atan2(dy, dx)
            │        • Built-in skins: Chibi Hero, Wood Mannequin, Cyber Mech, Paper Cutout
            │        • Method B Multi-Part Cutout Rigs (Head, Torso, Arms, Legs)
            │        • Interactive Rig Fitting Tuner (scale, rotation, pivot offsets)
            │        • Onion skinning & stage backdrop themes
            │        • Export 2D Animation JSON (Spine2D / Godot / Phaser compatible)
            │        • Snap Transparent / Backdrop PNG frame
            │        │
            │        └─► [ Broadcast 2D Video & Chroma Studio ] (Export2DVideoModal.tsx)
            │               • Offscreen deterministic multi-pass canvas renderer
            │               • Chroma Green, Blue, Magenta, Transparent Alpha (VP9), Dark, White
            │               • MP4 (H.264) & WebM (VP9) at 12 Mbps
            │               • Sequentially grounded camera stabilization
            │               • 1080p Full HD, 9:16 Vertical, 1:1 Square, 720p HD presets
            │
            ├───► [ Studio 3: Universal MoCap .BVH Exporter ] (MoCapExportPanel.tsx)
            │        • Standards-compliant Biovision Hierarchy (.BVH) generator
            │        • Euler rotational angle solver (Z, X, Y) from joint vectors
            │        • 25 FPS MOTION block formatting
            │        • Direct import into Blender (Armature), Unity (Humanoid), Unreal Engine
            │
            └─► [ Raw Landmarks Export ] (LandmarkBox.tsx / LandmarkSection.tsx)
                     • Downloadable BodyLandmarks.txt for custom C#/Python/ML pipelines
```

---

## 10. Performance, Memory Management & Cross-Platform Reliability

To guarantee stable long-session performance without browser tab crashes:

1. **Deterministic Memory Cleanup**:
   - **Blob URL Revocation**: All generated video and image object URLs (`URL.createObjectURL`) are systematically tracked and revoked via `URL.revokeObjectURL` when modal closes or new exports begin.
   - **Canvas Context Disposal**: Offscreen export canvases and WebGL render contexts explicitly clear their buffer references to prevent GPU memory leaks.
   - **MediaStream Track Termination**: All active video recording tracks in `browserPoseExtractor` and `videoExporter` invoke `track.stop()` immediately upon stream termination.
   - **Image Cache Optimization**: Uploaded cutout puppet sprites are loaded once into an HTMLImageElement memory cache (`loadedImagesRef`), avoiding garbage collection churn during 60 FPS playback.

2. **Cross-Browser & Codec Resilience**:
   - **Chrome / Edge / Opera**: Supports native MP4 (H.264) hardware encoding and WebM (VP9 with Alpha).
   - **Firefox**: Automatically falls back to WebM container with full transparency support.
   - **Safari (macOS / iOS)**: Automatically selects MP4 H.264 profile, ensuring compatibility across Apple ecosystems.

---

## 11. Verification, Testing & Status Summary

| Test / Gate | Target | Result | Status |
| :--- | :--- | :--- | :--- |
| **Type Check** | `tsc -b` | 0 errors | Passed |
| **Vite Production Build** | `npm run build` | Full bundle compiled to `dist/` | Passed |
| **ESLint Validation** | `npm run lint` | 0 errors, 0 warnings | Passed |
| **Browser MediaPipe** | WebAssembly + WebGL | Model loads and extracts 33 joints | Verified |
| **Three.js WebGL Player** | 60 FPS rendering | 360° Orbit, joints, limbs, scrub | Verified |
| **2D Puppet Studio** | Custom Cutout Sprites | Scaling, rotation offsets, affine transform | Verified |
| **Video & Chroma Exporter** | MP4 & WebM export | Green/Blue/Magenta/Alpha/1080p render | Verified |
| **MoCap BVH Generation** | Blender/Unity spec | Valid BVH syntax, 25 FPS MOTION blocks | Verified |


