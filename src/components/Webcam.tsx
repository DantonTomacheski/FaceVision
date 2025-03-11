import { useCallback, useRef, useState } from 'react';
import ReactWebcam from 'react-webcam';
import { useAppStore } from '../store/useAppStore';

export function Webcam() {
  const reactWebcamRef = useRef<ReactWebcam>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setWebcamRef } = useAppStore();
  
  // Configuração da webcam - ajustada para dispositivos móveis
  const videoConstraints = {
    width: { ideal: 720 },
    height: { ideal: 720 },
    facingMode: "user",
    aspectRatio: 1 // 1:1 aspect ratio for mobile
  };
  
  // Quando a webcam estiver pronta
  const handleUserMedia = useCallback(() => {
    setIsReady(true);
    setError(null);
    
    // Obter o elemento de vídeo da referência da ReactWebcam
    if (reactWebcamRef.current) {
      const videoElement = reactWebcamRef.current.video;
      if (videoElement) {
        // Definir o elemento de vídeo no store para uso na detecção facial
        setWebcamRef({ current: videoElement } as React.RefObject<HTMLVideoElement>);
        
        // Importante: verificar quando o vídeo realmente tem dimensões
        const checkVideo = () => {
          if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            console.log(`Webcam ready with dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
          } else {
            console.log("Waiting for video dimensions...");
            setTimeout(checkVideo, 100);
          }
        };
        
        checkVideo();
      }
    }
  }, [setWebcamRef]);
  
  // Tratamento de erros da webcam
  const handleError = useCallback((err: string | DOMException) => {
    setIsReady(false);
    const errorMessage = err instanceof DOMException ? err.message : String(err);
    setError(errorMessage);
    console.error("Webcam error:", errorMessage);
  }, []);
  
  return (
    <div className="webcam-container relative w-full h-full overflow-hidden">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 rounded-xl">
          <div className="text-center p-6">
            <p className="text-red-500 text-lg mb-4">Erro ao acessar a webcam</p>
            <p className="text-white mb-6">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}
      
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 z-10 rounded-xl">
          <div className="text-center">
            <div className="spinner h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Iniciando a câmera...</p>
          </div>
        </div>
      )}
      
      <ReactWebcam
        ref={reactWebcamRef}
        audio={false}
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        onUserMediaError={handleError}
        className="w-full h-full object-cover"
        mirrored={true} // Espelhar para experiência mais natural em selfies
        screenshotFormat="image/jpeg"
        screenshotQuality={1}
      />
    </div>
  );
}