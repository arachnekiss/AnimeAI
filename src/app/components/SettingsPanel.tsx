import React, { useState, useEffect, useCallback } from 'react';
import './SettingsPanel.css';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
  currentSettings: AppSettings;
  className?: string;
}

interface AppSettings {
  // 렌더링 설정
  rendering: {
    quality: 'low' | 'medium' | 'high' | 'ultra';
    antiAliasing: boolean;
    shadowQuality: 'off' | 'low' | 'medium' | 'high';
    frameRate: 30 | 60 | 120 | 'unlimited';
    vsync: boolean;
    resolutionScale: number; // 0.5 - 2.0
  };
  
  // 애니메이션 설정
  animation: {
    quality: 'low' | 'medium' | 'high';
    smoothing: number; // 0-1
    interpolation: 'linear' | 'cubic' | 'quintic';
    optimizePerformance: boolean;
    enablePhysics: boolean;
    physicsAccuracy: 'low' | 'medium' | 'high';
  };
  
  // 오디오 설정
  audio: {
    masterVolume: number; // 0-1
    voiceVolume: number; // 0-1
    sfxVolume: number; // 0-1
    musicVolume: number; // 0-1
    enableSpatialAudio: boolean;
    audioQuality: 'low' | 'medium' | 'high';
  };
  
  // AI 설정
  ai: {
    responseSpeed: 'fast' | 'balanced' | 'creative';
    emotionalDepth: number; // 0-1
    creativity: number; // 0-1
    coherence: number; // 0-1
    memoryLength: number; // 메시지 수
    enableLearning: boolean;
    personalityStability: number; // 0-1
  };
  
  // 인터페이스 설정
  interface: {
    theme: 'dark' | 'light' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    language: 'ko' | 'en' | 'ja' | 'zh';
    showFPS: boolean;
    showPerformanceMonitor: boolean;
    enableNotifications: boolean;
    autoHideUI: boolean;
    uiOpacity: number; // 0-1
  };
  
