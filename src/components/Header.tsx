import { useState } from 'react';
import { Menu, Users, Info, Download, X } from 'lucide-react';

const Header = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleUnityDownload = () => {
    window.open('https://drive.google.com/file/d/1h5FwmMtROuIUfbtZ2RBeHybw1bhG9USZ/view?usp=sharing', '_blank');
    setShowInstructions(true);
  };

  return (
    <header className="bg-gray-900 text-white py-4 px-6 fixed w-full top-0 z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Menu className="h-6 w-6" />
          <span className="text-xl font-bold">VidVision3D</span>
        </div>
        <div className="flex items-center space-x-5">
          <a
            href="#player"
            className="flex items-center space-x-1.5 text-cyan-400 hover:text-cyan-300 font-medium transition-colors text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>3D Player</span>
          </a>
          <a
            href="#create"
            className="hover:text-blue-400 transition-colors text-sm"
          >
            <span>Upload / Record</span>
          </a>
          <a href="#about" className="flex items-center space-x-1 hover:text-blue-400 transition-colors text-sm">
            <Info className="h-4 w-4" />
            <span>About</span>
          </a>
          <a href="#team" className="flex items-center space-x-1 hover:text-blue-400 transition-colors text-sm">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </a>
          <button
            onClick={handleUnityDownload}
            className="flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors text-xs"
            title="Download optional raw Unity project if needed"
          >
            <Download className="h-4 w-4" />
            <span>Unity Project (Optional)</span>
          </button>
        </div>
      </nav>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full relative">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-xl font-bold mb-4">How to Run Desktop Version</h3>
            
            <ol className="list-decimal list-inside space-y-3 text-gray-300">
              <li>Extract the downloaded ZIP file to your preferred location</li>
              <li>Open Unity Hub on your computer</li>
              <li>Click "Add" and select the extracted project folder</li>
              <li>Open the project in Unity Editor</li>
              <li>In the Project window, navigate to the Scenes folder</li>
              <li>Double-click the main scene to open it</li>
              <li>Click the Play button at the top of the Unity Editor</li>
            </ol>

            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-400">
                <strong>Note:</strong> Make sure you have Unity 2022.3 LTS or later installed on your computer.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
