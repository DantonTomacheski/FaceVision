import { useEffect, useState, useMemo } from 'react';
import { Webcam } from './components/Webcam';
import { FaceCanvas } from './components/FaceCanvas';
import { useFaceDetection } from './hooks/useFaceDetection';
import { useWorkerFaceDetection } from './hooks/useWorkerFaceDetection';
import { useAppStore } from './store/useAppStore';
import './App.css';

function App() {
  const { faceDetections, performanceSettings, livenessState, startLivenessCheck, nextLivenessStep, resetLivenessCheck } = useAppStore();
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Use either the regular face detection hook or the worker-based hook
  const useDetectionHook = performanceSettings.useWebWorker ? 
    useWorkerFaceDetection : useFaceDetection;
  
  // Use the hook to start face detection with useMemo to prevent dependencies issues
  const hookResult = useDetectionHook();
  const startFaceDetection = useMemo(() => {
    return 'startFaceDetection' in hookResult ? 
      hookResult.startFaceDetection : 
      () => console.warn('Face detection not available');
  }, [hookResult]);
  
  // Show loader while app is initializing
  useEffect(() => {
    // Simulating app initialization - in a real app this would check if models are loaded
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Auto-start verification when face is detected in intro step
  useEffect(() => {
    if (isAppReady && 
        livenessState.currentStep === 'intro' && 
        faceDetections.length > 0) {
      // Start liveness check automatically when face is detected
      startLivenessCheck();
    }
  }, [isAppReady, faceDetections, livenessState.currentStep, startLivenessCheck]);
  
  // Force restart face detection after component is fully mounted
  // This helps fix the detection not working on initial load
  useEffect(() => {
    if (isAppReady) {
      // Short delay to ensure everything is initialized
      const timer = setTimeout(() => {
        startFaceDetection();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isAppReady, startFaceDetection]);
  
  // Determine background based on current liveness step
  const getBgGradient = () => {
    if (!isAppReady) return 'bg-gradient-to-br from-blue-900 to-indigo-900';
    
    switch (livenessState.currentStep) {
      case 'intro':
        return 'bg-gradient-to-br from-indigo-900 to-purple-900';
      case 'completed':
        return 'bg-gradient-to-br from-emerald-800 to-teal-900';
      case 'faceAlignment':
        return 'bg-gradient-to-br from-blue-900 to-indigo-900';
      case 'blinkEyes':
        return 'bg-gradient-to-br from-blue-800 to-indigo-900';
      case 'turnLeft':
      case 'turnRight':
        return 'bg-gradient-to-br from-sky-800 to-blue-900';
      case 'smile':
        return 'bg-gradient-to-br from-teal-800 to-emerald-900';
      default:
        return 'bg-gradient-to-br from-gray-900 to-blue-900';
    }
  };
  
  // Obter o título e descrição da etapa atual
  const getStepContent = () => {
    switch (livenessState.currentStep) {
      case 'intro':
        return {
          title: 'Verificação de Identidade',
          description: 'Posicione seu rosto para iniciar a verificação',
          buttonText: 'Iniciar Verificação'
        };
      case 'faceAlignment':
        return {
          title: 'Posicione seu Rosto',
          description: 'Centralize seu rosto no quadro',
          buttonText: 'Continuar'
        };
      case 'blinkEyes':
        return {
          title: 'Pisque os Olhos',
          description: 'Pisque naturalmente algumas vezes',
          buttonText: 'Continuar'
        };
      case 'turnLeft':
        return {
          title: 'Vire à Esquerda',
          description: 'Gire levemente sua cabeça para a esquerda',
          buttonText: 'Continuar'
        };
      case 'turnRight':
        return {
          title: 'Vire à Direita',
          description: 'Gire levemente sua cabeça para a direita',
          buttonText: 'Continuar'
        };
      case 'smile':
        return {
          title: 'Sorria',
          description: 'Dê um sorriso natural para a câmera',
          buttonText: 'Continuar'
        };
      case 'completed':
        return {
          title: 'Verificação Concluída!',
          description: 'Sua identidade foi confirmada com sucesso',
          buttonText: 'Nova Verificação'
        };
      default:
        return {
          title: 'Verificação de Identidade',
          description: 'Prova de vivacidade',
          buttonText: 'Continuar'
        };
    }
  };
  
  // Lógica de ação do botão principal
  const handlePrimaryAction = () => {
    const { currentStep, progress } = livenessState;
    
    if (currentStep === 'intro') {
      startLivenessCheck();
    } else if (currentStep === 'completed') {
      resetLivenessCheck();
    } else if (progress >= 100) {
      nextLivenessStep();
    }
  };
  
  // Auto-continue to next step when current step is completed
  useEffect(() => {
    if (livenessState.progress >= 100 && 
        livenessState.currentStep !== 'intro' && 
        livenessState.currentStep !== 'completed') {
      // Add a small delay to show completion state
      const timer = setTimeout(() => {
        nextLivenessStep();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [livenessState.progress, livenessState.currentStep, nextLivenessStep]);
  
  const stepContent = getStepContent();
  const { currentStep, progress } = livenessState;
  
  // Calcula o progresso total da jornada
  const calculateTotalProgress = () => {
    const steps = ['faceAlignment', 'blinkEyes', 'turnLeft', 'turnRight', 'smile'];
    const currentIndex = steps.indexOf(currentStep as string);
    const completedSteps = steps.filter((_, index) => 
      index < currentIndex || (index === currentIndex && progress === 100)
    ).length;
    
    if (currentStep === 'intro') return 0;
    if (currentStep === 'completed') return 100;
    
    return (((completedSteps * 100) + (currentIndex === steps.indexOf(currentStep as string) ? progress : 0)) / steps.length);
  };
  
  return (
    <div className={`min-h-screen ${getBgGradient()} text-white transition-all duration-700`}>
      {!isAppReady ? (
        // Loading screen
        <div className="h-screen flex flex-col items-center justify-center">
          <div className="w-20 h-20 border-t-4 border-blue-500 border-solid rounded-full animate-spin mb-6"></div>
          <h2 className="text-xl font-semibold text-white mb-2">Carregando</h2>
          <p className="text-blue-300">Inicializando módulos de verificação...</p>
        </div>
      ) : (
        // Main application - mobile-optimized layout
        <div className="h-full min-h-screen flex flex-col max-w-[500px] mx-auto">
          {/* Progress bar - top of screen for all steps */}
          {currentStep !== 'intro' && currentStep !== 'completed' && (
            <div className="w-full bg-black/20 h-1.5 fixed top-0 left-0 z-10">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${calculateTotalProgress()}%` }}
              />
            </div>
          )}
          
          {/* Header with step information - only show outside of verification */}
          {(currentStep === 'intro' || currentStep === 'completed') && (
            <header 
              className="pt-6 px-4 text-center"
              aria-live="polite"
            >
              <h1 className="text-2xl font-bold mb-2">{stepContent.title}</h1>
              <p className="text-blue-200 mb-6">{stepContent.description}</p>
            </header>
          )}
          
          {/* Verification step header - only show during verification steps */}
          {currentStep !== 'intro' && currentStep !== 'completed' && (
            <header 
              className="pt-8 px-4 text-center mb-2"
              aria-live="polite"
            >
              <h1 className="text-xl font-bold mb-1">{stepContent.title}</h1>
              <p className="text-blue-200 text-sm mb-2">{stepContent.description}</p>
            </header>
          )}
          
          {/* Video container - take more vertical space on mobile */}
          <div className="video-container relative rounded-xl overflow-hidden flex-grow flex flex-col justify-center mx-4 mb-4">
            {/* Show verification progress on video */}
            {currentStep !== 'intro' && currentStep !== 'completed' && (
              <div 
                className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-black/40 px-3 py-1 rounded-full text-xs font-medium"
                aria-live="polite"
              >
                {progress < 100 ? `${Math.floor(progress)}%` : 'Concluído!'}
              </div>
            )}
            
            {/* Equal size for 1:1 aspect ratio, looks better on mobile */}
            <div className="aspect-square w-full mx-auto overflow-hidden relative rounded-xl">
              <Webcam />
              <FaceCanvas />
            </div>
            
            {/* Show validation messages */}
            {currentStep !== 'intro' && currentStep !== 'completed' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center w-full px-6">
                {progress < 10 && currentStep === 'faceAlignment' && (
                  <div className="bg-black/50 py-2 px-4 rounded-xl text-sm animate-pulse">
                    Centralize seu rosto no círculo
                  </div>
                )}
                {progress >= 80 && progress < 100 && (
                  <div className="bg-black/50 py-2 px-4 rounded-xl text-sm">
                    Quase lá...
                  </div>
                )}
                {progress === 100 && (
                  <div className="bg-green-800/70 py-2 px-4 rounded-xl text-sm font-medium">
                    Etapa concluída com sucesso!
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Action button - fixed at bottom for mobile */}
          <div className="mb-6 mx-4">
            <button
              onClick={handlePrimaryAction}
              disabled={currentStep !== 'intro' && currentStep !== 'completed' && progress < 100}
              className={`
                w-full py-4 rounded-xl font-medium text-white transition-all
                ${progress === 100 || currentStep === 'intro' || currentStep === 'completed'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                  : 'bg-blue-600/50 cursor-not-allowed'
                }
              `}
              aria-live="polite"
            >
              {stepContent.buttonText}
            </button>
            
            {/* Message about webcam permissions - only show on intro */}
            {currentStep === 'intro' && (
              <p className="text-center text-xs mt-4 text-blue-200 px-4">
                A verificação necessita de acesso à sua câmera.
                Todas as etapas são processadas localmente em seu dispositivo.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;