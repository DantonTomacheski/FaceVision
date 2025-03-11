export interface FaceDetection {
  id: string;
  box: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  landmarks?: number[][];
  expressions?: Record<string, number>;
}

export interface PerformanceMetrics {
  fps: number;
  detectTime: number;
  landmarkTime: number;
}

export type ThemeMode = "light" | "dark";

export interface VisualizationSettings {
  showBoundingBox: boolean;
  showFaceMesh: boolean;
  showKeyPoints: boolean;
  showExpressionBars: boolean;
}

export interface PerformanceSettings {
  throttlingLevel: number; // 1: responsive, 2: balanced, 3: power saver
  landmarkThrottleMs: number;
  expressionThrottleMs: number;
  maxSkipFrames: number;
  useWebWorker: boolean; // Whether to use web worker for face detection
}

export type LivenessStep =
  | "intro"
  | "faceAlignment"
  | "blinkEyes"
  | "turnLeft"
  | "turnRight"
  | "smile"
  | "completed";

export interface LivenessState {
  currentStep: LivenessStep;
  progress: number; // 0-100
  stepCompleted: Record<LivenessStep, boolean>;
  stepStartTime: number;
  stepTimeoutMs: number;
  detectionHistory: {
    blinkDetected: boolean;
    leftTurnDetected: boolean;
    rightTurnDetected: boolean;
    smileDetected: boolean;
    prevEyeOpenness?: number; // Track previous eye openness for blink detection
    prevFaceOrientation?: number; // Track previous face orientation for turn detection
  };
}

export interface AppState {
  // Webcam reference to HTML video element
  webcamRef: React.RefObject<HTMLVideoElement> | null;

  // Detections
  faceDetections: FaceDetection[];

  // Performance
  performanceMetrics: PerformanceMetrics;

  // Theme
  themeMode: ThemeMode;

  // Settings
  modelSettings: {
    detectionConfidence: number;
    maxFaces: number;
    landmarksEnabled: boolean;
    expressionsEnabled: boolean;
  };

  visualizationSettings: VisualizationSettings;

  performanceSettings: PerformanceSettings;

  // Liveness check state
  livenessState: LivenessState;

  // Actions
  setWebcamRef: (ref: React.RefObject<HTMLVideoElement>) => void;
  updateFaceDetections: (detections: FaceDetection[]) => void;
  updatePerformanceMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  updateModelSettings: (settings: Partial<AppState["modelSettings"]>) => void;
  updateVisualizationSettings: (
    settings: Partial<VisualizationSettings>
  ) => void;
  updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => void;
  toggleTheme: () => void;

  // Liveness actions
  startLivenessCheck: () => void;
  nextLivenessStep: () => void;
  resetLivenessCheck: () => void;
  updateLivenessProgress: (progress: number) => void;
  detectLivenessAction: (
    action: keyof LivenessState["detectionHistory"],
    detected: boolean
  ) => void;
}
