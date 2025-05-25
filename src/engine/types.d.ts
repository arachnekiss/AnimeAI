/**
 * Core type definitions for the AI Character Animation Engine
 */
import { Vector2, Vector3 } from 'three';
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
    boneWeights: Array<{
        boneId: string;
        weight: number;
    }>;
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
    keyframes: Map<string, Keyframe[]>;
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
/**
 * Facial expression parameters
 */
export interface ExpressionParameters {
    eyeOpenLeft: number;
    eyeOpenRight: number;
    eyebrowLeft: number;
    eyebrowRight: number;
    mouthOpen: number;
    mouthSmile: number;
    cheekPuff: number;
    headRotationX: number;
    headRotationY: number;
    headRotationZ: number;
}
/**
 * Emotion state for expression mapping
 */
export interface EmotionState {
    happiness: number;
    sadness: number;
    anger: number;
    surprise: number;
    fear: number;
    disgust: number;
    neutral: number;
    arousal: number;
    valence: number;
}
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
/**
 * Character personality configuration
 */
export interface CharacterPersonality {
    name: string;
    description: string;
    traits: string[];
    speaking_style: string;
    emotional_range: {
        expressiveness: number;
        stability: number;
        reactivity: number;
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
/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;
/**
 * Blend mode for layer composition
 */
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn' | 'darken' | 'lighten';
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
/**
 * Engine events
 */
export interface EngineEvents {
    'character-loaded': {
        character: any;
    };
    'animation-started': {
        state: string;
    };
    'animation-finished': {
        state: string;
    };
    'expression-changed': {
        expression: ExpressionParameters;
    };
    'emotion-detected': {
        emotion: EmotionState;
    };
    'performance-update': {
        metrics: PerformanceMetrics;
    };
    'error': {
        error: Error;
    };
}
/**
 * Event listener type
 */
export type EventListener<T = any> = (data: T) => void;
/**
 * 원본 이미지와 추출된 캐릭터 정보
 */
export interface CharacterData {
    id: string;
    name?: string;
    sourceImage: string;
    features?: Record<string, any>;
    meta?: Record<string, any>;
}
/**
 * 전체 스켈레톤 구조
 */
export interface Skeleton {
    bones: Bone[];
    root: string;
}
/**
 * 멀티앵글/멀티레이어 이미지 데이터
 */
export interface ViewLayers {
    angles: string[];
    layers: Record<string, string>;
}
/**
 * 리깅 및 블렌드셰이프 포함 캐릭터
 */
export interface RiggedCharacter {
    mesh: CharacterMesh;
    skeleton: Skeleton;
    blendShapes?: Record<string, Float32Array>;
    constraints?: Record<string, any>;
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
//# sourceMappingURL=types.d.ts.map