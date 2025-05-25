import { Vector3, Matrix4, Quaternion } from 'three';

export interface PhysicsBody {
  id: string;
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  mass: number;
  inverseMass: number;
  damping: number;
  angularVelocity: Vector3;
  angularDamping: number;
  rotation: Quaternion;
  forces: Vector3;
  torques: Vector3;
  isStatic: boolean;
  restitution: number;
  friction: number;
  sleepThreshold: number;
  isSleeping: boolean;
  sleepTime: number;
  boundingBox?: {
    min: Vector3;
    max: Vector3;
  };
}

export interface Constraint {
  id: string;
  type: 'distance' | 'spring' | 'hinge' | 'fixed' | 'cone';
  bodyA: string;
  bodyB: string;
  localAnchorA: Vector3;
  localAnchorB: Vector3;
  restLength?: number;
  stiffness: number;
  damping: number;
  minAngle?: number;
  maxAngle?: number;
  enabled: boolean;
}

export interface CollisionShape {
  type: 'sphere' | 'box' | 'capsule' | 'mesh';
  radius?: number;
  dimensions?: Vector3;
  height?: number;
  vertices?: Float32Array;
  indices?: Uint32Array;
}

export interface CollisionInfo {
  bodyA: string;
  bodyB: string;
  point: Vector3;
  normal: Vector3;
  penetration: number;
  impulse: number;
}

export interface PhysicsConfig {
  gravity: Vector3;
  timeStep: number;
  maxSubSteps: number;
  solverIterations: number;
  enableSleep: boolean;
  broadphaseType: 'naive' | 'sweep-prune' | 'spatial-hash';
  narrowphaseType: 'sat' | 'gjk-epa';
}

