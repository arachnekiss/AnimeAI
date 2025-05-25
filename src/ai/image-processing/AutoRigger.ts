// 자동 리깅: AI 기반
import type { Skeleton, ViewLayers, RiggedCharacter } from '../../engine/types';

export class AutoRigger {
  /**
   * AI 기반 자동 리깅 시스템
   * @param skeleton 생성된 스켈레톤
   * @param views 멀티뷰 레이어
   * @returns 리깅된 캐릭터 데이터
   */
  async rigCharacter(skeleton: Skeleton, views: ViewLayers): Promise<RiggedCharacter> {
    try {
      // AI 기반 리깅 API 호출
      const response = await fetch('/api/openai/ai-rigger/rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skeleton, viewLayers: views })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Rigger API 호출 실패: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      return {
        mesh: result.character?.riggedMesh || { vertices: [], faces: [], weights: [] },
        skeleton: result.character?.skeleton || skeleton,
        blendShapes: result.character?.blendShapes || [],
        constraints: result.character?.constraints || []
      };
    } catch (err) {
      console.error('AutoRigger API error:', err);
      throw err;
    }
  }
}
