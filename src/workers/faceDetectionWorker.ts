// Web Worker for face detection processing
// This allows the face detection to run in a separate thread from the main UI

import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

// Set up the worker context
const ctx: Worker = self as any;

// Initialize models
let blazeFaceModel: blazeface.BlazeFaceModel | null = null;

// Message handler
ctx.addEventListener('message', async (event: MessageEvent) => {
  const { type, imageData, detectionConfidence, maxFaces, id } = event.data;
  
  // Handle different message types
  switch (type) {
    case 'init':
      await initializeModel();
      ctx.postMessage({ type: 'initialized', success: true });
      break;
      
    case 'detect':
      if (!blazeFaceModel) {
        ctx.postMessage({ 
          type: 'error', 
          message: 'Model not initialized',
          id 
        });
        return;
      }
      
      try {
        // Convert ImageData to tensor
        const tensor = tf.browser.fromPixels(imageData);
        
        // Run face detection
        const predictions = await blazeFaceModel.estimateFaces(tensor, false);
        
        // Free memory
        tensor.dispose();
        
        // Filter by confidence and limit to maxFaces
        const filteredPredictions = predictions
          .filter(pred => pred.probability && pred.probability[0] >= detectionConfidence)
          .slice(0, maxFaces);
        
        // Convert to simplified format
        const faces = filteredPredictions.map(pred => {
          return {
            box: {
              xMin: pred.topLeft[0],
              yMin: pred.topLeft[1],
              xMax: pred.bottomRight[0],
              yMax: pred.bottomRight[1],
              width: pred.bottomRight[0] - pred.topLeft[0],
              height: pred.bottomRight[1] - pred.topLeft[1],
            },
            landmarks: pred.landmarks,
            probability: pred.probability ? pred.probability[0] : 0
          };
        });
        
        // Send results back to main thread
        ctx.postMessage({
          type: 'detection-result',
          faces,
          id
        });
      } catch (error) {
        ctx.postMessage({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          id
        });
      }
      break;
      
    default:
      ctx.postMessage({
        type: 'error',
        message: `Unknown message type: ${type}`,
        id
      });
  }
});

// Initialize the BlazeFace model
async function initializeModel() {
  try {
    // Enable WebGL for better performance if available
    await tf.setBackend('webgl');
    console.log('Using WebGL backend');
  } catch (e) {
    console.log('WebGL acceleration not available, falling back to CPU');
    await tf.setBackend('cpu');
  }
  
  // Load BlazeFace model
  blazeFaceModel = await blazeface.load();
}

// Signal that the worker is ready
ctx.postMessage({ type: 'ready' });