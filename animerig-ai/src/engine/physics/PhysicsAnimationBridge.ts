import { Vector3, Quaternion, Matrix4 } from 'three';
import { PhysicsSystem, PhysicsBody, Constraint } from './PhysicsSystem';
import { AnimationSystem, BlendTree, AnimationLayer } from '../animation/AnimationSystem';

export interface PhysicsAnimationBone {
  name: string;
  physicsBodyId?: string;
  parentConstraintId?: string;
  mass: number;
  length: number;
  radius: number;
  damping: number;
  stiffness: number;
  isKinematic: boolean;
  collisionGroup: number;
  collisionMask: number;
}

export interface RagdollConfig {
  enableRagdoll: boolean;
  blendWeight: number;
  collisionResponse: number;
  jointStiffness: number;
  jointDamping: number;
  linearDamping: number;
  angularDamping: number;
  gravityScale: number;
  autoDisable: boolean;
  disableThreshold: number;
}

export interface ClothConfig {
  resolution: { x: number; y: number };
  mass: number;
  stiffness: number;
  damping: number;
  windForce: Vector3;
  attachmentPoints: Array<{
    vertex: number;
    bodyId: string;
    offset: Vector3;
  }>;
}

export interface HairStrand {
  segments: PhysicsBody[];
  constraints: Constraint[];
  rootAttachment: string;
  stiffness: number;
  damping: number;
  gravityScale: number;
}

export class PhysicsAnimationBridge {
  private physics: PhysicsSystem;
  private animation: AnimationSystem;
  private ragdollBones: Map<string, PhysicsAnimationBone> = new Map();
  private ragdollConfig: RagdollConfig;
  private clothSystems: Map<string, ClothConfig> = new Map();
  private hairStrands: Map<string, HairStrand> = new Map();
  private isRagdollActive: boolean = false;
  private kinematicBodies: Set<string> = new Set();
  private blendMatrix: Matrix4 = new Matrix4();

  constructor(physics: PhysicsSystem, animation: AnimationSystem) {
    this.physics = physics;
    this.animation = animation;
    
    this.ragdollConfig = {
      enableRagdoll: false,
      blendWeight: 0,
      collisionResponse: 1,
      jointStiffness: 1000,
      jointDamping: 50,
      linearDamping: 0.95,
      angularDamping: 0.95,
      gravityScale: 1,
      autoDisable: true,
      disableThreshold: 0.1
    };
  }

  // Ragdoll system
  setupRagdoll(skeleton: any): void {
    this.cleanupRagdoll();
    
    const bones = skeleton.bones;
    const ragdollBones = this.createRagdollBones(bones);
    
    for (const bone of ragdollBones) {
      this.ragdollBones.set(bone.name, bone);
      
      if (!bone.isKinematic) {
        // Create physics body for bone
        const body = this.physics.createBody(bone.physicsBodyId!, {
          mass: bone.mass,
          damping: this.ragdollConfig.linearDamping,
          angularDamping: this.ragdollConfig.angularDamping,
          restitution: 0.1,
          friction: 0.7
        });
        
        // Set collision shape (capsule for bone)
        this.physics.setCollisionShape(bone.physicsBodyId!, {
          type: 'capsule',
          radius: bone.radius,
          height: bone.length
        });
      }
    }
    
    this.createRagdollConstraints(ragdollBones);
  }

  private createRagdollBones(bones: any[]): PhysicsAnimationBone[] {
    const ragdollBones: PhysicsAnimationBone[] = [];
    
    for (const bone of bones) {
      const isSpine = bone.name.includes('spine') || bone.name.includes('chest');
      const isHead = bone.name.includes('head') || bone.name.includes('neck');
      const isArm = bone.name.includes('arm') || bone.name.includes('shoulder');
      const isLeg = bone.name.includes('leg') || bone.name.includes('thigh') || bone.name.includes('calf');
      
      let mass = 1;
      let radius = 0.05;
      let length = 0.2;
      
      if (isHead) {
        mass = 5;
        radius = 0.08;
        length = 0.15;
      } else if (isSpine) {
        mass = 15;
        radius = 0.1;
        length = 0.25;
      } else if (isArm) {
        mass = 3;
        radius = 0.04;
        length = 0.3;
      } else if (isLeg) {
        mass = 8;
        radius = 0.06;
        length = 0.4;
      }
      
      const ragdollBone: PhysicsAnimationBone = {
        name: bone.name,
        physicsBodyId: `ragdoll_${bone.name}`,
        parentConstraintId: bone.parent ? `constraint_${bone.parent.name}_${bone.name}` : undefined,
        mass,
        length,
        radius,
        damping: this.ragdollConfig.jointDamping,
        stiffness: this.ragdollConfig.jointStiffness,
        isKinematic: false,
        collisionGroup: 1,
        collisionMask: -1
      };
      
      ragdollBones.push(ragdollBone);
    }
    
    return ragdollBones;
  }

