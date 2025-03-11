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
        case 'faceAlignment': {
          // Update progress based on face alignment (face is detected and centered)
          // Normalize box coordinates (they can be in pixels from detection)
          const videoWidth = get().webcamRef?.current?.videoWidth || 640;
          const videoHeight = get().webcamRef?.current?.videoHeight || 480;
          
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
            normWidth > 0.2 && normWidth < 0.8 &&
            normHeight > 0.2 && normHeight < 0.8;
          
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
        }
          
        case 'blinkEyes': {
          if (landmarks && landmarks.length > 0) {
            // Calculate eye openness
            const leftEyeTop = landmarks[159] || [0, 0, 0]; 
            const leftEyeBottom = landmarks[145] || [0, 0, 0]; 
            const rightEyeTop = landmarks[386] || [0, 0, 0]; 
            const rightEyeBottom = landmarks[374] || [0, 0, 0]; 
            
            const leftEyeOpenness = Math.sqrt(
              Math.pow(leftEyeTop[0] - leftEyeBottom[0], 2) + 
              Math.pow(leftEyeTop[1] - leftEyeBottom[1], 2)
            );
            
            const rightEyeOpenness = Math.sqrt(
              Math.pow(rightEyeTop[0] - rightEyeBottom[0], 2) + 
              Math.pow(rightEyeTop[1] - rightEyeBottom[1], 2)
            );
            
            const faceWidth = Math.sqrt(
              Math.pow(landmarks[234][0] - landmarks[454][0], 2) + 
              Math.pow(landmarks[234][1] - landmarks[454][1], 2)
            );
            
            const normalizedLeftEye = leftEyeOpenness / (faceWidth * 0.05); 
            const normalizedRightEye = rightEyeOpenness / (faceWidth * 0.05);
            const currentEyeOpenness = (normalizedLeftEye + normalizedRightEye) / 2;
            
            const prevEyeOpenness = get().livenessState.detectionHistory.prevEyeOpenness || 1;
            
            const CLOSED_THRESHOLD = 0.3;  
            const OPEN_THRESHOLD = 0.5;    
            const CHANGE_THRESHOLD = 0.25; 
            
            const blinkDetectedByChange = prevEyeOpenness > OPEN_THRESHOLD && 
                                         (prevEyeOpenness - currentEyeOpenness) > CHANGE_THRESHOLD;
                                         
            const blinkDetectedByAbsolute = currentEyeOpenness < CLOSED_THRESHOLD && 
                                            prevEyeOpenness > currentEyeOpenness;
            
            if (blinkDetectedByChange || blinkDetectedByAbsolute) {
              get().detectLivenessAction('blinkDetected', true);
              get().updateLivenessProgress(100);
            }
            
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevEyeOpenness: currentEyeOpenness
            };
            
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            if (!get().livenessState.detectionHistory.blinkDetected) {
              const eyeMovementRange = Math.abs(currentEyeOpenness - prevEyeOpenness) * 200;
              const eyeClosedProgress = Math.max(0, (1 - currentEyeOpenness) * 70);
              const blinkProgress = Math.min(90, Math.max(eyeMovementRange, eyeClosedProgress));
              
              const currentProgress = get().livenessState.progress;
              if (blinkProgress > currentProgress) {
                get().updateLivenessProgress(blinkProgress);
              }
            }
          }
          break;
        }
          
        case 'turnLeft': {
          if (expressions && expressions.faceOrientation !== undefined) {
            const faceOrientation = expressions.faceOrientation;
            
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: faceOrientation
            };
            
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            if (faceOrientation < -0.15) {
              get().detectLivenessAction('leftTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              const turnProgress = Math.max(0, Math.min(100, (-faceOrientation / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          } else if (landmarks && landmarks.length > 0) {
            const noseTip = landmarks[1]; 
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];
            const faceCenter = [
              (leftEar[0] + rightEar[0]) / 2,
              (leftEar[1] + rightEar[1]) / 2,
              (leftEar[2] + rightEar[2]) / 2
            ];
            
            const horizontalOffset = noseTip[0] - faceCenter[0];
            const faceWidth = Math.abs(rightEar[0] - leftEar[0]);
            const normalizedOffset = horizontalOffset / faceWidth;
            
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: normalizedOffset
            };
            
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            if (normalizedOffset < -0.15) {
              get().detectLivenessAction('leftTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              const turnProgress = Math.max(0, Math.min(100, (-normalizedOffset / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          break;
        }
          
        case 'turnRight': {
          if (expressions && expressions.faceOrientation !== undefined) {
            const faceOrientation = expressions.faceOrientation;
            
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: faceOrientation
            };
            
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            if (faceOrientation > 0.15) {
              get().detectLivenessAction('rightTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              const turnProgress = Math.max(0, Math.min(100, (faceOrientation / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          } else if (landmarks && landmarks.length > 0) {
            const noseTip = landmarks[1]; 
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];
            const faceCenter = [
              (leftEar[0] + rightEar[0]) / 2,
              (leftEar[1] + rightEar[1]) / 2,
              (leftEar[2] + rightEar[2]) / 2
            ];
            
            const horizontalOffset = noseTip[0] - faceCenter[0];
            const faceWidth = Math.abs(rightEar[0] - leftEar[0]);
            const normalizedOffset = horizontalOffset / faceWidth;
            
            const updatedHistory = {
              ...get().livenessState.detectionHistory,
              prevFaceOrientation: normalizedOffset
            };
            
            set({
              livenessState: {
                ...get().livenessState,
                detectionHistory: updatedHistory
              }
            });
            
            if (normalizedOffset > 0.15) {
              get().detectLivenessAction('rightTurnDetected', true);
              get().updateLivenessProgress(100);
            } else {
              const turnProgress = Math.max(0, Math.min(100, (normalizedOffset / 0.15) * 100));
              get().updateLivenessProgress(turnProgress);
            }
          }
          break;
        }
          
        case 'smile': {
          if (expressions) {
            const mouthCurvature = expressions.mouthCurvature;
            const mouthWidth = expressions.mouthWidth;
            const happyScore = expressions.happy || 0;
            
            if (mouthCurvature !== undefined && mouthWidth !== undefined) {
              const smileScore = (mouthCurvature * 0.7) + (mouthWidth * 0.3);
              
              if (smileScore > 0.4) {
                get().detectLivenessAction('smileDetected', true);
                get().updateLivenessProgress(100);
              } else {
                get().updateLivenessProgress(smileScore * 150); 
              }
            } else if (happyScore > 0) {
              if (happyScore > 0.6) {
                get().detectLivenessAction('smileDetected', true);
                get().updateLivenessProgress(100);
              } else {
                get().updateLivenessProgress(happyScore * 120);
              }
            }
          }
          break;
        }
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