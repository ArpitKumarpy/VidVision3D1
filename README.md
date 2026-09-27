# VidVision 3D

VidVision 3D is a browser-native motion capture, 3D kinematic visualization, and 2D animation synthesis platform. It transforms standard monocular RGB video footage or live webcam feeds into interactive 3D skeletal animations, 2D puppet rigs, broadcast-ready chroma videos, and standards-compliant motion capture datasets without requiring dedicated backend infrastructure or external desktop applications.

---

## 1. Project Genesis & Architectural Evolution

### The Original Python & Unity Scope

In its initial inception, VidVision 3D was conceived and prototyped as a multi-stage, fragmented desktop pipeline distributed across three disparate execution environments:

```
[ User Video ]
      │
      ▼
[ Python Flask Backend (app.py) ]
  • OpenCV video decoding
  • Python MediaPipe pose estimation
  • Text serialization -> BodyLandmarks.txt
      │
      ▼
[ Manual File Transfer ]
  • Download BodyLandmarks.txt from web UI
  • Launch Unity Hub & Unity Editor
  • Paste file into Unity Assets/ folder
      │
      ▼
[ Desktop Unity Application ]
  • Custom C# script (AnimationCode.cs)
  • Thread.Sleep(40) frame stepping at 25 FPS
  • Transform coordinate mapping (x/100, y/100, z/100)
```

#### Bottlenecks of the Original Implementation

1. **Heavy Infrastructure Requirements**: The Python Flask backend (`app.py`) relied on heavy C-extensions (`opencv-python`, native `mediapipe` wheel binaries). Deploying and scaling this architecture required containerized GPU/CPU instances, ongoing cloud hosting expenses, and active server management.
2. **Friction in User Experience**: Users were forced to download a multi-gigabyte Unity project archive, install Unity Hub and the Unity Editor, import generated text files into the project's `Assets` folder, and manually start a play session to preview basic stick-figure motions.
3. **Data Privacy Concerns**: Monocular video recordings and camera streams had to be transferred over the network to the Flask server for processing, introducing network latency and exposing user video data to remote server disks.
4. **Fragile Communication Loop**: The system lacked bidirectional synchronization. If a frame dropped or coordinate formats mismatched between Python and C#, the entire desktop visualization broke with little diagnostic feedback.

---

### Modernization: Transition to a 100% Client-Side Web Platform

To eliminate operational friction and deliver immediate accessibility across all modern operating systems and mobile devices, the entire architecture was re-engineered into a zero-backend, browser-native studio application.

```
[ Monocular Video / Camera Stream ]
               │
               ▼
[ In-Browser WebAssembly + WebGL Engine ]
  • Google MediaPipe Vision Tasks (@mediapipe/tasks-vision)
  • Hardware-accelerated GPU delegate with CPU Wasm fallback
  • Deterministic frame-stepping via OffscreenCanvas
               │
               ▼
[ Central Normalized Skeletal Pipeline (React / TypeScript) ]
               │
       ┌───────┼─────────────────────────┬────────────────────────┐
       ▼       ▼                         ▼                        ▼
[ 3D WebGL ] [ 2D Puppet Studio ] [ Video & Chroma Studio ] [ Universal MoCap ]
  Three.js     Kinematics Solver    MP4 / WebM / Keying       .BVH for Blender,
  360 Orbit    Custom Cutout Rigs   Camera Stabilization      Unity & Unreal
```

#### Technical Transformations Made

- **Porting Landmark Extraction from Python to WebAssembly**: Replaced Python OpenCV and MediaPipe with `@mediapipe/tasks-vision` executing client-side via WebAssembly and WebGL delegates. Pose inference executes entirely on the user's GPU/CPU inside an isolated browser worker context.
- **Replacing Desktop Unity with Native Three.js**: Reverse-engineered the original Unity C# `AnimationCode.cs` kinematic logic into pure TypeScript (`src/utils/skeleton.ts`). Built a full-featured WebGL 3D player (`StickFigure3DPlayer.tsx`) complete with 360-degree orbit controls, real-time bone-mesh extrusion, camera presets, raycast joint inspection, and timeline scrubbing.
- **Introducing a 2D Kinematics & Cutout Puppet Studio**: Added planar trigonometric angle solving ($\theta = \text{atan2}(\Delta y, \Delta x)$) across 11 primary anatomical segments, supporting procedural skins (Chibi Hero, Wood Mannequin, Cyber Mech, Paper Cutout) as well as custom user-uploaded multi-part sprite cutout rigs with interactive pivot and rotation calibration.
- **Integrating Broadcast Video & Chroma Export**: Built an offscreen rendering engine providing native MP4 (H.264) and transparent WebM (VP9) recording with Green, Blue, Magenta, and Alpha backdrops, grounded camera stabilization, and frame-rate synchronization.
- **Standardizing Industry MoCap Interchange (.BVH)**: Implemented an Euler angle decomposition pipeline that computes 3D rotational matrices from anatomical joint vectors, generating standard Biovision Hierarchy (`.bvh`) files directly importable into Blender, Autodesk Maya, Unity, and Unreal Engine.

