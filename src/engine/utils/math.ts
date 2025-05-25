/**
 * Mathematical utilities for the animation engine
 */

import { Vector2, Vector3 } from 'three';
import { Point2D, EasingFunction } from '../types';

// ===== Mathematical Constants =====
export const PI = Math.PI;
export const TWO_PI = PI * 2;
export const HALF_PI = PI * 0.5;
export const DEG_TO_RAD = PI / 180;
export const RAD_TO_DEG = 180 / PI;

// ===== Basic Math Functions =====

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Linear interpolation between two 2D points
 */
export function lerpPoint2D(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: a.z !== undefined && b.z !== undefined ? lerp(a.z, b.z, t) : undefined,
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a value from one range to another
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

/**
 * Smooth step function for smooth transitions
 */
export function smoothstep(min: number, max: number, value: number): number {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smootherstep function for even smoother transitions
 */
export function smootherstep(min: number, max: number, value: number): number {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// ===== Distance and Vector Functions =====

/**
 * Calculate distance between two 2D points
 */
export function distance2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance between two 2D points (faster than distance)
 */
export function distanceSquared2D(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Normalize a 2D vector
 */
export function normalize2D(point: Point2D): Point2D {
  const length = Math.sqrt(point.x * point.x + point.y * point.y);
  if (length === 0) return { x: 0, y: 0 };
  return {
    x: point.x / length,
    y: point.y / length,
  };
}

/**
 * Calculate dot product of two 2D vectors
 */
export function dot2D(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Calculate cross product of two 2D vectors (returns scalar)
 */
export function cross2D(a: Point2D, b: Point2D): number {
  return a.x * b.y - a.y * b.x;
}

/**
 * Rotate a 2D point around origin by angle (in radians)
 */
export function rotate2D(point: Point2D, angle: number): Point2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/**
 * Rotate a 2D point around a center point
 */
export function rotateAround2D(point: Point2D, center: Point2D, angle: number): Point2D {
  const translated = { x: point.x - center.x, y: point.y - center.y };
  const rotated = rotate2D(translated, angle);
  return {
    x: rotated.x + center.x,
    y: rotated.y + center.y,
  };
}

// ===== Easing Functions =====

export const Easing: Record<string, EasingFunction> = {
  linear: (t: number) => t,
  
  // Quadratic
  quadIn: (t: number) => t * t,
  quadOut: (t: number) => t * (2 - t),
  quadInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  cubicIn: (t: number) => t * t * t,
  cubicOut: (t: number) => (--t) * t * t + 1,
  cubicInOut: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quartic
  quartIn: (t: number) => t * t * t * t,
  quartOut: (t: number) => 1 - (--t) * t * t * t,
  quartInOut: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Sinusoidal
  sineIn: (t: number) => 1 - Math.cos(t * HALF_PI),
  sineOut: (t: number) => Math.sin(t * HALF_PI),
  sineInOut: (t: number) => -(Math.cos(PI * t) - 1) / 2,
  
  // Exponential
  expoIn: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  expoOut: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  expoInOut: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Elastic
  elasticIn: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * PI);
  },
  elasticOut: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * PI) + 1;
  },
  
  // Back
  backIn: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  backOut: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  
  // Bounce
  bounceOut: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  bounceIn: (t: number) => 1 - Easing.bounceOut(1 - t),
};

// ===== Noise Functions =====

/**
 * Simple 1D Perlin noise implementation
 */
export class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed?: number) {
    this.permutation = [];
    for (let i = 0; i < 256; i++) {
      this.permutation[i] = i;
    }
    
    // Shuffle based on seed
    if (seed !== undefined) {
      const random = this.seededRandom(seed);
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
      }
    } else {
      for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
      }
    }
    
    this.p = [...this.permutation, ...this.permutation];
  }

  private seededRandom(seed: number) {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private grad(hash: number, x: number): number {
    return (hash & 1) === 0 ? x : -x;
  }

  noise1D(x: number): number {
    const X = Math.floor(x) & 255;
    x -= Math.floor(x);
    const u = this.fade(x);
    return lerp(
      this.grad(this.p[X], x),
      this.grad(this.p[X + 1], x - 1),
      u
    );
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.p[X] + Y;
    const B = this.p[X + 1] + Y;
    
    return lerp(
      lerp(
        this.grad2D(this.p[A], x, y),
        this.grad2D(this.p[B], x - 1, y),
        u
      ),
      lerp(
        this.grad2D(this.p[A + 1], x, y - 1),
        this.grad2D(this.p[B + 1], x - 1, y - 1),
        u
      ),
      v
    );
  }

  private grad2D(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

// ===== Geometry Utilities =====

/**
 * Check if a point is inside a triangle
 */
export function pointInTriangle(p: Point2D, a: Point2D, b: Point2D, c: Point2D): boolean {
  const v0 = { x: c.x - a.x, y: c.y - a.y };
  const v1 = { x: b.x - a.x, y: b.y - a.y };
  const v2 = { x: p.x - a.x, y: p.y - a.y };

  const dot00 = dot2D(v0, v0);
  const dot01 = dot2D(v0, v1);
  const dot02 = dot2D(v0, v2);
  const dot11 = dot2D(v1, v1);
  const dot12 = dot2D(v1, v2);

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return (u >= 0) && (v >= 0) && (u + v <= 1);
}

/**
 * Calculate barycentric coordinates of a point in a triangle
 */
export function barycentric(p: Point2D, a: Point2D, b: Point2D, c: Point2D): Point2D & { z: number } {
  const v0 = { x: b.x - a.x, y: b.y - a.y };
  const v1 = { x: c.x - a.x, y: c.y - a.y };
  const v2 = { x: p.x - a.x, y: p.y - a.y };

  const dot00 = dot2D(v0, v0);
  const dot01 = dot2D(v0, v1);
  const dot02 = dot2D(v0, v2);
  const dot11 = dot2D(v1, v1);
  const dot12 = dot2D(v1, v2);

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return { x: 1 - u - v, y: u, z: v };
}

// ===== Time and Performance Utilities =====

/**
 * High-precision timestamp
 */
export function now(): number {
  return performance.now();
}

/**
 * Frame rate calculator
 */
export class FrameRateCalculator {
  private frames: number[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples;
  }

  update(): number {
    const now = performance.now();
    this.frames.push(now);
    
    if (this.frames.length > this.maxSamples) {
      this.frames.shift();
    }

    if (this.frames.length < 2) return 0;

    const totalTime = this.frames[this.frames.length - 1] - this.frames[0];
    const frameCount = this.frames.length - 1;
    
    return (frameCount / totalTime) * 1000;
  }

  getFPS(): number {
    return this.update();
  }
}

// ===== Random Utilities =====

/**
 * Random number between min and max
 */
export function random(min: number = 0, max: number = 1): number {
  return Math.random() * (max - min) + min;
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random element from array
 */
export function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Random point within a circle
 */
export function randomPointInCircle(center: Point2D, radius: number): Point2D {
  const angle = Math.random() * TWO_PI;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: center.x + Math.cos(angle) * r,
    y: center.y + Math.sin(angle) * r,
  };
}
