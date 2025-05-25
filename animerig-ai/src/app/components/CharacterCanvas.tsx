import React, { forwardRef } from 'react';
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

// This is a stub - the actual implementation is in CharacterCanvas.demo.tsx
export const CharacterCanvas = forwardRef<CharacterCanvasRef, CharacterCanvasProps>((props, ref) => {
  const stubMethods: CharacterCanvasRef = {
    triggerAnimation: () => {},
    setEmotions: () => {},
    takePicture: () => null,
    getStats: () => ({}),
    getCanvas: () => null,
  };

  React.useImperativeHandle(ref, () => stubMethods);

  return (
    <div style={{ 
      width: props.width || 800, 
      height: props.height || 600, 
      background: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #ddd'
    }}>
      <p>Original CharacterCanvas - Use CharacterCanvas.demo.tsx for the working demo</p>
    </div>
  );
});
