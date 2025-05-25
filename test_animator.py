#!/usr/bin/env python3
"""
Live2DAnimator 테스트 스크립트
MediaPipe 오류 없이 작동하는지 확인
"""

import sys
import os
import numpy as np
import cv2

# 경로 설정
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_live2d_animator():
    print("🧪 Live2DAnimator 테스트 시작...")
    
    try:
        from ai.animation.live2d_animator import Live2DAnimator
        print("✅ Live2DAnimator 클래스 import 성공")
        
        # 애니메이터 초기화
        animator = Live2DAnimator()
        print(f"✅ 애니메이터 초기화 성공 - 백엔드: {animator.get_backend_status()}")
        
        # 테스트 이미지 생성 (더미 이미지)
        test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        print("✅ 테스트 이미지 생성 완료")
        
        # 애니메이션 메시 생성 테스트
        mesh = animator.create_animation_mesh(test_image)
        print("✅ 애니메이션 메시 생성 성공")
        print(f"   - Face points: {len(mesh['regions']['face']['points'])}")
        
        # 애니메이션 적용 테스트
        test_params = {
            'emotion': {'happy': 0.8, 'neutral': 0.2},
            'blink': 0.5,
            'mouth_open': 0.3
        }
        animated = animator.apply_animation(mesh, test_params)
        print("✅ 애니메이션 적용 성공")
        
        print("\n🎉 모든 테스트 통과! Live2DAnimator가 정상 작동합니다.")
        return True
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_live2d_animator()
    sys.exit(0 if success else 1)
