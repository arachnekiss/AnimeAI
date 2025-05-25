import { useState, useEffect, useCallback, useRef } from 'react';
import { Character, AnimationState, Emotion } from '../../engine/types';
import { AnimationController } from '../../engine/core/AnimationController';
import { WebGLRenderer } from '../../engine/rendering/WebGLRenderer';

interface AnimationEngineState {
  isInitialized: boolean;
  isRunning: boolean;
  currentState: AnimationState;
  activeEmotions: Emotion[];
  error: string | null;
  performance: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
  };
}

interface AnimationEngineControls {
  initialize: (canvas: HTMLCanvasElement, character: Character) => Promise<boolean>;
  start: () => void;
  stop: () => void;
  triggerAnimation: (type: string, data: any) => void;
  setEmotions: (emotions: Emotion[]) => void;
  setState: (state: AnimationState) => void;
  setLookTarget: (target: { x: number; y: number }) => void;
  resetLookTarget: () => void;
  takePicture: () => string | null;
  cleanup: () => void;
}

interface UseAnimationEngineOptions {
  autoStart?: boolean;
  enablePerformanceMonitoring?: boolean;
  targetFPS?: number;
  enableInteraction?: boolean;
}

export const useAnimationEngine = (
  options: UseAnimationEngineOptions = {}
): [AnimationEngineState, AnimationEngineControls] => {
  const {
    autoStart = true,
    enablePerformanceMonitoring = true,
    targetFPS = 60,
    enableInteraction = true
  } = options;

  const [state, setState] = useState<AnimationEngineState>({
    isInitialized: false,
    isRunning: false,
    currentState: 'idle',
    activeEmotions: [],
    error: null,
    performance: {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0
    }
  });

  const animationControllerRef = useRef<AnimationController | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const performanceRef = useRef({
    lastFrameTime: 0,
    frameCount: 0,
    fpsUpdateTime: 0
  });

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!animationControllerRef.current || !rendererRef.current || !state.isInitialized) {
      return;
    }

    try {
      const deltaTime = currentTime - performanceRef.current.lastFrameTime;
      
      // Limit frame rate if specified
      if (targetFPS < 60) {
        const targetFrameTime = 1000 / targetFPS;
        if (deltaTime < targetFrameTime) {
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      // Update animation controller
      animationControllerRef.current.update(deltaTime);

      // Get current transforms and render
      const boneTransforms = animationControllerRef.current.getBoneTransforms();
      rendererRef.current.render(boneTransforms);

      // Update performance metrics
      if (enablePerformanceMonitoring) {
        performanceRef.current.frameCount++;
        
        if (currentTime - performanceRef.current.fpsUpdateTime >= 1000) {
          const fps = Math.round(
            (performanceRef.current.frameCount * 1000) / 
            (currentTime - performanceRef.current.fpsUpdateTime)
          );
          
          setState(prevState => ({
            ...prevState,
            performance: {
              ...prevState.performance,
              fps,
              frameTime: deltaTime
            }
          }));

          performanceRef.current.frameCount = 0;
          performanceRef.current.fpsUpdateTime = currentTime;
        }
      }

      // Update current state and emotions
      const currentState = animationControllerRef.current.getCurrentState();
      const activeEmotions = animationControllerRef.current.getActiveEmotions();
      
      setState(prevState => ({
        ...prevState,
        currentState,
        activeEmotions,
        error: null
      }));

      performanceRef.current.lastFrameTime = currentTime;
    } catch (error) {
      console.error('Animation loop error:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Animation error'
      }));
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [state.isInitialized, enablePerformanceMonitoring, targetFPS]);

  // Initialize animation engine
  const initialize = useCallback(async (canvas: HTMLCanvasElement, character: Character): Promise<boolean> => {
    try {
      setState(prevState => ({
        ...prevState,
        error: null
      }));

      // Clean up existing instances
      if (animationControllerRef.current) {
        animationControllerRef.current.cleanup();
      }
      if (rendererRef.current) {
        rendererRef.current.cleanup();
      }

      // Initialize WebGL renderer
      const renderer = new WebGLRenderer(canvas);
      await renderer.initialize();
      rendererRef.current = renderer;

      // Initialize animation controller
      const animationController = new AnimationController(character);
      animationControllerRef.current = animationController;

      // Load character into renderer
      await renderer.loadCharacter(character);

      canvasRef.current = canvas;

      setState(prevState => ({
        ...prevState,
        isInitialized: true,
        currentState: 'idle',
        activeEmotions: []
      }));

      // Auto-start if enabled
      if (autoStart) {
        start();
      }

      console.log('Animation engine initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize animation engine:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Initialization failed',
        isInitialized: false
      }));
      return false;
    }
  }, [autoStart]);

  // Start animation loop
  const start = useCallback(() => {
    if (!state.isInitialized || state.isRunning) return;

    setState(prevState => ({
      ...prevState,
      isRunning: true
    }));

    performanceRef.current.lastFrameTime = performance.now();
    performanceRef.current.fpsUpdateTime = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    console.log('Animation engine started');
  }, [state.isInitialized, state.isRunning, animate]);

  // Stop animation loop
  const stop = useCallback(() => {
    if (!state.isRunning) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    setState(prevState => ({
      ...prevState,
      isRunning: false
    }));

    console.log('Animation engine stopped');
  }, [state.isRunning]);

  // Trigger animation
  const triggerAnimation = useCallback((type: string, data: any) => {
    if (!animationControllerRef.current) {
      console.warn('Animation controller not initialized');
      return;
    }

    try {
      animationControllerRef.current.triggerAnimation(type, data);
    } catch (error) {
      console.error('Failed to trigger animation:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Animation trigger failed'
      }));
    }
  }, []);

  // Set emotions
  const setEmotions = useCallback((emotions: Emotion[]) => {
    if (!animationControllerRef.current) {
      console.warn('Animation controller not initialized');
      return;
    }

    try {
      animationControllerRef.current.setEmotions(emotions);
    } catch (error) {
      console.error('Failed to set emotions:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Failed to set emotions'
      }));
    }
  }, []);

  // Set animation state
  const setAnimationState = useCallback((animationState: AnimationState) => {
    if (!animationControllerRef.current) {
      console.warn('Animation controller not initialized');
      return;
    }

    try {
      animationControllerRef.current.setState(animationState);
    } catch (error) {
      console.error('Failed to set animation state:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Failed to set state'
      }));
    }
  }, []);

  // Set look target for eye tracking
  const setLookTarget = useCallback((target: { x: number; y: number }) => {
    if (!animationControllerRef.current || !enableInteraction) return;

    try {
      animationControllerRef.current.setLookTarget(target);
    } catch (error) {
      console.error('Failed to set look target:', error);
    }
  }, [enableInteraction]);

  // Reset look target
  const resetLookTarget = useCallback(() => {
    if (!animationControllerRef.current) return;

    try {
      animationControllerRef.current.resetLookTarget();
    } catch (error) {
      console.error('Failed to reset look target:', error);
    }
  }, []);

  // Take screenshot
  const takePicture = useCallback((): string | null => {
    if (!canvasRef.current) {
      console.warn('Canvas not available for screenshot');
      return null;
    }

    try {
      return canvasRef.current.toDataURL('image/png');
    } catch (error) {
      console.error('Failed to take picture:', error);
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Screenshot failed'
      }));
      return null;
    }
  }, []);

  // Cleanup resources
  const cleanup = useCallback(() => {
    stop();

    if (animationControllerRef.current) {
      animationControllerRef.current.cleanup();
      animationControllerRef.current = null;
    }

    if (rendererRef.current) {
      rendererRef.current.cleanup();
      rendererRef.current = null;
    }

    canvasRef.current = null;

    setState({
      isInitialized: false,
      isRunning: false,
      currentState: 'idle',
      activeEmotions: [],
      error: null,
      performance: {
        fps: 0,
        frameTime: 0,
        memoryUsage: 0
      }
    });

    console.log('Animation engine cleaned up');
  }, [stop]);

  // Update memory usage periodically
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;

    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setState(prevState => ({
          ...prevState,
          performance: {
            ...prevState.performance,
            memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024 // MB
          }
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [enablePerformanceMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle visibility change to pause/resume animation
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isRunning) {
        stop();
      } else if (!document.hidden && state.isInitialized && !state.isRunning && autoStart) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isRunning, state.isInitialized, autoStart, start, stop]);

  const controls: AnimationEngineControls = {
    initialize,
    start,
    stop,
    triggerAnimation,
    setEmotions,
    setState: setAnimationState,
    setLookTarget,
    resetLookTarget,
    takePicture,
    cleanup
  };

  return [state, controls];
};
