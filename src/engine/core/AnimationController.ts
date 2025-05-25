/**
 * Animation Controller - State machine for managing animations and transitions
 * This class handles animation playback, blending, and state transitions
 */

import {
  AnimationState,
  AnimationClip,
  AnimationTransition,
  Keyframe,
  Bone,
  Point2D,
  EasingFunction,
  PerformanceMetrics
} from '../types';
import { lerp, lerpPoint2D, clamp, Easing, now, FrameRateCalculator } from '../utils/math';

/**
 * Animation event data
 */
interface AnimationEvent {
  type: 'started' | 'finished' | 'looped' | 'blended';
  state: string;
  time: number;
  data?: any;
}

/**
 * Animation layer for blending multiple animations
 */
interface AnimationLayer {
  id: string;
  weight: number;
  currentState?: AnimationState;
  targetState?: AnimationState;
  transitionTime: number;
  transitionDuration: number;
  blendMode: 'override' | 'additive';
}

/**
 * Animation Controller configuration
 */
interface AnimationControllerConfig {
  maxLayers: number;
  defaultTransitionDuration: number;
  targetFPS: number;
  enableBlending: boolean;
  debugMode: boolean;
}

/**
 * Default animation controller configuration
 */
const DEFAULT_CONFIG: AnimationControllerConfig = {
  maxLayers: 4,
  defaultTransitionDuration: 0.3,
  targetFPS: 60,
  enableBlending: true,
  debugMode: false,
};

/**
 * Animation Controller class for managing character animations
 */
export class AnimationController {
  private config: AnimationControllerConfig;
  private states: Map<string, AnimationState> = new Map();
  private clips: Map<string, AnimationClip> = new Map();
  private layers: AnimationLayer[] = [];
  private bones: Map<string, Bone> = new Map();
  private currentTime: number = 0;
  private lastUpdateTime: number = 0;
  private isPlaying: boolean = false;
  private frameRateCalculator: FrameRateCalculator;
  private eventListeners: Map<string, Array<(event: AnimationEvent) => void>> = new Map();

  constructor(config: Partial<AnimationControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.frameRateCalculator = new FrameRateCalculator();
    this.initializeDefaultLayer();
  }

  /**
   * Initialize the default animation layer
   */
  private initializeDefaultLayer(): void {
    const defaultLayer: AnimationLayer = {
      id: 'default',
      weight: 1.0,
      transitionTime: 0,
      transitionDuration: 0,
      blendMode: 'override',
    };
    this.layers.push(defaultLayer);
  }

  /**
   * Set the bone structure for animation
   */
  setBones(bones: Bone[]): void {
    this.bones.clear();
    bones.forEach(bone => {
      this.bones.set(bone.id, { ...bone });
    });
  }

  /**
   * Add an animation clip
   */
  addClip(clip: AnimationClip): void {
    this.clips.set(clip.id, clip);
    
    if (this.config.debugMode) {
      console.log(`Added animation clip: ${clip.name} (${clip.duration}s)`);
    }
  }

  /**
   * Create an animation state
   */
  createState(id: string, name: string, clipId: string): AnimationState {
    const clip = this.clips.get(clipId);
    if (!clip) {
      throw new Error(`Animation clip '${clipId}' not found`);
    }

    const state: AnimationState = {
      id,
      name,
      clip,
      transitions: [],
      weight: 1.0,
      speed: 1.0,
    };

    this.states.set(id, state);
    return state;
  }

  /**
   * Add a transition between states
   */
  addTransition(fromStateId: string, toStateId: string, duration?: number, condition?: () => boolean): void {
    const fromState = this.states.get(fromStateId);
    const toState = this.states.get(toStateId);

    if (!fromState || !toState) {
      throw new Error('Invalid state IDs for transition');
    }

    const transition: AnimationTransition = {
      from: fromStateId,
      to: toStateId,
      duration: duration || this.config.defaultTransitionDuration,
      condition,
      easing: Easing.sineInOut,
    };

    fromState.transitions.push(transition);
  }

