#   VidVision-3D

*STRUCTURE:

stick-frames/
├── venv/                   
├── public/                
├── src/                    
│   ├── components/         
│   │   ├── CameraSection.tsx
│   │   ├── Header.tsx
│   │   ├── LandmarkBox.tsx
│   │   ├── LandmarkSection.tsx
│   │   └── UploadSection.tsx
│   ├── App.tsx           
│   ├── main.tsx          
│   ├── index.css         
│   └── vite-env.d.ts     
├── app.py            
├── package.json         
├── tsconfig.json       
├── tsconfig.app.json   
├── tsconfig.node.json  
├── vite.config.ts     
├── postcss.config.js 
├── tailwind.config.js 
└── eslint.config.js   

run: https://vid-vision3-d1.vercel.app/
and run the app.py in localhost 5000

# OR

Step-by-Step Setup and Explanation:

Create Project Structure


mkdir stick-frames
cd stick-frames
Backend Setup (Python)


# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install flask flask-cors mediapipe opencv-python
The backend (app.py) handles:

Video file uploads
Video processing with MediaPipe
Landmark extraction (body, left hand, right hand)
File serving
Frontend Setup (React + TypeScript)


# Install dependencies
npm install
Key components:

CameraSection: Handles video recording
UploadSection: Manages file uploads
LandmarkSection: Displays extracted landmarks
LandmarkBox: Reusable component for landmark display
Header: Navigation and UI controls
Configuration Files

vite.config.ts: Vite bundler settings
tailwind.config.js: UI styling framework
tsconfig*.json: TypeScript compilation settings
postcss.config.js: CSS processing
eslint.config.js: Code linting
Start Development Servers


# Terminal 1: Start Python backend
python app.py

# Terminal 2: Start frontend dev server
npm run dev
Component Flow:

User can either:

Upload video file via UploadSection
Record video using CameraSection
Video is sent to Flask backend for processing:

MediaPipe extracts pose landmarks
Landmarks are saved as text files
Frontend receives landmark data:

LandmarkSection displays the data
LandmarkBox components show individual landmark sets
User can download landmark data as text files
Development Workflow:

Make changes to frontend code (React components)
Vite hot reloads changes automatically
Backend changes require Flask server restart
Use browser dev tools for debugging
Check terminal for error messages
Testing:

Upload a video file or record using camera
Check network tab for API calls
Verify landmark data display
Test download functionality
Ensure error handling works
The application uses modern web technologies:

React for UI components
TypeScript for type safety
Tailwind CSS for styling
MediaPipe for pose detection
Flask for backend API
WebRTC for camera access
This modular structure allows for easy maintenance and future enhancements.

# STEPS TO INSTALL UNITY PROJECT:
1. Click on the "DOWNLOAD UNITY FILE"
2. Download and install "Unity Hub" prior to it.
3. Open the project in Unity Hub.
4. Download the body landmarks text file generated.
5. Paste it into the "ASSETS" of the Unity Project.
6. Make sure that there should be no duplicale body landmark file.
7. If there is Delete it and then paste your generated file.
8. Make sure the name of landmark text file is body_landmarks.txt and not something like "body_landmarks (1).txt" and so on.
9. if that is the case, rename the text file accordingly.


Tutorial: 
https://www.loom.com/share/4398d9094fce44f9974360884a161361


