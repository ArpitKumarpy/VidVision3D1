import { ParsedFrame } from './skeleton';

interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates rotation angles in degrees (Z, X, Y order) for a vector pointing from p1 to p2
 * relative to default downward vector (0, -1, 0)
 */
function calculateBoneRotations(
  p1: Vector3D,
  p2: Vector3D
): { rotZ: number; rotX: number; rotY: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;

  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const nz = dz / len;

  // Compute angle around Z axis (roll/lateral bend in frontal plane)
  const angleZ = Math.atan2(nx, -ny) * (180 / Math.PI);

  // Compute angle around X axis (pitch/sagittal flexion)
  const angleX = Math.atan2(nz, -ny) * (180 / Math.PI);

  // Compute angle around Y axis (twist)
  const angleY = Math.atan2(nx, nz) * (180 / Math.PI) * 0.2; // subtle yaw estimation

  return {
    rotZ: isNaN(angleZ) ? 0 : Math.max(-180, Math.min(180, angleZ)),
    rotX: isNaN(angleX) ? 0 : Math.max(-180, Math.min(180, angleX)),
    rotY: isNaN(angleY) ? 0 : Math.max(-180, Math.min(180, angleY)),
  };
}

/**
 * Converts 33 MediaPipe 3D Landmark parsed frames into standard Biovision Hierarchy (.bvh) MoCap format.
 * Compatible with Blender (File > Import > Motion Capture .bvh), Unity Humanoid Avatar, and Unreal Engine.
 */
