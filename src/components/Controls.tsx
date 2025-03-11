import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export function Controls() {
  const { 
    modelSettings, 
    updateModelSettings, 
    performanceMetrics,
    visualizationSettings,
    updateVisualizationSettings,
    performanceSettings,
    updatePerformanceSettings,
    themeMode
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  
  // Map throttling level to display text
  const getThrottlingLabel = (level: number) => {
    switch(level) {
      case 1: return 'Responsive';
      case 2: return 'Balanced';
      case 3: return 'Power Saver';
      default: return 'Custom';
    }
  };
  
  // Apply theme-specific styles
  const panelBgClass = themeMode === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-md';
  const tabBgClass = themeMode === 'dark' ? 'bg-gray-700' : 'bg-gray-200';
  const activeTabClass = themeMode === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white';
  const inactiveTabClass = themeMode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-800';
  
  return (
    <div className={`w-full max-w-4xl mx-auto mt-4 p-4 ${panelBgClass} rounded-lg transition-colors duration-300`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Facial Analysis Settings</h2>
        
        {/* Tab Selector */}
        <div className={`flex ${tabBgClass} rounded-lg p-1`}>
          <button
            className={`px-4 py-2 rounded-md ${activeTab === 'basic' ? activeTabClass : inactiveTabClass}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic
          </button>
          <button
            className={`px-4 py-2 rounded-md ${activeTab === 'advanced' ? activeTabClass : inactiveTabClass}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Settings</h3>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="landmarks"
                checked={modelSettings.landmarksEnabled}
                onChange={(e) => 
                  updateModelSettings({ 
                    landmarksEnabled: e.target.checked 
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
              />
              <label htmlFor="landmarks" className="ml-2">
                Face Landmarks
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="expressions"
                checked={modelSettings.expressionsEnabled}
                onChange={(e) => 
                  updateModelSettings({ 
                    expressionsEnabled: e.target.checked 
                  })
                }
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
              />
              <label htmlFor="expressions" className="ml-2">
                Expressions
              </label>
            </div>
          </div>
          
          <div>
            <label className="block mb-1">
              Detection Confidence: {modelSettings.detectionConfidence.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={modelSettings.detectionConfidence}
              onChange={(e) => 
                updateModelSettings({ 
                  detectionConfidence: parseFloat(e.target.value) 
                })
              }
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div>
            <label className="block mb-1">
              Maximum Faces: {modelSettings.maxFaces}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={modelSettings.maxFaces}
              onChange={(e) => 
                updateModelSettings({ 
                  maxFaces: parseInt(e.target.value) 
                })
              }
              className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {activeTab === 'advanced' && (
            <>
              <div className="mt-6 border-t border-gray-700 pt-4">
                <h4 className="font-medium mb-2">Visualization Settings</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showBoundingBox"
                      checked={visualizationSettings.showBoundingBox}
                      onChange={(e) => 
                        updateVisualizationSettings({ 
                          showBoundingBox: e.target.checked 
                        })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                    />
                    <label htmlFor="showBoundingBox" className="ml-2">
                      Bounding Box
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showMesh"
                      checked={visualizationSettings.showFaceMesh}
                      onChange={(e) => 
                        updateVisualizationSettings({ 
                          showFaceMesh: e.target.checked 
                        })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                    />
                    <label htmlFor="showMesh" className="ml-2">
                      Facial Mesh
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showKeyPoints"
                      checked={visualizationSettings.showKeyPoints}
                      onChange={(e) => 
                        updateVisualizationSettings({ 
                          showKeyPoints: e.target.checked 
                        })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                    />
                    <label htmlFor="showKeyPoints" className="ml-2">
                      Key Points
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showExpressionBars"
                      checked={visualizationSettings.showExpressionBars}
                      onChange={(e) => 
                        updateVisualizationSettings({ 
                          showExpressionBars: e.target.checked 
                        })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                    />
                    <label htmlFor="showExpressionBars" className="ml-2">
                      Expression Bars
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-medium mb-2">Performance Settings</h4>
                
                <div>
                  <label className="block mb-1">
                    Throttling: {getThrottlingLabel(performanceSettings.throttlingLevel)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={performanceSettings.throttlingLevel}
                    onChange={(e) => 
                      updatePerformanceSettings({ 
                        throttlingLevel: parseInt(e.target.value) 
                      })
                    }
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Responsive</span>
                    <span>Balanced</span>
                    <span>Power Saver</span>
                  </div>
                </div>
                
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="useWebWorker"
                    checked={performanceSettings.useWebWorker}
                    onChange={(e) => 
                      updatePerformanceSettings({ 
                        useWebWorker: e.target.checked 
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-600"
                  />
                  <label htmlFor="useWebWorker" className="ml-2">
                    Use Web Worker (Separate Thread)
                  </label>
                </div>
                
                <div className="text-xs mt-2 text-gray-400">
                  <p>Landmark Update: {performanceSettings.landmarkThrottleMs}ms</p>
                  <p>Expression Update: {performanceSettings.expressionThrottleMs}ms</p>
                  <p>Processing: {performanceSettings.useWebWorker ? 'Background Thread' : 'Main Thread'}</p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Performance Metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Processing Performance</h3>
          
          <div className={`${themeMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-3 rounded-lg mb-4`}>
            <div className="flex justify-between mb-1">
              <span>FPS:</span>
              <span className={`font-mono font-bold ${performanceMetrics.fps > 24 ? 'text-green-400' : performanceMetrics.fps > 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                {performanceMetrics.fps.toFixed(1)}
              </span>
            </div>
            
            {/* FPS Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
              <div 
                className={`h-2.5 rounded-full ${performanceMetrics.fps > 24 ? 'bg-green-500' : performanceMetrics.fps > 15 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (performanceMetrics.fps / 30) * 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Detection Time:</span>
              <span className="font-mono">{performanceMetrics.detectTime.toFixed(1)} ms</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Landmark Detection:</span>
              <span className="font-mono">{performanceMetrics.landmarkTime.toFixed(1)} ms</span>
            </div>
            
            <div className="flex justify-between items-center mt-4 font-medium">
              <span>Total Processing Time:</span>
              <span className="font-mono font-bold">
                {(performanceMetrics.detectTime + performanceMetrics.landmarkTime).toFixed(1)} ms
              </span>
            </div>
          </div>
          
          {activeTab === 'advanced' && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="font-medium mb-2">Debug Information</h4>
              
              <div className={`text-xs font-mono ${themeMode === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} p-2 rounded overflow-x-auto`}>
                <p>TensorFlow.js Backend: WebGL</p>
                <p>Faces detected: {performanceMetrics.fps > 0 ? 'Yes' : 'No'}</p>
                <p>Canvas dimensions: {document.querySelector('canvas')?.width || 0} x {document.querySelector('canvas')?.height || 0}</p>
                <p>Browser: {navigator.userAgent.split(' ').slice(-1)[0]}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}