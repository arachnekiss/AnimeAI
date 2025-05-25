import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Character, AnimationState } from '../../engine/types';

interface CharacterCanvasProps {
  character: Character | null;
  animationState: AnimationState;
  emotions: string[];
  onAnimationComplete?: (animationType: string) => void;
  onError?: (error: string) => void;
  className?: string;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export interface CharacterCanvasRef {
  triggerAnimation: (type: string, data: any) => void;
  setEmotions: (emotions: string[]) => void;
  takePicture: () => string | null;
  getStats: () => any;
  getCanvas: () => HTMLCanvasElement | null;
}

interface CanvasState {
  isInitialized: boolean;
  isRendering: boolean;
  fps: number;
  lastFrameTime: number;
  frameCount: number;
}

export const CharacterCanvas = forwardRef<CharacterCanvasRef, CharacterCanvasProps>(({
  character,
  animationState,
  emotions = [],
  onAnimationComplete,
  onError,
  className = '',
  width = 800,
  height = 600,
  interactive = true
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  
  const [canvasState, setCanvasState] = useState<CanvasState>({
    isInitialized: false,
    isRendering: false,
    fps: 60,
    lastFrameTime: 0,
    frameCount: 0
  });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOverCanvas, setIsMouseOverCanvas] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [currentEmotions, setCurrentEmotions] = useState<string[]>([]);

  // Helper functions for character rendering
  const getCharacterBodyColor = useCallback(() => {
    const metadata = (character as any)?.metadata?.generation_options;
    if (!metadata) return '#4CAF50';
    
    // Use character style to determine body color
    const style = metadata.style || 'anime';
    const colorMap: { [key: string]: string } = {
      'anime': '#4CAF50',
      'realistic': '#8D6E63',
      'cartoon': '#FF9800',
      'chibi': '#E91E63'
    };
    return colorMap[style] || '#4CAF50';
  }, [character]);

  const getCharacterFaceColor = useCallback(() => {
    const metadata = (character as any)?.metadata?.generation_options;
    if (!metadata) return '#FFC107';
    
    const skinTone = metadata.skinTone || 'medium';
    const colorMap: { [key: string]: string } = {
      'light': '#FFDBCB',
      'pale': '#F5E6D3',
      'medium': '#FFC107',
      'tan': '#D2B48C',
      'dark': '#8D6E63'
    };
    return colorMap[skinTone] || '#FFC107';
  }, [character]);

  const drawCharacterHair = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    const metadata = (character as any)?.metadata?.generation_options;
    if (!metadata) return;
    
    const hairColor = metadata.hairColor || 'brown';
    const colorMap: { [key: string]: string } = {
      'brown': '#8B4513',
      'black': '#2C2C2C',
      'blonde': '#FFD700',
      'red': '#CD5C5C',
      'blue': '#4169E1',
      'pink': '#FF69B4',
      'purple': '#9370DB',
      'silver': '#C0C0C0',
      'white': '#F5F5F5',
      'green': '#228B22'
    };
    
    ctx.fillStyle = colorMap[hairColor] || '#8B4513';
    
    // Draw simple hair shape
    ctx.beginPath();
    ctx.arc(centerX, centerY - 35, 35, Math.PI, 2 * Math.PI);
    ctx.fill();
    
    // Add hair highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX - 10, centerY - 40, 8, 0, 2 * Math.PI);
    ctx.fill();
  }, [character]);

  const drawCharacterEyes = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    const metadata = (character as any)?.metadata?.generation_options;
    const eyeColor = metadata?.eyeColor || 'blue';
    const colorMap: { [key: string]: string } = {
      'blue': '#4169E1',
      'brown': '#8B4513',
      'green': '#228B22',
      'hazel': '#8B7355',
      'gray': '#808080',
      'amber': '#FFBF00',
      'purple': '#9370DB',
      'red': '#DC143C'
    };
    