export function generateBVHContent(frames: ParsedFrame[], fps = 25): string {
  if (!frames || frames.length === 0) return '';

  const frameTime = (1 / fps).toFixed(6);

  const header = `HIERARCHY
ROOT Hips
{
	OFFSET 0.00 0.00 0.00
	CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
	JOINT Spine
	{
		OFFSET 0.00 3.80 0.00
		CHANNELS 3 Zrotation Xrotation Yrotation
		JOINT Chest
		{
			OFFSET 0.00 4.20 0.00
			CHANNELS 3 Zrotation Xrotation Yrotation
			JOINT Neck
			{
				OFFSET 0.00 2.50 0.00
				CHANNELS 3 Zrotation Xrotation Yrotation
				JOINT Head
				{
					OFFSET 0.00 2.20 0.00
					CHANNELS 3 Zrotation Xrotation Yrotation
					End Site
					{
						OFFSET 0.00 2.50 0.00
					}
				}
			}
			JOINT LeftCollar
			{
				OFFSET 2.20 1.50 0.00
				CHANNELS 3 Zrotation Xrotation Yrotation
				JOINT LeftUpArm
				{
					OFFSET 3.50 0.00 0.00
					CHANNELS 3 Zrotation Xrotation Yrotation
					JOINT LeftLowArm
					{
						OFFSET 5.50 0.00 0.00
						CHANNELS 3 Zrotation Xrotation Yrotation
						JOINT LeftHand
						{
							OFFSET 5.00 0.00 0.00
							CHANNELS 3 Zrotation Xrotation Yrotation
							End Site
							{
								OFFSET 2.00 0.00 0.00
							}
						}
					}
				}
			}
			JOINT RightCollar
			{
				OFFSET -2.20 1.50 0.00
				CHANNELS 3 Zrotation Xrotation Yrotation
				JOINT RightUpArm
				{
					OFFSET -3.50 0.00 0.00
					CHANNELS 3 Zrotation Xrotation Yrotation
					JOINT RightLowArm
					{
						OFFSET -5.50 0.00 0.00
						CHANNELS 3 Zrotation Xrotation Yrotation
						JOINT RightHand
						{
							OFFSET -5.00 0.00 0.00
							CHANNELS 3 Zrotation Xrotation Yrotation
							End Site
							{
								OFFSET -2.00 0.00 0.00
							}
						}
					}
				}
			}
		}
	}
	JOINT LeftUpLeg
	{
		OFFSET 1.80 -1.00 0.00
		CHANNELS 3 Zrotation Xrotation Yrotation
		JOINT LeftLowLeg
		{
			OFFSET 0.00 -7.50 0.00
			CHANNELS 3 Zrotation Xrotation Yrotation
			JOINT LeftFoot
			{
				OFFSET 0.00 -7.50 0.00
				CHANNELS 3 Zrotation Xrotation Yrotation
				End Site
				{
					OFFSET 0.00 0.00 2.00
				}
			}
		}
	}
	JOINT RightUpLeg
	{
		OFFSET -1.80 -1.00 0.00
		CHANNELS 3 Zrotation Xrotation Yrotation
		JOINT RightLowLeg
		{
			OFFSET 0.00 -7.50 0.00
			CHANNELS 3 Zrotation Xrotation Yrotation
			JOINT RightFoot
			{
				OFFSET 0.00 -7.50 0.00
				CHANNELS 3 Zrotation Xrotation Yrotation
				End Site
				{
					OFFSET 0.00 0.00 2.00
				}
			}
		}
	}
}
MOTION
Frames: ${frames.length}
Frame Time: ${frameTime}
`;

  const motionLines: string[] = [];

  for (const frame of frames) {
    const pts = frame.points;
    if (!pts || pts.length < 33) continue;

    // MediaPipe Keypoint indices:
    // 0: nose, 11: left_shoulder, 12: right_shoulder, 13: left_elbow, 14: right_elbow,
    // 15: left_wrist, 16: right_wrist, 23: left_hip, 24: right_hip,
    // 25: left_knee, 26: right_knee, 27: left_ankle, 28: right_ankle

    // Calculate mid-hip as root position
    const hipX = ((pts[23].x + pts[24].x) / 2) * 2;
    const hipY = ((pts[23].y + pts[24].y) / 2) * 2;
    const hipZ = ((pts[23].z + pts[24].z) / 2) * 2;

    const midShoulder = {
      x: (pts[11].x + pts[12].x) / 2,
      y: (pts[11].y + pts[12].y) / 2,
      z: (pts[11].z + pts[12].z) / 2,
    };

    const midHip = {
      x: (pts[23].x + pts[24].x) / 2,
      y: (pts[23].y + pts[24].y) / 2,
      z: (pts[23].z + pts[24].z) / 2,
    };

    // Calculate rotations for each joint hierarchy segment:
    // 1. Root / Spine
    const rotHips = calculateBoneRotations(midHip, midShoulder);
    const rotSpine = { rotZ: rotHips.rotZ * 0.3, rotX: rotHips.rotX * 0.3, rotY: rotHips.rotY * 0.3 };
    const rotChest = { rotZ: rotHips.rotZ * 0.3, rotX: rotHips.rotX * 0.3, rotY: rotHips.rotY * 0.3 };

    // 2. Neck & Head
    const rotNeck = calculateBoneRotations(midShoulder, pts[0]);
    const rotHead = { rotZ: rotNeck.rotZ * 0.5, rotX: rotNeck.rotX * 0.5, rotY: rotNeck.rotY * 0.5 };

    // 3. Left Arm
    const rotLCollar = { rotZ: 0, rotX: 0, rotY: 0 };
    const rotLUpArm = calculateBoneRotations(pts[11], pts[13]);
    const rotLLowArm = calculateBoneRotations(pts[13], pts[15]);
    const rotLHand = { rotZ: 0, rotX: 0, rotY: 0 };

    // 4. Right Arm
    const rotRCollar = { rotZ: 0, rotX: 0, rotY: 0 };
    const rotRUpArm = calculateBoneRotations(pts[12], pts[14]);
    const rotRLowArm = calculateBoneRotations(pts[14], pts[16]);
    const rotRHand = { rotZ: 0, rotX: 0, rotY: 0 };

    // 5. Left Leg
    const rotLUpLeg = calculateBoneRotations(pts[23], pts[25]);
    const rotLLowLeg = calculateBoneRotations(pts[25], pts[27]);
    const rotLFoot = { rotZ: 0, rotX: 0, rotY: 0 };

    // 6. Right Leg
    const rotRUpLeg = calculateBoneRotations(pts[24], pts[26]);
    const rotRLowLeg = calculateBoneRotations(pts[26], pts[28]);
    const rotRFoot = { rotZ: 0, rotX: 0, rotY: 0 };

    // Assemble channels in the exact order declared in HIERARCHY:
    // Root Hips (6 channels: Xpos Ypos Zpos Zrot Xrot Yrot)
    // Spine (3)
    // Chest (3)
    // Neck (3)
    // Head (3)
    // LeftCollar (3)
    // LeftUpArm (3)
    // LeftLowArm (3)
    // LeftHand (3)
    // RightCollar (3)
    // RightUpArm (3)
    // RightLowArm (3)
    // RightHand (3)
    // LeftUpLeg (3)
    // LeftLowLeg (3)
    // LeftFoot (3)
    // RightUpLeg (3)
    // RightLowLeg (3)
    // RightFoot (3)
    const lineValues = [
      // Hips 6 channels
      hipX.toFixed(2),
      hipY.toFixed(2),
      hipZ.toFixed(2),
      rotHips.rotZ.toFixed(2),
      rotHips.rotX.toFixed(2),
      rotHips.rotY.toFixed(2),
      // Spine
      rotSpine.rotZ.toFixed(2),
      rotSpine.rotX.toFixed(2),
      rotSpine.rotY.toFixed(2),
      // Chest
      rotChest.rotZ.toFixed(2),
      rotChest.rotX.toFixed(2),
      rotChest.rotY.toFixed(2),
      // Neck
      rotNeck.rotZ.toFixed(2),
      rotNeck.rotX.toFixed(2),
      rotNeck.rotY.toFixed(2),
      // Head
      rotHead.rotZ.toFixed(2),
      rotHead.rotX.toFixed(2),
      rotHead.rotY.toFixed(2),
      // Left Arm
      rotLCollar.rotZ.toFixed(2),
      rotLCollar.rotX.toFixed(2),
      rotLCollar.rotY.toFixed(2),
      rotLUpArm.rotZ.toFixed(2),
      rotLUpArm.rotX.toFixed(2),
      rotLUpArm.rotY.toFixed(2),
      rotLLowArm.rotZ.toFixed(2),
      rotLLowArm.rotX.toFixed(2),
      rotLLowArm.rotY.toFixed(2),
      rotLHand.rotZ.toFixed(2),
      rotLHand.rotX.toFixed(2),
      rotLHand.rotY.toFixed(2),
      // Right Arm
      rotRCollar.rotZ.toFixed(2),
      rotRCollar.rotX.toFixed(2),
      rotRCollar.rotY.toFixed(2),
      rotRUpArm.rotZ.toFixed(2),
      rotRUpArm.rotX.toFixed(2),
      rotRUpArm.rotY.toFixed(2),
      rotRLowArm.rotZ.toFixed(2),
      rotRLowArm.rotX.toFixed(2),
      rotRLowArm.rotY.toFixed(2),
      rotRHand.rotZ.toFixed(2),
      rotRHand.rotX.toFixed(2),
      rotRHand.rotY.toFixed(2),
      // Left Leg
      rotLUpLeg.rotZ.toFixed(2),
      rotLUpLeg.rotX.toFixed(2),
      rotLUpLeg.rotY.toFixed(2),
      rotLLowLeg.rotZ.toFixed(2),
      rotLLowLeg.rotX.toFixed(2),
      rotLLowLeg.rotY.toFixed(2),
      rotLFoot.rotZ.toFixed(2),
      rotLFoot.rotX.toFixed(2),
      rotLFoot.rotY.toFixed(2),
      // Right Leg
      rotRUpLeg.rotZ.toFixed(2),
      rotRUpLeg.rotX.toFixed(2),
      rotRUpLeg.rotY.toFixed(2),
      rotRLowLeg.rotZ.toFixed(2),
      rotRLowLeg.rotX.toFixed(2),
      rotRLowLeg.rotY.toFixed(2),
      rotRFoot.rotZ.toFixed(2),
      rotRFoot.rotX.toFixed(2),
      rotRFoot.rotY.toFixed(2),
    ];

    motionLines.push(lineValues.join(' '));
  }

  return header + motionLines.join('\n');
}

/**
 * Triggers a direct browser download of the generated .bvh MoCap file
 */
export function downloadBVHFile(filename: string, bvhContent: string) {
  const blob = new Blob([bvhContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.bvh') ? filename : `${filename}.bvh`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
