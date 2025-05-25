/**
 * Core type definitions for the AI Character Animation Engine
 */

import { Vector2, Vector3, Matrix4, Quaternion } from 'three';

// ===== Core Animation Types =====

/**
 * 2D point with optional z-depth for pseudo-3D effects
 */
export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

/**
 * Bone structure for character rigging
 */
export interface Bone {
  id: string;
  name: string;
  position: Point2D;
  rotation: number;
  scale: Point2D;
  parent?: string;
  children: string[];
  length: number;
  weight: number;
}

/**
 * Mesh vertex with UV coordinates and bone weights
 */
export interface Vertex {
  position: Point2D;
  uv: Point2D;
  boneWeights: Array<{ boneId: string; weight: number }>;
  normal?: Vector2;
}

/**
 * Triangle face for mesh triangulation
 */
export interface Face {
  vertices: [number, number, number];
  normal?: Vector3;
}

/**
 * Character mesh data
 */
export interface CharacterMesh {
  vertices: Vertex[];
  faces: Face[];
  textureCoords: Point2D[];
  bounds: {
    min: Point2D;
    max: Point2D;
  };
}

/**
 * Animation keyframe
 */
export interface Keyframe {
  time: number;
  transform: {
    position: Point2D;
    rotation: number;
    scale: Point2D;
  };
  easing?: EasingFunction;
}

/**
 * Animation clip containing keyframes for multiple bones
 */
export interface AnimationClip {
  id: string;
  name: string;
  duration: number;
  loop: boolean;
  keyframes: Map<string, Keyframe[]>; // boneId -> keyframes
}

/**
 * Animation state for state machine
 */
export interface AnimationState {
  id: string;
  name: string;
  clip: AnimationClip;
  transitions: AnimationTransition[];
  weight: number;
  speed: number;
}

/**
 * Animation transition between states
 */
export interface AnimationTransition {
  from: string;
  to: string;
  duration: number;
  condition?: () => boolean;
  easing?: EasingFunction;
}

// ===== Expression and Emotion Types =====

/**
 * Facial expression parameters
 */
export interface ExpressionParameters {
  eyeOpenLeft: number;     // 0-1
  eyeOpenRight: number;    // 0-1
  eyebrowLeft: number;     // -1 to 1 (down to up)
  eyebrowRight: number;    // -1 to 1
  mouthOpen: number;       // 0-1
  mouthSmile: number;      // -1 to 1 (frown to smile)
  cheekPuff: number;       // 0-1
  headRotationX: number;   // -45 to 45 degrees
  headRotationY: number;   // -45 to 45 degrees
  headRotationZ: number;   // -15 to 15 degrees
}

/**
 * Emotion state for expression mapping
 */
export interface EmotionState {
  happiness: number;       // 0-1
  sadness: number;         // 0-1
  anger: number;           // 0-1
  surprise: number;        // 0-1
  fear: number;            // 0-1
  disgust: number;         // 0-1
  neutral: number;         // 0-1
  arousal: number;         // 0-1 (energy level)
  valence: number;         // -1 to 1 (negative to positive)
}

// ===== Physics Types =====

/**
 * Physics particle for hair and cloth simulation
 */
export interface PhysicsParticle {
  id: string;
  position: Point2D;
  previousPosition: Point2D;
  velocity: Vector2;
  acceleration: Vector2;
  mass: number;
  pinned: boolean;
  damping: number;
}

/**
 * Physics constraint between particles
 */
export interface PhysicsConstraint {
  particleA: string;
  particleB: string;
  restLength: number;
  stiffness: number;
  type: 'distance' | 'bend' | 'collision';
}

/**
 * Physics simulation parameters
 */
export interface PhysicsSettings {
  gravity: Vector2;
  wind: Vector2;
  airResistance: number;
  groundLevel: number;
  substeps: number;
  timeStep: number;
}

// ===== Rendering Types =====

/**
 * Render layer for multi-layer composition
 */
export interface RenderLayer {
  id: string;
  name: string;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  zIndex: number;
}

/**
 * Rendering context for different backends
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D | WebGL2RenderingContext;
  width: number;
  height: number;
  pixelRatio: number;
  type: 'canvas2d' | 'webgl2';
}

/**
 * Texture data for character rendering
 */