    if (currentEmotions.includes('happy')) {
      // Happy eyes (closed/squinting)
      ctx.fillStyle = '#333';
      ctx.fillRect(centerX - 15, centerY - 25, 8, 3);
      ctx.fillRect(centerX + 7, centerY - 25, 8, 3);
    } else if (currentEmotions.includes('surprised')) {
      // Surprised eyes (wide)
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY - 25, 6, 0, 2 * Math.PI);
      ctx.arc(centerX + 10, centerY - 25, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // Eye color
      ctx.fillStyle = colorMap[eyeColor] || '#4169E1';
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY - 25, 4, 0, 2 * Math.PI);
      ctx.arc(centerX + 10, centerY - 25, 4, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // Normal eyes
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY - 25, 5, 0, 2 * Math.PI);
      ctx.arc(centerX + 10, centerY - 25, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Eye color
      ctx.fillStyle = colorMap[eyeColor] || '#4169E1';
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY - 25, 3, 0, 2 * Math.PI);
      ctx.arc(centerX + 10, centerY - 25, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Pupils
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(centerX - 10, centerY - 25, 1.5, 0, 2 * Math.PI);
      ctx.arc(centerX + 10, centerY - 25, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [character, currentEmotions]);

  const drawCharacterMouth = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    if (currentEmotions.includes('happy')) {
      // Smile
      ctx.arc(centerX, centerY - 10, 15, 0, Math.PI);
    } else if (currentEmotions.includes('sad')) {
      // Frown
      ctx.arc(centerX, centerY + 5, 15, Math.PI, 2 * Math.PI);
    } else if (currentEmotions.includes('surprised')) {
      // Open mouth (O shape)
      ctx.arc(centerX, centerY - 5, 8, 0, 2 * Math.PI);
    } else {
      // Neutral
      ctx.moveTo(centerX - 10, centerY - 5);
      ctx.lineTo(centerX + 10, centerY - 5);
    }
    ctx.stroke();
  }, [currentEmotions]);

  // Initialize canvas (simplified demo version)
  const initializeCanvas = useCallback(async () => {
    if (!canvasRef.current || !character) return;

    try {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) {
        throw new Error('2D Canvas context not supported');
      }

      setCanvasState(prev => ({
        ...prev,
        isInitialized: true
      }));

      console.log('Demo character canvas initialized successfully');
    } catch (error) {
      console.error('Failed to initialize character canvas:', error);
      onError?.(error instanceof Error ? error.message : 'Canvas initialization failed');
    }
  }, [character, onError]);

  // Animation loop (simplified demo version)
  const animate = useCallback((currentTime: number) => {
    if (!canvasRef.current || !canvasState.isInitialized) {
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const deltaTime = currentTime - canvasState.lastFrameTime;
    
    // Update FPS counter
    const newFrameCount = canvasState.frameCount + 1;
    if (newFrameCount % 60 === 0) {
      const fps = Math.round(60000 / (currentTime - canvasState.lastFrameTime + deltaTime * 59));
      setCanvasState(prev => ({
        ...prev,
        fps,
        frameCount: newFrameCount,
        lastFrameTime: currentTime
      }));
    }

    try {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);

      // Draw character representation
      if (character) {
        const centerX = width / 2;
        const centerY = height / 2;

        // Character body (simplified circle)
        ctx.fillStyle = getCharacterBodyColor();
        ctx.beginPath();
        ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI);
        ctx.fill();

        // Character face
        ctx.fillStyle = getCharacterFaceColor();
        ctx.beginPath();
        ctx.arc(centerX, centerY - 20, 30, 0, 2 * Math.PI);
        ctx.fill();

        // Hair (if character has hair color data)
        drawCharacterHair(ctx, centerX, centerY);

        // Eyes based on emotion and character data
        drawCharacterEyes(ctx, centerX, centerY);

        // Mouth based on emotion
        drawCharacterMouth(ctx, centerX, centerY);

        // Animation effects
        if (currentAnimation === 'wave') {
          // Draw waving hand
          ctx.fillStyle = '#FFB74D';
          ctx.beginPath();
          ctx.arc(centerX + 40, centerY - 30, 15, 0, 2 * Math.PI);
          ctx.fill();
        } else if (currentAnimation === 'talk') {
          // Draw speech bubble
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(centerX + 40, centerY - 40, 60, 30);
          ctx.fillStyle = '#333';
          ctx.font = '12px Arial';
          ctx.fillText('Hello!', centerX + 50, centerY - 25);
        }

        // Mouse interaction effect
        if (interactive && isMouseOverCanvas) {
          const dx = mousePosition.x - centerX;
          const dy = mousePosition.y - centerY;
          const angle = Math.atan2(dy, dx);
          
          // Draw look direction indicator
          ctx.strokeStyle = '#FF5722';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - 25);
          ctx.lineTo(centerX + Math.cos(angle) * 20, centerY - 25 + Math.sin(angle) * 20);
          ctx.stroke();
        }
      }

      // Character name
      if (character) {
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(character.name, width / 2, height - 20);
      }

    } catch (error) {
      console.error('Animation frame error:', error);
      onError?.(error instanceof Error ? error.message : 'Rendering error');
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    canvasState.isInitialized,
    canvasState.lastFrameTime,
    canvasState.frameCount,
    currentEmotions,
    currentAnimation,
    interactive,
    isMouseOverCanvas,
    mousePosition,
    width,
    height,
    character,
    onError
  ]);

  // Start/stop animation loop
  const startAnimation = useCallback(() => {
    if (!canvasState.isRendering && canvasState.isInitialized) {
      setCanvasState(prev => ({ ...prev, isRendering: true }));
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [canvasState.isInitialized, canvasState.isRendering, animate]);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    setCanvasState(prev => ({ ...prev, isRendering: false }));
  }, []);

  // Mouse event handlers
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  }, [interactive]);

  const handleMouseEnter = useCallback(() => {
    setIsMouseOverCanvas(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsMouseOverCanvas(false);
  }, []);

  const handleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    // Trigger wave animation on click
    setCurrentAnimation('wave');
    setTimeout(() => {
      setCurrentAnimation('idle');
      onAnimationComplete?.('wave');
    }, 2000);
  }, [interactive, onAnimationComplete]);

  // Public methods exposed via ref
  const triggerAnimation = useCallback((type: string, data: any) => {
    console.log(`Triggering animation: ${type}`, data);
    setCurrentAnimation(type);
    
    // Auto-reset to idle after animation duration
    const duration = data.duration || 2000;
    setTimeout(() => {
      setCurrentAnimation('idle');
      onAnimationComplete?.(type);
    }, duration);
  }, [onAnimationComplete]);

  const setEmotions = useCallback((newEmotions: string[]) => {
    console.log('Setting emotions:', newEmotions);
    setCurrentEmotions(newEmotions);
  }, []);

  const takePicture = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  }, []);

  const getStats = useCallback(() => {
    return {
      ...canvasState,
      currentAnimation,
      currentEmotions,
      mousePosition,
      isMouseOver: isMouseOverCanvas
    };
  }, [canvasState, currentAnimation, currentEmotions, mousePosition, isMouseOverCanvas]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    triggerAnimation,
    setEmotions,
    takePicture,
    getStats,
    getCanvas: () => canvasRef.current
  }), [triggerAnimation, setEmotions, takePicture, getStats]);

  // Effects
  useEffect(() => {
    if (character) {
      initializeCanvas();
    }

    return () => {
      stopAnimation();
    };
  }, [character, initializeCanvas, stopAnimation]);

  useEffect(() => {
    if (canvasState.isInitialized) {
      startAnimation();
    }

    return stopAnimation;
  }, [canvasState.isInitialized, startAnimation, stopAnimation]);

  // Update animation state
  useEffect(() => {
    if (animationState) {
      setCurrentAnimation(animationState.id);
    }
  }, [animationState]);

  // Update emotions
  useEffect(() => {
    setCurrentEmotions(emotions);
  }, [emotions]);

  return (
    <div className={`character-canvas-container ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          display: 'block',
          border: '1px solid #ccc',
          borderRadius: '8px',
          cursor: interactive ? 'pointer' : 'default',
          backgroundColor: '#f8f9fa'
        }}
      />
      
      {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div>FPS: {canvasState.fps}</div>
          <div>Initialized: {canvasState.isInitialized ? 'Yes' : 'No'}</div>
          <div>Rendering: {canvasState.isRendering ? 'Yes' : 'No'}</div>
          <div>Mouse: {mousePosition.x}, {mousePosition.y}</div>
          <div>Emotions: {currentEmotions.join(', ') || 'None'}</div>
          <div>Animation: {currentAnimation}</div>
        </div>
      )}

      {/* Loading indicator */}
      {!canvasState.isInitialized && character && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div>Loading character...</div>
          <div style={{ marginTop: '10px' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }} />
          </div>
        </div>
      )}

      {/* Error display */}
      {!character && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#f5f5f5',
          color: '#666',
          fontSize: '18px',
          borderRadius: '8px'
        }}>
          No character loaded
        </div>
      )}
    </div>
  );
});
