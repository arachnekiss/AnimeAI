import React, { useState, useEffect } from 'react';
import './UIShowcase.css';

interface ShowcaseState {
  id: string;
  name: string;
  description: string;
}

const UIShowcase: React.FC = () => {
  const [currentStateIndex, setCurrentStateIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const showcaseStates: ShowcaseState[] = [
    {
      id: 'main',
      name: 'Main Interface',
      description: 'Default character interaction view with chat interface'
    },
    {
      id: 'typing',
      name: 'Typing State',
      description: 'Character is responding with animated typing indicator'
    },
    {
      id: 'listening',
      name: 'Listening State',
      description: 'Voice input active, character is listening'
    },
    {
      id: 'thinking',
      name: 'Thinking State',
      description: 'AI processing, thoughtful animation'
    },
    {
      id: 'emotions',
      name: 'Emotion Display',
      description: 'Various emotional states and expressions'
    },
    {
      id: 'mobile',
      name: 'Mobile Layout',
      description: 'Responsive design for mobile devices'
    },
    {
      id: 'error',
      name: 'Error State',
      description: 'Error handling and recovery interface'
    },
    {
      id: 'onboarding',
      name: 'Onboarding Flow',
      description: 'First-time user experience and tutorial'
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentStateIndex((prev) => (prev + 1) % showcaseStates.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlay, showcaseStates.length]);

  const currentState = showcaseStates[currentStateIndex];

  const renderCurrentState = () => {
    switch (currentState.id) {
      case 'main':
        return (
          <div className="showcase-state main-state">
            <div className="character-area">
              <div className="character-avatar">👤</div>
              <div className="character-status">Ready to chat</div>
            </div>
            <div className="chat-area">
              <div className="chat-message user">Hello! How are you today?</div>
              <div className="chat-message ai">I'm doing great! How can I help you?</div>
            </div>
          </div>
        );

      case 'typing':
        return (
          <div className="showcase-state typing-state">
            <div className="character-area">
              <div className="character-avatar thinking">🤔</div>
              <div className="character-status">Typing...</div>
            </div>
            <div className="chat-area">
              <div className="chat-message user">Can you help me with something?</div>
              <div className="typing-indicator">
                <span>AI is typing</span>
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'listening':
        return (
          <div className="showcase-state listening-state">
            <div className="character-area">
              <div className="character-avatar listening">👂</div>
              <div className="character-status">Listening...</div>
            </div>
            <div className="voice-controls">
              <button className="voice-button active">🎤</button>
              <div className="audio-wave">
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
                <div className="wave-bar"></div>
              </div>
            </div>
          </div>
        );

      case 'thinking':
        return (
          <div className="showcase-state thinking-state">
            <div className="character-area">
              <div className="character-avatar processing">🧠</div>
              <div className="character-status">Processing...</div>
            </div>
            <div className="thinking-animation">
              <div className="thought-bubble">
                <span>Analyzing your request...</span>
              </div>
            </div>
          </div>
        );

      case 'emotions':
        return (
          <div className="showcase-state emotions-state">
            <div className="character-area">
              <div className="character-avatar happy">😊</div>
              <div className="character-status">Expressing emotions</div>
            </div>
            <div className="emotion-panel">
              <div className="emotion-item">😊 Happy</div>
              <div className="emotion-item">😢 Sad</div>
              <div className="emotion-item">😮 Surprised</div>
              <div className="emotion-item">😡 Angry</div>
            </div>
          </div>
        );

      case 'mobile':
        return (
          <div className="showcase-state mobile-state">
            <div className="mobile-frame">
              <div className="mobile-header">
                <span>AI Chat</span>
                <button>⚙️</button>
              </div>
              <div className="mobile-character">👤</div>
              <div className="mobile-chat">
                <div className="chat-message user">Hi!</div>
                <div className="chat-message ai">Hello there!</div>
              </div>
              <div className="mobile-input">
                <input placeholder="Type a message..." />
                <button>🎤</button>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="showcase-state error-state">
            <div className="error-container">
              <div className="error-icon">⚠️</div>
              <h3>Connection Error</h3>
              <p>Unable to reach the AI service</p>
              <button className="retry-button">Retry Connection</button>
            </div>
          </div>
        );

      case 'onboarding':
        return (
          <div className="showcase-state onboarding-state">
            <div className="onboarding-container">
              <h2>Welcome to AI Character Engine! 👋</h2>
              <div className="onboarding-steps">
                <div className="step active">
                  <div className="step-number">1</div>
                  <span>Choose your character</span>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <span>Start chatting</span>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <span>Enjoy the experience</span>
                </div>
              </div>
              <button className="continue-button">Get Started</button>
            </div>
          </div>
        );

      default:
        return <div>Unknown state</div>;
    }
  };

  return (
    <div className="ui-showcase">
      {showOverlay && (
        <div className="showcase-overlay">
          <div className="overlay-content">
            <h1>🎭 AI Character Animation Engine</h1>
            <h2>UI Component Showcase</h2>
            <p>Explore all interface states and interactions</p>
            <button 
              className="start-button"
              onClick={() => setShowOverlay(false)}
            >
              Start Showcase
            </button>
          </div>
        </div>
      )}

      <div className="showcase-header">
        <h1>AI Character Engine UI Showcase</h1>
        <div className="showcase-controls">
          <button 
            className={`auto-play-btn ${isAutoPlay ? 'active' : ''}`}
            onClick={() => setIsAutoPlay(!isAutoPlay)}
          >
            {isAutoPlay ? '⏸️ Pause' : '▶️ Auto Play'}
          </button>
        </div>
      </div>

      <div className="showcase-navigation">
        {showcaseStates.map((state, index) => (
          <button
            key={state.id}
            className={`nav-button ${index === currentStateIndex ? 'active' : ''}`}
            onClick={() => setCurrentStateIndex(index)}
          >
            <span className="nav-number">{index + 1}</span>
            <span className="nav-label">{state.name}</span>
          </button>
        ))}
      </div>

      <div className="showcase-content">
        <div className="state-info">
          <h2>{currentState.name}</h2>
          <p>{currentState.description}</p>
        </div>
        
        <div className="state-display">
          {renderCurrentState()}
        </div>
      </div>

      <div className="showcase-footer">
        <div className="navigation-controls">
          <button 
            onClick={() => setCurrentStateIndex(Math.max(0, currentStateIndex - 1))}
            disabled={currentStateIndex === 0}
          >
            ← Previous
          </button>
          <span>{currentStateIndex + 1} of {showcaseStates.length}</span>
          <button 
            onClick={() => setCurrentStateIndex(Math.min(showcaseStates.length - 1, currentStateIndex + 1))}
            disabled={currentStateIndex === showcaseStates.length - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default UIShowcase;
