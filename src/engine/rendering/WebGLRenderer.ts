/**
 * WebGL Renderer - GPU-accelerated renderer for character animation
 * This class handles WebGL rendering with optimizations for character animation
 */

import {
  RenderContext,
  Texture,
  CharacterMesh,
  Bone,
  RenderLayer,
  PerformanceMetrics,
  Point2D
} from '../types';
import { Matrix4, Vector2, Vector3 } from 'three';

/**
 * Shader program information
 */
interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
  attributes: Record<string, number>;
}

/**
 * Vertex buffer object
 */
interface VertexBuffer {
  buffer: WebGLBuffer;
  size: number;
  type: number;
  normalized: boolean;
}

/**
 * Render batch for optimization
 */
interface RenderBatch {
  texture: Texture;
  vertices: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

/**
 * WebGL Renderer configuration
 */
interface WebGLRendererConfig {
  enableMultisampling: boolean;
  maxTextureSize: number;
  maxBoneCount: number;
  enableDebug: boolean;
  premultipliedAlpha: boolean;
  preserveDrawingBuffer: boolean;
}

/**
 * Default WebGL renderer configuration
 */
const DEFAULT_CONFIG: WebGLRendererConfig = {
  enableMultisampling: true,
  maxTextureSize: 2048,
  maxBoneCount: 64,
  enableDebug: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
};

/**
 * Vertex shader source for character rendering
 */
const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_boneIndices;
attribute vec4 a_boneWeights;

uniform mat4 u_projectionMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_modelMatrix;
uniform mat4 u_boneMatrices[64];

varying vec2 v_texCoord;
varying vec3 v_worldPosition;

void main() {
    // Apply bone transformations
    mat4 boneMatrix = 
        u_boneMatrices[int(a_boneIndices.x)] * a_boneWeights.x +
        u_boneMatrices[int(a_boneIndices.y)] * a_boneWeights.y +
        u_boneMatrices[int(a_boneIndices.z)] * a_boneWeights.z +
        u_boneMatrices[int(a_boneIndices.w)] * a_boneWeights.w;
    
    vec4 worldPosition = u_modelMatrix * boneMatrix * vec4(a_position, 0.0, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_texCoord = a_texCoord;
    
    gl_Position = u_projectionMatrix * u_viewMatrix * worldPosition;
}
`;

/**
 * Fragment shader source for character rendering
 */
const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

uniform sampler2D u_texture;
uniform vec4 u_tint;
uniform float u_opacity;
uniform vec2 u_textureOffset;
uniform vec2 u_textureScale;

varying vec2 v_texCoord;
varying vec3 v_worldPosition;

void main() {
    vec2 texCoord = v_texCoord * u_textureScale + u_textureOffset;
    vec4 texColor = texture2D(u_texture, texCoord);
    
    // Apply tint and opacity
    vec3 finalColor = mix(texColor.rgb, u_tint.rgb, u_tint.a);
    float finalAlpha = texColor.a * u_opacity;
    
    gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * WebGL Renderer class for character animation
 */
export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private config: WebGLRendererConfig;
  private shaderProgram?: ShaderProgram;
  private vertexBuffer?: WebGLBuffer;
  private indexBuffer?: WebGLBuffer;
  private textures: Map<string, WebGLTexture> = new Map();
  private frameBuffer?: WebGLFramebuffer;
  private renderTexture?: WebGLTexture;
  private depthBuffer?: WebGLRenderbuffer;
  private projectionMatrix: Matrix4 = new Matrix4();
  private viewMatrix: Matrix4 = new Matrix4();
  private modelMatrix: Matrix4 = new Matrix4();
  private boneMatrices: Matrix4[] = [];
  private renderBatches: RenderBatch[] = [];
  private performanceMetrics: PerformanceMetrics;
  
  constructor(canvas: HTMLCanvasElement, config: Partial<WebGLRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Get WebGL context
    const gl = canvas.getContext('webgl2', {
      antialias: this.config.enableMultisampling,
      alpha: true,
      premultipliedAlpha: this.config.premultipliedAlpha,
      preserveDrawingBuffer: this.config.preserveDrawingBuffer,
    });
    
    if (!gl) {
      throw new Error('WebGL 2.0 not supported');
    }
    
    this.gl = gl;
    this.performanceMetrics = {
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      triangleCount: 0,
      drawCalls: 0,
    };
    
    this.initialize();
  }

  /**
   * Initialize WebGL renderer
   */
  private initialize(): void {
    const gl = this.gl;
    
    // Enable features
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Set clear color
    gl.clearColor(0, 0, 0, 0);
    
    // Initialize shaders
    this.initializeShaders();
    
    // Initialize buffers
    this.initializeBuffers();
    
    // Initialize bone matrices
    for (let i = 0; i < this.config.maxBoneCount; i++) {
      this.boneMatrices.push(new Matrix4());
    }
    
    // Set up viewport
    this.resize(gl.canvas.width, gl.canvas.height);
    
    if (this.config.enableDebug) {
      console.log('WebGL Renderer initialized');
      console.log('GL Version:', gl.getParameter(gl.VERSION));
      console.log('GL Vendor:', gl.getParameter(gl.VENDOR));
      console.log('GL Renderer:', gl.getParameter(gl.RENDERER));
    }
  }

  /**
   * Initialize shader programs
   */
  private initializeShaders(): void {
    const gl = this.gl;
    
    // Create vertex shader
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    if (!vertexShader) throw new Error('Failed to create vertex shader');
    
    // Create fragment shader
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!fragmentShader) throw new Error('Failed to create fragment shader');
    
    // Create program
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create shader program');
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link error: ${error}`);
    }
    
    // Get uniform and attribute locations
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const attributes: Record<string, number> = {};
    
    // Uniforms
    const uniformNames = [
      'u_projectionMatrix', 'u_viewMatrix', 'u_modelMatrix', 'u_boneMatrices',
      'u_texture', 'u_tint', 'u_opacity', 'u_textureOffset', 'u_textureScale'
    ];
    
    uniformNames.forEach(name => {
      const location = gl.getUniformLocation(program, name);
      if (location) uniforms[name] = location;
    });
    
    // Attributes
    const attributeNames = ['a_position', 'a_texCoord', 'a_boneIndices', 'a_boneWeights'];
    
    attributeNames.forEach(name => {
      const location = gl.getAttribLocation(program, name);
      if (location >= 0) attributes[name] = location;
    });
    
    this.shaderProgram = { program, uniforms, attributes };
    
    // Clean up shaders
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  }

  /**
   * Create a shader
   */
  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${error}`);
    }
    
    return shader;
  }

  /**
   * Initialize vertex and index buffers
   */
  private initializeBuffers(): void {
    const gl = this.gl;
    
    // Create vertex buffer
    this.vertexBuffer = gl.createBuffer();
    if (!this.vertexBuffer) throw new Error('Failed to create vertex buffer');
    
    // Create index buffer
    this.indexBuffer = gl.createBuffer();
    if (!this.indexBuffer) throw new Error('Failed to create index buffer');
  }

  /**
   * Resize renderer
   */
  resize(width: number, height: number): void {
    const gl = this.gl;
    
    gl.viewport(0, 0, width, height);
    
    // Update projection matrix
    this.projectionMatrix.makeOrthographic(0, width, height, 0, -1000, 1000);
    
    // Update canvas size
    gl.canvas.width = width;
    gl.canvas.height = height;
  }

  /**
   * Create texture from image
   */
  createTexture(id: string, image: HTMLImageElement | ImageBitmap): Texture {
    const gl = this.gl;
    const texture = gl.createTexture();
    
    if (!texture) throw new Error('Failed to create WebGL texture');
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Generate mipmaps if power of 2
    if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    
    this.textures.set(id, texture);
    
    const textureData: Texture = {
      id,
      image,
      width: image.width,
      height: image.height,
      format: 'rgba',
      wrapS: 'clamp',
      wrapT: 'clamp',
      minFilter: 'linear',
      magFilter: 'linear',
    };
    
    return textureData;
  }

  /**
   * Check if number is power of 2
   */
  private isPowerOf2(value: number): boolean {
    return (value & (value - 1)) === 0;
  }

  /**
   * Render character mesh
   */
  renderMesh(
    mesh: CharacterMesh,
    bones: Bone[],
    texture: Texture,
    transform?: {
      position?: Point2D;
      rotation?: number;
      scale?: Point2D;
      opacity?: number;
      tint?: { r: number; g: number; b: number; a: number };
    }
  ): void {
    const startTime = performance.now();
    
    if (!this.shaderProgram) return;
    
    const gl = this.gl;
    const program = this.shaderProgram;
    
    gl.useProgram(program.program);
    
    // Update bone matrices
    this.updateBoneMatrices(bones);
    
    // Update model matrix
    this.updateModelMatrix(transform);
    
    // Set uniforms
    this.setUniforms(texture, transform);
    
    // Prepare vertex data
    const vertexData = this.prepareVertexData(mesh);
    
    // Upload vertex data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer!);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData.vertices, gl.DYNAMIC_DRAW);
    
    // Upload index data
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer!);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertexData.indices, gl.DYNAMIC_DRAW);
    
    // Set up vertex attributes
    this.setupVertexAttributes();
    
    // Bind texture
    const webglTexture = this.textures.get(texture.id);
    if (webglTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, webglTexture);
      gl.uniform1i(program.uniforms.u_texture, 0);
    }
    
    // Draw
    gl.drawElements(gl.TRIANGLES, vertexData.indexCount, gl.UNSIGNED_SHORT, 0);
    
    // Update performance metrics
    this.performanceMetrics.drawCalls++;
    this.performanceMetrics.triangleCount += vertexData.indexCount / 3;
    this.performanceMetrics.renderTime += performance.now() - startTime;
  }

  /**
   * Update bone matrices for skeletal animation
   */
  private updateBoneMatrices(bones: Bone[]): void {
    const gl = this.gl;
    const program = this.shaderProgram!;
    
    // Reset all matrices to identity
    this.boneMatrices.forEach(matrix => matrix.identity());
    
    // Update matrices for each bone
    bones.forEach((bone, index) => {
      if (index >= this.config.maxBoneCount) return;
      
      const matrix = this.boneMatrices[index];
      matrix.makeTranslation(bone.position.x, bone.position.y, 0);
      matrix.multiply(new Matrix4().makeRotationZ(bone.rotation));
      matrix.multiply(new Matrix4().makeScale(bone.scale.x, bone.scale.y, 1));
    });
    
    // Upload bone matrices to GPU
    const matrixArray = new Float32Array(this.config.maxBoneCount * 16);
    this.boneMatrices.forEach((matrix, index) => {
      matrix.toArray(matrixArray, index * 16);
    });
    
    gl.uniformMatrix4fv(program.uniforms.u_boneMatrices, false, matrixArray);
  }

  /**
   * Update model matrix
   */
  private updateModelMatrix(transform?: any): void {
    const gl = this.gl;
    const program = this.shaderProgram!;
    
    this.modelMatrix.identity();
    
    if (transform) {
      if (transform.position) {
        this.modelMatrix.multiply(
          new Matrix4().makeTranslation(transform.position.x, transform.position.y, 0)
        );
      }
      if (transform.rotation) {
        this.modelMatrix.multiply(new Matrix4().makeRotationZ(transform.rotation));
      }
      if (transform.scale) {
        this.modelMatrix.multiply(new Matrix4().makeScale(transform.scale.x, transform.scale.y, 1));
      }
    }
    
    gl.uniformMatrix4fv(program.uniforms.u_projectionMatrix, false, this.projectionMatrix.elements);
    gl.uniformMatrix4fv(program.uniforms.u_viewMatrix, false, this.viewMatrix.elements);
    gl.uniformMatrix4fv(program.uniforms.u_modelMatrix, false, this.modelMatrix.elements);
  }

  /**
   * Set shader uniforms
   */
  private setUniforms(texture: Texture, transform?: any): void {
    const gl = this.gl;
    const program = this.shaderProgram!;
    
    // Set material properties
    const opacity = transform?.opacity ?? 1.0;
    const tint = transform?.tint ?? { r: 1, g: 1, b: 1, a: 0 };
    
    gl.uniform1f(program.uniforms.u_opacity, opacity);
    gl.uniform4f(program.uniforms.u_tint, tint.r, tint.g, tint.b, tint.a);
    gl.uniform2f(program.uniforms.u_textureOffset, 0, 0);
    gl.uniform2f(program.uniforms.u_textureScale, 1, 1);
  }

  /**
   * Prepare vertex data for rendering
   */
  private prepareVertexData(mesh: CharacterMesh): {
    vertices: Float32Array;
    indices: Uint16Array;
    indexCount: number;
  } {
    const vertices = mesh.vertices;
    const faces = mesh.faces;
    
    // Vertex format: [x, y, u, v, boneIndex0, boneIndex1, boneIndex2, boneIndex3, weight0, weight1, weight2, weight3]
    const vertexSize = 12;
    const vertexData = new Float32Array(vertices.length * vertexSize);
    
    vertices.forEach((vertex, index) => {
      const offset = index * vertexSize;
      
      // Position
      vertexData[offset + 0] = vertex.position.x;
      vertexData[offset + 1] = vertex.position.y;
      
      // Texture coordinates
      vertexData[offset + 2] = vertex.uv.x;
      vertexData[offset + 3] = vertex.uv.y;
      
      // Bone indices and weights
      for (let i = 0; i < 4; i++) {
        if (i < vertex.boneWeights.length) {
          const boneWeight = vertex.boneWeights[i];
          const boneIndex = parseInt(boneWeight.boneId.replace('bone_', ''), 10) || 0;
          vertexData[offset + 4 + i] = boneIndex;
          vertexData[offset + 8 + i] = boneWeight.weight;
        } else {
          vertexData[offset + 4 + i] = 0;
          vertexData[offset + 8 + i] = 0;
        }
      }
    });
    
    // Prepare index data
    const indexData = new Uint16Array(faces.length * 3);
    faces.forEach((face, index) => {
      const offset = index * 3;
      indexData[offset + 0] = face.vertices[0];
      indexData[offset + 1] = face.vertices[1];
      indexData[offset + 2] = face.vertices[2];
    });
    
    return {
      vertices: vertexData,
      indices: indexData,
      indexCount: indexData.length,
    };
  }

  /**
   * Setup vertex attributes
   */
  private setupVertexAttributes(): void {
    const gl = this.gl;
    const program = this.shaderProgram!;
    const vertexSize = 12 * 4; // 12 floats * 4 bytes per float
    
    // Position attribute
    if (program.attributes.a_position >= 0) {
      gl.enableVertexAttribArray(program.attributes.a_position);
      gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, vertexSize, 0);
    }
    
    // Texture coordinate attribute
    if (program.attributes.a_texCoord >= 0) {
      gl.enableVertexAttribArray(program.attributes.a_texCoord);
      gl.vertexAttribPointer(program.attributes.a_texCoord, 2, gl.FLOAT, false, vertexSize, 8);
    }
    
    // Bone indices attribute
    if (program.attributes.a_boneIndices >= 0) {
      gl.enableVertexAttribArray(program.attributes.a_boneIndices);
      gl.vertexAttribPointer(program.attributes.a_boneIndices, 4, gl.FLOAT, false, vertexSize, 16);
    }
    
    // Bone weights attribute
    if (program.attributes.a_boneWeights >= 0) {
      gl.enableVertexAttribArray(program.attributes.a_boneWeights);
      gl.vertexAttribPointer(program.attributes.a_boneWeights, 4, gl.FLOAT, false, vertexSize, 32);
    }
  }

  /**
   * Clear the render target
   */
  clear(r: number = 0, g: number = 0, b: number = 0, a: number = 0): void {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Reset performance counters for this frame
    this.performanceMetrics.drawCalls = 0;
    this.performanceMetrics.triangleCount = 0;
    this.performanceMetrics.renderTime = 0;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Dispose of WebGL resources
   */
  dispose(): void {
    const gl = this.gl;
    
    // Delete textures
    this.textures.forEach(texture => gl.deleteTexture(texture));
    this.textures.clear();
    
    // Delete buffers
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    
    // Delete shader program
    if (this.shaderProgram) {
      gl.deleteProgram(this.shaderProgram.program);
    }
    
    // Delete framebuffer objects
    if (this.frameBuffer) gl.deleteFramebuffer(this.frameBuffer);
    if (this.renderTexture) gl.deleteTexture(this.renderTexture);
    if (this.depthBuffer) gl.deleteRenderbuffer(this.depthBuffer);
  }
}
