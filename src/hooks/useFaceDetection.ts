import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  initializeTensorFlow,
  detectFaces,
  detectFaceLandmarks,
} from "../utils/tensorflowUtils";

export function useFaceDetection() {
  const {
    webcamRef,
    faceDetections,
    modelSettings,
    performanceSettings,
    updateFaceDetections,
    updatePerformanceMetrics,
  } = useAppStore();

  const rafId = useRef<number | null>(null);
  const modelsLoaded = useRef(false);
  const lastFrameTime = useRef(0);
  const processingFrame = useRef(false);
  const skipFrameCount = useRef(0);
  const lastFaceLandmarkTime = useRef(0);
  const initAttempts = useRef(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get performance tuning parameters from store
  const {
    landmarkThrottleMs: LANDMARK_THROTTLE_MS,
    maxSkipFrames: MAX_SKIP_FRAMES,
  } = performanceSettings;

  // Fixed parameters
  const TARGET_FPS = 30;
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  // Initialize TensorFlow models when component mounts
  useEffect(() => {
    const loadModels = async () => {
      // Evitar múltiplas inicializações simultâneas
      if (isInitializing) return;

      setIsInitializing(true);
      try {
        console.log("Inicializando modelos TensorFlow...");
        await initializeTensorFlow();
        modelsLoaded.current = true;
        console.log("TensorFlow models loaded successfully");

        // Automatically start face detection when models are loaded
        startFaceDetection();
      } catch (error) {
        console.error("Failed to load TensorFlow models:", error);

        // Retry loading models if failed (up to 3 times)
        if (initAttempts.current < 3) {
          console.log(
            `Retrying model initialization (attempt ${
              initAttempts.current + 1
            }/3)...`
          );
          initAttempts.current += 1;
          setTimeout(loadModels, 2000); // Tempo maior entre tentativas (2 segundos)
        }
      } finally {
        setIsInitializing(false);
      }
    };

    loadModels();

    // Cleanup on unmount
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, []);

  // Watch for webcam changes
  useEffect(() => {
    if (
      webcamRef &&
      webcamRef.current &&
      webcamRef.current.readyState >= 2 &&
      webcamRef.current.videoWidth > 0 &&
      modelsLoaded.current
    ) {
      console.log(
        "Webcam is ready and has dimensions - starting face detection"
      );
      startFaceDetection();
    } else if (webcamRef && webcamRef.current) {
      console.log("Webcam reference exists but video might not be ready");

      // Se o vídeo estiver presente mas não estiver pronto, configurar um handler para o evento loadeddata
      const videoElement = webcamRef.current;

      const handleVideoReady = () => {
        console.log("Video is now ready - starting face detection");
        if (modelsLoaded.current) {
          startFaceDetection();
        }
      };

      videoElement.addEventListener("loadeddata", handleVideoReady);

      return () => {
        videoElement.removeEventListener("loadeddata", handleVideoReady);
        stopFaceDetection();
      };
    } else {
      console.log("Webcam reference is not available");
      stopFaceDetection();
    }

    return () => stopFaceDetection();
  }, [webcamRef]);

  const startFaceDetection = () => {
    console.log("Starting face detection...");

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    // Reiniciar contadores e métricas
    lastFrameTime.current = performance.now();
    lastFaceLandmarkTime.current = 0;
    processingFrame.current = false;
    skipFrameCount.current = 0;

    // Iniciar o loop de detecção
    rafId.current = requestAnimationFrame(detectFaceInRealTime);
    console.log("Face detection loop started");
  };

  const stopFaceDetection = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    updateFaceDetections([]);
  };

  const calculateFPS = (now: number) => {
    const fps = 1000 / (now - lastFrameTime.current);
    lastFrameTime.current = now;
    return fps;
  };

  // Skip processing if the previous frame is still being processed or if we're skipping frames
  const shouldSkipProcessing = () => {
    if (processingFrame.current) {
      // Skip if already processing a frame
      return true;
    }

    if (skipFrameCount.current > 0) {
      // Skip this frame but decrement the counter
      skipFrameCount.current--;
      return true;
    }

    return false;
  };

  const detectFaceInRealTime = async () => {
    // Verificar se o webcam está pronto para processamento
    if (
      !webcamRef ||
      !webcamRef.current ||
      webcamRef.current.readyState < 2 ||
      webcamRef.current.videoWidth === 0 ||
      webcamRef.current.videoHeight === 0 ||
      !modelsLoaded.current
    ) {
      // Continuar o loop mesmo se não estiver pronto
      rafId.current = requestAnimationFrame(detectFaceInRealTime);
      return;
    }

    const video = webcamRef.current;

    const now = performance.now();
    const fps = calculateFPS(now);

    // Schedule the next animation frame immediately to maintain smooth rendering
    rafId.current = requestAnimationFrame(detectFaceInRealTime);

    // Skip processing if needed
    if (shouldSkipProcessing()) {
      return;
    }

    // Mark that we're processing a frame
    processingFrame.current = true;

    try {
      // Face detection step - run on every frame
      const detectStart = performance.now();
      let detectedFaces = [];

      // Using a lower confidence threshold for better detection in challenging conditions
      const confidenceThreshold = 0.15; // Reduced to increase detection sensitivity

      try {
        detectedFaces = await detectFaces(
          video,
          confidenceThreshold,
          modelSettings.maxFaces
        );

        // Logs para debug (remover em produção)
        if (detectedFaces.length > 0) {
          console.log(
            `Detected ${
              detectedFaces.length
            } faces with confidence: ${detectedFaces[0].confidence.toFixed(2)}`
          );
        } else {
          console.log("No faces detected in this frame");
        }
      } catch (detectError) {
        console.error("Error in face detection:", detectError);
      }

      const detectTime = performance.now() - detectStart;

      // Face landmarks step (if enabled and not throttled)
      let landmarkTime = 0;

      // Process landmarks more often for better tracking during verification steps
      const shouldProcessLandmarks =
        modelSettings.landmarksEnabled &&
        detectedFaces.length > 0 &&
        now - lastFaceLandmarkTime.current >= LANDMARK_THROTTLE_MS;

      if (shouldProcessLandmarks) {
        const landmarkStart = performance.now();
        detectedFaces = await detectFaceLandmarks(video, detectedFaces);
        landmarkTime = performance.now() - landmarkStart;
        lastFaceLandmarkTime.current = now;
      } else if (detectedFaces.length > 0) {
        // Copy landmarks from previous detections if available using improved matching
        detectedFaces = detectedFaces.map((face) => {
          // Find the previous face with the highest IoU (Intersection over Union)
          let bestMatch = null;
          let bestIoU = 0;

          for (const prev of faceDetections) {
            if (!prev.landmarks) continue;

            // Calculate intersection area
            const intersection = {
              xMin: Math.max(face.box.xMin, prev.box.xMin),
              yMin: Math.max(face.box.yMin, prev.box.yMin),
              xMax: Math.min(face.box.xMax, prev.box.xMax),
              yMax: Math.min(face.box.yMax, prev.box.yMax),
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
            const prevArea = prev.box.width * prev.box.height;
            const unionArea = faceArea + prevArea - intersectionArea;
            const iou = intersectionArea / unionArea;

            if (iou > bestIoU) {
              bestIoU = iou;
              bestMatch = prev;
            }
          }

          // Use landmarks from best matching face if it exists
          if (bestMatch && bestMatch.landmarks && bestIoU > 0.5) {
            return { ...face, landmarks: bestMatch.landmarks };
          }

          return face;
        });
      }

      // Update face detections in the store
      updateFaceDetections(detectedFaces);

      // Update performance metrics
      updatePerformanceMetrics({
        fps,
        detectTime,
        landmarkTime,
      });

      // Set the number of frames to skip based on performance
      skipFrameCount.current = Math.min(
        Math.max(0, Math.floor(detectTime / FRAME_INTERVAL)),
        MAX_SKIP_FRAMES
      );
    } catch (error) {
      console.error("Error in face detection loop:", error);
    } finally {
      processingFrame.current = false;
    }
  };

  return {
    startFaceDetection,
    stopFaceDetection,
  };
}
