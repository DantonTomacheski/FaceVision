import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FaceDetection, LivenessStep } from '../types';

// Facial mesh triangulation connection indices
// These define how to connect the landmarks to form a mesh
const FACE_MESH_CONNECTIONS = [
  // Face outline
  [10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389],
  [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397],
  [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152],
  [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172],
  [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162],
  [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10],
  
  // Eyebrows
  [107, 55], [55, 65], [65, 52], [52, 53], [53, 46],
  [46, 124], [124, 110], [110, 25], [25, 24], [24, 23],
  [23, 22], [22, 26], [26, 112], [112, 233], [233, 243],
  [243, 190], [190, 56], [56, 28], [28, 27], [27, 29],
  [29, 30], [30, 247], [247, 130], [130, 113], [113, 226],
  
  // Eyes
  [226, 31], [31, 228], [228, 229], [229, 230], [230, 231],
  [231, 232], [232, 233], [233, 244], [244, 143], [143, 111],
  [111, 117], [117, 118], [118, 119], [119, 120], [120, 121],
  [121, 122], [122, 123], [123, 46], [46, 226],
  
  // Nose
  [198, 420], [420, 134], [134, 51], [51, 5], [5, 4], [4, 45], [45, 220],
  [220, 115], [115, 218], [218, 219], [219, 220], [220, 45], [45, 4],
  [4, 275], [275, 440], [440, 457], [457, 399], [399, 437], [437, 417],
  [417, 436], [436, 435], [435, 401], [401, 418], [418, 421], [421, 457],
  [457, 440], [440, 275], [275, 4], [4, 5], [5, 195], [195, 197],
  [197, 196], [196, 5], [5, 4], [4, 45], [45, 220], [220, 115],
  [115, 48], [48, 64], [64, 97], [97, 2], [2, 326], [326, 327],
  
  // Lips
  [327, 423], [423, 425], [425, 427], [427, 380], [380, 428],
  [428, 429], [429, 430], [430, 431], [431, 432], [432, 433],
  [433, 434], [434, 261], [261, 325], [325, 462], [462, 370],
  [370, 369], [369, 368], [368, 367], [367, 307], [307, 306],
  [306, 304], [304, 303], [303, 302], [302, 301], [301, 300],
  [300, 299], [299, 298], [298, 175], [175, 152], [152, 377],
  [377, 400], [400, 378], [378, 379], [379, 365], [365, 397],
  [397, 288], [288, 361], [361, 323], [323, 454], [454, 356],
  [356, 389], [389, 251], [251, 284], [284, 332], [332, 297],
  [297, 338], [338, 10], [10, 109], [109, 67], [67, 103], [103, 54],
  [54, 21], [21, 162], [162, 127], [127, 234], [234, 93], [93, 132],
  [132, 58], [58, 172], [172, 136], [136, 150], [150, 149], [149, 176],
  [176, 148], [148, 152], [152, 175], [175, 95], [95, 88], [88, 87],
  [87, 86], [86, 85], [85, 84], [84, 83], [83, 82], [82, 81], [81, 80],
  [80, 191], [191, 78], [78, 95], [95, 175], [175, 298], [298, 299],
  [299, 300], [300, 301], [301, 302], [302, 303], [303, 304], [304, 306],
  [306, 307], [307, 367], [367, 368], [368, 369], [369, 370], [370, 462],
  [462, 250], [250, 290], [290, 328], [328, 326], [326, 97], [97, 2]
];

