#!/usr/bin/env python3
"""
start_animation 수정 후 간단한 GUI 검증 테스트
"""

import sys
import os

# 프로젝트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def quick_test():
    """빠른 start_animation 테스트"""
    print("🎭 Quick start_animation Test")
    
    try:
        # QApplication이 필요한 부분은 제외하고 클래스만 테스트
        from frontend.desktop.main import CharacterViewport
        
        # CharacterViewport 클래스 자체는 QApplication 없이도 import 가능
        # 메서드 존재 확인
        methods = dir(CharacterViewport)
        
        has_start_animation = 'start_animation' in methods
        has_is_animating = any('is_animating' in str(attr) for attr in CharacterViewport.__init__.__code__.co_names) if hasattr(CharacterViewport.__init__, '__code__') else False
        
        print(f"✅ CharacterViewport imported successfully")
        print(f"✅ start_animation method exists: {has_start_animation}")
        
        # 소스 코드에서 직접 확인
        import inspect
        source = inspect.getsource(CharacterViewport)
        
        has_start_animation_def = 'def start_animation(self):' in source
        has_is_animating_init = 'self.is_animating = False' in source
        has_animation_frame_init = 'self.animation_frame = 0' in source
        
        print(f"✅ start_animation method definition found: {has_start_animation_def}")
        print(f"✅ is_animating attribute initialization found: {has_is_animating_init}")
        print(f"✅ animation_frame attribute initialization found: {has_animation_frame_init}")
        
        if has_start_animation_def and has_is_animating_init and has_animation_frame_init:
            print("\n🎉 SUCCESS: All required components for start_animation are present!")
            print("✅ The AttributeError should be resolved.")
            
            # 에러가 발생했던 라인 734 관련 확인
            from frontend.desktop.main import MainWindow
            main_source = inspect.getsource(MainWindow)
            
            if 'self.viewport.start_animation()' in main_source:
                print("✅ MainWindow calls viewport.start_animation() correctly")
            
            return True
        else:
            print("\n❌ FAILURE: Some required components are missing")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = quick_test()
    print(f"\n📊 Test Result: {'✅ PASSED' if success else '❌ FAILED'}")
    sys.exit(0 if success else 1)
