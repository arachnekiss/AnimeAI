#!/usr/bin/env python3
"""
start_animation 메서드 수정 후 GUI 테스트
"""

import sys
import os

# 프로젝트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_gui_startup():
    """GUI 시작과 start_animation 메서드 테스트"""
    print("🧪 Testing GUI startup after start_animation fix...")
    
    try:
        # PyQt6 import 테스트
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import QTimer
        print("✅ PyQt6 import successful")
        
        # 애플리케이션 생성
        app = QApplication([])
        print("✅ QApplication created")
        
        # main.py import 테스트
        from frontend.desktop.main import MainWindow, CharacterViewport
        print("✅ MainWindow import successful")
        
        # CharacterViewport의 start_animation 메서드 확인
        viewport = CharacterViewport()
        if hasattr(viewport, 'start_animation'):
            print("✅ start_animation method exists")
            
            # 메서드 호출 테스트
            viewport.start_animation()
            print("✅ start_animation method executed successfully")
            
            # 애니메이션 상태 확인
            print(f"   - is_animating: {viewport.is_animating}")
            print(f"   - animation_frame: {viewport.animation_frame}")
        else:
            print("❌ start_animation method not found")
            return False
        
        # MainWindow 생성 테스트
        window = MainWindow()
        print("✅ MainWindow created successfully")
        
        # viewport의 start_animation 메서드 확인
        if hasattr(window.viewport, 'start_animation'):
            print("✅ MainWindow.viewport.start_animation exists")
        else:
            print("❌ MainWindow.viewport.start_animation not found")
            return False
        
        # 윈도우 표시 (짧은 시간만)
        window.show()
        print("✅ Window displayed")
        
        # 2초 후 자동 종료
        QTimer.singleShot(2000, app.quit)
        
        # 이벤트 루프 실행 (2초간)
        app.exec()
        print("✅ GUI event loop completed")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_character_data_flow():
    """캐릭터 데이터 플로우 테스트"""
    print("\n🧪 Testing character data flow...")
    
    try:
        from frontend.desktop.main import CharacterViewport
        from ai.animation.live2d_animator import Live2DAnimator
        
        # 더미 캐릭터 데이터 생성
        dummy_character_data = {
            'rig': {'regions': {'face': {'points': []}}},
            'image_path': None
        }
        
        viewport = CharacterViewport()
        print("✅ CharacterViewport created")
        
        # set_character_data 테스트
        viewport.set_character_data(dummy_character_data)
        print("✅ set_character_data executed")
        
        # start_animation 테스트
        viewport.start_animation()
        print("✅ start_animation executed after set_character_data")
        
        return True
        
    except Exception as e:
        print(f"❌ Character data flow test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """메인 테스트 함수"""
    print("🎭 AnimeRig AI - start_animation Fix Test")
    print("=" * 50)
    
    # 테스트 실행
    test1_success = test_gui_startup()
    test2_success = test_character_data_flow()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"   - GUI Startup Test: {'✅ PASSED' if test1_success else '❌ FAILED'}")
    print(f"   - Character Data Flow Test: {'✅ PASSED' if test2_success else '❌ FAILED'}")
    
    if test1_success and test2_success:
        print("\n🎉 All tests passed! start_animation fix is working.")
        print("✅ GUI should now load without AttributeError crashes.")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
    
    return test1_success and test2_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
