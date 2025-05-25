import React, { useState, useCallback, useRef } from 'react';
import './CharacterCreator.css';
import { AIAnimationEngine } from '../../ai/AIAnimationEngine';
import type { AnimatedCharacter } from '../../engine/types';

interface CharacterCreatorProps {
  onCharacterCreate: (character: AnimatedCharacter | CharacterData) => void;
  onClose: () => void;
  className?: string;
}

interface CharacterData {
  name: string;
  description: string;
  personality: PersonalityTraits;
  appearance: AppearanceData;
  voice: VoiceData;
  animations: AnimationPresets;
  backstory: string;
  tags: string[];
}

interface PersonalityTraits {
  extraversion: number; // 0-1
  agreeableness: number;
  conscientiousness: number;
  neuroticism: number;
  openness: number;
  dominance: number;
  energy: number;
  friendliness: number;
}

interface AppearanceData {
  bodyType: 'slim' | 'average' | 'athletic' | 'curvy';
  height: number; // 0-1 (relative scale)
  skinTone: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  faceShape: string;
  clothing: ClothingData;
  accessories: string[];
}

interface ClothingData {
  style: string;
  colors: string[];
  patterns: string[];
}

interface VoiceData {
  pitch: number; // 0-1
  speed: number; // 0-1
  tone: 'warm' | 'cool' | 'neutral';
  accent: string;
  emotionalRange: number; // 0-1
}