  private createRagdollConstraints(bones: PhysicsAnimationBone[]): void {
    for (const bone of bones) {
      if (!bone.parentConstraintId) continue;
      
      const parentBone = bones.find(b => bone.parentConstraintId?.includes(b.name));
      if (!parentBone || !bone.physicsBodyId || !parentBone.physicsBodyId) continue;
      
      // Create joint constraint between parent and child bones
      const constraint: Constraint = {
        id: bone.parentConstraintId,
        type: 'cone',
        bodyA: parentBone.physicsBodyId,
        bodyB: bone.physicsBodyId,
        localAnchorA: new Vector3(0, bone.length * 0.5, 0),
        localAnchorB: new Vector3(0, -bone.length * 0.5, 0),
        stiffness: bone.stiffness,
        damping: bone.damping,
        minAngle: -Math.PI / 4,
        maxAngle: Math.PI / 4,
        enabled: true
      };
      
      this.physics.createConstraint(bone.parentConstraintId, constraint);
    }
  }

  enableRagdoll(enable: boolean = true): void {
    this.ragdollConfig.enableRagdoll = enable;
    this.isRagdollActive = enable;
    
    if (enable) {
      // Transfer current pose to physics bodies
      this.transferAnimationToPhysics();
    } else {
      // Make bodies kinematic to follow animation
      for (const bone of this.ragdollBones.values()) {
        if (bone.physicsBodyId) {
          const body = this.physics.getBody(bone.physicsBodyId);
          if (body) {
            body.isStatic = true;
          }
        }
      }
    }
  }

  setRagdollBlendWeight(weight: number): void {
    this.ragdollConfig.blendWeight = Math.max(0, Math.min(1, weight));
  }

  private transferAnimationToPhysics(): void {
    // Get current bone transforms from animation system
    const boneTransforms = this.animation.getCurrentBoneTransforms();
    
    for (const [boneName, bone] of this.ragdollBones) {
      if (!bone.physicsBodyId) continue;
      
      const body = this.physics.getBody(bone.physicsBodyId);
      const transform = boneTransforms.get(boneName);
      
      if (body && transform) {
        body.position.copy(transform.position);
        body.rotation.copy(transform.quaternion);
        body.isStatic = false;
      }
    }
  }

  private transferPhysicsToAnimation(): void {
    if (!this.isRagdollActive) return;
    
    const boneTransforms = new Map<string, { position: Vector3; quaternion: Quaternion }>();
    
    for (const [boneName, bone] of this.ragdollBones) {
      if (!bone.physicsBodyId) continue;
      
      const body = this.physics.getBody(bone.physicsBodyId);
      if (body) {
        boneTransforms.set(boneName, {
          position: body.position.clone(),
          quaternion: body.rotation.clone()
        });
      }
    }
    
    this.animation.blendBoneTransforms(boneTransforms, this.ragdollConfig.blendWeight);
  }

