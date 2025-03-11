import { create } from 'zustand';
import { 
  AppState, 
  FaceDetection, 
  PerformanceMetrics, 
  VisualizationSettings,
  PerformanceSettings,
  ThemeMode,
  LivenessStep 
} from '../types';

export const useAppStore = create<AppState>((set, get) => ({
  // Webcam reference
  webcamRef: null,
  
  // Detections
  faceDetections: [],
  
  // Performance
  performanceMetrics: {
    fps: 0,
    detectTime: 0,
    landmarkTime: 0,
  },
  
  // Theme
  themeMode: 'dark',
  
  // Settings
  modelSettings: {
    detectionConfidence: 0.5,
    maxFaces: 1, // Limit to one face for liveness check
    landmarksEnabled: true,
    expressionsEnabled: true,
  },
  
  // Visualization settings
  visualizationSettings: {
    showBoundingBox: true,
    showFaceMesh: true,
    showKeyPoints: true,
    showExpressionBars: true,
  },
  
  // Performance settings
  performanceSettings: {
    throttlingLevel: 1, // Default to responsive
    landmarkThrottleMs: 100,
    expressionThrottleMs: 200,
    maxSkipFrames: 2,
    useWebWorker: false, // Set to false for better compatibility with react-webcam
  },
  
  // Liveness check state
  livenessState: {
    currentStep: 'intro',
    progress: 0,
    stepCompleted: {
      intro: false,
      faceAlignment: false,
      blinkEyes: false,
      turnLeft: false,
      turnRight: false,
      smile: false,
      completed: false
    },
    stepStartTime: 0,
    stepTimeoutMs: 15000, // 15 seconds timeout for each step
    detectionHistory: {
      blinkDetected: false,
      leftTurnDetected: false,
      rightTurnDetected: false,
      smileDetected: false,
      prevEyeOpenness: 1,
      prevFaceOrientation: 0
    }
  },
  
  // Actions
  setWebcamRef: (ref) => set({ webcamRef: ref }),
  
  updateFaceDetections: (detections: FaceDetection[]) => {
    const prevState = get();
    set({ faceDetections: detections });
    
    // If we're in liveness check mode, process detections for liveness
    if (detections.length > 0 && prevState.livenessState.currentStep !== 'intro' && prevState.livenessState.currentStep !== 'completed') {
      const detection = detections[0]; // Use the first face
      const { landmarks, expressions, box } = detection;
      
      // Process liveness based on current step
      switch (prevState.livenessState.currentStep) {
        case 'faceAlignment':
          // Update progress based on face alignment (face is detected and centered)
          // Normalize box coordinates (they can be in pixels from detection)
          const videoWidth = get().webcamRef?.videoWidth || 640;
          const videoHeight = get().webcamRef?.videoHeight || 480;
          
          // Calculate normalized coordinates
          const normX = (box.xMin + box.xMax) / 2 / videoWidth;
          const normY = (box.yMin + box.yMax) / 2 / videoHeight;
          const normWidth = box.width / videoWidth;
          const normHeight = box.height / videoHeight;
          
          // Face is centered if it's in the middle third of the screen
          // and has a reasonable size (not too close or too far)
          const isCentered = 
            normX > 0.25 && normX < 0.75 &&
            normY > 0.25 && normY < 0.75 &&
            normWidth > 0.2 && normWidth < 0.8;
          
          if (isCentered) {
            get().updateLivenessProgress(100);
          } else {
            // Calculate how close to center
            const distanceFromCenter = Math.sqrt(
              Math.pow(normX - 0.5, 2) + 
              Math.pow(normY - 0.5, 2)
            );
            // Size penalty if face is too small or too large
            const sizeOptimal = Math.min(
              Math.max((normWidth - 0.1) / 0.3, 0),
              Math.max((0.9 - normWidth) / 0.3, 0)
            );
            
            const progress = Math.max(0, 
              (1 - distanceFromCenter * 2) * 70 + // 70% weight to position
              sizeOptimal * 30 // 30% weight to size
            );
            
            get().updateLivenessProgress(progress);
          }
          break;
          
        case 'blinkEyes':
          if (landmarks && landmarks.length > 0 && detections[0].expressions) {
            // Use the eyeOpenness value from the expressions to detect blinks
            const eyeOpenness = detections[0].expressions.eyeOpenness;
            
            // If eyeOpenness is undefined, calculate it from landmarks directly
            if (eyeOpenness === undefined && landmarks.length >= 468) {
              const leftEyeTop = landmarks[159]; // Top of left eye
              const leftEyeBottom = landmarks[145]; // Bottom of left eye
              const rightEyeTop = landmarks[386]; // Top of right eye
              const rightEyeBottom = landmarks[374]; // Bottom of right eye
              
              // Calculate horizontal width references
              const leftEyeWidth = Math.sqrt(
                Math.pow(landmarks[33][0] - landmarks[133][0], 2) + 
                Math.pow(landmarks[33][1] - landmarks[133][1], 2)
              );
              const rightEyeWidth = Math.sqrt(
                Math.pow(landmarks[263][0] - landmarks[362][0], 2) + 
                Math.pow(landmarks[263][1] - landmarks[362][1], 2)
              );
              
              // Calculate vertical eye openness
              const leftEyeOpenness = Math.sqrt(
                Math.pow(leftEyeTop[0] - leftEyeBottom[0], 2) + 
                Math.pow(leftEyeTop[1] - leftEyeBottom[1], 2)
              ) / leftEyeWidth;
              const rightEyeOpenness = Math.sqrt(
                Math.pow(rightEyeTop[0] - rightEyeBottom[0], 2) + 
                Math.pow(rightEyeTop[1] - rightEyeBottom[1], 2)
              ) / rightEyeWidth;
              
              // Average of both eyes
              const calculatedEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
              
              // Keep track of eye state to detect complete blink cycle
              const prevEyeOpenness = get().livenessState.detectionHistory.prevEyeOpenness || 1;
              
              // Check if eyes closed (low openness) after being open (higher openness)
              if (calculatedEyeOpenness < 0.15 && prevEyeOpenness > 0.3) {
                // Blink detected!
                console.log("Blink detected! Value:", calculatedEyeOpenness, "Previous:", prevEyeOpenness);
                get().detectLivenessAction('blinkDetected', true);
                get().updateLivenessProgress(100);
              }
              
              // Store current eye openness for next frame comparison
              const updatedHistory = {
                ...get().livenessState.detectionHistory,
                prevEyeOpenness: calculatedEyeOpenness
              };
              
              // Update detection history
              set({
                livenessState: {
                  ...get().livenessState,
                  detectionHistory: updatedHistory
                }
              });
              
              // Update progress based on changes in eye openness
              if (!get().livenessState.detectionHistory.blinkDetected) {
                const blinkProgress = Math.max(
                  0, 
                  (1 - Math.abs(calculatedEyeOpenness - 0.2) * 4) * 50  // Progress peaks when eyes are closing
                );
                get().updateLivenessProgress(blinkProgress);
              }
            } else {
              // Use the pre-calculated eyeOpenness value from expressions
              // Keep track of eye state to detect complete blink cycle
              const prevEyeOpenness = get().livenessState.detectionHistory.prevEyeOpenness || 1;
              
              // Check if eyes closed (low openness) after being open (higher openness)
              // This detects the blink action - going from open to closed
              if (eyeOpenness < 0.2 && prevEyeOpenness > 0.5) {
                // Blink detected!
                console.log("Blink detected from expressions! Value:", eyeOpenness, "Previous:", prevEyeOpenness);
                get().detectLivenessAction('blinkDetected', true);
                get().updateLivenessProgress(100);
              }
              
              // Store current eye openness for next frame comparison
              const updatedHistory = {
                ...get().livenessState.detectionHistory,
                prevEyeOpenness: eyeOpenness
              };
              
              // Update detection history
              set({
                livenessState: {
                  ...get().livenessState,
                  detectionHistory: updatedHistory
                }
              });
              
              // Update progress based on changes in eye openness
              if (!get().livenessState.detectionHistory.blinkDetected) {
                const blinkProgress = Math.max(
                  0, 
                  (1 - Math.abs(eyeOpenness - 0.5) * 2) * 60  // Progress peaks when eyes are half-closed
                );
                get().updateLivenessProgress(blinkProgress);
              }
            }
          }
          break;
          
        case 'turnLeft':
          // First check if we have the faceOrientation value from expressions
          if (expressions && expressions.faceOrientation !== undefined) {
            const faceOrientation = expressions.faceOrientation;
            
            // Store current face orientation for next frame comparison
            const prevOrientation = get().livenessState.detectionHistory.prevFaceOrientation || 0;
            
            // Update orientation tracking
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: faceOrientation
            };
            
            // Update detection history
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            console.log("Left turn detection - orientation:", faceOrientation, "prev:", prevOrientation);
            
            // Detect significant turn to the left (negative value indicates left turn)
            // The more negative, the more the face is turned left
            if (faceOrientation < -0.15) {
              get().detectLivenessAction('leftTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              // Update progress based on how far user has turned left
              // Convert the range from 0 to -0.15 to progress 0-100
              const turnProgress = Math.max(0, Math.min(100, (-faceOrientation / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          // Fallback to landmark-based calculation if faceOrientation is not available
          else if (landmarks && landmarks.length > 0) {
            // Use facial landmarks to detect head turn to the left
            // We can approximate head orientation by comparing nose tip position relative to face center
            
            // Get nose tip and face center landmarks
            const noseTip = landmarks[1]; // Tip of nose
            
            // Calculate face center as midpoint between ears
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];
            const faceCenter = [
              (leftEar[0] + rightEar[0]) / 2,
              (leftEar[1] + rightEar[1]) / 2,
              (leftEar[2] + rightEar[2]) / 2
            ];
            
            // Calculate the horizontal offset of nose from face center
            // Negative value means face is turned left
            const horizontalOffset = noseTip[0] - faceCenter[0];
            const faceWidth = Math.abs(rightEar[0] - leftEar[0]);
            const normalizedOffset = horizontalOffset / faceWidth;
            
            // Store current face orientation for next frame comparison
            const prevOrientation = get().livenessState.detectionHistory.prevFaceOrientation || 0;
            
            // Update orientation tracking
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: normalizedOffset
            };
            
            // Update detection history
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            console.log("Left turn detection (landmarks) - offset:", normalizedOffset);
            
            // Detect significant turn to the left
            // A negative normalized offset below -0.15 indicates left turn
            if (normalizedOffset < -0.15) {
              get().detectLivenessAction('leftTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              // Update progress based on how far user has turned
              // Convert the range from 0 to -0.15 to progress 0-100
              const turnProgress = Math.max(0, Math.min(100, (-normalizedOffset / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          break;
          
        case 'turnRight':
          // First check if we have the faceOrientation value from expressions
          if (expressions && expressions.faceOrientation !== undefined) {
            const faceOrientation = expressions.faceOrientation;
            
            // Store current face orientation for next frame comparison
            const prevOrientation = get().livenessState.detectionHistory.prevFaceOrientation || 0;
            
            // Update orientation tracking
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: faceOrientation
            };
            
            // Update detection history
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            console.log("Right turn detection - orientation:", faceOrientation, "prev:", prevOrientation);
            
            // Detect significant turn to the right (positive value indicates right turn)
            // The more positive, the more the face is turned right
            if (faceOrientation > 0.15) {
              get().detectLivenessAction('rightTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              // Update progress based on how far user has turned right
              // Convert the range from 0 to 0.15 to progress 0-100
              const turnProgress = Math.max(0, Math.min(100, (faceOrientation / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          // Fallback to landmark-based calculation if faceOrientation is not available
          else if (landmarks && landmarks.length > 0) {
            // Use facial landmarks to detect head turn to the right
            // We can approximate head orientation by comparing nose tip position relative to face center
            
            // Get nose tip and face center landmarks
            const noseTip = landmarks[1]; // Tip of nose
            
            // Calculate face center as midpoint between ears
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];
            const faceCenter = [
              (leftEar[0] + rightEar[0]) / 2,
              (leftEar[1] + rightEar[1]) / 2,
              (leftEar[2] + rightEar[2]) / 2
            ];
            
            // Calculate the horizontal offset of nose from face center
            // Positive value means face is turned right
            const horizontalOffset = noseTip[0] - faceCenter[0];
            const faceWidth = Math.abs(rightEar[0] - leftEar[0]);
            const normalizedOffset = horizontalOffset / faceWidth;
            
            // Store current face orientation for next frame comparison
            const prevOrientation = get().livenessState.detectionHistory.prevFaceOrientation || 0;
            
            // Update orientation tracking
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: normalizedOffset
            };
            
            // Update detection history
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            console.log("Right turn detection (landmarks) - offset:", normalizedOffset);
            
            // Detect significant turn to the right
            // A positive normalized offset above 0.15 indicates right turn
            if (normalizedOffset > 0.15) {
              get().detectLivenessAction('rightTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              // Update progress based on how far user has turned
              // Convert the range from 0 to 0.15 to progress 0-100
              const turnProgress = Math.max(0, Math.min(100, (normalizedOffset / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          break;
          
        case 'smile':
          if (expressions) {
            // First try using mouthCurvature for more accurate smile detection
            const mouthCurvature = expressions.mouthCurvature;
            const mouthWidth = expressions.mouthWidth;
            const happyScore = expressions.happy || 0;
            
            if (mouthCurvature !== undefined && mouthWidth !== undefined) {
              // Calculate smile score using both curvature and width
              // Positive curvature and wide mouth indicate a smile
              const smileScore = (mouthCurvature * 0.7) + (mouthWidth * 0.3);
              
              console.log("Smile detection - curvature:", mouthCurvature, "width:", mouthWidth, "score:", smileScore);
              
              // Threshold for smile detection (adjusted for the combined metric)
              if (smileScore > 0.4) {
                get().detectLivenessAction('smileDetected', true);
                get().updateLivenessProgress(100);
              } else {
                // Update progress based on how close to a smile
                get().updateLivenessProgress(smileScore * 150); // Scaling to give better visual feedback
              }
            } 
            // Fallback to happy expression score if curvature not available
            else if (happyScore > 0) {
              // Threshold for smile detection using happy expression
              if (happyScore > 0.6) {
                console.log("Smile detected from happiness score:", happyScore);
                get().detectLivenessAction('smileDetected', true);
                get().updateLivenessProgress(100);
              } else {
                // Update progress based on how close to a smile
                get().updateLivenessProgress(happyScore * 120);
              }
            }
          }
          break;
      }
      
      // Check if current step timed out
      const now = Date.now();
      const { stepStartTime, stepTimeoutMs } = prevState.livenessState;
      if (stepStartTime > 0 && now - stepStartTime > stepTimeoutMs) {
        // Reset step and try again
        get().updateLivenessProgress(0);
      }
    }
  },
  
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => 
    set((state) => ({ 
      performanceMetrics: { ...state.performanceMetrics, ...metrics } 
    })),
  
  updateModelSettings: (settings) => 
    set((state) => ({ 
      modelSettings: { ...state.modelSettings, ...settings } 
    })),
    
  updateVisualizationSettings: (settings: Partial<VisualizationSettings>) => 
    set((state) => ({ 
      visualizationSettings: { ...state.visualizationSettings, ...settings } 
    })),
    
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => 
    set((state) => {
      // Update throttling parameters based on throttling level if it was changed
      let updatedSettings = { ...settings };
      
      if (settings.throttlingLevel !== undefined) {
        switch (settings.throttlingLevel) {
          case 1: // Responsive
            updatedSettings = {
              ...updatedSettings,
              landmarkThrottleMs: 100,
              expressionThrottleMs: 200,
              maxSkipFrames: 1
            };
            break;
          case 2: // Balanced
            updatedSettings = {
              ...updatedSettings,
              landmarkThrottleMs: 200,
              expressionThrottleMs: 400,
              maxSkipFrames: 2
            };
            break;
          case 3: // Power Saver
            updatedSettings = {
              ...updatedSettings,
              landmarkThrottleMs: 300,
              expressionThrottleMs: 600,
              maxSkipFrames: 3
            };
            break;
        }
      }
      
      return { 
        performanceSettings: { ...state.performanceSettings, ...updatedSettings } 
      };
    }),
    
  toggleTheme: () =>
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'light' : 'dark'
    })),
    
  // Liveness check actions
  startLivenessCheck: () => {
    set((state) => ({
      livenessState: {
        ...state.livenessState,
        currentStep: 'faceAlignment',
        progress: 0,
        stepCompleted: {
          ...state.livenessState.stepCompleted,
          intro: true
        },
        stepStartTime: Date.now(),
        detectionHistory: {
          blinkDetected: false,
          leftTurnDetected: false,
          rightTurnDetected: false,
          smileDetected: false,
          prevEyeOpenness: 1,
          prevFaceOrientation: 0
        }
      }
    }));
  },
  
  nextLivenessStep: () => {
    const state = get();
    const currentStep = state.livenessState.currentStep;
    
    // Determine next step
    let nextStep: LivenessStep = 'completed';
    
    switch (currentStep) {
      case 'intro':
        nextStep = 'faceAlignment';
        break;
      case 'faceAlignment':
        nextStep = 'blinkEyes';
        break;
      case 'blinkEyes':
        nextStep = 'turnLeft';
        break;
      case 'turnLeft':
        nextStep = 'turnRight';
        break;
      case 'turnRight':
        nextStep = 'smile';
        break;
      case 'smile':
        nextStep = 'completed';
        break;
      default:
        nextStep = 'completed';
    }
    
    // Mark current step as completed and move to next
    set((state) => ({
      livenessState: {
        ...state.livenessState,
        currentStep: nextStep,
        progress: 0,
        stepCompleted: {
          ...state.livenessState.stepCompleted,
          [currentStep]: true
        },
        stepStartTime: Date.now()
      }
    }));
  },
  
  resetLivenessCheck: () => {
    set((state) => ({
      livenessState: {
        currentStep: 'intro',
        progress: 0,
        stepCompleted: {
          intro: false,
          faceAlignment: false,
          blinkEyes: false,
          turnLeft: false,
          turnRight: false,
          smile: false,
          completed: false
        },
        stepStartTime: 0,
        stepTimeoutMs: state.livenessState.stepTimeoutMs,
        detectionHistory: {
          blinkDetected: false,
          leftTurnDetected: false,
          rightTurnDetected: false,
          smileDetected: false,
          prevEyeOpenness: 1,
          prevFaceOrientation: 0
        }
      }
    }));
  },
  
  updateLivenessProgress: (progress: number) => {
    set((state) => {
      // If progress reaches 100%, mark step as ready to complete
      if (progress >= 100 && state.livenessState.progress < 100) {
        return {
          livenessState: {
            ...state.livenessState,
            progress: 100
          }
        };
      }
      
      return {
        livenessState: {
          ...state.livenessState,
          progress
        }
      };
    });
  },
  
  detectLivenessAction: (action, detected) => {
    set((state) => ({
      livenessState: {
        ...state.livenessState,
        detectionHistory: {
          ...state.livenessState.detectionHistory,
          [action]: detected
        }
      }
    }));
  }
}));