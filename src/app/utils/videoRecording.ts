// Video recording utilities for the demo
export interface VideoRecordingOptions {
  duration?: number; // Duration in seconds
  fps?: number; // Frames per second
  quality?: number; // Quality from 0.1 to 1.0
}

export interface VideoRecordingProgress {
  currentFrame: number;
  totalFrames: number;
  progress: number; // 0-1
  isRecording: boolean;
  timeElapsed: number;
}

export class VideoRecorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private startTime = 0;
  private onProgress?: (progress: VideoRecordingProgress) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async startRecording(
    options: VideoRecordingOptions = {},
    onProgress?: (progress: VideoRecordingProgress) => void
  ): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    const {
      duration = 5, // Default 5 seconds
      fps = 30,
      quality = 0.8
    } = options;

    this.onProgress = onProgress;
    this.chunks = [];
    this.isRecording = true;
    this.startTime = Date.now();

    try {
      // Create media stream from canvas
      this.stream = this.canvas.captureStream(fps);
      
      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        videoBitsPerSecond: 2500000 * quality // Adjust bitrate based on quality
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishRecording();
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms

      // Progress tracking
      const totalFrames = Math.ceil(duration * fps);
      let currentFrame = 0;

      const progressInterval = setInterval(() => {
        if (!this.isRecording) {
          clearInterval(progressInterval);
          return;
        }

        const timeElapsed = (Date.now() - this.startTime) / 1000;
        currentFrame = Math.floor(timeElapsed * fps);
        const progress = Math.min(timeElapsed / duration, 1);

        if (this.onProgress) {
          this.onProgress({
            currentFrame,
            totalFrames,
            progress,
            isRecording: this.isRecording,
            timeElapsed
          });
        }

        // Auto-stop after duration
        if (timeElapsed >= duration) {
          this.stopRecording();
          clearInterval(progressInterval);
        }
      }, 1000 / fps);

    } catch (error) {
      this.isRecording = false;
      throw new Error(`Failed to start video recording: ${error}`);
    }
  }

  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    this.isRecording = false;
    this.mediaRecorder.stop();

    // Stop all tracks in the stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  private finishRecording(): void {
    if (this.chunks.length === 0) {
      console.warn('No video data recorded');
      return;
    }

    const mimeType = this.getSupportedMimeType();
    const blob = new Blob(this.chunks, { type: mimeType });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-animation-${Date.now()}.${this.getFileExtension(mimeType)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
    this.chunks = [];

    console.log('Video recording completed and downloaded');
  }

  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4;codecs=h264',
      'video/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback
    return 'video/webm';
  }

  private getFileExtension(mimeType: string): string {
    if (mimeType.includes('mp4')) {
      return 'mp4';
    }
    return 'webm';
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

// Utility function to create and start video recording
export async function recordCanvasVideo(
  canvas: HTMLCanvasElement,
  options: VideoRecordingOptions = {},
  onProgress?: (progress: VideoRecordingProgress) => void
): Promise<VideoRecorder> {
  const recorder = new VideoRecorder(canvas);
  await recorder.startRecording(options, onProgress);
  return recorder;
}

// Check if video recording is supported
export function isVideoRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && 
         typeof HTMLCanvasElement.prototype.captureStream === 'function';
}
