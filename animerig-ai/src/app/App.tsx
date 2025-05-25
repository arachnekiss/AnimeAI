/**
 * Main Application Component
 * AI Character Animation Engine and Interactive Chat Application
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CharacterCanvas } from './components/CharacterCanvas';
import { ChatInterface } from './components/ChatInterface';
import CharacterCreator from './components/CharacterCreator';
import SettingsPanel from './components/SettingsPanel';
import VoiceControl from './components/VoiceControl';
import PerformanceMonitor from './components/PerformanceMonitor';
import VisualDemoLayout from './components/VisualDemoLayout';
import { useAnimationEngine } from './hooks/useAnimationEngine';
import { useAIChat } from './hooks/useAIChat';
import { AIServiceManager } from '../ai';
import { PhysicsSystem } from '../engine/physics';
import { AnimationSystem } from '../engine/animation';
import { PhysicsAnimationBridge } from '../engine/physics/PhysicsAnimationBridge';
import { CameraExpressionMirror } from '../features/camera-tracking/CameraExpressionMirror';
import { EmotionalVoiceSynthesis } from '../ai/voice/EmotionalVoiceSynthesis';
import { OpenAI } from 'openai';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: string;
  gesture?: string;
}

interface Character {
  id: string;
  name: string;
  personality: string;
  appearance: {
    model: string;
    texture: string;
    animations: string[];
  };
}

interface AppState {
  currentCharacter: Character | null;
  isCharacterCreatorOpen: boolean;
  isSettingsOpen: boolean;
  isVoiceEnabled: boolean;
  showPerformanceMonitor: boolean;
  currentEmotion: string;
  messages: Message[];
  userId: string;
  isLoading: boolean;
  error: string | null;
}

function App() {
  // Check for showcase mode
  const isShowcaseMode = window.location.search.includes('showcase=true') || 
                        window.location.pathname.includes('/showcase') ||
                        process.env.NODE_ENV === 'showcase';

  // If in showcase mode, render VisualDemoLayout component
  if (isShowcaseMode) {
    return <VisualDemoLayout />;
  }

  const [appState, setAppState] = useState<AppState>({
    currentCharacter: null,
    isCharacterCreatorOpen: false,
    isSettingsOpen: false,
    isVoiceEnabled: false,
    showPerformanceMonitor: process.env.NODE_ENV === 'development',
    currentEmotion: 'neutral',
    messages: [],
    userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isLoading: false,
    error: null
  });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const aiServiceRef = useRef<AIServiceManager | null>(null);
  const physicsSystemRef = useRef<PhysicsSystem | null>(null);
  const animationSystemRef = useRef<AnimationSystem | null>(null);
  const physicsAnimationBridgeRef = useRef<PhysicsAnimationBridge | null>(null);
  const cameraMirrorRef = useRef<CameraExpressionMirror | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  const openaiRef = useRef<OpenAI | null>(null);
  const voiceSynthRef = useRef<EmotionalVoiceSynthesis | null>(null);

  // Custom hooks for animation engine and AI chat
  const {
    engine,
    isEngineReady,
    loadCharacter,
    updateEmotion,
    performanceMetrics,
    playAnimation,
  } = useAnimationEngine(canvasRef);

  const {
    sendMessage,
    isLoading: isChatLoading,
    currentPersonality,
    setPersonality,
  } = useAIChat({
    onMessageReceived: handleMessageReceived,
    onEmotionDetected: handleEmotionDetected,
  });

  // Handle new AI message
  function handleMessageReceived(message: ConversationMessage) {
    setMessages(prev => [...prev, message]);
    
    // Update character emotion based on message
    if (message.emotion) {
      handleEmotionDetected(message.emotion);
    }
    
    // Play appropriate gesture/animation
    if (message.gesture) {
      playAnimation(message.gesture);
    }

    // 감정 기반 TTS 실행 (assistant 메시지일 때만)
    if (message.role === 'assistant' && appState.isVoiceEnabled && voiceSynthRef.current) {
      voiceSynthRef.current.synthesizeWithEmotion(message.content, message.emotion || 'neutral')
        .then((audio: any) => {
          // audio는 Blob 또는 URL일 수 있음
          const url = typeof audio === 'string' ? audio : URL.createObjectURL(audio);
          const audioElem = new Audio(url);
          setTtsAudio(audioElem);
          audioElem.play();
        })
        .catch((err: any) => {
          console.error('TTS 오류:', err);
        });
    }
  }

  // Handle emotion changes
  function handleEmotionDetected(emotion: EmotionState) {
    setAppState(prev => ({ ...prev, currentEmotion: emotion }));
    updateEmotion(emotion);
  }

  // Handle user message
  function handleUserMessage(content: string) {
    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    sendMessage(content);
  }

  // Handle voice input
  function handleVoiceInput(text: string) {
    handleUserMessage(text);
  }

  // Handle character creation
  function handleCharacterCreated(character: any) {
    setAppState(prev => ({ 
      ...prev, 
      currentCharacter: character,
      isCharacterCreatorOpen: false 
    }));
    loadCharacter(character);
  }

  // Handle settings changes
  function handleSettingsChange(settings: any) {
    // Apply settings to engine
    if (settings.voiceEnabled !== undefined) {
      setAppState(prev => ({ ...prev, isVoiceEnabled: settings.voiceEnabled }));
    }
    if (settings.showPerformanceMonitor !== undefined) {
      setAppState(prev => ({ ...prev, showPerformanceMonitor: settings.showPerformanceMonitor }));
    }
  }

  // CameraExpressionMirror 초기화 및 표정 → 감정 업데이트
  useEffect(() => {
    if (isCameraEnabled && !cameraMirrorRef.current) {
      cameraMirrorRef.current = new CameraExpressionMirror((expression) => {
        // 표정이 감지되면 감정 상태 업데이트
        setAppState(prev => ({ ...prev, currentEmotion: expression }));
      });
      cameraMirrorRef.current.initialize();
    }
    return () => {
      cameraMirrorRef.current?.stop();
      cameraMirrorRef.current = null;
    };
  }, [isCameraEnabled]);

  // EmotionalVoiceSynthesis 초기화
  useEffect(() => {
    if (!openaiRef.current) {
      openaiRef.current = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      voiceSynthRef.current = new EmotionalVoiceSynthesis(openaiRef.current);
    }
  }, []);

  // TTS 오디오가 변경될 때 자동 재생
  useEffect(() => {
    if (ttsAudio) {
      ttsAudio.play();
    }
  }, [ttsAudio]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'n':
            event.preventDefault();
            setAppState(prev => ({ ...prev, isCharacterCreatorOpen: true }));
            break;
          case ',':
            event.preventDefault();
            setAppState(prev => ({ ...prev, isSettingsOpen: true }));
            break;
          case 'm':
            event.preventDefault();
            setAppState(prev => ({ ...prev, showPerformanceMonitor: !prev.showPerformanceMonitor }));
            break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">AI Character Engine</h1>
          <div className="status-indicators">
            <div className={`status-indicator ${isEngineReady ? 'ready' : 'loading'}`}>
              <span className="status-dot"></span>
              Engine {isEngineReady ? 'Ready' : 'Loading'}
            </div>
            {appState.currentCharacter && (
              <div className="character-info">
                <img 
                  src={appState.currentCharacter.avatar} 
                  alt={appState.currentCharacter.name}
                  className="character-avatar-small"
                />
                <span>{appState.currentCharacter.name}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <button 
            className="header-button"
            onClick={() => setAppState(prev => ({ ...prev, isCharacterCreatorOpen: true }))}
            title="Create New Character (Ctrl+N)"
          >
            <span className="icon">✨</span>
            New Character
          </button>
          
          <button 
            className="header-button"
            onClick={() => setAppState(prev => ({ ...prev, isVoiceEnabled: !prev.isVoiceEnabled }))}
            title="Toggle Voice Input"
          >
            <span className={`icon ${appState.isVoiceEnabled ? 'active' : ''}`}>🎤</span>
          </button>
          
          <button 
            className="header-button"
            onClick={() => setAppState(prev => ({ ...prev, isSettingsOpen: true }))}
            title="Settings (Ctrl+,)"
          >
            <span className="icon">⚙️</span>
          </button>

          <button
            className="header-button"
            onClick={() => setIsCameraEnabled((prev) => !prev)}
            title="카메라 표정 미러링 토글"
          >
            <span className="icon">📷</span>
            {isCameraEnabled ? '카메라 끄기' : '표정 미러링'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Character Display Area */}
        <div className="character-section">
          <CharacterCanvas
            ref={canvasRef}
            character={appState.currentCharacter}
            emotion={appState.currentEmotion}
            isReady={isEngineReady}
            onAnimationEvent={(event) => {
              console.log('Animation event:', event);
            }}
          />
          
          {/* Character Controls */}
          <div className="character-controls">
            <div className="emotion-display">
              <h3>Current Emotion</h3>
              <div className="emotion-bars">
                <div className="emotion-bar">
                  <label>Happy</label>
                  <div className="bar">
                    <div 
                      className="bar-fill happy" 
                      style={{ width: `${appState.currentEmotion.happiness * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="emotion-bar">
                  <label>Sad</label>
                  <div className="bar">
                    <div 
                      className="bar-fill sad" 
                      style={{ width: `${appState.currentEmotion.sadness * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="emotion-bar">
                  <label>Excited</label>
                  <div className="bar">
                    <div 
                      className="bar-fill excited" 
                      style={{ width: `${appState.currentEmotion.arousal * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="chat-section">
          <ChatInterface
            messages={messages}
            isLoading={isChatLoading}
            onSendMessage={handleUserMessage}
            personality={currentPersonality}
          />
          
          {/* Voice Control */}
          {appState.isVoiceEnabled && (
            <VoiceControl
              onVoiceInput={handleVoiceInput}
              isEnabled={appState.isVoiceEnabled}
            />
          )}
        </div>
      </main>

      {/* Modals and Overlays */}
      {appState.isCharacterCreatorOpen && (
        <CharacterCreator
          onCharacterCreated={handleCharacterCreated}
          onClose={() => setAppState(prev => ({ ...prev, isCharacterCreatorOpen: false }))}
        />
      )}

      {appState.isSettingsOpen && (
        <SettingsPanel
          settings={{
            voiceEnabled: appState.isVoiceEnabled,
            showPerformanceMonitor: appState.showPerformanceMonitor,
          }}
          onSettingsChange={handleSettingsChange}
          onClose={() => setAppState(prev => ({ ...prev, isSettingsOpen: false }))}
        />
      )}

      {/* Performance Monitor */}
      {appState.showPerformanceMonitor && (
        <PerformanceMonitor
          metrics={performanceMetrics}
          onClose={() => setAppState(prev => ({ ...prev, showPerformanceMonitor: false }))}
        />
      )}

      {/* Loading Overlay */}
      {!isEngineReady && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Initializing AI Character Engine</h2>
            <p>Loading animation system and AI models...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
