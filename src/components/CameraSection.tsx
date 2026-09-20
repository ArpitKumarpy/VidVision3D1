import React, { useRef, useState } from 'react';
import { Video, StopCircle, Upload, Loader2, RefreshCcw, Sparkles, AlertCircle } from 'lucide-react';
import { processVideoToLandmarks, ExtractionProgress } from '../api';

interface CameraSectionProps {
  onLandmarksReceived: (landmarks: {
    body: string | null;
    leftHand: string | null;
    rightHand: string | null;
  }) => void;
}

const CameraSection: React.FC<CameraSectionProps> = ({ onLandmarksReceived }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);

        // Stop all camera tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch {
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const retakeRecording = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setRecordedBlob(null);
    setVideoPreviewUrl(null);
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    startRecording();
  };

  const uploadRecording = async () => {
    if (!recordedBlob) return;

    setUploading(true);
    setError(null);
    setProgress({
      currentFrame: 0,
      totalFrames: 100,
      percent: 5,
      status: 'Extracting 3D skeleton from recording...',
    });

    try {
      const landmarks = await processVideoToLandmarks(recordedBlob, 'recorded-video.webm', (p) => {
        setProgress(p);
      });

      onLandmarksReceived(landmarks);

      // Clean up preview
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setRecordedBlob(null);
      setVideoPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during pose analysis');
    } finally {
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
            <span>Webcam 3D Pose AI (Zero Backend Required)</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>

        <div className="aspect-video bg-slate-950/80 rounded-xl overflow-hidden mb-4 relative border border-slate-800 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            src={videoPreviewUrl || undefined}
            className={`w-full h-full object-cover ${!isRecording && !recordedBlob ? 'hidden' : ''}`}
          />

          {!isRecording && !recordedBlob && (
            <div className="text-center p-6 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-primary-400 shadow-inner">
                <Video className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-white">Record with Camera</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Capture live movements and turn them into a 3D stick figure
              </p>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-semibold animate-pulse shadow-lg">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>Recording Live</span>
            </div>
          )}
        </div>

        {/* Progress Bar during AI processing */}
        {uploading && (
          <div className="mb-4 p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                <span>{progress?.status || 'Analyzing human motion...'}</span>
              </div>
              <span className="font-mono text-primary-400">{progress?.percent || 0}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress?.percent || 10}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex justify-center space-x-3">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-medium flex items-center gap-2 text-sm shadow-lg shadow-primary-600/30 transition-all"
            >
              <Video className="h-4 w-4" />
              <span>Start Camera</span>
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium flex items-center gap-2 text-sm shadow-lg shadow-red-600/30 transition-all"
            >
              <StopCircle className="h-4 w-4" />
              <span>Stop Recording</span>
            </button>
          )}

          {recordedBlob && !uploading && (
            <>
              <button
                onClick={retakeRecording}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl font-medium flex items-center gap-2 text-sm transition-all"
              >
                <RefreshCcw className="h-4 w-4" />
                <span>Retake</span>
              </button>
              <button
                onClick={uploadRecording}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium flex items-center gap-2 text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Upload className="h-4 w-4" />
                <span>Generate 3D Animation</span>
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/40 border border-red-500/60 rounded-xl">
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center text-xs text-slate-500">
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          <span>Camera stream is processed entirely on-device; no video data is sent to external servers</span>
        </div>
      </div>
    </div>
  );
};

export default CameraSection;
