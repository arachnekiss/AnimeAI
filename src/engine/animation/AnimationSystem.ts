/**
 * Animation System - High-performance animation engine with GPU acceleration
 * Handles skeletal animation, blend trees, and real-time animation blending
 */

import { Point2D, Bone, AnimationClip, Keyframe, PerformanceMetrics } from '../types';
import { lerp, lerpPoint2D, Easing, now, clamp } from '../utils/math';

export interface AnimationLayer {
  id: string;
  name: string;
  weight: number;
  blendMode: 'override' | 'additive' | 'multiply';
  maskBones?: string[];
  currentClip?: AnimationClip;
  playbackState: {
    time: number;
    speed: number;
    loop: boolean;
    playing: boolean;
  };
}

export interface BlendTree {
  id: string;
  name: string;
  type: 'linear' | 'directional' | 'freeform';
  parameters: Record<string, number>;
  nodes: BlendNode[];
  output?: AnimationPose;
}

export interface BlendNode {
  id: string;
  position: Point2D;
  animation: AnimationClip;
  weight: number;
  threshold?: number;
}

export interface AnimationPose {
  bones: Map<string, {
    position: Point2D;
    rotation: number;
    scale: Point2D;
  }>;
  timestamp: number;
  blendWeights?: Map<string, number>;
}

export interface AnimationConstraint {
  id: string;
  type: 'ik' | 'lookAt' | 'aim' | 'parent' | 'position' | 'rotation';
  sourceBone: string;
  targetBone?: string;
  targetPosition?: Point2D;
  weight: number;
  settings: Record<string, any>;
}

export interface IKChain {
  bones: string[];
  target: Point2D;
  poleVector?: Point2D;
  iterations: number;
  tolerance: number;
  bendDirection: number;
}

export class AnimationSystem {
  private skeleton: Map<string, Bone> = new Map();
  private animationLayers: Map<string, AnimationLayer> = new Map();
  private blendTrees: Map<string, BlendTree> = new Map();
  private constraints: Map<string, AnimationConstraint> = new Map();
  private currentPose: AnimationPose;
  private bindPose: AnimationPose;
  private deltaTime: number = 0;
  private lastUpdateTime: number = 0;
  private performanceMetrics: PerformanceMetrics;

  // GPU buffers for hardware acceleration
  private boneMatrices: Float32Array;
  private transformBuffer: WebGLBuffer | null = null;
  private gl: WebGLRenderingContext | null = null;

  constructor(skeleton: Map<string, Bone>, gl?: WebGLRenderingContext) {
    this.skeleton = skeleton;
    this.gl = gl || null;
    this.initializePoses();
    this.initializeGPUBuffers();
    this.performanceMetrics = {
      frameTime: 0,
      renderTime: 0,
      animationTime: 0,
      triangleCount: 0,
      drawCalls: 0,
      memoryUsage: 0
    };
  }

  /**
   * Initialize default poses
   */
  private initializePoses(): void {
    const bones = new Map<string, any>();
    
    this.skeleton.forEach((bone, id) => {
      bones.set(id, {
        position: { x: bone.position.x, y: bone.position.y },
        rotation: bone.rotation,
        scale: { x: 1, y: 1 }
      });
    });

    this.bindPose = {
      bones,
      timestamp: now()
    };

    this.currentPose = {
      bones: new Map(bones),
      timestamp: now()
    };
  }