interface AnimationPresets {
  idle: string[];
  talking: string[];
  emotions: Record<string, string[]>;
  gestures: string[];
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  onCharacterCreate,
  onClose,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [character, setCharacter] = useState<CharacterData>({
    name: '',
    description: '',
    personality: {
      extraversion: 0.5,
      agreeableness: 0.5,
      conscientiousness: 0.5,
      neuroticism: 0.3,
      openness: 0.7,
      dominance: 0.4,
      energy: 0.6,
      friendliness: 0.8
    },
    appearance: {
      bodyType: 'average',
      height: 0.5,
      skinTone: '#F4C2A1',
      hairColor: '#8B4513',
      hairStyle: 'medium',
      eyeColor: '#4B0082',
      faceShape: 'oval',
      clothing: {
        style: 'casual',
        colors: ['#4169E1', '#FFFFFF'],
        patterns: []
      },
      accessories: []
    },
    voice: {
      pitch: 0.5,
      speed: 0.5,
      tone: 'warm',
      accent: 'standard',
      emotionalRange: 0.7
    },
    animations: {
      idle: ['breathing', 'blinking', 'subtle_movement'],
      talking: ['mouth_sync', 'head_nod', 'hand_gesture'],
      emotions: {
        happy: ['smile', 'bright_eyes'],
        sad: ['frown', 'drooped_posture'],
        angry: ['scowl', 'tense_posture'],
        surprised: ['wide_eyes', 'open_mouth']
      },
      gestures: ['wave', 'point', 'thumbs_up', 'shrug']
    },
    backstory: '',
    tags: []
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiAnimationEngine = new AIAnimationEngine();

  const steps = [
    { title: '기본 정보', component: 'basic' },
    { title: '성격', component: 'personality' },
    { title: '외모', component: 'appearance' },
    { title: '음성', component: 'voice' },
    { title: '애니메이션', component: 'animations' },
    { title: '배경 스토리', component: 'backstory' },
    { title: '미리보기', component: 'preview' }
  ];

  const updateCharacter = useCallback((updates: Partial<CharacterData>) => {
    setCharacter((prev: CharacterData) => ({ ...prev, ...updates }));
  }, []);

  const updatePersonality = useCallback((trait: keyof PersonalityTraits, value: number) => {
    setCharacter((prev: CharacterData) => ({
      ...prev,
      personality: { ...prev.personality, [trait]: value }
    }));
  }, []);

  const updateAppearance = useCallback((updates: Partial<AppearanceData>) => {
    setCharacter((prev: CharacterData) => ({
      ...prev,
      appearance: { ...prev.appearance, ...updates }
    }));
  }, []);

  const updateVoice = useCallback((updates: Partial<VoiceData>) => {
    setCharacter((prev: CharacterData) => ({
      ...prev,
      voice: { ...prev.voice, ...updates }
    }));
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateRandomCharacter = () => {
    const randomPersonality: PersonalityTraits = {
      extraversion: Math.random(),
      agreeableness: Math.random(),
      conscientiousness: Math.random(),
      neuroticism: Math.random(),
      openness: Math.random(),
      dominance: Math.random(),
      energy: Math.random(),
      friendliness: Math.random()
    };

    const bodyTypes: Array<AppearanceData['bodyType']> = ['slim', 'average', 'athletic', 'curvy'];
    const hairStyles = ['short', 'medium', 'long', 'curly', 'straight', 'wavy'];
    const faceShapes = ['oval', 'round', 'square', 'heart', 'diamond'];
    const clothingStyles = ['casual', 'formal', 'sporty', 'elegant', 'alternative'];

    updateCharacter({
      personality: randomPersonality,
      appearance: {
        ...character.appearance,
        bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
        height: Math.random(),
        hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
        faceShape: faceShapes[Math.floor(Math.random() * faceShapes.length)],
        clothing: {
          ...character.appearance.clothing,
          style: clothingStyles[Math.floor(Math.random() * clothingStyles.length)]
        }
      },
      voice: {
        ...character.voice,
        pitch: Math.random(),
        speed: 0.3 + Math.random() * 0.4,
        emotionalRange: 0.4 + Math.random() * 0.6
      }
    });
  };

  const renderBasicInfo = () => (
    <div className="step-content">
      <div className="form-group">
        <label htmlFor="character-name">캐릭터 이름</label>
        <input
          id="character-name"
          type="text"
          value={character.name}
          onChange={(e) => updateCharacter({ name: e.target.value })}
          placeholder="캐릭터의 이름을 입력하세요"
        />
      </div>

      <div className="form-group">
        <label htmlFor="character-description">간단한 설명</label>
        <textarea
          id="character-description"
          value={character.description}
          onChange={(e) => updateCharacter({ description: e.target.value })}
          placeholder="캐릭터에 대한 간단한 설명을 작성하세요"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>태그</label>
        <div className="tag-input">
          <input
            type="text"
            placeholder="태그를 입력하고 Enter를 누르세요"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value.trim();
                if (value && !character.tags.includes(value)) {
                  updateCharacter({ tags: [...character.tags, value] });
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }}
          />
          <div className="tags">
            {character.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
                <button
                  onClick={() => updateCharacter({
                    tags: character.tags.filter((_, i) => i !== index)
                  })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>참조 이미지 (선택사항)</label>
        <div className="image-upload">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="upload-button"
          >
            이미지 업로드
          </button>
          {previewImage && (
            <div className="image-preview">
              <img src={previewImage} alt="Character reference" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPersonality = () => (
    <div className="step-content">
      <div className="personality-section">
        <h3>성격 특성</h3>
        <div className="personality-traits">
          {Object.entries(character.personality).map(([trait, value]) => (
            <div key={trait} className="trait-slider">
              <label>{getTraitLabel(trait)}</label>
              <div className="slider-container">
                <span className="slider-label">{getTraitLowLabel(trait)}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value}
                  onChange={(e) => updatePersonality(trait as keyof PersonalityTraits, parseFloat(e.target.value))}
                />
                <span className="slider-label">{getTraitHighLabel(trait)}</span>
              </div>
              <span className="trait-value">{Math.round(value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="personality-actions">
        <button onClick={generateRandomCharacter} className="random-button">
          랜덤 성격 생성
        </button>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="step-content">
      <div className="appearance-section">
        <div className="form-group">
          <label>체형</label>
          <select
            value={character.appearance.bodyType}
            onChange={(e) => updateAppearance({ bodyType: e.target.value as AppearanceData['bodyType'] })}
          >
            <option value="slim">슬림</option>
            <option value="average">보통</option>
            <option value="athletic">운동선수형</option>
            <option value="curvy">곡선형</option>
          </select>
        </div>

        <div className="form-group">
          <label>키</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={character.appearance.height}
            onChange={(e) => updateAppearance({ height: parseFloat(e.target.value) })}
          />
          <span>{character.appearance.height < 0.3 ? '작음' : character.appearance.height > 0.7 ? '큼' : '보통'}</span>
        </div>

        <div className="form-group">
          <label>피부톤</label>
          <input
            type="color"
            value={character.appearance.skinTone}
            onChange={(e) => updateAppearance({ skinTone: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>머리 색상</label>
          <input
            type="color"
            value={character.appearance.hairColor}
            onChange={(e) => updateAppearance({ hairColor: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>헤어스타일</label>
          <select
            value={character.appearance.hairStyle}
            onChange={(e) => updateAppearance({ hairStyle: e.target.value })}
          >
            <option value="short">짧은 머리</option>
            <option value="medium">중간 길이</option>
            <option value="long">긴 머리</option>
            <option value="curly">곱슬머리</option>
            <option value="straight">직모</option>
            <option value="wavy">웨이브</option>
          </select>
        </div>

        <div className="form-group">
          <label>눈 색상</label>
          <input
            type="color"
            value={character.appearance.eyeColor}
            onChange={(e) => updateAppearance({ eyeColor: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>얼굴형</label>
          <select
            value={character.appearance.faceShape}
            onChange={(e) => updateAppearance({ faceShape: e.target.value })}
          >
            <option value="oval">타원형</option>
            <option value="round">둥근형</option>
            <option value="square">사각형</option>
            <option value="heart">하트형</option>
            <option value="diamond">다이아몬드형</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderVoice = () => (
    <div className="step-content">
      <div className="voice-section">
        <div className="form-group">
          <label>음성 높이</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={character.voice.pitch}
            onChange={(e) => updateVoice({ pitch: parseFloat(e.target.value) })}
          />
          <span>{character.voice.pitch < 0.3 ? '낮음' : character.voice.pitch > 0.7 ? '높음' : '보통'}</span>
        </div>

        <div className="form-group">
          <label>말하기 속도</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={character.voice.speed}
            onChange={(e) => updateVoice({ speed: parseFloat(e.target.value) })}
          />
          <span>{character.voice.speed < 0.3 ? '느림' : character.voice.speed > 0.7 ? '빠름' : '보통'}</span>
        </div>

        <div className="form-group">
          <label>톤</label>
          <select
            value={character.voice.tone}
            onChange={(e) => updateVoice({ tone: e.target.value as VoiceData['tone'] })}
          >
            <option value="warm">따뜻함</option>
            <option value="cool">차가움</option>
            <option value="neutral">중성적</option>
          </select>
        </div>

        <div className="form-group">
          <label>감정 표현 범위</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={character.voice.emotionalRange}
            onChange={(e) => updateVoice({ emotionalRange: parseFloat(e.target.value) })}
          />
          <span>{Math.round(character.voice.emotionalRange * 100)}%</span>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="step-content preview-section">
      <div className="character-preview">
        <h3>{character.name || '이름 없음'}</h3>
        <p>{character.description}</p>
        
        <div className="preview-details">
          <div className="detail-section">
            <h4>성격</h4>
            <div className="personality-preview">
              {Object.entries(character.personality).map(([trait, value]) => (
                <div key={trait} className="trait-preview">
                  <span>{getTraitLabel(trait)}</span>
                  <div className="trait-bar">
                    <div
                      className="trait-fill"
                      style={{ width: `${value * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>외모</h4>
            <div className="appearance-preview">
              <p>체형: {getBodyTypeLabel(character.appearance.bodyType)}</p>
              <p>키: {getHeightLabel(character.appearance.height)}</p>
              <p>헤어스타일: {character.appearance.hairStyle}</p>
              <p>얼굴형: {character.appearance.faceShape}</p>
            </div>
          </div>

          <div className="detail-section">
            <h4>음성</h4>
            <div className="voice-preview">
              <p>톤: {character.voice.tone}</p>
              <p>높이: {getVoicePitchLabel(character.voice.pitch)}</p>
              <p>속도: {getVoiceSpeedLabel(character.voice.speed)}</p>
            </div>
          </div>
        </div>

        {character.tags.length > 0 && (
          <div className="tags-preview">
            {character.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const getTraitLabel = (trait: string): string => {
    const labels: Record<string, string> = {
      extraversion: '외향성',
      agreeableness: '친화성',
      conscientiousness: '성실성',
      neuroticism: '신경성',
      openness: '개방성',
      dominance: '지배성',
      energy: '활력',
      friendliness: '친근함'
    };
    return labels[trait] || trait;
  };

  const getTraitLowLabel = (trait: string): string => {
    const labels: Record<string, string> = {
      extraversion: '내향적',
      agreeableness: '경쟁적',
      conscientiousness: '즉흥적',
      neuroticism: '안정적',
      openness: '전통적',
      dominance: '순종적',
      energy: '차분함',
      friendliness: '거리두기'
    };
    return labels[trait] || '낮음';
  };

  const getTraitHighLabel = (trait: string): string => {
    const labels: Record<string, string> = {
      extraversion: '외향적',
      agreeableness: '협력적',
      conscientiousness: '계획적',
      neuroticism: '민감함',
      openness: '창의적',
      dominance: '지배적',
      energy: '활발함',
      friendliness: '친근함'
    };
    return labels[trait] || '높음';
  };

  const getBodyTypeLabel = (bodyType: string): string => {
    const labels: Record<string, string> = {
      slim: '슬림',
      average: '보통',
      athletic: '운동선수형',
      curvy: '곡선형'
    };
    return labels[bodyType] || bodyType;
  };

  const getHeightLabel = (height: number): string => {
    if (height < 0.3) return '작음';
    if (height > 0.7) return '큼';
    return '보통';
  };

  const getVoicePitchLabel = (pitch: number): string => {
    if (pitch < 0.3) return '낮음';
    if (pitch > 0.7) return '높음';
    return '보통';
  };

  const getVoiceSpeedLabel = (speed: number): string => {
    if (speed < 0.3) return '느림';
    if (speed > 0.7) return '빠름';
    return '보통';
  };

  const handleCreate = async () => {
    // 이미지 업로드가 있을 경우 자동 추출/리깅 파이프라인 실행
    if (previewImage) {
      try {
        // base64 → File 변환
        const file = await fetch(previewImage)
          .then(res => res.blob())
          .then(blob => new File([blob], `${character.name || 'character'}.png`, { type: blob.type }));
        const animatedCharacter: AnimatedCharacter = await aiAnimationEngine.processUserImage(file);
        onCharacterCreate(animatedCharacter);
        return;
      } catch (err) {
        alert('캐릭터 자동 추출/리깅에 실패했습니다. 수동 설정을 사용하세요.');
        // fallback: 수동 데이터 전달
      }
    }
    // 이미지가 없으면 기존 character 데이터 전달 (수동 생성)
    onCharacterCreate(character);
  };

  const renderCurrentStep = () => {
    switch (steps[currentStep].component) {
      case 'basic': return renderBasicInfo();
      case 'personality': return renderPersonality();
      case 'appearance': return renderAppearance();
      case 'voice': return renderVoice();
      case 'animations': return <div className="step-content">애니메이션 설정 (개발 중)</div>;
      case 'backstory': return (
        <div className="step-content">
          <div className="form-group">
            <label htmlFor="backstory">배경 스토리</label>
            <textarea
              id="backstory"
              value={character.backstory}
              onChange={(e) => updateCharacter({ backstory: e.target.value })}
              placeholder="캐릭터의 배경 스토리를 작성하세요"
              rows={6}
            />
          </div>
        </div>
      );
      case 'preview': return renderPreview();
      default: return <div>알 수 없는 단계</div>;
    }
  };

  return (
    <div className={`character-creator ${className}`}>
      <div className="creator-header">
        <h2>캐릭터 생성</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="creator-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>
        <div className="step-indicators">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`step-indicator ${index <= currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(index)}
            >
              <span className="step-number">{index + 1}</span>
              <span className="step-title">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="creator-content">
        <div className="step-header">
          <h3>{steps[currentStep].title}</h3>
        </div>
        {renderCurrentStep()}
      </div>

      <div className="creator-actions">
        <button
          className="prev-button"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          이전
        </button>
        
        {currentStep === steps.length - 1 ? (
          <button className="create-button" onClick={handleCreate}>
            캐릭터 생성
          </button>
        ) : (
          <button
            className="next-button"
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          >
            다음
          </button>
        )}
      </div>
    </div>
  );
};

export default CharacterCreator;
