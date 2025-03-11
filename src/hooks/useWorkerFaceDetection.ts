import { useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FaceDetection } from '../types';
import { v4 as uuidv4 } from 'uuid';

// This hook manages face detection processing in a web worker
export function useWorkerFaceDetection() {
  const {
    webcamRef,
    webcamState,
    modelSettings,
    updateFaceDetections,
    updatePerformanceMetrics
  } = useAppStore();
  
  // References for worker and animation frame
  const workerRef = useRef<Worker | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const workerInitializedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsUpdateIntervalRef = useRef(0);
  const requestIdCounterRef = useRef(0);
  const pendingRequestsRef = useRef<Map<number, { startTime: number }>>(new Map());
  
  // Initialize the worker
  useEffect(() => {
    // Create offscreen canvas for frame data extraction
    canvasRef.current = document.createElement('canvas');
    
    // Initialize the detection worker
    const worker = new Worker(
      new URL('../workers/faceDetectionWorker.ts', import.meta.url),
      { type: 'module' }
    );
    
    worker.onmessage = handleWorkerMessage;
    workerRef.current = worker;
    
    // Clean up
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  // Start/stop detection based on webcam state
  useEffect(() => {
    if (webcamState === 'active') {
      if (workerRef.current && !workerInitializedRef.current) {
        initializeWorker();
      } else {
        startDetection();
      }
    } else {
      stopDetection();
    }
    
    return () => stopDetection();
  }, [webcamState]);
  
  // Handle messages from the worker
  const handleWorkerMessage = (event: MessageEvent) => {
    const { type, faces, id, success, message } = event.data;
    
    switch (type) {
      case 'ready':
        console.log('Face detection worker is ready');
        break;
        
      case 'initialized':
        if (success) {
          console.log('Face detection worker initialized successfully');
          workerInitializedRef.current = true;
          startDetection();
        } else {
          console.error('Failed to initialize face detection worker');
        }
        break;
        
      case 'detection-result':
        // Calculate detection time
        const request = pendingRequestsRef.current.get(id);
        if (request) {
          const detectionTime = performance.now() - request.startTime;
          
          // Convert worker results to app format
          const detections: FaceDetection[] = faces.map((face: any) => ({
            id: uuidv4(),
            box: face.box,
            probability: face.probability,
          }));
          
          // Update state
          updateFaceDetections(detections);
          updatePerformanceMetrics({
            detectTime: detectionTime,
          });
          
          // Remove from pending requests
          pendingRequestsRef.current.delete(id);
        }
        break;
        
      case 'error':
        console.error('Worker error:', message);
        pendingRequestsRef.current.delete(id || 0);
        break;
    }
  };
  
  const initializeWorker = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'init' });
    }
  };
  
  const startDetection = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    lastFrameTimeRef.current = performance.now();
    frameCountRef.current = 0;
    fpsUpdateIntervalRef.current = performance.now();
    
    detectFaceInRealTime();
  };
  
  const stopDetection = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    updateFaceDetections([]);
  };
  
  const calculateFPS = (now: number) => {
    const elapsed = now - fpsUpdateIntervalRef.current;
    
    if (elapsed >= 1000) { // Update FPS every second
      const fps = frameCountRef.current / (elapsed / 1000);
      updatePerformanceMetrics({ fps });
      
      // Reset counters
      frameCountRef.current = 0;
      fpsUpdateIntervalRef.current = now;
    }
    
    frameCountRef.current++;
  };
  
  const detectFaceInRealTime = () => {
    if (!webcamRef || !webcamRef.current || !workerInitializedRef.current || !canvasRef.current) {
      rafIdRef.current = requestAnimationFrame(detectFaceInRealTime);
      return;
    }
    
    const video = webcamRef.current;
    
    if (video.readyState !== 4) {
      rafIdRef.current = requestAnimationFrame(detectFaceInRealTime);
      return;
    }
    
    // Calculate FPS
    const now = performance.now();
    calculateFPS(now);
    
    // Process frame
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafIdRef.current = requestAnimationFrame(detectFaceInRealTime);
      return;
    }
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Generate a unique ID for this request
    const requestId = requestIdCounterRef.current++;
    
    // Add to pending requests with start time
    pendingRequestsRef.current.set(requestId, {
      startTime: performance.now()
    });
    
    // Send to worker for processing
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'detect',
        imageData,
        detectionConfidence: modelSettings.detectionConfidence,
        maxFaces: modelSettings.maxFaces,
        id: requestId
      }, [imageData.data.buffer]);
    }
    
    // Schedule next frame
    rafIdRef.current = requestAnimationFrame(detectFaceInRealTime);
  };
  
  return {
    isWorkerInitialized: workerInitializedRef.current
  };
}