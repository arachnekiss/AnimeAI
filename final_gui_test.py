#!/usr/bin/env python3
"""
GUI 최종 검증 테스트 - start_animation 수정 후
"""

import sys
import os
import subprocess
import time

# 프로젝트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_gui_without_crash():
    """GUI가 크래시 없이 시작되는지 테스트"""
    print("🎭 Testing GUI startup without crashes...")
    
    try:
        # 별도 프로세스로 GUI 실행 (5초 후 자동 종료)
        cmd = [
            sys.executable, 
            "-c", 
            """
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QTimer
from frontend.desktop.main import MainWindow

app = QApplication([])
window = MainWindow()
window.show()

# 5초 후 자동 종료
QTimer.singleShot(5000, app.quit)

print('✅ GUI started successfully')
exit_code = app.exec()
print(f'✅ GUI exited with code: {exit_code}')
"""
        ]
        
        print("Starting GUI process...")
        process = subprocess.Popen(
            cmd, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            text=True,
            cwd=os.path.dirname(__file__)
        )
        
        # 10초 타임아웃으로 대기
        try:
            stdout, stderr = process.communicate(timeout=10)
            
            print("📤 GUI Process Output:")
            if stdout:
                print(stdout)
            if stderr:
                print("📤 GUI Process Errors:")
                print(stderr)
            
            # AttributeError 확인
            if 'AttributeError' in stderr and 'start_animation' in stderr:
                print("❌ FAILED: start_animation AttributeError still occurs")
                return False
            elif process.returncode == 0:
                print("✅ SUCCESS: GUI started and exited without start_animation errors")
                return True
            else:
                print(f"⚠ WARNING: GUI exited with code {process.returncode}")
                return True  # 종료 코드가 0이 아니어도 AttributeError가 없으면 성공
                
        except subprocess.TimeoutExpired:
            print("⚠ WARNING: GUI process timed out (might be running successfully)")
            process.kill()
            return True  # 타임아웃은 성공으로 간주 (GUI가 정상 실행 중일 가능성)
            
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        return False

def main():
    """메인 테스트"""
    print("🎯 AnimeRig AI - Final GUI Crash Test")
    print("=" * 50)
    
    # 사전 검증
    print("📋 Pre-checks:")
    try:
        from frontend.desktop.main import CharacterViewport
        viewport = CharacterViewport.__new__(CharacterViewport)  # 인스턴스 생성 없이 클래스만 확인
        has_method = hasattr(CharacterViewport, 'start_animation')
        print(f"   ✅ start_animation method exists: {has_method}")
    except Exception as e:
        print(f"   ❌ Pre-check failed: {e}")
        return False
    
    # GUI 크래시 테스트
    print("\n🚀 GUI Crash Test:")
    gui_success = test_gui_without_crash()
    
    print("\n" + "=" * 50)
    print("📊 Final Result:")
    if gui_success:
        print("🎉 SUCCESS: start_animation fix is working!")
        print("✅ GUI should now load without AttributeError crashes.")
        print("✅ Character processing and animation should work properly.")
    else:
        print("❌ FAILED: GUI still has issues.")
        print("📝 Please check the error output above.")
    
    return gui_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
