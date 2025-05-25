#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
수정사항 검증 스크립트 - 터미널 없이 코드 검증
"""

import sys
import os

# 프로젝트 루트 추가
project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'animerig-ai')
sys.path.insert(0, project_root)

def test_character_processor_fixes():
    """CharacterProcessor 수정사항 테스트"""
    print("🧪 CharacterProcessor 수정사항 검증...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        processor = CharacterProcessor()
        print("  ✅ CharacterProcessor 초기화 성공")
        
        # None features로 테스트
        print("  🔍 None features 테스트...")
        result = processor.generate_3d_model(None)
        
        if result and 'vertices' in result:
            print(f"  ✅ None features 처리 성공: {len(result['vertices'])} vertices")
        else:
            print("  ❌ None features 처리 실패")
            return False
        
        # 빈 딕셔너리로 테스트
        print("  🔍 빈 features 테스트...")
        result2 = processor.generate_3d_model({})
        
        if result2 and 'vertices' in result2:
            print(f"  ✅ 빈 features 처리 성공: {len(result2['vertices'])} vertices")
        else:
            print("  ❌ 빈 features 처리 실패")
            return False
        
        print("  ✅ CharacterProcessor 수정사항 검증 완료!")
        return True
        
    except Exception as e:
        print(f"  ❌ CharacterProcessor 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_unicode_fixes():
    """Unicode 수정사항 테스트"""
    print("\n📝 Unicode 수정사항 검증...")
    
    try:
        # main.py 파일 읽기
        main_file = os.path.join('animerig-ai', 'frontend', 'desktop', 'main.py')
        
        with open(main_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Unicode 문자 확인
        if '\u2713' in content:
            print("  ❌ Unicode 체크마크 \\u2713 여전히 존재")
            return False
        elif '✓' in content:
            print("  ❌ Unicode 체크마크 ✓ 여전히 존재")
            return False
        else:
            print("  ✅ Unicode 문자 제거 확인")
        
        # [OK] 패턴 확인
        ok_count = content.count('[OK]')
        if ok_count > 0:
            print(f"  ✅ [OK] 패턴 {ok_count}개 발견 - 대체 완료")
        else:
            print("  ⚠️ [OK] 패턴 없음 - 확인 필요")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Unicode 테스트 실패: {e}")
        return False

def test_character_rendering():
    """캐릭터 렌더링 개선사항 테스트"""
    print("\n🎨 캐릭터 렌더링 개선사항 검증...")
    
    try:
        # main.py에서 캐릭터 렌더링 관련 메소드 확인
        main_file = os.path.join('animerig-ai', 'frontend', 'desktop', 'main.py')
        
        with open(main_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 개선된 렌더링 메소드 확인
        if 'render_character_silhouette' in content:
            print("  ✅ render_character_silhouette 메소드 존재")
        else:
            print("  ❌ render_character_silhouette 메소드 없음")
            return False
        
        if 'render_3d_model' in content:
            print("  ✅ render_3d_model 메소드 존재")
        else:
            print("  ❌ render_3d_model 메소드 없음")
            return False
        
        if 'draw_circle' in content:
            print("  ✅ draw_circle 메소드 존재 (얼굴 그리기용)")
        else:
            print("  ❌ draw_circle 메소드 없음")
            return False
        
        print("  ✅ 캐릭터 렌더링 개선사항 확인 완료!")
        return True
        
    except Exception as e:
        print(f"  ❌ 캐릭터 렌더링 테스트 실패: {e}")
        return False

def main():
    """메인 검증 함수"""
    print("🔍 AnimeRig AI 수정사항 종합 검증")
    print("=" * 50)
    
    # 작업 디렉토리 설정
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    results = []
    
    # 각 테스트 실행
    results.append(test_unicode_fixes())
    results.append(test_character_processor_fixes())
    results.append(test_character_rendering())
    
    # 결과 요약
    print("\n" + "=" * 50)
    print("📊 검증 결과 요약:")
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ 모든 테스트 통과! ({passed}/{total})")
        print("\n🎉 수정사항이 모두 정상적으로 적용되었습니다!")
        print("\n다음 단계:")
        print("1. GUI를 실행하여 실제 동작 확인")
        print("2. 갈색 블록 대신 캐릭터 실루엣 렌더링 확인")
        print("3. 에러 없이 기본 캐릭터 로드 확인")
        return True
    else:
        print(f"❌ 일부 테스트 실패 ({passed}/{total})")
        return False

if __name__ == "__main__":
    success = main()
    print(f"\n검증 완료 - {'성공' if success else '실패'}")