  // Cloth simulation
  setupCloth(name: string, config: ClothConfig): void {
    this.clothSystems.set(name, config);
    
    const { resolution, mass, stiffness, damping } = config;
    const particleMass = mass / (resolution.x * resolution.y);
    
    // Create cloth particles
    for (let y = 0; y < resolution.y; y++) {
      for (let x = 0; x < resolution.x; x++) {
        const particleId = `${name}_particle_${x}_${y}`;
        
        this.physics.createBody(particleId, {
          mass: particleMass,
          damping: damping,
          position: new Vector3(x * 0.1, 0, y * 0.1)
        });
        
        this.physics.setCollisionShape(particleId, {
          type: 'sphere',
          radius: 0.01
        });
      }
    }
    
    // Create structural constraints
    for (let y = 0; y < resolution.y; y++) {
      for (let x = 0; x < resolution.x; x++) {
        const currentId = `${name}_particle_${x}_${y}`;
        
        // Horizontal constraint
        if (x < resolution.x - 1) {
          const rightId = `${name}_particle_${x + 1}_${y}`;
          this.physics.createConstraint(`${name}_h_${x}_${y}`, {
            id: `${name}_h_${x}_${y}`,
            type: 'distance',
            bodyA: currentId,
            bodyB: rightId,
            localAnchorA: new Vector3(),
            localAnchorB: new Vector3(),
            restLength: 0.1,
            stiffness: stiffness,
            damping: damping * 0.1,
            enabled: true
          });
        }
        
        // Vertical constraint
        if (y < resolution.y - 1) {
          const downId = `${name}_particle_${x}_${y + 1}`;
          this.physics.createConstraint(`${name}_v_${x}_${y}`, {
            id: `${name}_v_${x}_${y}`,
            type: 'distance',
            bodyA: currentId,
            bodyB: downId,
            localAnchorA: new Vector3(),
            localAnchorB: new Vector3(),
            restLength: 0.1,
            stiffness: stiffness,
            damping: damping * 0.1,
            enabled: true
          });
        }
      }
    }
    
    // Create attachment constraints
    for (const attachment of config.attachmentPoints) {
      const particleId = `${name}_particle_${attachment.vertex % resolution.x}_${Math.floor(attachment.vertex / resolution.x)}`;
      
      this.physics.createConstraint(`${name}_attach_${attachment.vertex}`, {
        id: `${name}_attach_${attachment.vertex}`,
        type: 'fixed',
        bodyA: attachment.bodyId,
        bodyB: particleId,
        localAnchorA: attachment.offset,
        localAnchorB: new Vector3(),
        stiffness: stiffness * 2,
        damping: damping,
        enabled: true
      });
    }
  }

  updateCloth(name: string, deltaTime: number): void {
    const config = this.clothSystems.get(name);
    if (!config) return;
    
    // Apply wind force
    if (config.windForce.lengthSq() > 0) {
      const { resolution } = config;
      
      for (let y = 0; y < resolution.y; y++) {
        for (let x = 0; x < resolution.x; x++) {
          const particleId = `${name}_particle_${x}_${y}`;
          this.physics.applyForce(particleId, config.windForce.clone().multiplyScalar(deltaTime));
        }
      }
    }
  }

  // Hair simulation
  setupHair(name: string, rootBone: string, config: {
    segmentCount: number;
    segmentLength: number;
    mass: number;
    stiffness: number;
    damping: number;
    gravityScale: number;
  }): void {
    const segments: PhysicsBody[] = [];
    const constraints: Constraint[] = [];
    
    for (let i = 0; i < config.segmentCount; i++) {
      const segmentId = `${name}_segment_${i}`;
      
      const body = this.physics.createBody(segmentId, {
        mass: config.mass / config.segmentCount,
        damping: config.damping,
        position: new Vector3(0, -i * config.segmentLength, 0)
      });
      
      this.physics.setCollisionShape(segmentId, {
        type: 'sphere',
        radius: 0.005
      });
      
      segments.push(body);
      
      // Create constraint to previous segment or root
      if (i === 0) {
        // Attach to root bone
        const rootConstraint: Constraint = {
          id: `${name}_root_constraint`,
          type: 'fixed',
          bodyA: rootBone,
          bodyB: segmentId,
          localAnchorA: new Vector3(),
          localAnchorB: new Vector3(),
          stiffness: config.stiffness * 2,
          damping: config.damping,
          enabled: true
        };
        
        this.physics.createConstraint(`${name}_root_constraint`, rootConstraint);
        constraints.push(rootConstraint);
      } else {
        const prevSegmentId = `${name}_segment_${i - 1}`;
        const segmentConstraint: Constraint = {
          id: `${name}_constraint_${i}`,
          type: 'distance',
          bodyA: prevSegmentId,
          bodyB: segmentId,
          localAnchorA: new Vector3(),
          localAnchorB: new Vector3(),
          restLength: config.segmentLength,
          stiffness: config.stiffness,
          damping: config.damping,
          enabled: true
        };
        
        this.physics.createConstraint(`${name}_constraint_${i}`, segmentConstraint);
        constraints.push(segmentConstraint);
      }
    }
    
    const hairStrand: HairStrand = {
      segments,
      constraints,
      rootAttachment: rootBone,
      stiffness: config.stiffness,
      damping: config.damping,
      gravityScale: config.gravityScale
    };
    
    this.hairStrands.set(name, hairStrand);
  }

