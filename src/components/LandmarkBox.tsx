import React from 'react';
import { Download } from 'lucide-react';

interface LandmarkBoxProps {
  title: string;
  data: string | undefined;  // Changed from string | null to string | undefined
}

const LandmarkBox: React.FC<LandmarkBoxProps> = ({ title, data }) => {
  const handleDownload = () => {
    if (!data) return;
    
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(' ', '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border-2 border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={handleDownload}
          disabled={!data}
          className={`p-2 rounded-full transition-colors ${
            data 
              ? 'bg-gray-700 hover:bg-gray-600 text-primary-400' 
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
      <div className="h-32 overflow-auto bg-gray-900 rounded p-3">
        <pre className="text-sm text-gray-400 font-mono">
          {data || 'No data available'}
        </pre>
      </div>
    </div>
  );
};

export default LandmarkBox;