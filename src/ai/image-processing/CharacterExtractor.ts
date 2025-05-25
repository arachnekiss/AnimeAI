// 캐릭터 추출: GPT-image-1 기반
import type { CharacterData } from '../../engine/types';

export class CharacterExtractor {
  /**
   * GPT-image-1을 사용하여 유저 이미지에서 캐릭터를 추출합니다.
   * @param userImage 유저가 업로드한 이미지 파일
   * @returns 추출된 캐릭터 데이터
   */
  async extractCharacterFromImage(userImage: File): Promise<CharacterData> {
    try {
      // FormData 생성하여 multipart/form-data로 전송
      const formData = new FormData();
      formData.append('image', userImage);

      // 2. OpenAI GPT-image-1 API 호출
      const response = await fetch('/api/openai/gpt-image-1/character-extract', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API 호출 실패: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      // 3. 결과를 CharacterData로 매핑
      return {
        id: result.id || crypto.randomUUID(),
        name: result.name || 'Extracted Character',
        sourceImage: result.sourceImage || '',
        features: result.features || {},
        meta: result.meta || { extractedAt: new Date().toISOString() }
      };
    } catch (err) {
      // 에러 핸들링 및 로깅
      console.error('CharacterExtractor API error:', err);
      throw err;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