---

### Architectural Comparison Matrix

| Architectural Vector | Original Python + Unity Scope | Modernized Web-Native Studio |
| :--- | :--- | :--- |
| **Inference Runtime** | Server-side Python (`app.py`), OpenCV, Flask | Client-side WebAssembly + WebGL (`@mediapipe/tasks-vision`) |
| **Backend Dependency** | Python 3.9+, Flask, Flask-CORS, virtualenv | Zero backend; 100% static client hosting |
| **3D Visualization** | External Unity Desktop Editor via C# script | WebGL via Three.js integrated into the UI |
| **End-User Setup** | Unity Hub, Unity Editor, multi-GB project zip | Zero installation; opens instantly in any modern web browser |
| **Data Privacy** | Video streams uploaded over network to server | Local-only execution; video never leaves the device |
| **Hosting Footprint** | Stateful Linux container with Python runtime | Fully static distribution (Vercel, GitHub Pages, Netlify, Cloud Run) |
| **2D Animation Pipeline** | None | 2D kinematic puppet engine with custom sprite rigging |
| **Video Production Export** | None (screen recording of Unity window) | Dedicated MP4/WebM encoder with Chroma Key matting |
| **DCC Interoperability** | Raw proprietary text coordinates | Standards-compliant `.BVH` MoCap file export |

---

## 2. Core Modules & Studio Systems

### 1. In-Browser Computer Vision Pipeline
- **Model**: Google MediaPipe Pose Landmarker Lite running via WebAssembly.
- **Hardware Acceleration**: Automatic WebGL GPU delegate probing with transparent fallback to multi-threaded CPU WebAssembly execution.
- **Frame Synchronization**: Offscreen video element stepping synchronized to 25 FPS, providing frame-by-frame inference parity with original training specifications.
- **Input Channels**:
  - Drag-and-drop local video files (`.mp4`, `.webm`, `.mov`).
  - Real-time webcam capture with immediate in-browser recording.
  - Bundled sample video dataset (`/sample-video.mp4`) for zero-configuration testing.
  - Direct import of pre-calculated landmark text datasets.

### 2. 3D WebGL Stick Figure Studio
- **Graphics Pipeline**: Three.js WebGLRenderer with directional shadows and ambient lighting.
- **Joint Visualization**: 33 illuminated anatomical keypoint spheres with color-coded lateral assignment (Cyan for Left limbs, Coral for Right limbs, Amber for Torso/Cranial midline).
- **Limb Geometry**: Dynamically computed 3D cylindrical limb meshes calculated from vector orientation quaternions between connected joints.
- **Camera Presets**: Instant orthographic alignment for Front, Side, Top, and Perspective Orbit viewports.
- **Playback Controls**: Scrubbing timeline, single-frame stepping, loop toggling, speed multipliers (`0.5x`, `1.0x`, `1.5x`, `2.0x`), and Z-depth spatial expansion (`1x` to `20x`).

### 3. 2D Cutout & Puppet Animator
- **Kinematic Solver**: Calculates planar rotation angles for head, torso, upper arms, forearms, hands, thighs, shins, and feet.
- **Procedural Archetypes**:
  - *Chibi Hero*: Stylized cartoon figure with facial features and dynamic limbs.
  - *Wood Mannequin*: Classic ball-and-socket artist drawing doll.
  - *Cyber Mech*: Futuristic angular silhouette with high-contrast energy elements.
  - *Paper Cutout*: Handcrafted stationery aesthetic with brass joint rivets.
- **Multi-Part Custom Cutout Rigging (Method B)**:
  - Users can upload transparent PNG or SVG sprites for discrete body segments (Head, Torso, Upper Arm, Forearm, Thigh, Shin).
  - Bundled "Pixel Robot" sample rig for immediate testing.
  - Downloadable artist template guide (`puppet_rig_artist_template.svg`) detailing rotation origins, scale guidelines, and aspect ratios.
