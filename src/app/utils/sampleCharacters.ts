import { Character, Bone, CharacterMesh, AnimationClip, Keyframe, Point2D } from '../../engine/types';

// 샘플 캐릭터 생성 함수
export const createSampleCharacter = (): Character => {
  // 기본 본 구조 (간단한 휴머노이드)
  const bones: Bone[] = [
    {
      id: 'root',
      name: 'Root',
      position: { x: 0, y: 0 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      children: ['spine'],
      length: 10,
      weight: 1
    },
    {
      id: 'spine',
      name: 'Spine',
      position: { x: 0, y: 50 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'root',
      children: ['head', 'leftArm', 'rightArm'],
      length: 60,
      weight: 1
    },
    {
      id: 'head',
      name: 'Head',
      position: { x: 0, y: 120 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'spine',
      children: [],
      length: 40,
      weight: 1
    },
    {
      id: 'leftArm',
      name: 'Left Arm',
      position: { x: -30, y: 100 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'spine',
      children: ['leftForearm'],
      length: 35,
      weight: 1
    },
    {
      id: 'leftForearm',
      name: 'Left Forearm',
      position: { x: -60, y: 80 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'leftArm',
      children: [],
      length: 30,
      weight: 1
    },
    {
      id: 'rightArm',
      name: 'Right Arm',
      position: { x: 30, y: 100 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'spine',
      children: ['rightForearm'],
      length: 35,
      weight: 1
    },
    {
      id: 'rightForearm',
      name: 'Right Forearm',
      position: { x: 60, y: 80 },
      rotation: 0,
      scale: { x: 1, y: 1 },
      parent: 'rightArm',
      children: [],
      length: 30,
      weight: 1
    }
  ];

  // 간단한 메시 (사각형 기반)
  const mesh: CharacterMesh = {
    vertices: [
      { position: { x: -20, y: 0 }, uv: { x: 0, y: 0 }, boneWeights: [{ boneId: 'root', weight: 1 }] },
      { position: { x: 20, y: 0 }, uv: { x: 1, y: 0 }, boneWeights: [{ boneId: 'root', weight: 1 }] },
      { position: { x: 20, y: 160 }, uv: { x: 1, y: 1 }, boneWeights: [{ boneId: 'head', weight: 1 }] },
      { position: { x: -20, y: 160 }, uv: { x: 0, y: 1 }, boneWeights: [{ boneId: 'head', weight: 1 }] }
    ],
    faces: [
      { vertices: [0, 1, 2] },
      { vertices: [0, 2, 3] }
    ],
    textureCoords: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ],
    bounds: {
      min: { x: -20, y: 0 },
      max: { x: 20, y: 160 }
    }
  };

  // 기본 애니메이션 클립들
  const idleKeyframes = new Map<string, Keyframe[]>();
  idleKeyframes.set('head', [
    { time: 0, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 2000, transform: { position: { x: 0, y: 125 }, rotation: 0.1, scale: { x: 1, y: 1 } } },
    { time: 4000, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);

  // Wave 애니메이션
  const waveKeyframes = new Map<string, Keyframe[]>();
  waveKeyframes.set('rightArm', [
    { time: 0, transform: { position: { x: 30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 500, transform: { position: { x: 35, y: 105 }, rotation: 0.5, scale: { x: 1, y: 1 } } },
    { time: 1000, transform: { position: { x: 30, y: 110 }, rotation: 0.8, scale: { x: 1, y: 1 } } },
    { time: 1500, transform: { position: { x: 25, y: 105 }, rotation: 0.3, scale: { x: 1, y: 1 } } },
    { time: 2000, transform: { position: { x: 30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);

  // Talk 애니메이션
  const talkKeyframes = new Map<string, Keyframe[]>();
  talkKeyframes.set('head', [
    { time: 0, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 200, transform: { position: { x: 2, y: 122 }, rotation: 0.1, scale: { x: 1.02, y: 0.98 } } },
    { time: 400, transform: { position: { x: -1, y: 118 }, rotation: -0.05, scale: { x: 0.98, y: 1.02 } } },
    { time: 600, transform: { position: { x: 1, y: 121 }, rotation: 0.08, scale: { x: 1.01, y: 0.99 } } },
    { time: 800, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);

  // Listen 애니메이션
  const listenKeyframes = new Map<string, Keyframe[]>();
  listenKeyframes.set('head', [
    { time: 0, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 1000, transform: { position: { x: -3, y: 123 }, rotation: -0.15, scale: { x: 1, y: 1 } } },
    { time: 2000, transform: { position: { x: 0, y: 120 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);

  // Gesture 애니메이션
  const gestureKeyframes = new Map<string, Keyframe[]>();
  gestureKeyframes.set('leftArm', [
    { time: 0, transform: { position: { x: -30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 800, transform: { position: { x: -25, y: 115 }, rotation: 0.6, scale: { x: 1, y: 1 } } },
    { time: 1600, transform: { position: { x: -30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);
  gestureKeyframes.set('rightArm', [
    { time: 0, transform: { position: { x: 30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } },
    { time: 400, transform: { position: { x: 35, y: 108 }, rotation: 0.4, scale: { x: 1, y: 1 } } },
    { time: 1200, transform: { position: { x: 25, y: 112 }, rotation: -0.3, scale: { x: 1, y: 1 } } },
    { time: 1600, transform: { position: { x: 30, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } } }
  ]);

  const animations: AnimationClip[] = [
    {
      id: 'idle',
      name: 'Idle',
      duration: 4000,
      loop: true,
      keyframes: idleKeyframes
    },
    {
      id: 'wave',
      name: 'Wave',
      duration: 2000,
      loop: false,
      keyframes: waveKeyframes
    },
    {
      id: 'talk',
      name: 'Talk',
      duration: 800,
      loop: true,
      keyframes: talkKeyframes
    },
    {
      id: 'listen',
      name: 'Listen',
      duration: 2000,
      loop: true,
      keyframes: listenKeyframes
    },
    {
      id: 'gesture',
      name: 'Gesture',
      duration: 1600,
      loop: false,
      keyframes: gestureKeyframes
    }
  ];

  return {
    id: 'sample-character-1',
    name: 'Sample Anime Character',
    style: 'anime',
    bones,
    mesh,
    animations,
    personality: {
      name: 'Cheerful Assistant',
      description: 'A friendly AI companion',
      traits: ['helpful', 'energetic', 'curious'],
      speaking_style: 'casual and warm',
      emotional_range: {
        expressiveness: 0.8,
        stability: 0.7,
        reactivity: 0.9
      },
      conversation_context: 'I am here to help and chat with you!'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// 다양한 감정/상태에 따른 샘플 캐릭터 변형
export const createCharacterVariants = () => {
  const baseCharacter = createSampleCharacter();
  
  return {
    happy: { ...baseCharacter, id: 'character-happy', name: 'Happy Character' },
    sad: { ...baseCharacter, id: 'character-sad', name: 'Sad Character' },
    excited: { ...baseCharacter, id: 'character-excited', name: 'Excited Character' },
    thinking: { ...baseCharacter, id: 'character-thinking', name: 'Thinking Character' }
  };
};

// 애니메이션 상태 생성
export const createAnimationStates = () => {
  return {
    idle: 'idle' as const,
    talking: 'talking' as const,
    listening: 'listening' as const,
    thinking: 'thinking' as const,
    gesturing: 'gesturing' as const
  };
};

// 감정 상태 생성
export const createEmotionStates = () => {
  return [
    'happy',
    'sad', 
    'angry',
    'surprised',
    'neutral',
    'excited'
  ];
};
