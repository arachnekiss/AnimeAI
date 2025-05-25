import React, { useState, useRef, useEffect } from 'react';
import { CharacterCanvas } from './CharacterCanvas.demo';
import { createSampleCharacter, createCharacterVariants, createAnimationStates, createEmotionStates } from '../utils/sampleCharacters';
import { Character, AnimationStateType, AnimationState } from '../../engine/types';
import CharacterGenerationModal from './CharacterGenerationModal';
import { APITestPanel } from './APITestPanel';
import { CanvasGIFRecorder, downloadGIF } from '../utils/gifRecording';
import { VideoRecorder, VideoRecordingProgress, isVideoRecordingSupported } from '../utils/videoRecording';
import './VisualDemoLayout.css';
import './CharacterGenerationModal.css';

interface CharacterCanvasRef {
  triggerAnimation: (type: string, data: any) => void;
  setEmotions: (emotions: string[]) => void;
  takePicture: () => string | null;
  getStats: () => any;
  getCanvas: () => HTMLCanvasElement | null;
}

const VisualDemoLayout: React.FC = () => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [characterState, setCharacterState] = useState<AnimationStateType>('idle');
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [currentAnimation, setCurrentAnimation] = useState('idle');
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<string[]>(['neutral']);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isAPITestPanelOpen, setIsAPITestPanelOpen] = useState(false);
  const [gifRecorder, setGifRecorder] = useState<CanvasGIFRecorder | null>(null);
  const [isRecordingGif, setIsRecordingGif] = useState(false);
  const [gifProgress, setGifProgress] = useState(0);
  const [videoRecorder, setVideoRecorder] = useState<VideoRecorder | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState<VideoRecordingProgress>({
    currentFrame: 0,
    totalFrames: 0,
    progress: 0,
    isRecording: false,
    timeElapsed: 0
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<CharacterCanvasRef>(null);

  // Convert AnimationStateType to AnimationState interface
  const createAnimationState = (stateType: AnimationStateType): AnimationState => {
    const sampleChar = character || createSampleCharacter();
    const animations = sampleChar.animations || [];
    const clip = animations.find(anim => anim.id === stateType) || (animations.length > 0 ? animations[0] : {
      id: 'default',
      name: 'Default',
      duration: 1.0,
      loop: true,
      keyframes: new Map()
    });
    
    return {
      id: stateType,
      name: stateType.charAt(0).toUpperCase() + stateType.slice(1),
      clip: clip,
      transitions: [],
      weight: 1.0,
      speed: 1.0
    };
  };

  // 컴포넌트 마운트 시 기본 캐릭터 로드
  useEffect(() => {
    const sampleCharacter = createSampleCharacter();
    setCharacter(sampleCharacter);
    log('Sample character loaded: ' + sampleCharacter.name);
  }, []);

  // 로그 추가 함수
  const log = (msg: string) => setInteractionLog(logs => [...logs, `${new Date().toLocaleTimeString()}: ${msg}`]);

  // 각종 테스트 핸들러 (실제 엔진 함수와 연결)
  const testClickInteraction = () => {
    log('Click on character - Character waves!');
    setCurrentAnimation('wave');
    setCurrentEmotion('happy');
    setCharacterState('gesturing');
    setEmotions(['happy']);
    
    // Use actual animation engine methods
    if (canvasRef.current) {
      canvasRef.current.triggerAnimation('gesture', {
        type: 'wave',
        duration: 2000,
        intensity: 0.8
      });
      canvasRef.current.setEmotions(['happy']);
    }
  };

  const testChatInteraction = () => {
    log('Chat interaction - Character responds');
    setCurrentAnimation('talk');
    setCurrentEmotion('interested');
    setCharacterState('talking');
    setEmotions(['neutral', 'happy']);
    
    // Use actual animation engine methods
    if (canvasRef.current) {
      canvasRef.current.triggerAnimation('talk', {
        type: 'conversation',
        duration: 3000,
        intensity: 0.7
      });
      canvasRef.current.setEmotions(['neutral', 'happy']);
    }
  };

  const testVoiceInteraction = () => {
    log('Voice interaction - Character listening');
    setCurrentAnimation('listen');
    setCurrentEmotion('listening');
    setCharacterState('listening');
    setEmotions(['neutral']);
    
    // Use actual animation engine methods
    if (canvasRef.current) {
      canvasRef.current.triggerAnimation('listen', {
        type: 'voice-input',
        duration: 4000,
        intensity: 0.6
      });
      canvasRef.current.setEmotions(['neutral']);
    }
    
    // Simulate voice recording
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      log('Voice recording completed');
    }, 3000);
  };

  const testCameraInteraction = async () => {
    log('Camera mirroring - Activating camera');
    setCurrentAnimation('mirror-smile');
    setCurrentEmotion('smile');
    setCharacterState('idle');
    setEmotions(['happy']);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        log('Camera activated - Character will mirror expressions');
        
        // Use actual animation engine methods
        if (canvasRef.current) {
          canvasRef.current.triggerAnimation('mirror', {
            type: 'expression-mirror',
            duration: 5000,
            intensity: 0.9
          });
        }
        
        // Simulate expression detection
        setTimeout(() => {
          setEmotions(['happy', 'surprised']);
          if (canvasRef.current) {
            canvasRef.current.setEmotions(['happy', 'surprised']);
          }
          log('Detected smile - Character mirrors expression');
        }, 1500);
        
        // Stop camera after demo
        setTimeout(() => {
          stream.getTracks().forEach(track => track.stop());
          setIsCameraActive(false);
          log('Camera mirroring demo completed');
        }, 5000);
      }
    } catch (error) {
      log('Camera access denied or not available');
    }
  };

  const cycleEmotions = () => {
    log('Cycling through emotions with real-time updates');
    const emotionStates = createEmotionStates();
    let idx = 0;
    
    const cycleNext = () => {
      if (idx < emotionStates.length) {
        const emotion = emotionStates[idx];
        setCurrentEmotion(emotion);
        setCurrentAnimation('emotion-' + emotion);
        setCharacterState('idle');
        setEmotions([emotion]);
        
        // Use actual animation engine methods
        if (canvasRef.current) {
          canvasRef.current.triggerAnimation('emotion', {
            type: emotion,
            duration: 1500,
            intensity: 0.8
          });
          canvasRef.current.setEmotions([emotion]);
        }
        
        log(`Emotion changed to: ${emotion}`);
        idx++;
        setTimeout(cycleNext, 1800);
      } else {
        log('Emotion cycle completed');
        setCurrentEmotion('neutral');
        setEmotions(['neutral']);
        setCharacterState('idle');
        if (canvasRef.current) {
          canvasRef.current.setEmotions(['neutral']);
        }
      }
    };
    
    cycleNext();
  };

  const generateNewCharacter = () => {
    setIsGenerationModalOpen(true);
  };

  const handleCharacterGenerated = (newCharacter: Character) => {
    log(`New character generated: ${newCharacter.name}`);
    setCharacter(newCharacter);
    setCurrentEmotion('neutral');
    setEmotions(['neutral']);
    setCharacterState('idle');
    
    // Trigger introduction animation
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.triggerAnimation('introduction', {
          type: 'wave',
          duration: 2500,
          intensity: 0.9
        });
      }
      log('Character introduction animation started');
    }, 500);
  };

  // Initialize GIF recorder when canvas is ready
  useEffect(() => {
    if (canvasRef.current && !gifRecorder) {
      // Get the actual canvas element from the ref
      const canvasElement = document.querySelector('canvas');
      if (canvasElement) {
        const recorder = new CanvasGIFRecorder(canvasElement, {
          duration: 5000, // 5 seconds
          frameRate: 30,
          quality: 'medium'
        });
        setGifRecorder(recorder);
      }
    }
  }, [canvasRef.current, gifRecorder]);

  const startGifRecording = () => {
    if (!gifRecorder || isRecordingGif) return;
    
    setIsRecordingGif(true);
    setGifProgress(0);
    log('Starting GIF recording (5 seconds)...');
    
    gifRecorder.startRecording(
      (progress) => {
        setGifProgress(progress);
      },
      (gifBlob) => {
        downloadGIF(gifBlob, `character-demo-${Date.now()}.gif`);
        setIsRecordingGif(false);
        setGifProgress(0);
        log('GIF recording completed and downloaded');
      }
    );
  };

  // Video recording functions
  const startVideoRecording = async () => {
    if (!canvasRef.current || isRecordingVideo) return;
    
    try {
      const canvas = canvasRef.current.getCanvas();
      if (!canvas) {
        log('Error: Unable to access canvas for video recording');
        return;
      }

      const recorder = new VideoRecorder(canvas);
      setVideoRecorder(recorder);
      setIsRecordingVideo(true);
      
      log('Starting video recording (5 seconds)...');
      
      await recorder.startRecording(
        { duration: 5, fps: 30, quality: 0.8 },
        (progress) => {
          setVideoProgress(progress);
        }
      );
      
    } catch (error) {
      log(`Video recording error: ${error}`);
      setIsRecordingVideo(false);
      setVideoRecorder(null);
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorder && isRecordingVideo) {
      videoRecorder.stopRecording();
      setIsRecordingVideo(false);
      setVideoRecorder(null);
      setVideoProgress({
        currentFrame: 0,
        totalFrames: 0,
        progress: 0,
        isRecording: false,
        timeElapsed: 0
      });
      log('Video recording stopped and downloaded');
    }
  };

  return (
    <div className="demo-container">
      {/* 좌측: 캐릭터 애니메이션 */}
      <div className="character-demo-area">
        <h2>Live Character Animation</h2>
        <CharacterCanvas 
          ref={canvasRef}
          character={character}
          animationState={createAnimationState(characterState)}
          emotions={emotions}
          width={400}
          height={400}
          interactive={true}
          onAnimationComplete={(animationType) => {
            log(`Animation completed: ${animationType}`);
          }}
          onError={(error) => {
            log(`Error: ${error}`);
          }}
        />
        <div className="character-status">
          Character: {character?.name || 'None'}<br/>
          Current State: {characterState}<br/>
          Current Emotion: {currentEmotion}<br/>
          Animation: {currentAnimation}<br/>
          Emotions: {emotions.join(', ')}<br/>
          {isRecording && <span className="recording-indicator">🔴 Recording</span>}<br/>
          {isCameraActive && <span className="camera-indicator">📹 Camera Active</span>}
        </div>
      </div>
      {/* 우측: 인터랙션 컨트롤 */}
      <div className="interaction-controls">
        <h2>Test Interactions</h2>
        <button onClick={testClickInteraction}>🖱️ Test Click Response</button>
        <button onClick={testChatInteraction}>💬 Test Chat Response</button>
        <button onClick={testVoiceInteraction}>🎤 Test Voice Response</button>
        <button onClick={testCameraInteraction}>📷 Test Camera Mirroring</button>
        <button onClick={cycleEmotions}>😊 Cycle Through Emotions</button>
        <button onClick={generateNewCharacter}>🎭 Generate New Character</button>
        
        <div className="animation-controls">
          <h3>Quick Animation Tests</h3>
          <button onClick={() => {
            setCharacterState('idle');
            setCurrentAnimation('breathing');
            log('Started idle breathing animation');
          }}>💤 Idle Breathing</button>
          
          <button onClick={() => {
            setCharacterState('thinking');
            setCurrentAnimation('head-tilt');
            log('Character is thinking...');
          }}>🤔 Thinking Pose</button>
          
          <button onClick={() => {
            setCharacterState('gesturing');
            setCurrentAnimation('hand-wave');
            log('Character waves hello!');
          }}>👋 Wave Hello</button>

          <button onClick={() => {
            setCharacterState('talking');
            setCurrentAnimation('talk');
            log('Character starts talking');
          }}>💬 Start Talking</button>

          <button onClick={() => {
            setCharacterState('listening');
            setCurrentAnimation('listen');
            log('Character is listening attentively');
          }}>👂 Listen Mode</button>
        </div>

        <div className="demo-tools">
          <h3>Demo Tools</h3>
          <button onClick={() => {
            // Use canvas ref method for screenshot
            if (canvasRef.current) {
              const dataUrl = canvasRef.current.takePicture();
              if (dataUrl) {
                const link = document.createElement('a');
                link.download = `character-demo-${Date.now()}.png`;
                link.href = dataUrl;
                link.click();
                setScreenshots(prev => [...prev, dataUrl]);
                log('Screenshot captured and downloaded');
              }
            } else {
              log('Canvas not available for screenshot');
            }
          }}>📸 Capture Screenshot</button>

          <button 
            onClick={startGifRecording}
            disabled={isRecordingGif || !gifRecorder}
          >
            {isRecordingGif ? '🔴 Recording...' : '🎬 Record GIF'}
          </button>

          {isRecordingGif && (
            <div className="recording-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${gifProgress}%` }}
                ></div>
              </div>
              <span>{Math.round(gifProgress)}% Complete</span>
            </div>
          )}

          <button 
            onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
            disabled={!isVideoRecordingSupported()}
            title={!isVideoRecordingSupported() ? 'Video recording not supported in this browser' : ''}
          >
            {isRecordingVideo ? '⏹️ Stop Video' : '🎥 Record Video'}
          </button>

          {isRecordingVideo && (
            <div className="recording-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${videoProgress.progress * 100}%` }}
                ></div>
              </div>
              <span>
                {Math.round(videoProgress.progress * 100)}% Complete 
                ({videoProgress.timeElapsed.toFixed(1)}s)
              </span>
            </div>
          )}

          <button onClick={() => {
            // Get actual performance metrics from canvas
            if (canvasRef.current) {
              const stats = canvasRef.current.getStats();
              log(`Performance: ${stats.fps} FPS, Frame: ${stats.frameCount}, Animation: ${stats.currentAnimation}`);
            } else {
              log('Canvas not available for performance metrics');
            }
          }}>📊 Show Performance</button>

          <button onClick={() => {
            // Reset demo
            setCharacterState('idle');
            setCurrentAnimation('idle');
            setCurrentEmotion('neutral');
            setEmotions(['neutral']);
            setInteractionLog([]);
            log('Demo reset to initial state');
          }}>🔄 Reset Demo</button>

          <button 
            onClick={() => setIsAPITestPanelOpen(true)}
            style={{ 
              background: 'linear-gradient(135deg, #e74c3c, #c0392b)', 
              border: 'none',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            🔬 Test AI Engine
          </button>
        </div>

        <div className="interaction-log">
          <h3>Activity Log</h3>
          <div className="log-content">
            {interactionLog.length === 0 ? (
              <div className="log-entry">
                <span className="log-message">Welcome! Click any button to test character interactions.</span>
              </div>
            ) : (
              interactionLog.map((logEntry, i) => (
                <div key={i} className="log-entry">
                  <span className="log-message">{logEntry}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Hidden video element for camera demo */}
        {isCameraActive && (
          <video
            ref={videoRef}
            style={{
              width: '150px',
              height: '100px',
              borderRadius: '8px',
              border: '2px solid #44ff44',
              marginTop: '16px'
            }}
            autoPlay
            muted
          />
        )}
        
      </div>
      
      {/* Character Generation Modal */}
      <CharacterGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        onCharacterGenerated={handleCharacterGenerated}
      />

      {/* API Test Panel */}
      {isAPITestPanelOpen && (
        <APITestPanel
          onClose={() => setIsAPITestPanelOpen(false)}
        />
      )}
    </div>
  );
};

export default VisualDemoLayout;
