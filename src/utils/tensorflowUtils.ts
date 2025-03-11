import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import { FaceDetection } from "../types";
import { v4 as uuidv4 } from "uuid";

// Enable WebGL for better performance
tf.setBackend("webgl");
console.log("Using WebGL backend: ", tf.getBackend());

// Global model instances
let blazeFaceModel: blazeface.BlazeFaceModel | null = null;
let faceMeshModel: faceLandmarksDetection.FaceLandmarksDetector | null = null;
let modelLoadingPromise: Promise<void> | null = null;

/**
 * Initialize TensorFlow.js and load models
 */
export async function initializeTensorFlow(): Promise<void> {
  // If already loading, return the existing promise
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  // Create a new promise for loading models
  modelLoadingPromise = new Promise<void>(async (resolve, reject) => {
    try {
      console.log("Initializing TensorFlow.js models...");

      // Verificar e configurar o backend
      await tf.ready();
      console.log("TensorFlow.js ready, using backend:", tf.getBackend());

      // Garbage collection para evitar problemas de memória
      tf.tidy(() => {
        // Create a dummy tensor and dispose it to warm up the backend
        const dummy = tf.zeros([1, 1, 1, 3]);
        dummy.dispose();
      });

      // Load BlazeFace model if not loaded
      if (!blazeFaceModel) {
        console.log("Loading BlazeFace model...");
        blazeFaceModel = await blazeface.load({
          maxFaces: 1, // Reduz para um rosto para melhor performance
          scoreThreshold: 0.5, // Limiar de confiança para detecção
        });
        console.log("BlazeFace model loaded successfully");
      }

      // Load FaceMesh model if not loaded
      if (!faceMeshModel) {
        console.log("Loading FaceMesh model...");
        faceMeshModel = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: "tfjs",
            refineLandmarks: true,
            maxFaces: 1,
          }
        );
        console.log("FaceMesh model loaded successfully");
      }

      resolve();
    } catch (error) {
      console.error("Error initializing TensorFlow.js models:", error);
      // Reset loading promise so it can be retried
      modelLoadingPromise = null;
      reject(error);
    }
  });

  return modelLoadingPromise;
}

/**
 * Detect faces in an image using BlazeFace
 * Updated with improved sensitivity and error handling
 */
export async function detectFaces(
  video: HTMLVideoElement,
  detectionConfidence: number,
  maxFaces: number
): Promise<FaceDetection[]> {
  // Ensure models are loaded
  if (!blazeFaceModel) {
    console.warn("BlazeFace model not loaded, attempting to load models now");
    try {
      await initializeTensorFlow();
    } catch (error) {
      console.error("Failed to load TensorFlow models:", error);
      return [];
    }
  }

  // Check if video is ready for processing
  if (
    !video ||
    !video.videoWidth ||
    !video.videoHeight ||
    video.readyState < 2
  ) {
    console.warn("Video not ready for processing, skipping face detection");
    return [];
  }

  try {
    // Medida preventiva para evitar erros com WebGL
    if (tf.getBackend() !== "webgl") {
      console.warn("WebGL backend not active, attempting to set it");
      await tf.setBackend("webgl");
    }

    // Create a tensor from the video element with enhanced preprocessing
    const tensor = tf.tidy(() => {
      // Get pixels from video
      const pixels = tf.browser.fromPixels(video);
      return pixels;
    });

    // Run face detection with enhanced sensitivity
    if (!blazeFaceModel) {
      console.error("BlazeFace model still not available");
      tensor.dispose();
      return [];
    }

    // The returnTensors option is set to false to get predictions directly
    const predictions = await blazeFaceModel.estimateFaces(tensor, false);

    // Dispose tensor to prevent memory leaks
    tensor.dispose();

    // Apply a lower confidence threshold for detecting faces in challenging conditions
    const effectiveThreshold = Math.min(detectionConfidence, 0.15); // Lower minimum threshold

    // Filter by confidence and limit to maxFaces
    const filteredPredictions = predictions
      .filter((pred) => {
        // Check if probability exists and is above threshold
        const isConfident =
          pred.probability && pred.probability[0] >= effectiveThreshold;
        // Also check if the bounding box is valid
        const validBox =
          pred.topLeft &&
          pred.bottomRight &&
          !isNaN(pred.topLeft[0]) &&
          !isNaN(pred.topLeft[1]) &&
          !isNaN(pred.bottomRight[0]) &&
          !isNaN(pred.bottomRight[1]);
        return isConfident && validBox;
      })
      .slice(0, maxFaces);

    // Convert to our FaceDetection format with enhanced box handling
    return filteredPredictions.map((pred) => {
      // Adjust coordinates if they're outside the video dimensions
      const xMin = Math.max(0, pred.topLeft[0]);
      const yMin = Math.max(0, pred.topLeft[1]);
      const xMax = Math.min(video.videoWidth, pred.bottomRight[0]);
      const yMax = Math.min(video.videoHeight, pred.bottomRight[1]);

      const width = xMax - xMin;
      const height = yMax - yMin;

      // Expand detection box slightly to improve landmark detection
      // This helps capture facial features that might be at the edge of the detection box
      const expansionFactor = 0.1; // 10% expansion
      const expandedBox = {
        xMin: Math.max(0, xMin - (width * expansionFactor) / 2),
        yMin: Math.max(0, yMin - (height * expansionFactor) / 2),
        xMax: Math.min(video.videoWidth, xMax + (width * expansionFactor) / 2),
        yMax: Math.min(
          video.videoHeight,
          yMax + (height * expansionFactor) / 2
        ),
        width: width * (1 + expansionFactor),
        height: height * (1 + expansionFactor),
      };

      return {
        id: uuidv4(),
        box: expandedBox,
        confidence: pred.probability ? pred.probability[0] : 0,
      };
    });
  } catch (error) {
    console.error("Error during face detection:", error);
    // Return empty array instead of throwing to prevent stopping the detection loop
    return [];
  }
}

