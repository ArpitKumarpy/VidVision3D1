import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';

interface UploadResponse {
  body_landmarks: string;
  right_hand_landmarks: string;
  left_hand_landmarks: string;
}

interface LandmarkData {
  body: string | null;
  leftHand: string | null;
  rightHand: string | null;
}

interface UploadProps {
  onLandmarksReceived: (landmarks: LandmarkData) => void;
}

const UploadSection: React.FC<UploadProps> = ({ onLandmarksReceived }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'running' | 'not-running'>('checking');

  useEffect(() => {
    fetch('/api/download/test.txt')
      .then(() => setServerStatus('running'))
      .catch(() => setServerStatus('not-running'));
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (serverStatus !== 'running') {
      setError('Flask server is not running. Please start the server first.');
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFile(file);
      await uploadFile(file);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (serverStatus !== 'running') {
      setError('Flask server is not running. Please start the server first.');
      return;
    }
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data: UploadResponse = await response.json();
      
      try {
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
      } catch (err) {
        throw new Error('Failed to fetch landmark data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="border-2 border-gray-600 rounded-lg p-8">
        {serverStatus === 'not-running' && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-center">
            <p className="text-red-200">
              Flask server is not running. Please start the server using:
              <code className="block mt-2 p-2 bg-black/30 rounded">python app.py</code>
            </p>
          </div>
        )}
        
        <div
          className={`relative border-2 border-dashed rounded-lg aspect-video flex flex-col items-center justify-center ${
            dragActive ? 'border-primary-500 bg-primary-50/10' : 'border-gray-600'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="video/*"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading || serverStatus !== 'running'}
          />
          
          {uploading ? (
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 text-primary-500 animate-spin mb-4" />
              <h3 className="text-xl font-semibold mb-2">Processing video...</h3>
              <p className="text-gray-400">This may take a few moments</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload your video</h3>
              <p className="text-gray-400 mb-4">
                {serverStatus === 'running' 
                  ? 'Drag and drop your video file here or click to browse'
                  : 'Please start the Flask server first'
                }
              </p>
            </>
          )}
        </div>

        {file && !uploading && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-300">Selected: {file.name}</p>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-center text-sm text-gray-400">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span>Maximum file size: 500MB</span>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