  /**
   * Initialize GPU buffers for hardware-accelerated animation
   */
  private initializeGPUBuffers(): void {
    if (!this.gl) return;

    const boneCount = this.skeleton.size;
    this.boneMatrices = new Float32Array(boneCount * 16); // 4x4 matrices

    this.transformBuffer = this.gl.createBuffer();
    if (this.transformBuffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.boneMatrices, this.gl.DYNAMIC_DRAW);
    }
  }

  /**
   * Create a new animation layer
   */
  createLayer(id: string, name: string, weight: number = 1.0): AnimationLayer {
    const layer: AnimationLayer = {
      id,
      name,
      weight,
      blendMode: 'override',
      playbackState: {
        time: 0,
        speed: 1,
        loop: false,
        playing: false
      }
    };

    this.animationLayers.set(id, layer);
    return layer;
  }

  /**
   * Play animation on specified layer
   */
  playAnimation(layerId: string, clip: AnimationClip, options?: {
    fadeIn?: number;
    fadeOut?: number;
    loop?: boolean;
    speed?: number;
    startTime?: number;
  }): void {
    const layer = this.animationLayers.get(layerId);
    if (!layer) {
      throw new Error(`Animation layer '${layerId}' not found`);
    }

    layer.currentClip = clip;
    layer.playbackState.playing = true;
    layer.playbackState.loop = options?.loop || false;
    layer.playbackState.speed = options?.speed || 1;
    layer.playbackState.time = options?.startTime || 0;

    // Handle fade in
    if (options?.fadeIn) {
      this.fadeLayerWeight(layerId, layer.weight, options.fadeIn);
    }
  }

  /**
   * Stop animation on specified layer
   */
  stopAnimation(layerId: string, fadeOut?: number): void {
    const layer = this.animationLayers.get(layerId);
    if (!layer) return;

    if (fadeOut) {
      this.fadeLayerWeight(layerId, 0, fadeOut).then(() => {
        layer.playbackState.playing = false;
        layer.currentClip = undefined;
      });
    } else {
      layer.playbackState.playing = false;
      layer.currentClip = undefined;
    }
  }

  /**
   * Create blend tree for complex animation blending
   */
  createBlendTree(id: string, name: string, type: BlendTree['type']): BlendTree {
    const blendTree: BlendTree = {
      id,
      name,
      type,
      parameters: {},
      nodes: []
    };

    this.blendTrees.set(id, blendTree);
    return blendTree;
  }

  /**
   * Add blend node to blend tree
   */
  addBlendNode(treeId: string, node: BlendNode): void {
    const tree = this.blendTrees.get(treeId);
    if (!tree) {
      throw new Error(`Blend tree '${treeId}' not found`);
    }

    tree.nodes.push(node);
  }

  /**
   * Update blend tree parameters
   */
  updateBlendTreeParameters(treeId: string, parameters: Record<string, number>): void {
    const tree = this.blendTrees.get(treeId);
    if (!tree) return;

    Object.assign(tree.parameters, parameters);
    this.evaluateBlendTree(tree);
  }

  /**
   * Evaluate blend tree and generate output pose
   */
  private evaluateBlendTree(tree: BlendTree): void {
    const startTime = performance.now();

    switch (tree.type) {
      case 'linear':
        tree.output = this.evaluateLinearBlendTree(tree);
        break;
      case 'directional':
        tree.output = this.evaluateDirectionalBlendTree(tree);
        break;
      case 'freeform':
        tree.output = this.evaluateFreeformBlendTree(tree);
        break;
    }

    this.performanceMetrics.animationTime += performance.now() - startTime;
  }

  /**
   * Linear blend tree evaluation
   */
  private evaluateLinearBlendTree(tree: BlendTree): AnimationPose {
    const pose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    if (tree.nodes.length === 0) return pose;

    const parameter = tree.parameters['blend'] || 0;
    
    if (tree.nodes.length === 1) {
      return this.sampleAnimationPose(tree.nodes[0].animation, parameter);
    }

    // Linear interpolation between adjacent nodes
    const segmentLength = 1 / (tree.nodes.length - 1);
    const segmentIndex = Math.floor(parameter / segmentLength);
    const localT = (parameter - segmentIndex * segmentLength) / segmentLength;

    const node1 = tree.nodes[Math.min(segmentIndex, tree.nodes.length - 1)];
    const node2 = tree.nodes[Math.min(segmentIndex + 1, tree.nodes.length - 1)];

    const pose1 = this.sampleAnimationPose(node1.animation, parameter);
    const pose2 = this.sampleAnimationPose(node2.animation, parameter);

    return this.blendPoses(pose1, pose2, localT);
  }

  /**
   * Directional blend tree evaluation (2D blending)
   */
  private evaluateDirectionalBlendTree(tree: BlendTree): AnimationPose {
    const pose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    const x = tree.parameters['x'] || 0;
    const y = tree.parameters['y'] || 0;
    const inputVector: Point2D = { x, y };

    // Find the triangle containing the input point
    const triangle = this.findContainingTriangle(tree.nodes, inputVector);
    if (!triangle) {
      return tree.nodes[0] ? this.sampleAnimationPose(tree.nodes[0].animation, 0) : pose;
    }

    // Calculate barycentric coordinates
    const weights = this.calculateBarycentricWeights(triangle, inputVector);

    // Blend the three animations
    const poses = triangle.map((node, i) => ({
      pose: this.sampleAnimationPose(node.animation, 0),
      weight: weights[i]
    }));

    return this.blendMultiplePoses(poses);
  }

  /**
   * Freeform blend tree evaluation
   */
  private evaluateFreeformBlendTree(tree: BlendTree): AnimationPose {
    const pose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    const x = tree.parameters['x'] || 0;
    const y = tree.parameters['y'] || 0;
    const inputPoint: Point2D = { x, y };

    // Calculate weights based on distance to each node
    const weights: number[] = [];
    let totalWeight = 0;

    tree.nodes.forEach(node => {
      const distance = Math.sqrt(
        Math.pow(node.position.x - inputPoint.x, 2) +
        Math.pow(node.position.y - inputPoint.y, 2)
      );
      
      const weight = distance === 0 ? 1000 : 1 / (distance + 0.001);
      weights.push(weight);
      totalWeight += weight;
    });

    // Normalize weights
    const normalizedWeights = weights.map(w => w / totalWeight);

    // Blend animations based on weights
    const poses = tree.nodes.map((node, i) => ({
      pose: this.sampleAnimationPose(node.animation, 0),
      weight: normalizedWeights[i]
    }));

    return this.blendMultiplePoses(poses);
  }

  /**
   * Sample animation pose at specific time
   */
  private sampleAnimationPose(clip: AnimationClip, time: number): AnimationPose {
    const pose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    // Wrap time if looping
    const wrappedTime = clip.loop ? time % clip.duration : clamp(time, 0, clip.duration);

    clip.boneAnimations.forEach((boneAnim, boneId) => {
      const bone = this.skeleton.get(boneId);
      if (!bone) return;

      // Sample position keyframes
      const position = this.sampleKeyframes(boneAnim.positionKeyframes, wrappedTime);
      // Sample rotation keyframes
      const rotation = this.sampleRotationKeyframes(boneAnim.rotationKeyframes, wrappedTime);
      // Sample scale keyframes
      const scale = this.sampleKeyframes(boneAnim.scaleKeyframes, wrappedTime);

      pose.bones.set(boneId, {
        position: position || bone.position,
        rotation: rotation !== undefined ? rotation : bone.rotation,
        scale: scale || { x: 1, y: 1 }
      });
    });

    return pose;
  }

  /**
   * Sample keyframes at specific time
   */
  private sampleKeyframes(keyframes: Keyframe[], time: number): Point2D | null {
    if (!keyframes || keyframes.length === 0) return null;
    if (keyframes.length === 1) return keyframes[0].value as Point2D;

    // Find surrounding keyframes
    let leftIndex = 0;
    let rightIndex = keyframes.length - 1;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        leftIndex = i;
        rightIndex = i + 1;
        break;
      }
    }

    const leftKeyframe = keyframes[leftIndex];
    const rightKeyframe = keyframes[rightIndex];

    if (leftKeyframe.time === rightKeyframe.time) {
      return leftKeyframe.value as Point2D;
    }

    // Calculate interpolation factor
    const t = (time - leftKeyframe.time) / (rightKeyframe.time - leftKeyframe.time);
    
    // Apply easing
    const easedT = this.applyEasing(t, leftKeyframe.easing || 'linear');

    // Interpolate values
    return lerpPoint2D(leftKeyframe.value as Point2D, rightKeyframe.value as Point2D, easedT);
  }

  /**
   * Sample rotation keyframes
   */
  private sampleRotationKeyframes(keyframes: Keyframe[], time: number): number | undefined {
    if (!keyframes || keyframes.length === 0) return undefined;
    if (keyframes.length === 1) return keyframes[0].value as number;

    // Find surrounding keyframes
    let leftIndex = 0;
    let rightIndex = keyframes.length - 1;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        leftIndex = i;
        rightIndex = i + 1;
        break;
      }
    }

    const leftKeyframe = keyframes[leftIndex];
    const rightKeyframe = keyframes[rightIndex];

    if (leftKeyframe.time === rightKeyframe.time) {
      return leftKeyframe.value as number;
    }

    const t = (time - leftKeyframe.time) / (rightKeyframe.time - leftKeyframe.time);
    const easedT = this.applyEasing(t, leftKeyframe.easing || 'linear');

    // Interpolate rotation with proper angle wrapping
    return this.lerpAngle(leftKeyframe.value as number, rightKeyframe.value as number, easedT);
  }

  /**
   * Blend two poses
   */
  private blendPoses(pose1: AnimationPose, pose2: AnimationPose, weight: number): AnimationPose {
    const blendedPose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    // Blend each bone
    const allBones = new Set([...pose1.bones.keys(), ...pose2.bones.keys()]);
    
    allBones.forEach(boneId => {
      const bone1 = pose1.bones.get(boneId);
      const bone2 = pose2.bones.get(boneId);

      if (bone1 && bone2) {
        blendedPose.bones.set(boneId, {
          position: lerpPoint2D(bone1.position, bone2.position, weight),
          rotation: this.lerpAngle(bone1.rotation, bone2.rotation, weight),
          scale: lerpPoint2D(bone1.scale, bone2.scale, weight)
        });
      } else if (bone1) {
        blendedPose.bones.set(boneId, { ...bone1 });
      } else if (bone2) {
        blendedPose.bones.set(boneId, { ...bone2 });
      }
    });

    return blendedPose;
  }

  /**
   * Blend multiple poses with weights
   */
  private blendMultiplePoses(posesWithWeights: Array<{ pose: AnimationPose; weight: number }>): AnimationPose {
    const blendedPose: AnimationPose = {
      bones: new Map(),
      timestamp: now()
    };

    if (posesWithWeights.length === 0) return blendedPose;

    // Normalize weights
    const totalWeight = posesWithWeights.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return blendedPose;

    const normalizedPoses = posesWithWeights.map(item => ({
      pose: item.pose,
      weight: item.weight / totalWeight
    }));

    // Get all unique bone IDs
    const allBones = new Set<string>();
    normalizedPoses.forEach(item => {
      item.pose.bones.forEach((_, boneId) => allBones.add(boneId));
    });

    // Blend each bone
    allBones.forEach(boneId => {
      let blendedPosition = { x: 0, y: 0 };
      let blendedRotation = 0;
      let blendedScale = { x: 0, y: 0 };
      let totalBoneWeight = 0;

      normalizedPoses.forEach(item => {
        const bone = item.pose.bones.get(boneId);
        if (bone) {
          blendedPosition.x += bone.position.x * item.weight;
          blendedPosition.y += bone.position.y * item.weight;
          blendedRotation += bone.rotation * item.weight;
          blendedScale.x += bone.scale.x * item.weight;
          blendedScale.y += bone.scale.y * item.weight;
          totalBoneWeight += item.weight;
        }
      });

      if (totalBoneWeight > 0) {
        blendedPose.bones.set(boneId, {
          position: blendedPosition,
          rotation: blendedRotation,
          scale: blendedScale
        });
      }
    });

    return blendedPose;
  }

  /**
   * Add animation constraint
   */
  addConstraint(constraint: AnimationConstraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /**
   * Remove animation constraint
   */
  removeConstraint(constraintId: string): void {
    this.constraints.delete(constraintId);
  }

  /**
   * Apply IK constraint
   */
  private applyIKConstraint(constraint: AnimationConstraint, chain: IKChain): void {
    if (!constraint.targetPosition) return;

    const bones = chain.bones.map(id => this.currentPose.bones.get(id)).filter(Boolean);
    if (bones.length < 2) return;

    // Two-bone IK solver
    if (bones.length === 2) {
      this.solveTwoBoneIK(bones[0]!, bones[1]!, constraint.targetPosition, chain.bendDirection);
    } else {
      // Multi-bone IK using FABRIK algorithm
      this.solveFABRIK(bones, constraint.targetPosition, chain.iterations, chain.tolerance);
    }
  }

  /**
   * Two-bone IK solver
   */
  private solveTwoBoneIK(upperBone: any, lowerBone: any, target: Point2D, bendDirection: number): void {
    const upperLength = this.distance(upperBone.position, lowerBone.position);
    const lowerLength = this.distance(lowerBone.position, target);
    const targetDistance = this.distance(upperBone.position, target);

    // Check if target is reachable
    const maxReach = upperLength + lowerLength;
    if (targetDistance > maxReach) {
      // Extend towards target
      const direction = this.normalize(this.subtract(target, upperBone.position));
      lowerBone.position = {
        x: upperBone.position.x + direction.x * upperLength,
        y: upperBone.position.y + direction.y * upperLength
      };
      return;
    }

    // Calculate bend angle using law of cosines
    const cosAngle = (upperLength * upperLength + targetDistance * targetDistance - lowerLength * lowerLength) /
                     (2 * upperLength * targetDistance);
    const angle = Math.acos(clamp(cosAngle, -1, 1));

    // Calculate joint position
    const targetAngle = Math.atan2(target.y - upperBone.position.y, target.x - upperBone.position.x);
    const bendAngle = targetAngle + (angle * bendDirection);

    lowerBone.position = {
      x: upperBone.position.x + Math.cos(bendAngle) * upperLength,
      y: upperBone.position.y + Math.sin(bendAngle) * upperLength
    };

    // Update rotations
    upperBone.rotation = bendAngle;
    lowerBone.rotation = Math.atan2(target.y - lowerBone.position.y, target.x - lowerBone.position.x);
  }

  /**
   * FABRIK IK solver for multi-bone chains
   */
  private solveFABRIK(bones: any[], target: Point2D, iterations: number, tolerance: number): void {
    if (bones.length < 2) return;

    const boneLengths = [];
    for (let i = 0; i < bones.length - 1; i++) {
      boneLengths.push(this.distance(bones[i].position, bones[i + 1].position));
    }

    const origin = { ...bones[0].position };
    let distance = this.distance(bones[bones.length - 1].position, target);

    for (let iter = 0; iter < iterations && distance > tolerance; iter++) {
      // Forward pass
      bones[bones.length - 1].position = { ...target };
      for (let i = bones.length - 2; i >= 0; i--) {
        const direction = this.normalize(this.subtract(bones[i].position, bones[i + 1].position));
        bones[i].position = {
          x: bones[i + 1].position.x + direction.x * boneLengths[i],
          y: bones[i + 1].position.y + direction.y * boneLengths[i]
        };
      }

      // Backward pass
      bones[0].position = { ...origin };
      for (let i = 0; i < bones.length - 1; i++) {
        const direction = this.normalize(this.subtract(bones[i + 1].position, bones[i].position));
        bones[i + 1].position = {
          x: bones[i].position.x + direction.x * boneLengths[i],
          y: bones[i].position.y + direction.y * boneLengths[i]
        };
      }

      distance = this.distance(bones[bones.length - 1].position, target);
    }

    // Update rotations
    for (let i = 0; i < bones.length - 1; i++) {
      bones[i].rotation = Math.atan2(
        bones[i + 1].position.y - bones[i].position.y,
        bones[i + 1].position.x - bones[i].position.x
      );
    }
  }

  /**
   * Update animation system
   */
  update(): void {
    const currentTime = now();
    this.deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    const startTime = performance.now();

    // Update animation layers
    this.animationLayers.forEach(layer => {
      if (layer.playbackState.playing && layer.currentClip) {
        layer.playbackState.time += this.deltaTime * layer.playbackState.speed;
        
        if (layer.playbackState.time >= layer.currentClip.duration) {
          if (layer.playbackState.loop) {
            layer.playbackState.time = layer.playbackState.time % layer.currentClip.duration;
          } else {
            layer.playbackState.playing = false;
            layer.playbackState.time = layer.currentClip.duration;
          }
        }
      }
    });

    // Evaluate blend trees
    this.blendTrees.forEach(tree => {
      this.evaluateBlendTree(tree);
    });

    // Blend all layers
    this.blendLayers();

    // Apply constraints
    this.applyConstraints();

    // Update GPU buffers
    this.updateGPUBuffers();

    this.performanceMetrics.animationTime = performance.now() - startTime;
  }

  /**
   * Blend all animation layers
   */
  private blendLayers(): void {
    // Start with bind pose
    this.currentPose = {
      bones: new Map(this.bindPose.bones),
      timestamp: now()
    };

    const sortedLayers = Array.from(this.animationLayers.values())
      .filter(layer => layer.playbackState.playing && layer.currentClip)
      .sort((a, b) => a.weight - b.weight);

    sortedLayers.forEach(layer => {
      if (!layer.currentClip) return;

      const layerPose = this.sampleAnimationPose(layer.currentClip, layer.playbackState.time);
      
      switch (layer.blendMode) {
        case 'override':
          this.currentPose = this.blendPoses(this.currentPose, layerPose, layer.weight);
          break;
        case 'additive':
          this.additivePose(layerPose, layer.weight);
          break;
        case 'multiply':
          this.multiplyPose(layerPose, layer.weight);
          break;
      }
    });
  }

  /**
   * Apply all animation constraints
   */
  private applyConstraints(): void {
    this.constraints.forEach(constraint => {
      switch (constraint.type) {
        case 'ik':
          // IK constraints would need additional chain data
          break;
        case 'lookAt':
          this.applyLookAtConstraint(constraint);
          break;
        case 'aim':
          this.applyAimConstraint(constraint);
          break;
        case 'parent':
          this.applyParentConstraint(constraint);
          break;
      }
    });
  }

  /**
   * Update GPU transform buffers
   */
  private updateGPUBuffers(): void {
    if (!this.gl || !this.transformBuffer) return;

    let index = 0;
    this.currentPose.bones.forEach((bone, boneId) => {
      // Convert bone transform to 4x4 matrix
      const matrix = this.createTransformMatrix(bone.position, bone.rotation, bone.scale);
      
      // Copy matrix to buffer
      for (let i = 0; i < 16; i++) {
        this.boneMatrices[index * 16 + i] = matrix[i];
      }
      index++;
    });

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.transformBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.boneMatrices);
  }

  // Utility methods
  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'linear': return t;
      case 'ease-in': return Easing.easeInQuad(t);
      case 'ease-out': return Easing.easeOutQuad(t);
      case 'ease-in-out': return Easing.easeInOutQuad(t);
      default: return t;
    }
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = ((b - a + Math.PI) % (2 * Math.PI)) - Math.PI;
    return a + diff * t;
  }

  private distance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private normalize(vector: Point2D): Point2D {
    const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    return length > 0 ? { x: vector.x / length, y: vector.y / length } : { x: 0, y: 0 };
  }

  private subtract(p1: Point2D, p2: Point2D): Point2D {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
  }

  private createTransformMatrix(position: Point2D, rotation: number, scale: Point2D): number[] {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    return [
      cos * scale.x, -sin * scale.x, 0, position.x,
      sin * scale.y,  cos * scale.y, 0, position.y,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  private fadeLayerWeight(layerId: string, targetWeight: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const layer = this.animationLayers.get(layerId);
      if (!layer) {
        resolve();
        return;
      }

      const startWeight = layer.weight;
      const startTime = now();
      
      const updateWeight = () => {
        const elapsed = now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        layer.weight = lerp(startWeight, targetWeight, progress);
        
        if (progress >= 1) {
          resolve();
        } else {
          requestAnimationFrame(updateWeight);
        }
      };
      
      updateWeight();
    });
  }

  private additivePose(pose: AnimationPose, weight: number): void {
    pose.bones.forEach((bone, boneId) => {
      const currentBone = this.currentPose.bones.get(boneId);
      if (currentBone) {
        currentBone.position.x += bone.position.x * weight;
        currentBone.position.y += bone.position.y * weight;
        currentBone.rotation += bone.rotation * weight;
        currentBone.scale.x += (bone.scale.x - 1) * weight;
        currentBone.scale.y += (bone.scale.y - 1) * weight;
      }
    });
  }

  private multiplyPose(pose: AnimationPose, weight: number): void {
    pose.bones.forEach((bone, boneId) => {
      const currentBone = this.currentPose.bones.get(boneId);
      if (currentBone) {
        const multiplier = lerp(1, bone.scale.x, weight);
        currentBone.scale.x *= multiplier;
        currentBone.scale.y *= multiplier;
      }
    });
  }

  private findContainingTriangle(nodes: BlendNode[], point: Point2D): BlendNode[] | null {
    // Simple triangle finding - in production use more efficient spatial structures
    for (let i = 0; i < nodes.length - 2; i++) {
      for (let j = i + 1; j < nodes.length - 1; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const triangle = [nodes[i], nodes[j], nodes[k]];
          if (this.pointInTriangle(point, triangle)) {
            return triangle;
          }
        }
      }
    }
    return null;
  }

  private pointInTriangle(point: Point2D, triangle: BlendNode[]): boolean {
    const [a, b, c] = triangle.map(node => node.position);
    
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < 1e-10) return false;
    
    const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
    const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
    
    return u >= 0 && v >= 0 && u + v <= 1;
  }

  private calculateBarycentricWeights(triangle: BlendNode[], point: Point2D): number[] {
    const [a, b, c] = triangle.map(node => node.position);
    
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(denominator) < 1e-10) return [1, 0, 0];
    
    const u = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / denominator;
    const v = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / denominator;
    const w = 1 - u - v;
    
    return [u, v, w];
  }

  private applyLookAtConstraint(constraint: AnimationConstraint): void {
    const bone = this.currentPose.bones.get(constraint.sourceBone);
    if (!bone || !constraint.targetPosition) return;

    const direction = this.subtract(constraint.targetPosition, bone.position);
    bone.rotation = Math.atan2(direction.y, direction.x);
  }

  private applyAimConstraint(constraint: AnimationConstraint): void {
    // Similar to lookAt but with offset
    this.applyLookAtConstraint(constraint);
  }

  private applyParentConstraint(constraint: AnimationConstraint): void {
    const sourceBone = this.currentPose.bones.get(constraint.sourceBone);
    const targetBone = constraint.targetBone ? this.currentPose.bones.get(constraint.targetBone) : null;
    
    if (!sourceBone || !targetBone) return;

    // Apply parent transform with weight
    sourceBone.position = lerpPoint2D(sourceBone.position, targetBone.position, constraint.weight);
    sourceBone.rotation = this.lerpAngle(sourceBone.rotation, targetBone.rotation, constraint.weight);
  }

  /**
   * Get current animation pose
   */
  getCurrentPose(): AnimationPose {
    return { ...this.currentPose };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get GPU transform buffer for rendering
   */
  getTransformBuffer(): WebGLBuffer | null {
    return this.transformBuffer;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.gl && this.transformBuffer) {
      this.gl.deleteBuffer(this.transformBuffer);
    }
    
    this.animationLayers.clear();
    this.blendTrees.clear();
    this.constraints.clear();
  }
}

export default AnimationSystem;
