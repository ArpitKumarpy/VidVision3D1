import { useState } from 'react';
import { Menu, Users, Info, Download, X } from 'lucide-react';

const Header = () => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleUnityDownload = () => {
    window.open('https://drive.google.com/uc?export=download&id=YOUR_NEW_FILE_ID', '_blank');
    setShowInstructions(true);
  };

  return (
    <header className="bg-gray-900 text-white py-4 px-6 fixed w-full top-0 z-50">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Menu className="h-6 w-6" />
          <span className="text-xl font-bold">Stick Frames</span>
        </div>
        <div className="flex items-center space-x-6">
          <button
            onClick={handleUnityDownload}
            className="flex items-center space-x-1 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <Download className="h-5 w-5" />
            <span>DOWNLOAD UNITY FILE</span>
          </button>
          <a href="#about" className="flex items-center space-x-1 hover:text-blue-400 transition-colors">
            <Info className="h-5 w-5" />
            <span>About</span>
          </a>
          <a href="#team" className="flex items-center space-x-1 hover:text-blue-400 transition-colors">
            <Users className="h-5 w-5" />
            <span>Team</span>
          </a>
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