/**
 * Detect face landmarks using MediaPipe FaceMesh
 * Enhanced with more robust landmark detection
 */
export async function detectFaceLandmarks(
  video: HTMLVideoElement,
  faces: FaceDetection[]
): Promise<FaceDetection[]> {
  if (!faceMeshModel) {
    console.warn("FaceMesh model not loaded, will attempt to load it now");
    try {
      faceMeshModel = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          maxFaces: 1,
          refineLandmarks: true,
        }
      );
      console.log("FaceMesh model loaded on demand");
    } catch (error) {
      console.error("Failed to load FaceMesh model:", error);
      return faces; // Return original faces without landmarks rather than failing
    }
  }

  if (faces.length === 0) {
    return faces;
  }

  try {
    // Run landmark detection with improved configuration
    const predictions = await faceMeshModel.estimateFaces(video);

    if (!predictions || predictions.length === 0) {
      return faces;
    }

    // Match landmarks with detected faces using best-effort matching
    return faces.map((face) => {
      // Find the best matching prediction for this face
      let bestMatch = null;
      let bestIoU = 0;

      for (const pred of predictions) {
        // Calculate bounding box for this prediction's keypoints
        if (!pred.keypoints || pred.keypoints.length === 0) continue;

        // Find bounding box of the face landmarks
        const keypoints = pred.keypoints;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        for (const kp of keypoints) {
          minX = Math.min(minX, kp.x);
          minY = Math.min(minY, kp.y);
          maxX = Math.max(maxX, kp.x);
          maxY = Math.max(maxY, kp.y);
        }

        // Calculate IoU (Intersection over Union) between this prediction and the face
        const intersection = {
          xMin: Math.max(face.box.xMin, minX),
          yMin: Math.max(face.box.yMin, minY),
          xMax: Math.min(face.box.xMax, maxX),
          yMax: Math.min(face.box.yMax, maxY),
        };

        // Check if there is an intersection
        if (
          intersection.xMax <= intersection.xMin ||
          intersection.yMax <= intersection.yMin
        ) {
          continue; // No intersection
        }

        const intersectionArea =
          (intersection.xMax - intersection.xMin) *
          (intersection.yMax - intersection.yMin);
        const faceArea = face.box.width * face.box.height;
        const predArea = (maxX - minX) * (maxY - minY);
        const unionArea = faceArea + predArea - intersectionArea;
        const iou = intersectionArea / unionArea;

        if (iou > bestIoU) {
          bestIoU = iou;
          bestMatch = pred;
        }
      }

      // If we found a matching prediction, extract landmarks
      if (bestMatch && bestMatch.keypoints && bestIoU > 0.3) {
        // 0.3 threshold for IoU matching
        const landmarks = bestMatch.keypoints.map((kp) => [
          kp.x,
          kp.y,
          kp.z || 0,
        ]);
        return {
          ...face,
          landmarks,
        };
      }

      return face;
    });
  } catch (error) {
    console.error("Error during landmark detection:", error);
    return faces; // Return original faces without landmarks rather than failing
  }
}

