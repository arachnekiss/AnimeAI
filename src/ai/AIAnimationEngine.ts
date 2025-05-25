// AIAnimationEngine: 자동 캐릭터 추출/리깅 파이프라인 통합
import { CharacterExtractor } from './image-processing/CharacterExtractor';
import { SkeletonGenerator } from './image-processing/SkeletonGenerator';
import { MultiViewGenerator } from './image-processing/MultiViewGenerator';
import { AutoRigger } from './image-processing/AutoRigger';
import type { CharacterData, Skeleton, ViewLayers, RiggedCharacter, AnimatedCharacter } from '../engine/types';

export class AIAnimationEngine {
  private extractor = new CharacterExtractor();
  private skeletonGen = new SkeletonGenerator();
  private viewGen = new MultiViewGenerator();
  private rigger = new AutoRigger();

  /**
   * 유저 이미지로부터 애니메이션 가능한 캐릭터를 자동 생성
   */
  async processUserImage(userImage: File): Promise<AnimatedCharacter> {
    // 1. 캐릭터 추출
    const character: CharacterData = await this.extractor.extractCharacterFromImage(userImage);
    // 2. 스켈레톤 생성
    const img = await this.loadImageData(character.sourceImage);
    const skeleton: Skeleton = await this.skeletonGen.generateSkeleton(img);
    // 3. 멀티뷰 생성
    const views: ViewLayers = await this.viewGen.generateRotationViews(img);
    // 4. 자동 리깅
    const rigged: RiggedCharacter = await this.rigger.rigCharacter(skeleton, views);
    // 5. 최종 애니메이션 캐릭터 객체 생성
    return {
      id: character.id,
      rigged,
      viewLayers: views,
      meta: character.meta
    };
  }

  private async loadImageData(dataUrl: string): Promise<ImageData> {
    // base64 → ImageData 변환 (브라우저 환경)
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, img.width, img.height);
        if (imageData) resolve(imageData);
        else reject(new Error('ImageData 변환 실패'));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
}
