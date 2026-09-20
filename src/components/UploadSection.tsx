import React, { useState } from 'react';
import { Upload, AlertCircle, Loader2, Sparkles, CheckCircle, FileText } from 'lucide-react';
import { processVideoToLandmarks, LandmarkData, ExtractionProgress } from '../api';

interface UploadProps {
  onLandmarksReceived: (landmarks: LandmarkData) => void;
}

const UploadSection: React.FC<UploadProps> = ({ onLandmarksReceived }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      await processFile(droppedFile);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      await processFile(selectedFile);
    }
  };

  const processFile = async (selectedFile: File) => {
    setUploading(true);
    setError(null);
    setProgress({
      currentFrame: 0,
      totalFrames: 100,
      percent: 5,
      status: 'Preparing video for AI processing...',
    });

    try {
      const landmarks = await processVideoToLandmarks(selectedFile, selectedFile.name, (p) => {
        setProgress(p);
      });

      onLandmarksReceived(landmarks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during video processing');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const handleLoadSampleVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setUploading(true);
      setError(null);
      setProgress({
        currentFrame: 0,
        totalFrames: 100,
        percent: 5,
        status: 'Fetching sample video...',
      });
      const res = await fetch('/sample-video.mp4');
      if (!res.ok) throw new Error('Sample video file not reachable');
      const blob = await res.blob();
      const sampleFile = new File([blob], 'sample-video.mp4', { type: 'video/mp4' });
      setFile(sampleFile);
      await processFile(sampleFile);
    } catch (err) {
      setError('Failed to load sample video: ' + (err instanceof Error ? err.message : String(err)));
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="border border-slate-700 bg-slate-900/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        {/* In-browser AI badge */}
        <div className="mb-4 flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>In-Browser AI Processing (Zero Backend Required)</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>

        <div
          className={`relative border-2 border-dashed rounded-xl aspect-video flex flex-col items-center justify-center transition-all ${
            dragActive ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-950/40'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="video/*,.txt"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />

          {uploading ? (
            <div className="text-center p-6 w-full max-w-md space-y-4">
              <Loader2 className="mx-auto h-10 w-10 text-primary-400 animate-spin" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Extracting 3D Landmarks...
                </h3>
                <p className="text-xs text-slate-400">
                  {progress?.status || 'Analyzing human motion in browser...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary-500 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress?.percent || 10}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Frame {progress?.currentFrame || 0} / {progress?.totalFrames || 0}</span>
                <span>{progress?.percent || 0}%</span>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-primary-400 shadow-inner">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                Upload your video or landmark file
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Drag and drop MP4, WebM, MOV, or BodyLandmarks.txt here, or click to browse
              </p>
              <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-cyan-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Runs 100% locally on your device</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick sample test */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">Don't have a video file ready?</span>
          <button
            type="button"
            onClick={handleLoadSampleVideo}
            disabled={uploading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Process Sample Video (MP4)</span>
          </button>
        </div>

        {file && !uploading && (
          <div className="mt-4 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <FileText className="w-4 h-4 text-primary-400" />
              <span>Loaded: <strong className="text-white">{file.name}</strong></span>
            </div>
            <span className="text-[11px] text-slate-500">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-500/60 rounded-xl">
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center text-xs text-slate-500">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          <span>Processes directly in your browser with hardware WebAssembly & WebGL acceleration</span>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
