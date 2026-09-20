import React, { useState, useMemo } from 'react';
import { Download, FileCode, Check, Copy, HelpCircle, Box } from 'lucide-react';
import { parseBodyLandmarks, ParsedFrame } from '../utils/skeleton';
import { generateBVHContent, downloadBVHFile } from '../utils/bvhExporter';

interface MoCapExportPanelProps {
  bodyLandmarksText?: string | null;
  sourceTitle?: string;
}

export const MoCapExportPanel: React.FC<MoCapExportPanelProps> = ({
  bodyLandmarksText,
  sourceTitle = 'Active Animation',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'blender' | 'unity' | 'unreal'>('blender');

  const frames: ParsedFrame[] = useMemo(() => {
    if (!bodyLandmarksText || bodyLandmarksText.trim() === '') return [];
    return parseBodyLandmarks(bodyLandmarksText);
  }, [bodyLandmarksText]);

  const bvhContent = useMemo(() => {
    if (frames.length === 0) return '';
    return generateBVHContent(frames, 25);
  }, [frames]);

  const durationSec = (frames.length / 25).toFixed(2);
  const fileSizeKB = (new Blob([bvhContent]).size / 1024).toFixed(1);

  const handleDownload = () => {
    if (!bvhContent) return;
    const filename = `mocap_${frames.length}frames.bvh`;
    downloadBVHFile(filename, bvhContent);
  };

  const handleCopy = () => {
    if (!bvhContent) return;
    navigator.clipboard.writeText(bvhContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-sm">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Universal MoCap Exporter (.BVH)
              </h3>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {sourceTitle}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Industry-standard Biovision Hierarchy format for Blender, Unity, and Unreal Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!bvhContent}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Copy BVH text to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy BVH</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={!bvhContent}
            className="px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download .BVH File</span>
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Info & Quick Stats */}
        <div className="lg:col-span-5 space-y-5">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">Total Frames</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{frames.length}</span>
            </div>
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">Duration</span>
              <span className="text-lg font-bold font-mono text-emerald-400">{durationSec}s</span>
            </div>
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-center">
              <span className="text-[11px] text-slate-400 block mb-0.5">File Size</span>
              <span className="text-lg font-bold font-mono text-purple-400">{fileSizeKB} KB</span>
            </div>
          </div>

          {/* Software Import Guides */}
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>How to use in your software</span>
              </h4>
              <div className="flex gap-1">
                {(['blender', 'unity', 'unreal'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
                      activeTab === t
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Guide Content */}
            {activeTab === 'blender' && (
              <div className="text-xs text-slate-300 space-y-2">
                <p className="text-slate-400 leading-relaxed">
                  Blender has native BVH motion capture support built-in:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>In Blender, go to <strong>File &gt; Import &gt; Motion Capture (.bvh)</strong>.</li>
                  <li>Select your downloaded <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">.bvh</code> file.</li>
                  <li>An animated armature with 66 keyframes will appear in your 3D viewport.</li>
                  <li>Use Blender's <em>Bone Constraint &gt; Copy Rotation</em> or <em>Rokoko Studio Live</em> to retarget the motion onto your character model!</li>
                </ol>
              </div>
            )}

            {activeTab === 'unity' && (
              <div className="text-xs text-slate-300 space-y-2">
                <p className="text-slate-400 leading-relaxed">
                  Unity imports BVH files through standard Humanoid Animation:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Drag the <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">.bvh</code> file into your Unity <em>Assets/</em> folder.</li>
                  <li>In the Inspector, select the asset, go to the <strong>Rig</strong> tab, and set Animation Type to <strong>Humanoid</strong>.</li>
                  <li>Click <em>Apply</em>. Drag the generated Animation Clip onto any character Animator controller!</li>
                </ol>
              </div>
            )}

            {activeTab === 'unreal' && (
              <div className="text-xs text-slate-300 space-y-2">
                <p className="text-slate-400 leading-relaxed">
                  Unreal Engine supports BVH importing via FBX or Blender pipeline:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Open the file in Blender or Maya and export as <strong>FBX (Bake Animation)</strong>.</li>
                  <li>Import the FBX into Unreal Content Browser as an <strong>Animation Sequence</strong>.</li>
                  <li>Use UE5's <em>IK Rig</em> or <em>IK Retargeter</em> to retarget onto Manny/Quinn!</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: BVH Code Inspector */}
        <div className="lg:col-span-7 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Generated BVH Hierarchy &amp; Channel Stream</span>
            </span>
            <span className="font-mono text-[11px] text-slate-500">25 FPS • 40ms interval</span>
          </div>

          <div className="relative flex-1 min-h-[260px] max-h-[320px] bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-auto font-mono text-xs text-slate-300 leading-relaxed shadow-inner">
            {bvhContent ? (
              <pre className="text-[11px] text-cyan-200/90 whitespace-pre">
                {bvhContent.slice(0, 2000)}
                {bvhContent.length > 2000 && (
                  <span className="text-slate-500">
                    {`\n\n... [${frames.length} motion frames total. Download file to view full motion data]`}
                  </span>
                )}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                No motion data loaded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
