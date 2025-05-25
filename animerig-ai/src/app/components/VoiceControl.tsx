import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VoiceControl.css';

interface VoiceControlProps {
  onVoiceInput: (audioBlob: Blob, transcript?: string) => void;
  onVoiceSettings: (settings: VoiceSettings) => void;
  isListening?: boolean;
  className?: string;
}

interface VoiceSettings {
  language: string;
  sensitivity: number;
  autoStop: boolean;
  noiseReduction: boolean;
  echoCancellation: boolean;
}

interface AudioVisualizationData {
  frequencies: Uint8Array;
  volume: number;
  isActive: boolean;
}

const VoiceControl: React.FC<VoiceControlProps> = ({
  onVoiceInput,
  onVoiceSettings,
  isListening = false,
  className = ''
}) => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    language: 'ko-KR',
    sensitivity: 0.5,
    autoStop: true,
    noiseReduction: true,
    echoCancellation: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const visualizationRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize audio context and speech recognition
  useEffect(() => {
    initializeAudio();
    initializeSpeechRecognition();
    
    return () => {
      cleanup();
    };
  }, []);

  // Update voice settings callback
  useEffect(() => {
    onVoiceSettings(voiceSettings);
  }, [voiceSettings, onVoiceSettings]);

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: voiceSettings.echoCancellation,
          noiseSuppression: voiceSettings.noiseReduction,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;
      setPermissionGranted(true);
      setErrorMessage(null);

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionGranted(false);
      setErrorMessage('마이크 접근 권한이 필요합니다.');
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.lang = voiceSettings.language;
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setErrorMessage(`음성 인식 오류: ${event.error}`);
      };
    }
  };

  const startRecording = useCallback(async () => {
    if (!streamRef.current || !permissionGranted) {
      await initializeAudio();
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        onVoiceInput(audioBlob, transcript);
        setTranscript('');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setErrorMessage(null);

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Start audio visualization
      startVisualization();

    } catch (error) {
      console.error('Error starting recording:', error);
      setErrorMessage('녹음을 시작할 수 없습니다.');
    }
  }, [permissionGranted, transcript, onVoiceInput]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    stopVisualization();
  }, [isRecording]);

  const startVisualization = () => {
    if (!analyserRef.current || !visualizationRef.current) return;

    const canvas = visualizationRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !isRecording) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      setAudioLevel(average / 255);

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw frequency bars
      const barWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsl(${hue}, 50%, 50%)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAudioLevel(0);
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopVisualization();
  };

  const updateSettings = (newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...voiceSettings, ...newSettings };
    setVoiceSettings(updatedSettings);
    
    // Update speech recognition language
    if (recognitionRef.current && newSettings.language) {
      recognitionRef.current.lang = newSettings.language;
    }
  };

  return (
    <div className={`voice-control ${className}`}>
      {/* Main Control Panel */}
      <div className="voice-control-panel">
        <div className="voice-status">
          <div className={`status-indicator ${isRecording ? 'recording' : permissionGranted ? 'ready' : 'error'}`}>
            <div className="status-dot"></div>
            <span className="status-text">
              {isRecording ? '녹음 중...' : permissionGranted ? '준비됨' : '권한 필요'}
            </span>
          </div>
          
          {errorMessage && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Recording Button */}
        <div className="recording-controls">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!permissionGranted}
            aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
          >
            <div className="record-icon">
              {isRecording ? (
                <div className="stop-icon"></div>
              ) : (
                <div className="mic-icon"></div>
              )}
            </div>
            <span className="record-text">
              {isRecording ? '중지' : '음성 입력'}
            </span>
          </button>

          {/* Audio Level Indicator */}
          <div className="audio-level">
            <div className="level-bar">
              <div 
                className="level-fill"
                style={{ width: `${audioLevel * 100}%` }}
              ></div>
            </div>
            <span className="level-text">{Math.round(audioLevel * 100)}%</span>
          </div>
        </div>

        {/* Audio Visualization */}
        <canvas
          ref={visualizationRef}
          className="audio-visualization"
          width={300}
          height={100}
        ></canvas>

        {/* Transcript Display */}
        {transcript && (
          <div className="transcript-display">
            <div className="transcript-header">
              <span>음성 인식 결과</span>
              {confidence > 0 && (
                <span className="confidence">신뢰도: {Math.round(confidence * 100)}%</span>
              )}
            </div>
            <div className="transcript-text">{transcript}</div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="voice-settings">
        <button
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="음성 설정"
        >
          ⚙️ 설정
        </button>

        {showSettings && (
          <div className="settings-panel">
            <div className="setting-group">
              <label htmlFor="language-select">언어</label>
              <select
                id="language-select"
                value={voiceSettings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
              >
                <option value="ko-KR">한국어</option>
                <option value="en-US">English (US)</option>
                <option value="ja-JP">日本語</option>
                <option value="zh-CN">中文 (简体)</option>
              </select>
            </div>

            <div className="setting-group">
              <label htmlFor="sensitivity-slider">감도</label>
              <input
                id="sensitivity-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.sensitivity}
                onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
              />
              <span>{Math.round(voiceSettings.sensitivity * 100)}%</span>
            </div>

            <div className="setting-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={voiceSettings.autoStop}
                  onChange={(e) => updateSettings({ autoStop: e.target.checked })}
                />
                자동 정지
              </label>
            </div>

            <div className="setting-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={voiceSettings.noiseReduction}
                  onChange={(e) => updateSettings({ noiseReduction: e.target.checked })}
                />
                노이즈 감소
              </label>
            </div>

            <div className="setting-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={voiceSettings.echoCancellation}
                  onChange={(e) => updateSettings({ echoCancellation: e.target.checked })}
                />
                에코 제거
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceControl;