/**
 * Analyze expressions based on face landmarks
 * Using geometric measurements between facial landmarks to determine expressions
 */
export function analyzeExpressions(faces: FaceDetection[]): FaceDetection[] {
  return faces.map((face) => {
    if (!face.landmarks) return face;

    // Calculate expressions based on actual landmark measurements
    const expressions = calculateExpressionsFromLandmarks(face.landmarks);

    return {
      ...face,
      expressions,
    };
  });
}

/**
 * Calculate facial expressions using geometric relationships between landmarks
 * Each expression is determined by specific facial feature measurements
 * Enhanced with more accurate expression detection
 */
function calculateExpressionsFromLandmarks(
  landmarks: number[][]
): Record<string, number> {
  // If landmarks are not in the expected format, return neutral expression
  if (!landmarks || landmarks.length < 468) {
    return { neutral: 1, happy: 0, sad: 0, angry: 0, surprised: 0 };
  }

  // Key landmark indices for MediaPipe FaceMesh model
  // Eyes
  const leftEyeTop = landmarks[159]; // Top of left eye
  const leftEyeBottom = landmarks[145]; // Bottom of left eye
  const rightEyeTop = landmarks[386]; // Top of right eye
  const rightEyeBottom = landmarks[374]; // Bottom of right eye

  // Eyebrows
  const leftEyebrowOuter = landmarks[70]; // Left eyebrow outer
  const leftEyebrowInner = landmarks[107]; // Left eyebrow inner
  const rightEyebrowOuter = landmarks[300]; // Right eyebrow outer
  const rightEyebrowInner = landmarks[336]; // Right eyebrow inner

  // Mouth
  const mouthTop = landmarks[13]; // Top of mouth
  const mouthBottom = landmarks[14]; // Bottom of mouth
  const mouthLeft = landmarks[78]; // Left corner of mouth
  const mouthRight = landmarks[308]; // Right corner of mouth

  // Nose
  const noseTip = landmarks[1]; // Tip of nose
  const noseBottom = landmarks[2]; // Bottom of nose

  // Face bounds
  const faceTop = landmarks[10]; // Top of forehead
  const faceBottom = landmarks[152]; // Bottom of chin

  // Calculate eye openness (vertical distance / horizontal distance)
  const leftEyeOpenness =
    distance(leftEyeTop, leftEyeBottom) /
    distance(landmarks[33], landmarks[133]);
  const rightEyeOpenness =
    distance(rightEyeTop, rightEyeBottom) /
    distance(landmarks[263], landmarks[362]);
  const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;

  // Calculate mouth openness (vertical distance / face height)
  const mouthOpenness =
    distance(mouthTop, mouthBottom) / distance(faceTop, faceBottom);

  // Calculate mouth width (smile indication)
  const mouthWidth =
    distance(mouthLeft, mouthRight) / distance(landmarks[234], landmarks[454]);

  // Calculate eyebrow raise (distance from eyebrow to eye / face height)
  const leftEyebrowRaise =
    distance(leftEyebrowOuter, leftEyeTop) / distance(faceTop, faceBottom);
  const rightEyebrowRaise =
    distance(rightEyebrowOuter, rightEyeTop) / distance(faceTop, faceBottom);
  const eyebrowRaise = (leftEyebrowRaise + rightEyebrowRaise) / 2;

  // Additional measurements for improved accuracy

  // Check if mouth corners are turned up (smiling) or down (frowning)
  const mouthLeftHeight = landmarks[78][1] - landmarks[92][1]; // negative if turned up
  const mouthRightHeight = landmarks[308][1] - landmarks[322][1]; // negative if turned up
  const mouthCurvature = -(mouthLeftHeight + mouthRightHeight) / 2; // positive if smiling

  // Calculate expressions based on feature measurements

  // Surprised: wide open eyes, raised eyebrows, open mouth
  const surprised = normalize(
    eyeOpenness * 3 + eyebrowRaise * 2 + mouthOpenness * 2,
    0.1,
    0.5
  );

  // Happy: wide mouth (smile), mouth corners up, slightly raised eyebrows
  const happy = normalize(
    mouthWidth * 3 +
      mouthCurvature * 6 +
      eyebrowRaise * 0.5 -
      mouthOpenness * 0.7,
    0.2,
    0.6
  );

  // Sad: drooping eyebrows, mouth corners down, narrow mouth
  const sad = normalize(
    (1 - mouthWidth) * 1.5 + (1 - eyebrowRaise) * 2 - mouthCurvature * 4,
    0,
    0.4
  );

  // Angry: lowered eyebrows, narrow eyes, slight frown
  const angry = normalize(
    (1 - eyebrowRaise) * 4 + (1 - eyeOpenness) * 2 - mouthCurvature * 2,
    0,
    0.5
  );

  // Calculate neutral as inverse of other expressions
  let neutral = 1 - (surprised + happy + sad + angry);
  if (neutral < 0) neutral = 0;

  // Normalize all expressions to sum to 1
  const sum = neutral + happy + sad + angry + surprised;

  // Calculate more precise blink detection metrics
  // Get more precise eye measurements by using specific points for eyelids
  const leftEyeUpperLid = [landmarks[159], landmarks[145], landmarks[144]]; // Upper eyelid points
  const leftEyeLowerLid = [landmarks[33], landmarks[133], landmarks[173]]; // Lower eyelid points
  const rightEyeUpperLid = [landmarks[386], landmarks[374], landmarks[373]]; // Upper eyelid points  
  const rightEyeLowerLid = [landmarks[263], landmarks[362], landmarks[398]]; // Lower eyelid points

  // Calculate average vertical distances between upper and lower eyelids
  let leftEyeOpennessRefined = 0;
  let rightEyeOpennessRefined = 0;
  
  // For left eye
  leftEyeUpperLid.forEach((upper, i) => {
    const lower = leftEyeLowerLid[i % leftEyeLowerLid.length];
    leftEyeOpennessRefined += distance(upper, lower);
  });
  leftEyeOpennessRefined /= leftEyeUpperLid.length;
  
  // For right eye
  rightEyeUpperLid.forEach((upper, i) => {
    const lower = rightEyeLowerLid[i % rightEyeLowerLid.length];
    rightEyeOpennessRefined += distance(upper, lower);
  });
  rightEyeOpennessRefined /= rightEyeUpperLid.length;
  
  // Normalize by face width to get relative eye openness
  const faceWidth = distance(landmarks[234], landmarks[454]); // Width between ears
  const normalizedLeftEyeOpenness = leftEyeOpennessRefined / (faceWidth * 0.15); // 15% of face width is typical eye width
  const normalizedRightEyeOpenness = rightEyeOpennessRefined / (faceWidth * 0.15);
  
  // Clamp to reasonable range and average both eyes
  const refinedEyeOpenness = Math.min(1, Math.max(0, (normalizedLeftEyeOpenness + normalizedRightEyeOpenness) / 2));
  
  // Log the refined eye openness value for debugging
  if (Math.random() < 0.05) { // Only log occasionally to avoid flooding console
    console.log("Refined eye openness:", refinedEyeOpenness, "Standard:", eyeOpenness);
  }

  // Add specific measurements for liveness detection features
  return {
    neutral: neutral / sum,
    happy: happy / sum,
    sad: sad / sum,
    angry: angry / sum,
    surprised: surprised / sum,
    // Add specific values needed for liveness detection
    eyeOpenness: eyeOpenness,                 // Original eye openness calculation
    refinedEyeOpenness: refinedEyeOpenness,   // More precise eye openness for blink detection
    leftEyeOpenness: normalizedLeftEyeOpenness, // Left eye openness individually
    rightEyeOpenness: normalizedRightEyeOpenness, // Right eye openness individually
    mouthWidth: mouthWidth,                   // For smile detection
    mouthCurvature: mouthCurvature,           // For smile detection (more accurate than just width)
    faceOrientation: noseTip[0] - (landmarks[234][0] + landmarks[454][0]) / 2  // For head turn detection
  };
}

/**
 * Calculate Euclidean distance between two 3D points
 */
function distance(point1: number[], point2: number[]): number {
  const dx = point2[0] - point1[0];
  const dy = point2[1] - point1[1];
  const dz = (point2[2] || 0) - (point1[2] || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a value between 0 and 1
 */
function normalize(value: number, min: number, max: number): number {
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, normalized));
}