  // 개발자 설정
  developer: {
    enableDebugMode: boolean;
    showConsole: boolean;
    verboseLogging: boolean;
    enableExperimentalFeatures: boolean;
    cacheDuration: number; // 시간 (분)
  };
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSettingsChange,
  currentSettings,
  className = ''
}) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState('rendering');
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 탭 정의
  const tabs = [
    { id: 'rendering', label: '렌더링', icon: '🎨' },
    { id: 'animation', label: '애니메이션', icon: '🎭' },
    { id: 'audio', label: '오디오', icon: '🔊' },
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'interface', label: '인터페이스', icon: '🖼️' },
    { id: 'developer', label: '개발자', icon: '🛠️' }
  ];

  // 설정 변경 감지
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(currentSettings));
  }, [settings, currentSettings]);

  // 설정 업데이트 함수
  const updateSettings = useCallback(<T extends keyof AppSettings>(
    category: T,
    updates: Partial<AppSettings[T]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...updates }
    }));
  }, []);

  // 설정 저장
  const handleSave = () => {
    onSettingsChange(settings);
    setHasChanges(false);
  };

  // 설정 초기화
  const handleReset = () => {
    setSettings(currentSettings);
    setHasChanges(false);
  };

  // 기본값으로 복원
  const handleRestoreDefaults = () => {
    const defaultSettings: AppSettings = {
      rendering: {
        quality: 'medium',
        antiAliasing: true,
        shadowQuality: 'medium',
        frameRate: 60,
        vsync: true,
        resolutionScale: 1.0
      },
      animation: {
        quality: 'medium',
        smoothing: 0.5,
        interpolation: 'cubic',
        optimizePerformance: true,
        enablePhysics: true,
        physicsAccuracy: 'medium'
      },
      audio: {
        masterVolume: 0.8,
        voiceVolume: 1.0,
        sfxVolume: 0.7,
        musicVolume: 0.5,
        enableSpatialAudio: true,
        audioQuality: 'high'
      },
      ai: {
        responseSpeed: 'balanced',
        emotionalDepth: 0.7,
        creativity: 0.6,
        coherence: 0.8,
        memoryLength: 20,
        enableLearning: true,
        personalityStability: 0.7
      },
      interface: {
        theme: 'dark',
        fontSize: 'medium',
        language: 'ko',
        showFPS: false,
        showPerformanceMonitor: false,
        enableNotifications: true,
        autoHideUI: false,
        uiOpacity: 0.9
      },
      developer: {
        enableDebugMode: false,
        showConsole: false,
        verboseLogging: false,
        enableExperimentalFeatures: false,
        cacheDuration: 60
      }
    };
    setSettings(defaultSettings);
  };

  // 검색 필터링
  const filteredTabs = tabs.filter(tab => 
    searchQuery === '' || 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  const renderRenderingSettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label>렌더링 품질</label>
        <select
          value={settings.rendering.quality}
          onChange={(e) => updateSettings('rendering', { quality: e.target.value as any })}
        >
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
          <option value="ultra">울트라</option>
        </select>
        <span className="setting-description">전체 렌더링 품질을 조절합니다.</span>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.rendering.antiAliasing}
            onChange={(e) => updateSettings('rendering', { antiAliasing: e.target.checked })}
          />
          안티앨리어싱
        </label>
        <span className="setting-description">가장자리를 부드럽게 만듭니다.</span>
      </div>

      <div className="setting-group">
        <label>그림자 품질</label>
        <select
          value={settings.rendering.shadowQuality}
          onChange={(e) => updateSettings('rendering', { shadowQuality: e.target.value as any })}
        >
          <option value="off">끄기</option>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>

      <div className="setting-group">
        <label>프레임 레이트</label>
        <select
          value={settings.rendering.frameRate}
          onChange={(e) => updateSettings('rendering', { frameRate: e.target.value === 'unlimited' ? 'unlimited' : parseInt(e.target.value) as any })}
        >
          <option value="30">30 FPS</option>
          <option value="60">60 FPS</option>
          <option value="120">120 FPS</option>
          <option value="unlimited">무제한</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.rendering.vsync}
            onChange={(e) => updateSettings('rendering', { vsync: e.target.checked })}
          />
          수직 동기화 (VSync)
        </label>
        <span className="setting-description">화면 찢어짐을 방지합니다.</span>
      </div>

      <div className="setting-group">
        <label>해상도 스케일</label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={settings.rendering.resolutionScale}
          onChange={(e) => updateSettings('rendering', { resolutionScale: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.rendering.resolutionScale * 100)}%</span>
      </div>
    </div>
  );

  const renderAnimationSettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label>애니메이션 품질</label>
        <select
          value={settings.animation.quality}
          onChange={(e) => updateSettings('animation', { quality: e.target.value as any })}
        >
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>

      <div className="setting-group">
        <label>스무딩</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.animation.smoothing}
          onChange={(e) => updateSettings('animation', { smoothing: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.animation.smoothing * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>보간 방식</label>
        <select
          value={settings.animation.interpolation}
          onChange={(e) => updateSettings('animation', { interpolation: e.target.value as any })}
        >
          <option value="linear">선형</option>
          <option value="cubic">큐빅</option>
          <option value="quintic">퀸틱</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.animation.optimizePerformance}
            onChange={(e) => updateSettings('animation', { optimizePerformance: e.target.checked })}
          />
          성능 최적화
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.animation.enablePhysics}
            onChange={(e) => updateSettings('animation', { enablePhysics: e.target.checked })}
          />
          물리 시뮬레이션
        </label>
      </div>

      {settings.animation.enablePhysics && (
        <div className="setting-group">
          <label>물리 정확도</label>
          <select
            value={settings.animation.physicsAccuracy}
            onChange={(e) => updateSettings('animation', { physicsAccuracy: e.target.value as any })}
          >
            <option value="low">낮음</option>
            <option value="medium">보통</option>
            <option value="high">높음</option>
          </select>
        </div>
      )}
    </div>
  );

  const renderAudioSettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label>마스터 볼륨</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.masterVolume}
          onChange={(e) => updateSettings('audio', { masterVolume: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.audio.masterVolume * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>음성 볼륨</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.voiceVolume}
          onChange={(e) => updateSettings('audio', { voiceVolume: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.audio.voiceVolume * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>효과음 볼륨</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.sfxVolume}
          onChange={(e) => updateSettings('audio', { sfxVolume: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.audio.sfxVolume * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>배경음악 볼륨</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.audio.musicVolume}
          onChange={(e) => updateSettings('audio', { musicVolume: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.audio.musicVolume * 100)}%</span>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.audio.enableSpatialAudio}
            onChange={(e) => updateSettings('audio', { enableSpatialAudio: e.target.checked })}
          />
          공간 오디오
        </label>
      </div>

      <div className="setting-group">
        <label>오디오 품질</label>
        <select
          value={settings.audio.audioQuality}
          onChange={(e) => updateSettings('audio', { audioQuality: e.target.value as any })}
        >
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>
    </div>
  );

  const renderAISettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label>응답 속도</label>
        <select
          value={settings.ai.responseSpeed}
          onChange={(e) => updateSettings('ai', { responseSpeed: e.target.value as any })}
        >
          <option value="fast">빠름</option>
          <option value="balanced">균형</option>
          <option value="creative">창의적</option>
        </select>
      </div>

      <div className="setting-group">
        <label>감정 깊이</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.ai.emotionalDepth}
          onChange={(e) => updateSettings('ai', { emotionalDepth: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.ai.emotionalDepth * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>창의성</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.ai.creativity}
          onChange={(e) => updateSettings('ai', { creativity: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.ai.creativity * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>일관성</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.ai.coherence}
          onChange={(e) => updateSettings('ai', { coherence: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.ai.coherence * 100)}%</span>
      </div>

      <div className="setting-group">
        <label>메모리 길이</label>
        <input
          type="range"
          min="5"
          max="100"
          step="1"
          value={settings.ai.memoryLength}
          onChange={(e) => updateSettings('ai', { memoryLength: parseInt(e.target.value) })}
        />
        <span className="range-value">{settings.ai.memoryLength}개 메시지</span>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.ai.enableLearning}
            onChange={(e) => updateSettings('ai', { enableLearning: e.target.checked })}
          />
          학습 기능
        </label>
      </div>

      <div className="setting-group">
        <label>성격 안정성</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.ai.personalityStability}
          onChange={(e) => updateSettings('ai', { personalityStability: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.ai.personalityStability * 100)}%</span>
      </div>
    </div>
  );

  const renderInterfaceSettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label>테마</label>
        <select
          value={settings.interface.theme}
          onChange={(e) => updateSettings('interface', { theme: e.target.value as any })}
        >
          <option value="dark">다크</option>
          <option value="light">라이트</option>
          <option value="auto">자동</option>
        </select>
      </div>

      <div className="setting-group">
        <label>폰트 크기</label>
        <select
          value={settings.interface.fontSize}
          onChange={(e) => updateSettings('interface', { fontSize: e.target.value as any })}
        >
          <option value="small">작게</option>
          <option value="medium">보통</option>
          <option value="large">크게</option>
        </select>
      </div>

      <div className="setting-group">
        <label>언어</label>
        <select
          value={settings.interface.language}
          onChange={(e) => updateSettings('interface', { language: e.target.value as any })}
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="zh">中文</option>
        </select>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.interface.showFPS}
            onChange={(e) => updateSettings('interface', { showFPS: e.target.checked })}
          />
          FPS 표시
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.interface.showPerformanceMonitor}
            onChange={(e) => updateSettings('interface', { showPerformanceMonitor: e.target.checked })}
          />
          성능 모니터
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.interface.enableNotifications}
            onChange={(e) => updateSettings('interface', { enableNotifications: e.target.checked })}
          />
          알림
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.interface.autoHideUI}
            onChange={(e) => updateSettings('interface', { autoHideUI: e.target.checked })}
          />
          UI 자동 숨김
        </label>
      </div>

      <div className="setting-group">
        <label>UI 불투명도</label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={settings.interface.uiOpacity}
          onChange={(e) => updateSettings('interface', { uiOpacity: parseFloat(e.target.value) })}
        />
        <span className="range-value">{Math.round(settings.interface.uiOpacity * 100)}%</span>
      </div>
    </div>
  );

  const renderDeveloperSettings = () => (
    <div className="settings-section">
      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.developer.enableDebugMode}
            onChange={(e) => updateSettings('developer', { enableDebugMode: e.target.checked })}
          />
          디버그 모드
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.developer.showConsole}
            onChange={(e) => updateSettings('developer', { showConsole: e.target.checked })}
          />
          콘솔 표시
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.developer.verboseLogging}
            onChange={(e) => updateSettings('developer', { verboseLogging: e.target.checked })}
          />
          상세 로깅
        </label>
      </div>

      <div className="setting-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.developer.enableExperimentalFeatures}
            onChange={(e) => updateSettings('developer', { enableExperimentalFeatures: e.target.checked })}
          />
          실험적 기능
        </label>
      </div>

      <div className="setting-group">
        <label>캐시 지속 시간</label>
        <input
          type="range"
          min="1"
          max="1440"
          step="1"
          value={settings.developer.cacheDuration}
          onChange={(e) => updateSettings('developer', { cacheDuration: parseInt(e.target.value) })}
        />
        <span className="range-value">{settings.developer.cacheDuration}분</span>
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'rendering': return renderRenderingSettings();
      case 'animation': return renderAnimationSettings();
      case 'audio': return renderAudioSettings();
      case 'ai': return renderAISettings();
      case 'interface': return renderInterfaceSettings();
      case 'developer': return renderDeveloperSettings();
      default: return <div>알 수 없는 탭</div>;
    }
  };

  return (
    <div className={`settings-panel ${className}`}>
      <div className="settings-overlay" onClick={onClose}></div>
      <div className="settings-container">
        <div className="settings-header">
          <h2>설정</h2>
          <div className="settings-search">
            <input
              type="text"
              placeholder="설정 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-sidebar">
            <div className="settings-tabs">
              {filteredTabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-main">
            <div className="settings-tab-content">
              {renderCurrentTab()}
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <div className="action-group">
            <button 
              className="restore-button"
              onClick={handleRestoreDefaults}
            >
              기본값 복원
            </button>
            <button 
              className="reset-button"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              초기화
            </button>
          </div>
          <div className="action-group">
            <button className="cancel-button" onClick={onClose}>
              취소
            </button>
            <button 
              className="save-button"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
