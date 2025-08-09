import React, { useRef, useState } from 'react';
import { Video, StopCircle, Upload, Loader2, RefreshCcw } from 'lucide-react';

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
        
        // Create preview URL for the recorded video
        const previewUrl = URL.createObjectURL(blob);
        setVideoPreviewUrl(previewUrl);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = previewUrl;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
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

    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, 'recorded-video.webm');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const [bodyData, leftHandData, rightHandData] = await Promise.all([
        fetch(`/api${data.body_landmarks}`).then(res => res.text()),
        fetch(`/api${data.left_hand_landmarks}`).then(res => res.text()),
        fetch(`/api${data.right_hand_landmarks}`).then(res => res.text())
      ]);

      onLandmarksReceived({
        body: bodyData,
        leftHand: leftHandData,
        rightHand: rightHandData
      });

      // Clean up
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
      setRecordedBlob(null);
      setVideoPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="border-2 border-gray-600 rounded-lg p-8">
        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            controls={!!recordedBlob}
          />
        </div>

        <div className="flex justify-center gap-4 mb-4">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Video className="h-5 w-5" />
              Start Recording
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <StopCircle className="h-5 w-5" />
              Stop Recording
            </button>
          )}

          {recordedBlob && !uploading && (
            <div className="flex gap-4">
              <button
                onClick={retakeRecording}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <RefreshCcw className="h-5 w-5" />
                Retake
              </button>
              <button
                onClick={uploadRecording}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              >
                <Upload className="h-5 w-5" />
                Process Recording
              </button>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 px-4 py-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraSection;
