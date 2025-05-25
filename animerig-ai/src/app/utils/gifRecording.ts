// GIF Recording Utilities for Canvas Animation
export interface GIFRecordingOptions {
  duration: number; // in milliseconds
  frameRate: number; // frames per second
  quality: 'low' | 'medium' | 'high';
  width?: number;
  height?: number;
}

export interface RecordingState {
  isRecording: boolean;
  frames: string[];
  startTime: number;
  frameCount: number;
  progress: number; // 0-100
}

export class CanvasGIFRecorder {
  private canvas: HTMLCanvasElement;
  private options: GIFRecordingOptions;
  private state: RecordingState;
  private intervalId: number | null = null;
  private onProgress?: (progress: number) => void;
  private onComplete?: (gifBlob: Blob) => void;

  constructor(canvas: HTMLCanvasElement, options: GIFRecordingOptions) {
    this.canvas = canvas;
    this.options = {
      frameRate: 30,
      quality: 'medium',
      ...options
    };
    this.state = {
      isRecording: false,
      frames: [],
      startTime: 0,
      frameCount: 0,
      progress: 0
    };
  }

  startRecording(onProgress?: (progress: number) => void, onComplete?: (gifBlob: Blob) => void): void {
    if (this.state.isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    this.onProgress = onProgress;
    this.onComplete = onComplete;
    
    this.state = {
      isRecording: true,
      frames: [],
      startTime: Date.now(),
      frameCount: 0,
      progress: 0
    };

    const frameInterval = 1000 / this.options.frameRate;
    
    this.intervalId = window.setInterval(() => {
      this.captureFrame();
    }, frameInterval);

    // Auto-stop after duration
    setTimeout(() => {
      this.stopRecording();
    }, this.options.duration);

    console.log(`Started GIF recording for ${this.options.duration}ms at ${this.options.frameRate}fps`);
  }

  private captureFrame(): void {
    if (!this.state.isRecording) return;

    try {
      // Capture frame as data URL
      const dataURL = this.canvas.toDataURL('image/png');
      this.state.frames.push(dataURL);
      this.state.frameCount++;

      // Calculate progress
      const elapsed = Date.now() - this.state.startTime;
      this.state.progress = Math.min((elapsed / this.options.duration) * 100, 100);
      
      this.onProgress?.(this.state.progress);

    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  }

  stopRecording(): void {
    if (!this.state.isRecording) return;

    this.state.isRecording = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log(`Recording stopped. Captured ${this.state.frameCount} frames`);
    
    // Process frames into GIF
    this.processFramesToGIF();
  }

  private async processFramesToGIF(): Promise<void> {
    try {
      // For demo purposes, we'll simulate GIF creation
      // In a real implementation, you'd use a library like gif.js
      
      console.log('Processing frames to GIF...');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock GIF blob for demo
      const gifData = this.createMockGIFBlob();
      
      this.onComplete?.(gifData);
      
      console.log('GIF processing completed');
      
    } catch (error) {
      console.error('Error processing GIF:', error);
    }
  }

  private createMockGIFBlob(): Blob {
    // Create a simple canvas with animated content for demo
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width || this.canvas.width;
    canvas.height = this.options.height || this.canvas.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Draw a simple animation frame
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#4CAF50';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GIF Recording Demo', canvas.width / 2, canvas.height / 2);
    ctx.fillText(`${this.state.frameCount} frames captured`, canvas.width / 2, canvas.height / 2 + 40);

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/gif');
    }) as any;
  }

  getState(): RecordingState {
    return { ...this.state };
  }

  isRecording(): boolean {
    return this.state.isRecording;
  }
}

// Utility function to download GIF
export const downloadGIF = (blob: Blob, filename: string = 'character-animation.gif'): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Enhanced GIF recording with Web Workers (for better performance)
export class EnhancedGIFRecorder {
  private canvas: HTMLCanvasElement;
  private worker: Worker | null = null;
  private frames: ImageData[] = [];
  private isRecording = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async startRecording(options: GIFRecordingOptions): Promise<void> {
    if (this.isRecording) return;

    this.isRecording = true;
    this.frames = [];

    // Create worker for GIF processing (would need to implement worker separately)
    // For now, we'll use the simpler approach

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const frameInterval = 1000 / options.frameRate;
    const totalFrames = Math.floor(options.duration / frameInterval);

    for (let i = 0; i < totalFrames; i++) {
      if (!this.isRecording) break;

      // Capture frame
      const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      this.frames.push(imageData);

      await new Promise(resolve => setTimeout(resolve, frameInterval));
    }

    this.isRecording = false;
  }

  stopRecording(): void {
    this.isRecording = false;
  }

  async generateGIF(): Promise<Blob> {
    // Simulate GIF generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock blob
    return new Blob(['mock gif data'], { type: 'image/gif' });
  }
}

// Video recording utility (for MP4 output)
export class CanvasVideoRecorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async startRecording(options: { duration: number }): Promise<void> {
    try {
      const stream = this.canvas.captureStream(30); // 30 FPS
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        this.downloadVideo(blob);
      };

      this.mediaRecorder.start();

      // Auto-stop after duration
      setTimeout(() => {
        this.stopRecording();
      }, options.duration);

    } catch (error) {
      console.error('Video recording not supported:', error);
      throw new Error('Video recording not supported in this browser');
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private downloadVideo(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'character-animation.webm';
    link.click();
    URL.revokeObjectURL(url);
  }
}