- **Interactive Rig Fitting Tuner**:
  - Real-time modification of sprite scale (30% to 250%), rotational angle offset (-180 degrees to +180 degrees), and dual-axis pivot displacement ($\Delta X, \Delta Y$).
  - Fluorescent skeletal bone overlay guide for alignment against custom artwork.
  - Automatic browser storage persistence (`localStorage`) for custom rig profiles.

### 4. Broadcast Video & Chroma Key Studio
- **Chroma Key Backdrops**:
  - *Chroma Green (`#00FF00`)*: Standard green screen for Adobe Premiere Pro Ultra Key, DaVinci Resolve Delta Keyer, and After Effects Keylight.
  - *Chroma Blue (`#0000FF`)*: Matte option for characters with green art assets.
  - *Chroma Magenta (`#FF00FF`)*: High-contrast matte for characters with blue and green palettes.
  - *Transparent Alpha Channel*: Encoded via WebM VP9 for direct compositing without keying artifacts.
  - *Studio Dark (`#0B0F19`)* and *Clean White (`#FFFFFF`)*: Solid backgrounds for Luma keying or standalone publication.
- **Encoding Formats**: Native hardware-accelerated MP4 (H.264 / AVC1) and WebM (VP9).
- **Framing & Stabilization**:
  - *Sequentially Grounded (Global Bounding)*: Analyzes all animation frames to establish a static spatial floor and zoom scale, eliminating camera jitter during jumping or running sequences.
  - *Dynamic Center Tracking*: Tracks the centroid of motion per frame for acrobatic sequences.
- **Resolution Profiles**: 1080p Full HD (16:9), 1080p Vertical (9:16 for Reels/Shorts), 1080p Square (1:1), 720p HD, and Native Stage (800x600).
- **Deterministic Offscreen Dispatch**: Isolated offscreen canvas buffer rendering at 12 Mbps with zero dropped frames.

### 5. Universal MoCap .BVH Generator
- **Format Specification**: Standardized Biovision Hierarchy (`.bvh`) ASCII formatting containing joint hierarchy definitions, initial bone offsets, and per-frame rotational channels (`Zrotation Xrotation Yrotation`).
- **Kinematic Conversion**: Solves Euler rotational angles from 3D unit direction vectors across 25 FPS motion frames.
- **Native Host Interoperability**:
  - *Blender*: Direct import via File > Import > Motion Capture (.bvh) creating an active skeletal armature ready for character retargeting.
  - *Unity*: Asset import with humanoid animation retargeting.
  - *Unreal Engine*: Skeleton mapping via IK Rig and IK Retargeter.
- **In-App Inspector**: Live syntax-highlighted BVH stream view, header verification, frame metrics, and one-click file download.

---

## 3. System Architecture & Data Flow

```
                      +-----------------------------+
                      |   Source Video / Webcam     |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |  @mediapipe/tasks-vision    |
                      |   (WebAssembly + WebGL)     |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |  33 Normalized Coordinates  |
                      |    [X, Y, Z] per Frame      |
                      +-----------------------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
     +-----------------+    +-----------------+    +-----------------+
     | 3D WebGL Studio |    | 2D Kinematics   |    | MoCap Exporter  |
     |   (Three.js)    |    |  Puppet Engine  |    | (.BVH Solver)   |
     +-----------------+    +-----------------+    +-----------------+
              |                      |                      |
              v                      v                      v
     +-----------------+    +-----------------+    +-----------------+
     | Interactive 360 |    | Broadcast Video |    | Blender / Unity |
     |  Orbit Viewport |    |  MP4 / Chroma   |    |  Armature Data  |
     +-----------------+    +-----------------+    +-----------------+
```

---

## 4. Repository Structure

