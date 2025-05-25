// 카메라 기반 표정 미러링 기능 (MediaPipe 기반)
import { FaceMesh } from '@mediapipe/face_mesh';

export class CameraExpressionMirror {
  private videoElement: HTMLVideoElement | null = null;
  private faceMesh: FaceMesh | null = null;
  private animationFrameId: number | null = null;
  private onExpression: (expression: string) => void;

  constructor(onExpression: (expression: string) => void) {
    this.onExpression = onExpression;
  }

  async initialize() {
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);

    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    this.videoElement.srcObject = stream;

    this.faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true });
    this.faceMesh.onResults(this.handleResults);

    this.startDetection();
  }

  private startDetection = () => {
    if (!this.videoElement) return;
    const detect = async () => {
      await this.faceMesh!.send({ image: this.videoElement! });
      this.animationFrameId = requestAnimationFrame(detect);
    };
    detect();
  };

  private handleResults = (results: any) => {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const expression = this.analyzeExpression(results.multiFaceLandmarks[0]);
      this.onExpression(expression);
    }
  };

  private analyzeExpression(landmarks: any): string {
    // 간단 예시: 입꼬리, 눈썹, 눈 크기 등으로 happy/sad/surprised/neutral 추정
    // 실제 구현은 ML 모델 또는 landmark 비율 기반
    // (여기선 happy/neutral만 예시)
    const mouthSmile = landmarks[61].y - landmarks[291].y;
    if (mouthSmile < -0.01) return 'happy';
    return 'neutral';
  }

  stop() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      document.body.removeChild(this.videoElement);
    }
  }
}
