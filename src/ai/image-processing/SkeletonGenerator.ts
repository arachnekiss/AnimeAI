// 스켈레톤 생성: GPT-4.1 nano 기반
import type { Skeleton } from '../../engine/types';

export class SkeletonGenerator {
  /**
   * GPT-4.1 nano를 사용하여 캐릭터 이미지에서 본 구조를 생성합니다.
   * @param characterImage 추출된 캐릭터 이미지 데이터
   * @returns 생성된 스켈레톤 데이터
   */
  async generateSkeleton(characterImage: ImageData): Promise<Skeleton> {
    try {
      // 2. OpenAI GPT-4.1 nano API 호출
      const response = await fetch('/api/openai/gpt-4.1-nano/skeleton-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData: {
            width: characterImage.width,
            height: characterImage.height,
            data: Array.from(characterImage.data)
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API 호출 실패: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        bones: result.bones || [],
        root: result.bones?.[0]?.id || 'root' // 첫 번째 본을 루트로 사용
      };
    } catch (err) {
      console.error('SkeletonGenerator API error:', err);
      throw err;
    }
  }

  private imageDataToBase64(imageData: ImageData): string {
    // 캔버스 활용 임시 변환 (실제 환경에 맞게 보완)
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx?.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }
}
