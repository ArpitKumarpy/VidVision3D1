import { useState } from 'react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import CameraSection from './components/CameraSection';
import LandmarkSection from './components/LandmarkSection';

interface LandmarkData {
  body: string | null;
  leftHand: string | null;
  rightHand: string | null;
}

function App() {
  const [landmarks, setLandmarks] = useState<LandmarkData>({
    body: null,
    leftHand: null,
    rightHand: null
  });

  const handleLandmarksReceived = (newLandmarks: LandmarkData) => {
    setLandmarks(newLandmarks);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 text-gradient">
            Stick Frames
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Transform your videos into stunning stick figure animations with our advanced AI-powered technology
          </p>
        </section>

        {/* Upload and Camera Section */}
        <section className="max-w-7xl mx-auto mb-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 text-center">Upload Video</h2>
              <UploadSection onLandmarksReceived={handleLandmarksReceived} />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 text-center">Record Video</h2>
              <CameraSection onLandmarksReceived={handleLandmarksReceived} />
            </div>
          </div>
        </section>

        {/* Landmarks Section */}
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">Landmark Data</h2>
          <LandmarkSection 
            bodyLandmarks={landmarks.body}
            leftHandLandmarks={landmarks.leftHand}
            rightHandLandmarks={landmarks.rightHand}
          />
        </section>

        {/* About Section */}
        <section id="about" className="max-w-7xl mx-auto px-4 mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">About the Project</h2>
          <div className="bg-gray-800 rounded-lg p-8">
            <p className="text-gray-300 leading-relaxed">
              Stick Frames is an innovative project that uses advanced computer vision and AI algorithms
              to convert regular videos into engaging stick figure animations. Our technology preserves
              the natural movement and fluidity of the original footage while transforming it into a
              unique artistic style.
            </p>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6 text-center">Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Alex Chen",
                role: "AI Engineer",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200"
              },
              {
                name: "Alex Chen",
                role: "AI Engineer",
                image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200"
              },
              {
                name: "Sarah Johnson",
                role: "Full Stack Developer",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200"
              },
              {
                name: "Mike Williams",
                role: "UI/UX Designer",
                image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200"
              }
            ].map((member, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 text-center">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-400">{member.role}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;