  /**
   * Play an animation state
   */
  play(stateId: string, layerId: string = 'default', crossfade: boolean = true): void {
    const state = this.states.get(stateId);
    const layer = this.getLayer(layerId);

    if (!state || !layer) {
      console.error(`Cannot play state '${stateId}' on layer '${layerId}'`);
      return;
    }

    if (crossfade && layer.currentState) {
      // Start crossfade transition
      layer.targetState = state;
      layer.transitionTime = 0;
      layer.transitionDuration = this.config.defaultTransitionDuration;
    } else {
      // Immediate transition
      layer.currentState = state;
      layer.targetState = undefined;
      layer.transitionTime = 0;
    }

    this.isPlaying = true;
    this.emitEvent('started', stateId);

    if (this.config.debugMode) {
      console.log(`Playing animation: ${state.name} on layer: ${layerId}`);
    }
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.isPlaying = false;
    this.layers.forEach(layer => {
      if (layer.currentState) {
        this.emitEvent('finished', layer.currentState.id);
      }
      layer.currentState = undefined;
      layer.targetState = undefined;
    });
  }

  /**
   * Pause/resume animation playback
   */
  setPaused(paused: boolean): void {
    this.isPlaying = !paused;
  }

  /**
   * Update animation system
   */
  update(deltaTime?: number): void {
    const currentTime = now();
    const dt = deltaTime || (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;

    if (!this.isPlaying) return;

    this.currentTime += dt;

    // Update each layer
    this.layers.forEach(layer => this.updateLayer(layer, dt));

    // Apply animation transforms to bones
    this.applyAnimationToBones();

    // Check for automatic transitions
    this.checkTransitions();

    // Update frame rate
    this.frameRateCalculator.update();
  }

  /**
   * Update a single animation layer
   */
  private updateLayer(layer: AnimationLayer, deltaTime: number): void {
    // Handle transitions
    if (layer.targetState && layer.currentState) {
      layer.transitionTime += deltaTime;
      const progress = Math.min(layer.transitionTime / layer.transitionDuration, 1);

      if (progress >= 1) {
        // Transition complete
        this.emitEvent('finished', layer.currentState.id);
        layer.currentState = layer.targetState;
        layer.targetState = undefined;
        layer.transitionTime = 0;
        this.emitEvent('started', layer.currentState.id);
      } else {
        // Transition in progress - handled in applyAnimationToBones
        this.emitEvent('blended', layer.currentState.id);
      }
    }

    // Update current state time
    if (layer.currentState) {
      const clip = layer.currentState.clip;
      const stateTime = (this.currentTime * layer.currentState.speed) % clip.duration;

      // Check for loop completion
      if (stateTime < deltaTime && clip.loop) {
        this.emitEvent('looped', layer.currentState.id);
      }
    }
  }

  /**
   * Apply animation transforms to bones
   */
  private applyAnimationToBones(): void {
    // Reset bone transforms
    this.bones.forEach(bone => {
      bone.rotation = 0;
      bone.scale = { x: 1, y: 1 };
    });

    // Apply transforms from each layer
    this.layers.forEach(layer => {
      if (layer.currentState) {
        this.applyLayerToBones(layer);
      }
    });
  }

  /**
   * Apply a single layer's animation to bones
   */
  private applyLayerToBones(layer: AnimationLayer): void {
    const weight = layer.weight;
    
    if (layer.targetState && layer.currentState) {
      // Blend between current and target states
      const progress = layer.transitionTime / layer.transitionDuration;
      const easedProgress = Easing.sineInOut(progress);
      
      this.applyStateTransforms(layer.currentState, weight * (1 - easedProgress));
      this.applyStateTransforms(layer.targetState, weight * easedProgress);
    } else if (layer.currentState) {
      // Apply single state
      this.applyStateTransforms(layer.currentState, weight);
    }
  }

  /**
   * Apply animation state transforms to bones
   */
  private applyStateTransforms(state: AnimationState, weight: number): void {
    const clip = state.clip;
    const time = (this.currentTime * state.speed) % clip.duration;

    clip.keyframes.forEach((keyframes, boneId) => {
      const bone = this.bones.get(boneId);
      if (!bone || keyframes.length === 0) return;

      const transform = this.interpolateKeyframes(keyframes, time);
      this.applyTransformToBone(bone, transform, weight);
    });
  }

  /**
   * Interpolate between keyframes at a given time
   */
  private interpolateKeyframes(keyframes: Keyframe[], time: number): {
    position: Point2D;
    rotation: number;
    scale: Point2D;
  } {
    if (keyframes.length === 1) {
      return keyframes[0].transform;
    }

    // Find surrounding keyframes
    let prevFrame = keyframes[0];
    let nextFrame = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        prevFrame = keyframes[i];
        nextFrame = keyframes[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const duration = nextFrame.time - prevFrame.time;
    const t = duration > 0 ? (time - prevFrame.time) / duration : 0;
    
    // Apply easing
    const easingFunc = nextFrame.easing || Easing.linear;
    const easedT = easingFunc(clamp(t, 0, 1));

    // Interpolate transforms
    return {
      position: lerpPoint2D(prevFrame.transform.position, nextFrame.transform.position, easedT),
      rotation: lerp(prevFrame.transform.rotation, nextFrame.transform.rotation, easedT),
      scale: lerpPoint2D(prevFrame.transform.scale, nextFrame.transform.scale, easedT),
    };
  }

  /**
   * Apply transform to bone with weight
   */
  private applyTransformToBone(
    bone: Bone, 
    transform: { position: Point2D; rotation: number; scale: Point2D }, 
    weight: number
  ): void {
    // Apply weighted transforms
    bone.position.x = lerp(bone.position.x, transform.position.x, weight);
    bone.position.y = lerp(bone.position.y, transform.position.y, weight);
    bone.rotation = lerp(bone.rotation, transform.rotation, weight);
    bone.scale.x = lerp(bone.scale.x, transform.scale.x, weight);
    bone.scale.y = lerp(bone.scale.y, transform.scale.y, weight);
  }

  /**
   * Check for automatic transitions
   */
  private checkTransitions(): void {
    this.layers.forEach(layer => {
      if (!layer.currentState || layer.targetState) return;

      const state = layer.currentState;
      for (const transition of state.transitions) {
        if (transition.condition && transition.condition()) {
          this.play(transition.to, layer.id, true);
          break;
        }
      }
    });
  }

  /**
   * Get or create animation layer
   */
  private getLayer(layerId: string): AnimationLayer | undefined {
    let layer = this.layers.find(l => l.id === layerId);
    
    if (!layer && this.layers.length < this.config.maxLayers) {
      layer = {
        id: layerId,
        weight: 1.0,
        transitionTime: 0,
        transitionDuration: 0,
        blendMode: 'override',
      };
      this.layers.push(layer);
    }
    
    return layer;
  }

  /**
   * Set layer weight for blending
   */
  setLayerWeight(layerId: string, weight: number): void {
    const layer = this.getLayer(layerId);
    if (layer) {
      layer.weight = clamp(weight, 0, 1);
    }
  }

  /**
   * Get current animation state
   */
  getCurrentState(layerId: string = 'default'): AnimationState | undefined {
    const layer = this.layers.find(l => l.id === layerId);
    return layer?.currentState;
  }

  /**
   * Get all bones with current transforms
   */
  getBones(): Bone[] {
    return Array.from(this.bones.values());
  }

  /**
   * Get specific bone by ID
   */
  getBone(boneId: string): Bone | undefined {
    return this.bones.get(boneId);
  }

  /**
   * Create a simple animation clip
   */
  createSimpleClip(
    id: string,
    name: string,
    duration: number,
    boneTransforms: Map<string, Array<{ time: number; position?: Point2D; rotation?: number; scale?: Point2D }>>
  ): AnimationClip {
    const keyframes = new Map<string, Keyframe[]>();

    boneTransforms.forEach((transforms, boneId) => {
      const boneKeyframes: Keyframe[] = transforms.map(transform => ({
        time: transform.time,
        transform: {
          position: transform.position || { x: 0, y: 0 },
          rotation: transform.rotation || 0,
          scale: transform.scale || { x: 1, y: 1 },
        },
        easing: Easing.sineInOut,
      }));

      keyframes.set(boneId, boneKeyframes);
    });

    const clip: AnimationClip = {
      id,
      name,
      duration,
      loop: true,
      keyframes,
    };

    this.addClip(clip);
    return clip;
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, listener: (event: AnimationEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, listener: (event: AnimationEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit animation event
   */
  private emitEvent(type: AnimationEvent['type'], stateId: string, data?: any): void {
    const event: AnimationEvent = {
      type,
      state: stateId,
      time: this.currentTime,
      data,
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }

    // Also emit to 'all' listeners
    const allListeners = this.eventListeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => listener(event));
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Partial<PerformanceMetrics> {
    return {
      fps: this.frameRateCalculator.getFPS(),
      updateTime: 0, // Will be measured externally
    };
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    return {
      currentTime: this.currentTime,
      isPlaying: this.isPlaying,
      layerCount: this.layers.length,
      stateCount: this.states.size,
      clipCount: this.clips.size,
      layers: this.layers.map(layer => ({
        id: layer.id,
        weight: layer.weight,
        currentState: layer.currentState?.name,
        targetState: layer.targetState?.name,
        transitionProgress: layer.transitionDuration > 0 ? layer.transitionTime / layer.transitionDuration : 0,
      })),
    };
  }
}
