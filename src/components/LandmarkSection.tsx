import React from 'react';
import LandmarkBox from './LandmarkBox';

interface LandmarkSectionProps {
  bodyLandmarks: string | null;
  leftHandLandmarks: string | null;
  rightHandLandmarks: string | null;
}

const LandmarkSection: React.FC<LandmarkSectionProps> = ({
  bodyLandmarks,
  leftHandLandmarks,
  rightHandLandmarks
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <LandmarkBox 
        title="Body Landmarks"
        data={bodyLandmarks || undefined}
      />
      <LandmarkBox 
        title="Left Hand Landmarks"
        data={leftHandLandmarks || undefined}
      />
      <LandmarkBox 
        title="Right Hand Landmarks"
        data={rightHandLandmarks || undefined}
      />
    </div>
  );
};

export default LandmarkSection;