export interface Texture {
  id: string;
  image: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  format: 'rgba' | 'rgb' | 'alpha';
  wrapS: 'repeat' | 'clamp' | 'mirror';
  wrapT: 'repeat' | 'clamp' | 'mirror';
  minFilter: 'nearest' | 'linear' | 'mipmap';
  magFilter: 'nearest' | 'linear';
}

// ===== AI Integration Types =====

/**
 * Character personality configuration
 */
export interface CharacterPersonality {
  name: string;
  description: string;
  traits: string[];
  speaking_style: string;
  emotional_range: {
    expressiveness: number; // 0-1
    stability: number;      // 0-1
    reactivity: number;     // 0-1
  };
  conversation_context: string;
}

/**
 * Voice configuration for TTS
 */
export interface VoiceConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  language: string;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  emotion?: EmotionState;
  gesture?: string;
}

// ===== Utility Types =====

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Blend mode for layer composition
 */
export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'soft-light' 
  | 'hard-light' 
  | 'color-dodge' 
  | 'color-burn'
  | 'darken' 
  | 'lighten';

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  triangleCount: number;
  drawCalls: number;
}

/**
 * Configuration for the animation engine
 */
export interface EngineConfig {
  targetFPS: number;
  enablePhysics: boolean;
  physicsSubsteps: number;
  renderBackend: 'auto' | 'webgl2' | 'canvas2d';
  maxCharacters: number;
  debugMode: boolean;
  performanceMonitoring: boolean;
}

// ===== Event Types =====

/**
 * Engine events
 */
export interface EngineEvents {
  'character-loaded': { character: any };
  'animation-started': { state: string };
  'animation-finished': { state: string };
  'expression-changed': { expression: ExpressionParameters };
  'emotion-detected': { emotion: EmotionState };
  'performance-update': { metrics: PerformanceMetrics };
  'error': { error: Error };
}

/**
 * Event listener type
 */
export type EventListener<T = any> = (data: T) => void;

// ===== AI Image Processing Types =====

/**
 * 원본 이미지와 추출된 캐릭터 정보
 */
export interface CharacterData {
  id: string;
  name?: string;
  sourceImage: string; // base64 or URL
  features?: Record<string, any>; // 얼굴, 신체, 의상 등 추출 특징
  meta?: Record<string, any>;
}

/**
 * 전체 스켈레톤 구조
 */
export interface Skeleton {
  bones: Bone[];
  root: string; // root bone id
}

/**
 * 멀티앵글/멀티레이어 이미지 데이터
 */
export interface ViewLayers {
  angles: string[]; // ex: ["front", "side", "back"]
  layers: Record<string, string>; // angle -> base64/URL
}

/**
 * 리깅 및 블렌드셰이프 포함 캐릭터
 */
export interface RiggedCharacter {
  mesh: CharacterMesh;
  skeleton: Skeleton;
  blendShapes?: Record<string, Float32Array>; // 표정/변형용
  constraints?: Record<string, any>; // 본 제약조건 등
}

/**
 * 최종 애니메이션 가능한 캐릭터
 */
export interface AnimatedCharacter {
  id: string;
  rigged: RiggedCharacter;
  viewLayers: ViewLayers;
  personality?: CharacterPersonality;
  voiceConfig?: VoiceConfig;
  meta?: Record<string, any>;
}

// ===== Backend Compatibility Types =====

/**
 * Basic Character data for backend
 */
export interface Character {
  id: string;
  name: string;
  style: 'anime' | 'realistic' | 'cartoon' | 'chibi';
  personality?: CharacterPersonality;
  bones?: Bone[];
  mesh?: CharacterMesh;
  animations?: AnimationClip[];
  backstory?: string;
  specialAbilities?: string[];
  metadata?: {
    generatedFrom?: string;
    generation_options?: any;
    creation_method?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Emotion detection result
 */
export interface Emotion {
  type: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'excited';
  intensity: number; // 0-1
  confidence: number; // 0-1
}

/**
 * Animation state enum for backend
 */
export type AnimationStateType = 'idle' | 'talking' | 'listening' | 'thinking' | 'gesturing';
