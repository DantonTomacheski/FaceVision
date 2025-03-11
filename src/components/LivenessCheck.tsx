import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LivenessStep } from '../types';

export function LivenessCheck() {
  const { 
    livenessState, 
    startLivenessCheck, 
    nextLivenessStep, 
    resetLivenessCheck,
    faceDetections
  } = useAppStore();
  
  const { currentStep, progress, stepCompleted } = livenessState;
  const [animateSuccess, setAnimateSuccess] = useState(false);
  
  useEffect(() => {
    // Quando o progresso atinge 100%, mostrar animação de sucesso e ir para o próximo passo
    if (progress >= 100 && currentStep !== 'completed') {
      setAnimateSuccess(true);
      
      const timer = setTimeout(() => {
        nextLivenessStep();
        setAnimateSuccess(false);
      }, 1200); // Tempo para mostrar a animação
      
      return () => clearTimeout(timer);
    }
  }, [progress, currentStep, nextLivenessStep]);
  
  // Definições para cada etapa
  const stepDefinitions = {
    intro: {
      title: 'Verificação de Vivacidade',
      description: 'Vamos verificar se você é uma pessoa real através de alguns movimentos faciais simples.',
      instruction: 'Esta verificação é rápida e segura. Siga as instruções na tela.',
      icon: '👤',
      mainAnimation: 'transform-gpu transition-all duration-1000 animate-float',
      illustrationPath: "/lock-shield.svg", // Fictício: use uma imagem real
      actionLabel: 'Iniciar Verificação',
      colors: 'from-purple-500 to-indigo-600'
    },
    faceAlignment: {
      title: 'Posicione seu Rosto',
      description: 'Centralize seu rosto dentro do quadro.',
      instruction: 'Fique em um ambiente bem iluminado e olhe diretamente para a câmera.',
      icon: '🎯',
      mainAnimation: 'animate-pulse',
      overlay: 'face-positioning-guide',
      actionLabel: 'Posicionando...',
      colors: 'from-blue-500 to-sky-600'
    },
    blinkEyes: {
      title: 'Pisque os Olhos',
      description: 'Pisque ambos os olhos naturalmente.',
      instruction: 'Mantenha seu rosto centralizado e pisque algumas vezes.',
      icon: '👁️',
      mainAnimation: 'animate-blink-suggestion',
      actionLabel: 'Piscando...',
      colors: 'from-indigo-500 to-blue-600'
    },
    turnLeft: {
      title: 'Vire Levemente à Esquerda',
      description: 'Gire levemente sua cabeça para a esquerda.',
      instruction: 'Movimente sua cabeça lentamente e volte para o centro.',
      icon: '↩️',
      mainAnimation: 'animate-slide-left',
      actionLabel: 'Virando...',
      colors: 'from-sky-500 to-cyan-600'
    },
    turnRight: {
      title: 'Vire Levemente à Direita',
      description: 'Gire levemente sua cabeça para a direita.',
      instruction: 'Movimente sua cabeça lentamente e volte para o centro.',
      icon: '↪️',
      mainAnimation: 'animate-slide-right',
      actionLabel: 'Virando...',
      colors: 'from-cyan-500 to-teal-600'
    },
    smile: {
      title: 'Sorria',
      description: 'Dê um sorriso natural para a câmera.',
      instruction: 'Mantenha o rosto centralizado enquanto sorri.',
      icon: '😊',
      mainAnimation: 'animate-pulse',
      actionLabel: 'Sorrindo...',
      colors: 'from-teal-500 to-emerald-600'
    },
    completed: {
      title: 'Verificação Concluída!',
      description: 'Sua verificação de vivacidade foi bem-sucedida.',
      instruction: 'Você pode continuar com o processo de autenticação.',
      icon: '✅',
      mainAnimation: 'animate-bounce',
      actionLabel: 'Nova Verificação',
      colors: 'from-emerald-500 to-green-600'
    }
  };

  // Informações da etapa atual
  const currentStepInfo = stepDefinitions[currentStep];

  // Calcular progresso total da verificação
  const calculateTotalProgress = () => {
    const steps = ['faceAlignment', 'blinkEyes', 'turnLeft', 'turnRight', 'smile'];
    const completedSteps = steps.filter(step => stepCompleted[step as LivenessStep]).length;
    const currentStepIndex = steps.indexOf(currentStep as string);
    
    if (currentStep === 'completed') return 100;
    if (currentStep === 'intro') return 0;
    
    const baseProgress = (completedSteps / steps.length) * 100;
    const currentStepContribution = (progress / 100) * (1 / steps.length) * 100;
    
    return Math.min(baseProgress + currentStepContribution, 99);
  };
  
  // Verificar se existe uma detecção de rosto
  const faceDetected = faceDetections.length > 0;
  
  // Determinar a ordem dos passos para o indicador de progresso
  const stepOrder: LivenessStep[] = ['faceAlignment', 'blinkEyes', 'turnLeft', 'turnRight', 'smile'];
  
  // Determinar o índice do passo atual (para o indicador de progresso)
  const currentStepIndex = stepOrder.indexOf(currentStep as LivenessStep);
  
  return (
    <div className={`liveness-check w-full max-w-lg mx-auto mt-4 overflow-hidden rounded-2xl shadow-xl 
                     transition-all duration-500 bg-gradient-to-br ${currentStepInfo.colors}`}>
      
      {/* Contêiner principal com glassmorphism */}
      <div className="backdrop-blur-sm backdrop-filter bg-white/10 p-6">
        
        {/* Cabeçalho com ícone animado */}
        <div className="text-center mb-6 relative">
          <div className={`icon-container mx-auto mb-4 h-16 w-16 flex items-center justify-center 
                          rounded-full bg-white/20 backdrop-blur-md ${currentStepInfo.mainAnimation}`}>
            <span className="text-3xl">{currentStepInfo.icon}</span>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-md">{currentStepInfo.title}</h2>
          <p className="text-white/90 text-sm">{currentStepInfo.description}</p>
          
          {/* Indicador de progresso circular - apenas exibido durante as etapas principais */}
          {currentStep !== 'intro' && currentStep !== 'completed' && (
            <div className="absolute top-0 right-0 w-12 h-12">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <circle 
                  cx="18" cy="18" r="16" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.3)" 
                  strokeWidth="2"
                />
                <circle 
                  cx="18" cy="18" r="16" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeDasharray="100" 
                  strokeDashoffset={100 - progress}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
                <text 
                  x="18" y="20" 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill="white"
                  className="text-xs font-bold"
                >
                  {Math.round(progress)}%
                </text>
              </svg>
            </div>
          )}
        </div>
        
        {/* Indicador de progresso de etapas */}
        {currentStep !== 'intro' && (
          <div className="steps-progress mb-6">
            <div className="relative flex justify-between items-center">
              <div className="absolute h-1 bg-white/30 w-full top-1/2 transform -translate-y-1/2 z-0"></div>
              
              {stepOrder.map((step, index) => {
                // Determinar o estado do indicador (completo, atual, pendente)
                const isCompleted = stepCompleted[step];
                const isCurrent = currentStep === step;
                const isPending = !isCompleted && !isCurrent;
                
                return (
                  <div 
                    key={step} 
                    className={`step-indicator z-10 flex flex-col items-center space-y-1 transition-all duration-300`}
                  >
                    <div 
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                              transition-all duration-300 transform
                              ${isCompleted ? 'bg-white text-emerald-600 scale-110' : 
                                isCurrent ? 'bg-white/20 border-2 border-white ring-4 ring-white/20 scale-125' : 
                                'bg-white/20'}`}
                    >
                      {isCompleted && <span>✓</span>}
                    </div>
                    
                    <span className={`text-xs mt-1 ${isCurrent ? 'text-white font-bold' : 'text-white/70'}`}>
                      {index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Caixa de instruções com efeito de vidro */}
        <div className="instruction-box bg-white/10 backdrop-blur-sm p-4 rounded-xl mb-5 border border-white/20 shadow-inner">
          <p className="text-center text-white">{currentStepInfo.instruction}</p>
        </div>
        
        {/* Barra de progresso total */}
        <div className="total-progress-container mb-5">
          <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500 ease-out"
              style={{ width: `${calculateTotalProgress()}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>Progresso</span>
            <span>{Math.round(calculateTotalProgress())}%</span>
          </div>
        </div>
        
        {/* Aviso se não houver detecção de rosto */}
        {!faceDetected && currentStep !== 'intro' && currentStep !== 'completed' && (
          <div className="mt-4 py-2 px-4 bg-orange-500/20 backdrop-blur-sm border border-orange-300/30 
                        rounded-lg text-white text-sm text-center animate-pulse">
            <p>Nenhum rosto detectado. Posicione seu rosto na câmera.</p>
          </div>
        )}
        
        {/* Botões de ação com efeito de vidro */}
        <div className="actions mt-6 flex justify-center space-x-4">
          {currentStep === 'intro' && (
            <button
              onClick={startLivenessCheck}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm 
                        border border-white/30 rounded-full text-white font-semibold 
                        transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {currentStepInfo.actionLabel}
            </button>
          )}
          
          {currentStep === 'completed' && (
            <button
              onClick={resetLivenessCheck}
              className="px-6 py-3 bg-white hover:bg-opacity-90 backdrop-blur-sm
                        rounded-full text-emerald-600 font-semibold 
                        transition-all duration-300 hover:scale-105 shadow-lg"
            >
              {currentStepInfo.actionLabel}
            </button>
          )}
          
          {currentStep !== 'intro' && currentStep !== 'completed' && (
            <button
              onClick={resetLivenessCheck}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm
                        border border-white/20 rounded-full text-white text-sm
                        transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
      
      {/* Elementos visuais interativos específicos para cada etapa */}
      <div className="step-specific-elements absolute inset-0 pointer-events-none">
        {/* Guia de posicionamento de rosto */}
        {currentStep === 'faceAlignment' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-48 h-48 border-2 border-dashed border-white/70 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          w-36 h-36 border border-white/40 rounded-full"></div>
          </div>
        )}
        
        {/* Indicador de piscar */}
        {currentStep === 'blinkEyes' && (
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex space-x-12">
              <div className="w-6 h-6 bg-white/30 rounded-full animate-blink-left"></div>
              <div className="w-6 h-6 bg-white/30 rounded-full animate-blink-right"></div>
            </div>
          </div>
        )}
        
        {/* Indicadores de direção para virar */}
        {currentStep === 'turnLeft' && (
          <div className="absolute top-1/3 left-1/4 transform -translate-y-1/2">
            <div className="w-8 h-8 text-white/70 animate-bounce-left">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </div>
          </div>
        )}
        
        {currentStep === 'turnRight' && (
          <div className="absolute top-1/3 right-1/4 transform -translate-y-1/2">
            <div className="w-8 h-8 text-white/70 animate-bounce-right">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
              </svg>
            </div>
          </div>
        )}
        
        {/* Indicador de sorriso */}
        {currentStep === 'smile' && (
          <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="text-4xl animate-pulse">😊</div>
          </div>
        )}
      </div>
      
      {/* Efeito de sucesso quando uma etapa é concluída */}
      {animateSuccess && (
        <div className="success-effect absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-white rounded-full animate-success-pulse flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
        </div>
      )}
      
      {/* Efeito de celebração quando completa todas as etapas */}
      {currentStep === 'completed' && (
        <div className="celebration absolute inset-0 pointer-events-none overflow-hidden">
          <div className="fireworks">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="confetti absolute"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: `hsl(${Math.random() * 360}, 100%, 70%)`,
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  transform: `rotate(${Math.random() * 360}deg)`,
                  opacity: Math.random(),
                  animation: `confetti-fall ${Math.random() * 3 + 2}s linear infinite`
                }}
              />
            ))}
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="success-badge bg-white/20 backdrop-blur-xl p-5 rounded-full animate-bounce-slow">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center">
                <span className="text-emerald-600 text-3xl">✓</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}