```
.
|-- public/
|   |-- sample-video.mp4           # Bundled monocular test footage
|   |-- puppet_rig_template.svg    # 2D character rigging visual guide
|-- src/
|   |-- components/
|   |   |-- CameraSection.tsx      # In-browser webcam recorder
|   |   |-- CustomPuppetModal.tsx  # Multi-part sprite rigging modal
|   |   |-- Export2DVideoModal.tsx # MP4 and Chroma video export interface
|   |   |-- Header.tsx             # Studio navigation and status bar
|   |   |-- LandmarkBox.tsx        # Raw landmark telemetry viewer
|   |   |-- LandmarkSection.tsx    # Landmark file management interface
|   |   |-- MoCapExportPanel.tsx   # Universal .BVH generator and inspector
|   |   |-- Puppet2DPlayer.tsx     # 2D skeletal canvas animation stage
|   |   |-- RigFittingTuner.tsx    # Sprite transform calibration panel
|   |   |-- StickFigure3DPlayer.tsx# Three.js 3D WebGL motion visualizer
|   |   |-- UploadSection.tsx      # Video drag-and-drop ingestion interface
|   |-- utils/
|   |   |-- browserPoseExtractor.ts# MediaPipe WebAssembly inference worker
|   |   |-- bvhExporter.ts         # Biovision Hierarchy mathematical solver
|   |   |-- puppet2DRenderer.ts    # 2D canvas drawing and transformation math
|   |   |-- puppetFitting.ts       # Sprite offset management and persistence
|   |   |-- skeleton.ts            # 3D bone connections and coordinate parser
|   |   |-- videoExporter.ts       # Deterministic offscreen video encoding
|   |-- App.tsx                    # Central application state container
|   |-- main.tsx                   # React root entry point
|   |-- index.css                  # Global styles and Tailwind directives
|-- APPROACHES.md                  # Comprehensive architectural decision record
|-- package.json                   # Dependency definitions and build scripts
|-- tsconfig.json                  # TypeScript compiler configuration
|-- vite.config.ts                 # Vite bundler and dev server configuration
|-- README.md                      # Project documentation
```

---

## 5. Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher.
- **Package Manager**: `npm` (version 9+), `pnpm`, or `bun`.
- **Hardware**: Modern web browser with WebGL2 support (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).

### Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ArpitKumarpy/VidVision3D1.git
   cd VidVision3D1
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

### Production Build & Verification

To compile the application for production deployment:

```bash
# Type check and build distribution bundle
npm run build

# Validate code style and lint rules
npm run lint

# Preview the production build locally
npm run preview
```

---

## 6. Target Workflows & Toolchain Integration

### 1. 3D Character Animation (Blender)
1. In VidVision 3D, switch to the **3D Motion Capture (.BVH)** tab.
2. Click **Download .BVH File**.
3. In Blender, navigate to **File > Import > Motion Capture (.bvh)**.
4. An animated armature will be created at 25 FPS matching the captured performance.
5. Use Blender's *Bone Constraints* (`Copy Rotation`) or retargeting addons (such as Rokoko Studio or Auto-Rig Pro) to drive custom humanoid meshes.

### 2. Game Development (Unity & Unreal Engine)
- **Unity**: Import the `.bvh` file directly into your `Assets/` directory. Select the imported asset in the Inspector, switch the **Animation Type** to **Humanoid**, and click **Apply**. The clip can now drive any standard Mecanim avatar.
- **Unreal Engine**: Convert the `.bvh` file to an `.fbx` animation sequence using Blender or Autodesk FBX Converter, then import it onto an Unreal Engine Mannequin skeletal mesh using the **IK Retargeter**.

### 3. Video Editing & Compositing (Premiere Pro, DaVinci Resolve, CapCut)
1. In the **2D Puppet Studio**, open the **Export MP4 / Chroma** modal.
2. Select **Chroma Green Screen** (or **Transparent Alpha** if using WebM in compatible editors).
3. Choose the desired resolution (such as 1080p Landscape or 9:16 Vertical).
4. Click **Start Video Render** and download the resulting video file.
5. In your video editor:
   - **Adobe Premiere Pro**: Apply the **Ultra Key** effect and sample the green backdrop.
   - **DaVinci Resolve**: In the Color or Fusion page, apply the **Delta Keyer** tool.
   - **CapCut / Final Cut Pro**: Select the clip, enable **Chroma Key**, and select the green background.

### 4. 2D Game Engines (Godot & Phaser)
1. In the **2D Puppet Studio**, click **Export 2D Animation JSON**.
2. The exported JSON file contains structured bone rotation angles, segment lengths, and root positions per frame.
3. Import the JSON dataset into custom bone controllers or skeletal animation plugins in Godot, Phaser, or Spine2D.

---

## 7. Performance & Privacy Guarantees

- **Zero Cloud Data Transmission**: All computer vision operations occur strictly inside the client browser. No video frames, camera inputs, or motion parameters are sent over external networks.
- **Deterministic Memory Allocation**: Offscreen canvas instances and media recorder data buffers are explicitly cleared and object URLs revoked via `URL.revokeObjectURL` upon export completion to prevent browser memory leaks during extended sessions.
- **Cross-Platform Compatibility**: Tested across Windows, macOS, Linux, ChromeOS, and mobile browser runtimes with adaptive hardware acceleration.

---

## 8. License

This project is licensed under the MIT License. Refer to the LICENSE file for full terms and conditions.