export function FaceCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { 
    webcamRef, 
    faceDetections, 
    modelSettings,
    visualizationSettings,
    livenessState
  } = useAppStore();
  
  const { currentStep } = livenessState;
  
  const drawFaceGuide = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentStep: LivenessStep, progress: number) => {
    // Base guide visible during all steps except intro and completed
    if (currentStep !== 'intro' && currentStep !== 'completed') {
      // Overlay for background dimming
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, width, height);
      
      // Draw guide oval/circle for face positioning 
      const centerX = width / 2;
      const centerY = height / 2;
      // Modified to create a more square/circular shape instead of oval
      const radius = Math.min(width, height) * 0.28; // Use same value for both dimensions
      
      // Clear central oval for face positioning
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); // Using arc instead of ellipse for perfect circle
      ctx.clip();
      ctx.clearRect(0, 0, width, height);
      ctx.restore();
      
      // Draw circular border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Draw pulsing effect based on step progress
      if (progress < 100) {
        const pulseSize = Math.sin(Date.now() / 300) * 5 + 5; // Pulsing effect
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + pulseSize, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    
    // Step-specific guides
    switch (currentStep) {
      case 'faceAlignment': {
        // Draw crosshair at center
        const centerX = width / 2;
        const centerY = height / 2;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        
        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY);
        ctx.lineTo(centerX + 10, centerY);
        ctx.stroke();
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 10);
        ctx.lineTo(centerX, centerY + 10);
        ctx.stroke();
        break;
      }
        
      case 'blinkEyes': {
        // Draw eye regions focus
        if (faceDetections.length > 0 && faceDetections[0].landmarks) {
          const landmarks = faceDetections[0].landmarks;
          
          // Eye regions (approximate positions for left and right eyes)
          if (landmarks[33] && landmarks[159] && landmarks[263] && landmarks[386]) {
            // Left eye
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(landmarks[33][0], landmarks[33][1], 25, 15, 0, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Right eye
            ctx.beginPath();
            ctx.ellipse(landmarks[263][0], landmarks[263][1], 25, 15, 0, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Animated effect to suggest blinking
            const blinkOpacity = (Math.sin(Date.now() / 300) + 1) / 2 * 0.5;
            ctx.fillStyle = `rgba(0, 255, 255, ${blinkOpacity})`;
            ctx.beginPath();
            ctx.ellipse(landmarks[33][0], landmarks[33][1], 25, 15, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(landmarks[263][0], landmarks[263][1], 25, 15, 0, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        break;
      }
        
      case 'turnLeft': {
        // Draw arrow pointing left
        const leftArrowX = width * 0.25;
        const arrowY = height * 0.4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(leftArrowX + 20, arrowY - 15);
        ctx.lineTo(leftArrowX - 10, arrowY);
        ctx.lineTo(leftArrowX + 20, arrowY + 15);
        ctx.closePath();
        ctx.fill();
        break;
      }
        
      case 'turnRight': {
        // Draw arrow pointing right
        const rightArrowX = width * 0.75;
        const rightArrowY = height * 0.4;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.moveTo(rightArrowX - 20, rightArrowY - 15);
        ctx.lineTo(rightArrowX + 10, rightArrowY);
        ctx.lineTo(rightArrowX - 20, rightArrowY + 15);
        ctx.fill();
        break;
      }
        
      case 'smile': {
        // Draw smile guide
        if (faceDetections.length > 0 && faceDetections[0].landmarks) {
          const landmarks = faceDetections[0].landmarks;
          
          // Mouth region (approximate position)
          if (landmarks[13] && landmarks[14]) {
            // Mouth highlight
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            
            const mouthCenterX = (landmarks[13][0] + landmarks[14][0]) / 2;
            const mouthCenterY = (landmarks[13][1] + landmarks[14][1]) / 2;
            const mouthWidth = Math.abs(landmarks[13][0] - landmarks[14][0]) * 1.5;
            
            // Draw smile curved line
            ctx.beginPath();
            ctx.arc(mouthCenterX, mouthCenterY - 20, mouthWidth / 2, 0.1 * Math.PI, 0.9 * Math.PI, false);
            ctx.stroke();
            
            // Smile emoji hint
            ctx.font = '30px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('😊', mouthCenterX - 15, mouthCenterY + 50);
          }
        }
        break;
      }
        
      case 'completed': {
        // Success checkmark in center
        const checkX = width / 2;
        const checkY = height / 2;
        
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(checkX - 30, checkY);
        ctx.lineTo(checkX - 10, checkY + 20);
        ctx.lineTo(checkX + 30, checkY - 20);
        ctx.stroke();
        
        // Celebration particles
        for (let i = 0; i < 20; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          const size = Math.random() * 8 + 2;
          
          ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, 2 * Math.PI);
          ctx.fill();
        }
        break;
      }
    }
  }, [faceDetections]);

  const drawStepInstructions = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, currentStep: LivenessStep, progress: number) => {
    // Skip in intro and completed states
    if (currentStep === 'intro' || currentStep === 'completed') return;
    
    // Set up text properties
    ctx.textAlign = 'center';
    
    // Instructions background
    const padding = 15;
    const instructionY = height * 0.85;
    const bgHeight = 70;
    
    // Draw step instructions at the bottom
    let instruction = '';
    
    switch(currentStep) {
      case 'faceAlignment':
        instruction = 'Posicione seu rosto no centro';
        break;
      case 'blinkEyes':
        instruction = 'Pisque os olhos naturalmente';
        break;
      case 'turnLeft':
        instruction = 'Vire a cabeça para a esquerda';
        break;
      case 'turnRight':
        instruction = 'Vire a cabeça para a direita';
        break;
      case 'smile':
        instruction = 'Sorria para a câmera';
        break;
    }
    
    // Background for text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, instructionY - padding, width, bgHeight);
    
    // Progress bar
    const progressBarHeight = 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, instructionY - padding - progressBarHeight, width, progressBarHeight);
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, instructionY - padding - progressBarHeight, (width * progress) / 100, progressBarHeight);
    
    // Main instruction text
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(instruction, width / 2, instructionY + 5);
    
    // Progress indicator
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(`${Math.round(progress)}%`, width / 2, instructionY + 30);
  }, []);

  const drawFaceDetections = useCallback(() => {
    // We're intentionally not drawing any indicators that follow the face
    // This removes the green tracking dot/crosshair that follows user movements
    return; // Do nothing - removes the green tracking indicator
  }, []);

  const drawFaceMesh = useCallback((ctx: CanvasRenderingContext2D, detections: FaceDetection[]) => {
    detections.forEach((detection) => {
      if (!detection.landmarks) return;
      
      // Set line properties
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      
      // Draw facial mesh connections
      FACE_MESH_CONNECTIONS.forEach(([start, end]) => {
        if (detection.landmarks && 
            detection.landmarks[start] && 
            detection.landmarks[end]) {
          ctx.beginPath();
          ctx.moveTo(detection.landmarks[start][0], detection.landmarks[start][1]);
          ctx.lineTo(detection.landmarks[end][0], detection.landmarks[end][1]);
          ctx.stroke();
        }
      });
    });
  }, []);

  const drawKeyLandmarks = useCallback((ctx: CanvasRenderingContext2D, detections: FaceDetection[], step: LivenessStep) => {
    detections.forEach((detection) => {
      if (!detection.landmarks) return;
      
      const landmarks = detection.landmarks;
      
      // Different key indices based on step
      let keyIndices: number[] = [];
      
      if (step === 'blinkEyes') {
        // For blink, highlight eye landmarks
        keyIndices = [
          // Eyes
          33, 133, 159, 145, 263, 362, 386, 374,
        ];
      } else if (step === 'smile') {
        // For smile, highlight mouth landmarks
        keyIndices = [
          // Mouth
          61, 91, 84, 314, 321, 291, 40, 0, 267, 270
        ];
      } else if (step === 'turnLeft' || step === 'turnRight') {
        // For head turning, highlight face contour
        keyIndices = [
          // Face contour
          10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 
          361, 288, 397, 365, 379, 400, 377, 152, 148, 176
        ];
      }
      
      // Draw key landmarks as larger dots
      ctx.fillStyle = '#00FFFF';
      keyIndices.forEach(index => {
        if (landmarks[index]) {
          ctx.beginPath();
          ctx.arc(landmarks[index][0], landmarks[index][1], 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !webcamRef || !webcamRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = webcamRef.current;
    
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw face guide overlay based on current step
    drawFaceGuide(ctx, canvas.width, canvas.height, currentStep, livenessState.progress);
    
    // Call face detection visualization (now a no-op that doesn't actually draw anything)
    if (faceDetections.length > 0) {
      drawFaceDetections();
    }
    
    // Draw face landmarks if we have detections and they're useful for the current step
    if (faceDetections.length > 0 && modelSettings.landmarksEnabled) {
      // Durante o passo de piscar, sorrir ou virar, mostrar a malha facial
      if (['blinkEyes', 'smile', 'turnLeft', 'turnRight'].includes(currentStep) && 
          visualizationSettings.showFaceMesh) {
        drawFaceMesh(ctx, faceDetections);
      }
      
      // Mostrar pontos chave do rosto durante etapas específicas
      if (['blinkEyes', 'smile'].includes(currentStep) && 
          visualizationSettings.showKeyPoints) {
        drawKeyLandmarks(ctx, faceDetections, currentStep);
      }
    }
    
    // Draw step-specific instructions on the canvas
    drawStepInstructions(ctx, canvas.width, canvas.height, currentStep, livenessState.progress);
    
  }, [faceDetections, webcamRef, modelSettings, visualizationSettings, currentStep, livenessState.progress, drawFaceGuide, drawFaceDetections, drawFaceMesh, drawKeyLandmarks, drawStepInstructions]);

  // We don't use isFaceAligned anymore after removing the green tracking dot
  // but keeping this code commented out for reference if needed in the future
  /*
  const isFaceAligned = (
    detections: FaceDetection[],
    canvasWidth: number, 
    canvasHeight: number
  ): boolean => {
    if (detections.length === 0) return false;
    
    const detection = detections[0];
    const { box } = detection;
    
    // Calculate face center position
    const faceCenterX = (box.xMin + box.xMax) / 2;
    const faceCenterY = (box.yMin + box.yMax) / 2;
    
    // Calculate canvas center
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    
    // Calculate distance from center
    const distanceFromCenterX = Math.abs(faceCenterX - canvasCenterX) / canvasWidth;
    const distanceFromCenterY = Math.abs(faceCenterY - canvasCenterY) / canvasHeight;
    
    // Check if face is within center area - increased tolerance to make it easier to align
    // Changed from 0.15 to 0.25 (increasing the acceptable area by ~67%)
    return distanceFromCenterX < 0.25 && distanceFromCenterY < 0.25;
  };
  */

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
}