// 멀티뷰 생성: GPT-image-1 기반
import type { ViewLayers } from '../../engine/types';

export class MultiViewGenerator {
  /**
   * GPT-image-1을 사용하여 다양한 각도의 캐릭터 뷰를 생성합니다.
   * @param baseImage 기준 캐릭터 이미지 데이터
   * @returns 각도별 뷰 레이어 데이터
   */
  async generateRotationViews(baseImage: ImageData): Promise<ViewLayers> {
    try {
      // OpenAI GPT-image-1 API 호출
      const response = await fetch('/api/openai/gpt-image-1/multiview-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: {
            width: baseImage.width,
            height: baseImage.height,
            data: Array.from(baseImage.data)
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API 호출 실패: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        angles: result.angles || ['front', 'side', 'back'],
        layers: result.layers || {
          front: 'placeholder-front',
          side: 'placeholder-side', 
          back: 'placeholder-back'
        }
      };
    } catch (err) {
      console.error('MultiViewGenerator API error:', err);
      throw err;
    }
  }

  private imageDataToBase64(imageData: ImageData): string {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }
}