export class PhysicsSystem {
  private bodies: Map<string, PhysicsBody> = new Map();
  private constraints: Map<string, Constraint> = new Map();
  private collisionShapes: Map<string, CollisionShape> = new Map();
  private collisions: CollisionInfo[] = [];
  private config: PhysicsConfig;
  private time: number = 0;
  private accumulator: number = 0;
  private broadphaseGrid: Map<string, Set<string>> = new Map();
  private spatialHashSize: number = 10;

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = {
      gravity: new Vector3(0, -9.81, 0),
      timeStep: 1/60,
      maxSubSteps: 4,
      solverIterations: 10,
      enableSleep: true,
      broadphaseType: 'spatial-hash',
      narrowphaseType: 'gjk-epa',
      ...config
    };
  }

  // Body management
  createBody(id: string, options: Partial<PhysicsBody> = {}): PhysicsBody {
    const mass = options.mass ?? 1;
    const body: PhysicsBody = {
      id,
      position: options.position?.clone() ?? new Vector3(),
      velocity: options.velocity?.clone() ?? new Vector3(),
      acceleration: options.acceleration?.clone() ?? new Vector3(),
      mass,
      inverseMass: mass > 0 ? 1 / mass : 0,
      damping: options.damping ?? 0.99,
      angularVelocity: options.angularVelocity?.clone() ?? new Vector3(),
      angularDamping: options.angularDamping ?? 0.95,
      rotation: options.rotation?.clone() ?? new Quaternion(),
      forces: new Vector3(),
      torques: new Vector3(),
      isStatic: options.isStatic ?? false,
      restitution: options.restitution ?? 0.3,
      friction: options.friction ?? 0.5,
      sleepThreshold: options.sleepThreshold ?? 0.01,
      isSleeping: false,
      sleepTime: 0,
      boundingBox: options.boundingBox
    };

    this.bodies.set(id, body);
    return body;
  }

  removeBody(id: string): void {
    this.bodies.delete(id);
    this.collisionShapes.delete(id);
    
    // Remove constraints associated with this body
    for (const [constraintId, constraint] of this.constraints) {
      if (constraint.bodyA === id || constraint.bodyB === id) {
        this.constraints.delete(constraintId);
      }
    }
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  // Collision shape management
  setCollisionShape(bodyId: string, shape: CollisionShape): void {
    this.collisionShapes.set(bodyId, shape);
    this.updateBoundingBox(bodyId);
  }

  private updateBoundingBox(bodyId: string): void {
    const body = this.bodies.get(bodyId);
    const shape = this.collisionShapes.get(bodyId);
    
    if (!body || !shape) return;

    const pos = body.position;
    let min: Vector3, max: Vector3;

    switch (shape.type) {
      case 'sphere':
        const radius = shape.radius || 1;
        min = pos.clone().addScalar(-radius);
        max = pos.clone().addScalar(radius);
        break;
      
      case 'box':
        const dim = shape.dimensions || new Vector3(1, 1, 1);
        min = pos.clone().sub(dim.clone().multiplyScalar(0.5));
        max = pos.clone().add(dim.clone().multiplyScalar(0.5));
        break;
      
      case 'capsule':
        const capRadius = shape.radius || 0.5;
        const height = shape.height || 2;
        min = pos.clone().add(new Vector3(-capRadius, -height/2, -capRadius));
        max = pos.clone().add(new Vector3(capRadius, height/2, capRadius));
        break;
      
      default:
        min = pos.clone().addScalar(-1);
        max = pos.clone().addScalar(1);
    }

    body.boundingBox = { min, max };
  }

  // Constraint management
  createConstraint(id: string, constraint: Constraint): void {
    this.constraints.set(id, constraint);
  }

  removeConstraint(id: string): void {
    this.constraints.delete(id);
  }

  // Force application
  applyForce(bodyId: string, force: Vector3, point?: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.isStatic) return;

    body.forces.add(force);

    if (point) {
      const torque = point.clone().sub(body.position).cross(force);
      body.torques.add(torque);
    }
  }

  applyImpulse(bodyId: string, impulse: Vector3, point?: Vector3): void {
    const body = this.bodies.get(bodyId);
    if (!body || body.isStatic) return;

    body.velocity.add(impulse.clone().multiplyScalar(body.inverseMass));

    if (point) {
      const angularImpulse = point.clone().sub(body.position).cross(impulse);
      body.angularVelocity.add(angularImpulse.multiplyScalar(body.inverseMass));
    }
  }

  // Main simulation step
  step(deltaTime: number): void {
    this.accumulator += deltaTime;
    const dt = this.config.timeStep;
    let steps = 0;

    while (this.accumulator >= dt && steps < this.config.maxSubSteps) {
      this.substep(dt);
      this.accumulator -= dt;
      this.time += dt;
      steps++;
    }
  }

  private substep(dt: number): void {
    // Apply gravity and integrate forces
    this.integrateForces(dt);
    
    // Collision detection
    this.detectCollisions();
    
    // Solve constraints
    this.solveConstraints(dt);
    
    // Solve collisions
    this.solveCollisions();
    
    // Integrate velocities
    this.integrateVelocities(dt);
    
    // Update bounding boxes
    this.updateBoundingBoxes();
    
    // Handle sleeping
    if (this.config.enableSleep) {
      this.updateSleepStates(dt);
    }
    
    // Clear forces
    this.clearForces();
  }

  private integrateForces(dt: number): void {
    for (const body of this.bodies.values()) {
      if (body.isStatic || body.isSleeping) continue;

      // Apply gravity
      body.forces.add(this.config.gravity.clone().multiplyScalar(body.mass));

      // Integrate acceleration
      body.acceleration.copy(body.forces).multiplyScalar(body.inverseMass);
      body.velocity.add(body.acceleration.clone().multiplyScalar(dt));

      // Apply damping
      body.velocity.multiplyScalar(Math.pow(body.damping, dt));
      body.angularVelocity.multiplyScalar(Math.pow(body.angularDamping, dt));
    }
  }

  private integrateVelocities(dt: number): void {
    for (const body of this.bodies.values()) {
      if (body.isStatic || body.isSleeping) continue;

      // Integrate position
      body.position.add(body.velocity.clone().multiplyScalar(dt));

      // Integrate rotation
      if (body.angularVelocity.lengthSq() > 0.001) {
        const angle = body.angularVelocity.length() * dt;
        const axis = body.angularVelocity.clone().normalize();
        const deltaRotation = new Quaternion().setFromAxisAngle(axis, angle);
        body.rotation.multiplyQuaternions(deltaRotation, body.rotation);
        body.rotation.normalize();
      }
    }
  }

  private detectCollisions(): void {
    this.collisions = [];
    
    if (this.config.broadphaseType === 'spatial-hash') {
      this.spatialHashBroadphase();
    } else {
      this.naiveBroadphase();
    }
  }

  private spatialHashBroadphase(): void {
    this.broadphaseGrid.clear();
    
    // Hash bodies into grid cells
    for (const body of this.bodies.values()) {
      if (!body.boundingBox) continue;
      
      const cells = this.getGridCells(body.boundingBox);
      for (const cell of cells) {
        if (!this.broadphaseGrid.has(cell)) {
          this.broadphaseGrid.set(cell, new Set());
        }
        this.broadphaseGrid.get(cell)!.add(body.id);
      }
    }
    
    // Check collisions within cells
    const checkedPairs = new Set<string>();
    
    for (const cellBodies of this.broadphaseGrid.values()) {
      const bodyArray = Array.from(cellBodies);
      
      for (let i = 0; i < bodyArray.length; i++) {
        for (let j = i + 1; j < bodyArray.length; j++) {
          const pairKey = `${bodyArray[i]}-${bodyArray[j]}`;
          if (checkedPairs.has(pairKey)) continue;
          
          checkedPairs.add(pairKey);
          this.narrowphaseCollision(bodyArray[i], bodyArray[j]);
        }
      }
    }
  }

  private naiveBroadphase(): void {
    const bodyIds = Array.from(this.bodies.keys());
    
    for (let i = 0; i < bodyIds.length; i++) {
      for (let j = i + 1; j < bodyIds.length; j++) {
        this.narrowphaseCollision(bodyIds[i], bodyIds[j]);
      }
    }
  }

  private getGridCells(boundingBox: { min: Vector3; max: Vector3 }): string[] {
    const cells: string[] = [];
    const size = this.spatialHashSize;
    
    const minX = Math.floor(boundingBox.min.x / size);
    const maxX = Math.floor(boundingBox.max.x / size);
    const minY = Math.floor(boundingBox.min.y / size);
    const maxY = Math.floor(boundingBox.max.y / size);
    const minZ = Math.floor(boundingBox.min.z / size);
    const maxZ = Math.floor(boundingBox.max.z / size);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          cells.push(`${x},${y},${z}`);
        }
      }
    }
    
    return cells;
  }

  private narrowphaseCollision(bodyIdA: string, bodyIdB: string): void {
    const bodyA = this.bodies.get(bodyIdA);
    const bodyB = this.bodies.get(bodyIdB);
    const shapeA = this.collisionShapes.get(bodyIdA);
    const shapeB = this.collisionShapes.get(bodyIdB);
    
    if (!bodyA || !bodyB || !shapeA || !shapeB) return;
    if (bodyA.isStatic && bodyB.isStatic) return;
    if (!this.boundingBoxOverlap(bodyA, bodyB)) return;
    
    const collision = this.checkShapeCollision(bodyA, shapeA, bodyB, shapeB);
    if (collision) {
      this.collisions.push(collision);
    }
  }

  private boundingBoxOverlap(bodyA: PhysicsBody, bodyB: PhysicsBody): boolean {
    if (!bodyA.boundingBox || !bodyB.boundingBox) return true;
    
    const a = bodyA.boundingBox;
    const b = bodyB.boundingBox;
    
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
  }

  private checkShapeCollision(
    bodyA: PhysicsBody, shapeA: CollisionShape,
    bodyB: PhysicsBody, shapeB: CollisionShape
  ): CollisionInfo | null {
    // Simplified collision detection - would need full GJK/EPA implementation
    if (shapeA.type === 'sphere' && shapeB.type === 'sphere') {
      return this.sphereSphereCollision(bodyA, shapeA, bodyB, shapeB);
    }
    
    return null;
  }

  private sphereSphereCollision(
    bodyA: PhysicsBody, shapeA: CollisionShape,
    bodyB: PhysicsBody, shapeB: CollisionShape
  ): CollisionInfo | null {
    const radiusA = shapeA.radius || 1;
    const radiusB = shapeB.radius || 1;
    const distance = bodyA.position.distanceTo(bodyB.position);
    const totalRadius = radiusA + radiusB;
    
    if (distance >= totalRadius) return null;
    
    const normal = bodyB.position.clone().sub(bodyA.position).normalize();
    const penetration = totalRadius - distance;
    const point = bodyA.position.clone().add(normal.clone().multiplyScalar(radiusA));
    
    return {
      bodyA: bodyA.id,
      bodyB: bodyB.id,
      point,
      normal,
      penetration,
      impulse: 0
    };
  }

  private solveConstraints(dt: number): void {
    for (let iteration = 0; iteration < this.config.solverIterations; iteration++) {
      for (const constraint of this.constraints.values()) {
        if (!constraint.enabled) continue;
        this.solveConstraint(constraint, dt);
      }
    }
  }

  private solveConstraint(constraint: Constraint, dt: number): void {
    const bodyA = this.bodies.get(constraint.bodyA);
    const bodyB = this.bodies.get(constraint.bodyB);
    
    if (!bodyA || !bodyB) return;
    
    switch (constraint.type) {
      case 'distance':
        this.solveDistanceConstraint(bodyA, bodyB, constraint);
        break;
      case 'spring':
        this.solveSpringConstraint(bodyA, bodyB, constraint, dt);
        break;
    }
  }

  private solveDistanceConstraint(bodyA: PhysicsBody, bodyB: PhysicsBody, constraint: Constraint): void {
    const worldAnchorA = bodyA.position.clone().add(constraint.localAnchorA);
    const worldAnchorB = bodyB.position.clone().add(constraint.localAnchorB);
    const delta = worldAnchorB.clone().sub(worldAnchorA);
    const distance = delta.length();
    const restLength = constraint.restLength || 0;
    
    if (distance === 0) return;
    
    const error = distance - restLength;
    const normal = delta.clone().normalize();
    const correction = normal.clone().multiplyScalar(error * 0.5);
    
    if (!bodyA.isStatic) {
      bodyA.position.add(correction.clone().multiplyScalar(bodyA.inverseMass / (bodyA.inverseMass + bodyB.inverseMass)));
    }
    
    if (!bodyB.isStatic) {
      bodyB.position.sub(correction.clone().multiplyScalar(bodyB.inverseMass / (bodyA.inverseMass + bodyB.inverseMass)));
    }
  }

  private solveSpringConstraint(bodyA: PhysicsBody, bodyB: PhysicsBody, constraint: Constraint, dt: number): void {
    const worldAnchorA = bodyA.position.clone().add(constraint.localAnchorA);
    const worldAnchorB = bodyB.position.clone().add(constraint.localAnchorB);
    const delta = worldAnchorB.clone().sub(worldAnchorA);
    const distance = delta.length();
    const restLength = constraint.restLength || 0;
    
    if (distance === 0) return;
    
    const normal = delta.clone().normalize();
    const springForce = (distance - restLength) * constraint.stiffness;
    const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
    const dampingForce = relativeVelocity.dot(normal) * constraint.damping;
    
    const totalForce = normal.clone().multiplyScalar(springForce + dampingForce);
    
    this.applyForce(bodyA.id, totalForce.clone());
    this.applyForce(bodyB.id, totalForce.clone().negate());
  }

  private solveCollisions(): void {
    for (const collision of this.collisions) {
      const bodyA = this.bodies.get(collision.bodyA);
      const bodyB = this.bodies.get(collision.bodyB);
      
      if (!bodyA || !bodyB) continue;
      
      this.resolveCollision(bodyA, bodyB, collision);
    }
  }

  private resolveCollision(bodyA: PhysicsBody, bodyB: PhysicsBody, collision: CollisionInfo): void {
    // Position correction
    const correction = collision.normal.clone().multiplyScalar(collision.penetration * 0.8);
    const totalInverseMass = bodyA.inverseMass + bodyB.inverseMass;
    
    if (!bodyA.isStatic) {
      bodyA.position.sub(correction.clone().multiplyScalar(bodyA.inverseMass / totalInverseMass));
    }
    
    if (!bodyB.isStatic) {
      bodyB.position.add(correction.clone().multiplyScalar(bodyB.inverseMass / totalInverseMass));
    }
    
    // Velocity resolution
    const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
    const normalVelocity = relativeVelocity.dot(collision.normal);
    
    if (normalVelocity > 0) return; // Separating
    
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const impulseScalar = -(1 + restitution) * normalVelocity / totalInverseMass;
    const impulse = collision.normal.clone().multiplyScalar(impulseScalar);
    
    collision.impulse = impulseScalar;
    
    if (!bodyA.isStatic) {
      bodyA.velocity.sub(impulse.clone().multiplyScalar(bodyA.inverseMass));
    }
    
    if (!bodyB.isStatic) {
      bodyB.velocity.add(impulse.clone().multiplyScalar(bodyB.inverseMass));
    }
    
    // Friction
    const tangent = relativeVelocity.clone().sub(collision.normal.clone().multiplyScalar(normalVelocity));
    if (tangent.lengthSq() > 0.001) {
      tangent.normalize();
      const friction = Math.sqrt(bodyA.friction * bodyB.friction);
      const frictionImpulse = Math.min(friction * impulseScalar, tangent.length() * totalInverseMass);
      const frictionVector = tangent.clone().multiplyScalar(frictionImpulse);
      
      if (!bodyA.isStatic) {
        bodyA.velocity.add(frictionVector.clone().multiplyScalar(bodyA.inverseMass));
      }
      
      if (!bodyB.isStatic) {
        bodyB.velocity.sub(frictionVector.clone().multiplyScalar(bodyB.inverseMass));
      }
    }
  }

  private updateBoundingBoxes(): void {
    for (const bodyId of this.bodies.keys()) {
      this.updateBoundingBox(bodyId);
    }
  }

  private updateSleepStates(dt: number): void {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      
      const kineticEnergy = body.velocity.lengthSq() + body.angularVelocity.lengthSq();
      
      if (kineticEnergy < body.sleepThreshold) {
        body.sleepTime += dt;
        if (body.sleepTime > 0.5) {
          body.isSleeping = true;
          body.velocity.set(0, 0, 0);
          body.angularVelocity.set(0, 0, 0);
        }
      } else {
        body.sleepTime = 0;
        body.isSleeping = false;
      }
    }
  }

  private clearForces(): void {
    for (const body of this.bodies.values()) {
      body.forces.set(0, 0, 0);
      body.torques.set(0, 0, 0);
    }
  }

  // Public API
  getCollisions(): CollisionInfo[] {
    return this.collisions;
  }

  getBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  getConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  setGravity(gravity: Vector3): void {
    this.config.gravity.copy(gravity);
  }

  dispose(): void {
    this.bodies.clear();
    this.constraints.clear();
    this.collisionShapes.clear();
    this.collisions = [];
    this.broadphaseGrid.clear();
  }
}
