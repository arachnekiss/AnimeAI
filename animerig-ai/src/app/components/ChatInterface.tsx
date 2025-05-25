import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  type: 'user' | 'character';
  content: string;
  timestamp: Date;
  emotion?: string;
  voiceData?: string; // Base64 encoded audio
  isLoading?: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string, voiceData?: Blob) => void;
  onVoiceToggle?: (enabled: boolean) => void;
  isVoiceEnabled?: boolean;
  isLoading?: boolean;
  characterName?: string;
  className?: string;
  maxMessages?: number;
}

interface VoiceRecording {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages = [],
  onSendMessage,
  onVoiceToggle,
  isVoiceEnabled = false,
  isLoading = false,
  characterName = 'Character',
  className = '',
  maxMessages = 50
}) => {
  const [inputValue, setInputValue] = useState('');
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording>({
    isRecording: false,
    mediaRecorder: null,
    audioChunks: []
  });
  const [audioPermission, setAudioPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle text input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || isLoading) return;

    onSendMessage(trimmedMessage);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, isLoading, onSendMessage]);

  // Voice recording functionality
  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream
      setAudioPermission('granted');
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setAudioPermission('denied');
      return false;
    }
  }, []);

  const startVoiceRecording = useCallback(async () => {
    if (audioPermission !== 'granted') {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        onSendMessage('🎤 Voice message', audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        setVoiceRecording({
          isRecording: false,
          mediaRecorder: null,
          audioChunks: []
        });
      };

      mediaRecorder.start();
      setVoiceRecording({
        isRecording: true,
        mediaRecorder,
        audioChunks
      });

    } catch (error) {
      console.error('Failed to start voice recording:', error);
      setAudioPermission('denied');
    }
  }, [audioPermission, onSendMessage, requestMicrophonePermission]);

  const stopVoiceRecording = useCallback(() => {
    if (voiceRecording.mediaRecorder && voiceRecording.isRecording) {
      voiceRecording.mediaRecorder.stop();
    }
  }, [voiceRecording]);

  const handleVoiceToggle = useCallback(() => {
    const newVoiceEnabled = !isVoiceEnabled;
    onVoiceToggle?.(newVoiceEnabled);
    
    if (newVoiceEnabled && audioPermission === 'prompt') {
      requestMicrophonePermission();
    }
  }, [isVoiceEnabled, audioPermission, onVoiceToggle, requestMicrophonePermission]);

  // Play voice message
  const playVoiceMessage = useCallback((voiceData: string) => {
    try {
      const audio = new Audio(voiceData);
      audio.play().catch(error => {
        console.error('Failed to play voice message:', error);
      });
    } catch (error) {
      console.error('Failed to create audio element:', error);
    }
  }, []);

  // Format timestamp
  const formatTime = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Render message
  const renderMessage = useCallback((message: Message) => {
    const isUser = message.type === 'user';
    
    return (
      <div
        key={message.id}
        className={`message ${isUser ? 'user-message' : 'character-message'}`}
      >
        <div className="message-header">
          <span className="message-sender">
            {isUser ? 'You' : characterName}
          </span>
          <span className="message-time">
            {formatTime(message.timestamp)}
          </span>
          {message.emotion && (
            <span className="message-emotion">
              {message.emotion}
            </span>
          )}
        </div>
        
        <div className="message-content">
          {message.isLoading ? (
            <div className="message-loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          ) : (
            <>
              <p>{message.content}</p>
              {message.voiceData && (
                <button
                  className="voice-play-button"
                  onClick={() => playVoiceMessage(message.voiceData!)}
                  title="Play voice message"
                >
                  🔊
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }, [characterName, formatTime, playVoiceMessage]);

  return (
    <div className={`chat-interface ${className}`}>
      {/* Chat header */}
      <div className="chat-header">
        <h3>Chat with {characterName}</h3>
        <div className="chat-controls">
          <button
            className={`voice-toggle ${isVoiceEnabled ? 'enabled' : ''}`}
            onClick={handleVoiceToggle}
            title={isVoiceEnabled ? 'Disable voice' : 'Enable voice'}
            disabled={audioPermission === 'denied'}
          >
            {isVoiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Messages container */}
      <div 
        ref={chatContainerRef}
        className="messages-container"
      >
        {messages.slice(-maxMessages).map(renderMessage)}
        
        {isLoading && (
          <div className="message character-message">
            <div className="message-header">
              <span className="message-sender">{characterName}</span>
            </div>
            <div className="message-content">
              <div className="message-loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="input-area">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${characterName}...`}
            disabled={isLoading}
            className="message-input"
          />
          
          {isVoiceEnabled && (
            <button
              className={`voice-record-button ${voiceRecording.isRecording ? 'recording' : ''}`}
              onMouseDown={startVoiceRecording}
              onMouseUp={stopVoiceRecording}
              onMouseLeave={stopVoiceRecording}
              disabled={isLoading || audioPermission === 'denied'}
              title={voiceRecording.isRecording ? 'Release to send' : 'Hold to record'}
            >
              🎤
            </button>
          )}
          
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="send-button"
            title="Send message"
          >
            ➤
          </button>
        </div>
        
        {voiceRecording.isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            Recording... Release to send
          </div>
        )}
        
        {audioPermission === 'denied' && isVoiceEnabled && (
          <div className="permission-warning">
            Microphone access denied. Please enable in browser settings.
          </div>
        )}
      </div>

      <style jsx>{`
        .chat-interface {
          display: flex;
          flex-direction: column;
          height: 500px;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom: 1px solid #e0e0e0;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .chat-controls {
          display: flex;
          gap: 8px;
        }

        .voice-toggle {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          color: white;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.2s;
        }

        .voice-toggle:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .voice-toggle.enabled {
          background: rgba(76, 175, 80, 0.3);
        }

        .voice-toggle:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: #f8f9fa;
        }

        .message {
          margin-bottom: 16px;
          animation: fadeIn 0.3s ease-in;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;
          color: #666;
        }

        .message-sender {
          font-weight: 600;
        }

        .message-time {
          color: #999;
        }

        .message-emotion {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
        }

        .message-content {
          position: relative;
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 18px;
          word-wrap: break-word;
        }

        .user-message .message-content {
          background: #007bff;
          color: white;
          margin-left: auto;
          border-bottom-right-radius: 6px;
        }

        .character-message .message-content {
          background: white;
          color: #333;
          border: 1px solid #e0e0e0;
          border-bottom-left-radius: 6px;
        }

        .message-content p {
          margin: 0;
          line-height: 1.4;
        }

        .voice-play-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          margin-left: 8px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .voice-play-button:hover {
          opacity: 1;
        }

        .message-loading {
          display: flex;
          align-items: center;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #999;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }

        .input-area {
          padding: 16px;
          background: white;
          border-top: 1px solid #e0e0e0;
        }

        .input-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .message-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 25px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s;
        }

        .message-input:focus {
          border-color: #007bff;
        }

        .voice-record-button {
          background: #f0f0f0;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-record-button:hover {
          background: #e0e0e0;
        }

        .voice-record-button.recording {
          background: #ff5722;
          color: white;
          animation: pulse 1s infinite;
        }

        .voice-record-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .send-button {
          background: #007bff;
          color: white;
          border: none;
          border-radius: 50%;
          width: 44px;
          height: 44px;
          cursor: pointer;
          font-size: 18px;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .send-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          color: #ff5722;
          font-size: 12px;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          background: #ff5722;
          border-radius: 50%;
          animation: pulse 1s infinite;
        }

        .permission-warning {
          margin-top: 8px;
          padding: 8px;
          background: #fff3cd;
          color: #856404;
          border-radius: 6px;
          font-size: 12px;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