  updateHair(deltaTime: number): void {
    for (const [name, strand] of this.hairStrands) {
      // Apply gravity scaling
      for (const segment of strand.segments) {
        const gravityForce = this.physics['config'].gravity.clone().multiplyScalar(
          segment.mass * strand.gravityScale * deltaTime
        );
        this.physics.applyForce(segment.id, gravityForce);
      }
    }
  }

  // Main update loop
  update(deltaTime: number): void {
    // Update cloth systems
    for (const clothName of this.clothSystems.keys()) {
      this.updateCloth(clothName, deltaTime);
    }
    
    // Update hair systems
    this.updateHair(deltaTime);
    
    // Transfer physics results back to animation if ragdoll is active
    if (this.isRagdollActive) {
      this.transferPhysicsToAnimation();
    } else {
      // Update kinematic bodies to follow animation
      this.updateKinematicBodies();
    }
  }

  private updateKinematicBodies(): void {
    const boneTransforms = this.animation.getCurrentBoneTransforms();
    
    for (const bodyId of this.kinematicBodies) {
      const body = this.physics.getBody(bodyId);
      if (!body) continue;
      
      const boneName = bodyId.replace('ragdoll_', '');
      const transform = boneTransforms.get(boneName);
      
      if (transform) {
        body.position.copy(transform.position);
        body.rotation.copy(transform.quaternion);
        body.velocity.set(0, 0, 0);
        body.angularVelocity.set(0, 0, 0);
      }
    }
  }

  // Utility methods
  getClothPositions(name: string): Vector3[] {
    const config = this.clothSystems.get(name);
    if (!config) return [];
    
    const positions: Vector3[] = [];
    const { resolution } = config;
    
    for (let y = 0; y < resolution.y; y++) {
      for (let x = 0; x < resolution.x; x++) {
        const particleId = `${name}_particle_${x}_${y}`;
        const body = this.physics.getBody(particleId);
        if (body) {
          positions.push(body.position.clone());
        }
      }
    }
    
    return positions;
  }

  getHairPositions(name: string): Vector3[] {
    const strand = this.hairStrands.get(name);
    if (!strand) return [];
    
    return strand.segments.map(segment => segment.position.clone());
  }

  private cleanupRagdoll(): void {
    for (const bone of this.ragdollBones.values()) {
      if (bone.physicsBodyId) {
        this.physics.removeBody(bone.physicsBodyId);
      }
      if (bone.parentConstraintId) {
        this.physics.removeConstraint(bone.parentConstraintId);
      }
    }
    this.ragdollBones.clear();
  }

  dispose(): void {
    this.cleanupRagdoll();
    
    // Cleanup cloth systems
    for (const [name, config] of this.clothSystems) {
      const { resolution } = config;
      for (let y = 0; y < resolution.y; y++) {
        for (let x = 0; x < resolution.x; x++) {
          const particleId = `${name}_particle_${x}_${y}`;
          this.physics.removeBody(particleId);
        }
      }
    }
    this.clothSystems.clear();
    
    // Cleanup hair systems
    for (const [name, strand] of this.hairStrands) {
      for (const segment of strand.segments) {
        this.physics.removeBody(segment.id);
      }
      for (const constraint of strand.constraints) {
        this.physics.removeConstraint(constraint.id);
      }
    }
    this.hairStrands.clear();
  }
}
