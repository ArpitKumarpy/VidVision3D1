import { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import CameraSection from './components/CameraSection';
import LandmarkSection from './components/LandmarkSection';
import StickFigure3DPlayer from './components/StickFigure3DPlayer';
import { Puppet2DPlayer } from './components/Puppet2DPlayer';
import { MoCapExportPanel } from './components/MoCapExportPanel';
import { fetchLandmarkText } from './api';
import { Sparkles, Play, Layers, Box, Palette, FileCode } from 'lucide-react';

interface LandmarkData {
  body: string | null;
  leftHand: string | null;
  rightHand: string | null;
}

type StudioMode = '3d_stick' | '2d_puppet' | 'mocap_bvh';

function App() {
  const [landmarks, setLandmarks] = useState<LandmarkData>({
    body: null,
    leftHand: null,
    rightHand: null,
  });
  const [sourceTitle, setSourceTitle] = useState<string>('Preloaded Demo (66 Frames)');
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioMode>('3d_stick');

  const loadSampleAnimation = async () => {
    setIsLoadingSample(true);
    try {
      const [body, leftHand, rightHand] = await Promise.all([
        fetchLandmarkText('/download/BodyLandmarks.txt'),
        fetchLandmarkText('/download/LeftHandLandmarks.txt'),
        fetchLandmarkText('/download/RightHandLandmarks.txt'),
      ]);
      setLandmarks({
        body: body || null,
        leftHand: leftHand || null,
        rightHand: rightHand || null,
      });
      setSourceTitle('Preloaded Demo (66 Frames)');
    } catch {
      // ignore
    } finally {
      setIsLoadingSample(false);
    }
  };

  useEffect(() => {
    loadSampleAnimation();
  }, []);

  const handleLandmarksReceived = (newLandmarks: LandmarkData) => {
    setLandmarks(newLandmarks);
    setSourceTitle('Newly Processed Animation');
    // Scroll smoothly to player if landmarks received
    const playerElem = document.getElementById('player');
    if (playerElem) {
      playerElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col font-sans selection:bg-primary-500 selection:text-white">
      <Header />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-12 md:py-16 text-center px-4 border-b border-slate-800/80 bg-gradient-to-b from-primary-950/20 via-transparent to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Stack Web MoCap &amp; 2D Puppet Animation Studio</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              Motion Capture &amp; Puppet Studio
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Extract 3D human pose kinematics directly in your browser. Play interactively with 360° 3D WebGL, animate 2D character puppets, or export clean MoCap (.BVH) for Blender and Unity.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#create"
                className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl text-sm shadow-lg shadow-primary-600/25 transition-all"
              >
                Upload Video or Record
              </a>
              <a
                href="#player"
                className="px-6 py-3 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 rounded-xl text-sm font-medium transition-all"
              >
                Open Animation Studio
              </a>
            </div>
          </div>
        </section>

        {/* Studio View Section */}
        <section id="player" className="max-w-7xl mx-auto my-12 px-4 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">Studio Animation Player</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Switch between 3D WebGL Stick Figure, 2D Puppet Animator, and Universal .BVH Exporter.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Studio Mode Selector Switch */}
              <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 flex items-center shadow-lg">
                <button
                  onClick={() => setStudioMode('3d_stick')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    studioMode === '3d_stick'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Stick Figure</span>
                </button>

                <button
                  onClick={() => setStudioMode('2d_puppet')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    studioMode === '2d_puppet'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>2D Puppet Studio</span>
                </button>

                <button
                  onClick={() => setStudioMode('mocap_bvh')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    studioMode === 'mocap_bvh'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>MoCap Exporter (.BVH)</span>
                </button>
              </div>

              <button
                onClick={loadSampleAnimation}
                disabled={isLoadingSample}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Reload the bundled 66-frame sample motion"
              >
                {isLoadingSample ? (
                  <span>Loading demo...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-primary-400 fill-primary-400" />
                    <span>Sample Motion</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Render Active Studio Mode */}
          {studioMode === '3d_stick' && (
            <StickFigure3DPlayer
              bodyLandmarksText={landmarks.body}
              leftHandLandmarksText={landmarks.leftHand}
              rightHandLandmarksText={landmarks.rightHand}
              onLoadSample={loadSampleAnimation}
              sourceTitle={sourceTitle}
            />
          )}

          {studioMode === '2d_puppet' && (
            <Puppet2DPlayer
              bodyLandmarksText={landmarks.body}
              onLoadSample={loadSampleAnimation}
              sourceTitle={sourceTitle}
            />
          )}

          {studioMode === 'mocap_bvh' && (
            <MoCapExportPanel
              bodyLandmarksText={landmarks.body}
              sourceTitle={sourceTitle}
            />
          )}
        </section>

        {/* Upload and Camera Section */}
        <section id="create" className="max-w-7xl mx-auto mb-16 px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-white">Capture or Upload Motion</h2>
            <p className="text-sm text-gray-400">
              Upload a video or record with your camera to extract 3D landmarks in real time.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Upload Video</h3>
              <UploadSection onLandmarksReceived={handleLandmarksReceived} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-center text-slate-200">Record Video</h3>
              <CameraSection onLandmarksReceived={handleLandmarksReceived} />
            </div>
          </div>
        </section>

        {/* Landmarks Section */}
        <section id="landmarks" className="max-w-7xl mx-auto px-4 mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-center md:text-left flex items-center gap-2">
              <Layers className="w-6 h-6 text-primary-400" />
              <span>Raw Landmark Coordinates</span>
            </h2>
            <span className="text-xs text-slate-400">
              MediaPipe Body (33 points) &amp; Hands (21 points each)
            </span>
          </div>
          <LandmarkSection
            bodyLandmarks={landmarks.body}
            leftHandLandmarks={landmarks.leftHand}
            rightHandLandmarks={landmarks.rightHand}
          />
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-slate-500 text-xs">
        <p>VidVision3D • In-Browser Motion Capture &amp; 2D Puppet Animation Studio</p>
      </footer>
    </div>
  );
}

export default App;
