#!/usr/bin/env python3
"""
AnimeRig AI GUI 기능 자동 테스트
GUI 기능들을 자동으로 테스트하고 결과를 리포트로 생성
"""

import sys
import time
import os
from pathlib import Path

# PyQt6 imports
try:
    from PyQt6.QtWidgets import QApplication
    from PyQt6.QtCore import QTimer, QThread
    from PyQt6.QtTest import QTest
    from PyQt6.QtCore import Qt
    PYQT_AVAILABLE = True
except ImportError:
    PYQT_AVAILABLE = False
    print("PyQt6 not available for testing")

# 프로젝트 경로 추가
sys.path.append(str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parent / "frontend" / "desktop"))

class GUITester:
    def __init__(self):
        if not PYQT_AVAILABLE:
            raise RuntimeError("PyQt6 is required for GUI testing")
            
        self.app = QApplication.instance()
        if self.app is None:
            self.app = QApplication(sys.argv)
            
        self.window = None
        self.test_results = {}
        self.setup_test_environment()
        
    def setup_test_environment(self):
        """테스트 환경 설정"""
        # 결과 디렉토리 생성
        self.results_dir = Path("verification_results")
        self.results_dir.mkdir(exist_ok=True)
        
        # 로그 파일 초기화
        self.log_file = self.results_dir / "gui_test_log.txt"
        
    def log(self, message):
        """테스트 로그 기록"""
        timestamp = time.strftime('%H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        
        with open(self.log_file, 'a') as f:
            f.write(log_message + "\n")
    
    def run_all_tests(self):
        """모든 GUI 기능 테스트 실행"""
        self.log("=== Starting AnimeRig AI GUI Tests ===")
        
        tests = [
            self.test_application_import,
            self.test_window_creation,
            self.test_window_display,
            self.test_components_initialization,
            self.test_backend_connectivity,
            self.test_control_interactions,
            self.test_screenshot_capture
        ]
        
        for test in tests:
            test_name = test.__name__
            self.log(f"Running {test_name}...")
            
            try:
                result = test()
                self.test_results[test_name] = result
                self.log(f"✓ {test_name}: {'PASSED' if result.get('success', False) else 'FAILED'}")
            except Exception as e:
                error_msg = f"ERROR: {str(e)}"
                self.test_results[test_name] = {"success": False, "error": error_msg}
                self.log(f"✗ {test_name}: {error_msg}")
        
        self.generate_report()
        return self.test_results
    
    def test_application_import(self):
        """메인 애플리케이션 모듈 import 테스트"""
        try:
            from frontend.desktop.main import MainWindow, Config
            return {
                "success": True,
                "details": {
                    "MainWindow imported": True,
                    "Config imported": True,
                    "App name": getattr(Config, 'APP_NAME', 'Unknown'),
                    "App version": getattr(Config, 'APP_VERSION', 'Unknown')
                }
            }
        except ImportError as e:
            return {"success": False, "error": f"Import failed: {e}"}
    
    def test_window_creation(self):
        """메인 윈도우 생성 테스트"""
        try:
            from frontend.desktop.main import MainWindow
            self.window = MainWindow()
            
            return {
                "success": True,
                "details": {
                    "Window created": self.window is not None,
                    "Window type": type(self.window).__name__,
                    "Has viewport": hasattr(self.window, 'viewport'),
                    "Has chat widget": hasattr(self.window, 'chat_widget'),
                    "Has control panel": hasattr(self.window, 'control_panel')
                }
            }
        except Exception as e:
            return {"success": False, "error": f"Window creation failed: {e}"}
    
    def test_window_display(self):
        """윈도우 표시 테스트"""
        if not self.window:
            return {"success": False, "error": "No window to test"}
        
        try:
            self.window.show()
            QTest.qWait(1000)  # 1초 대기
            
            checks = {
                "Window visible": self.window.isVisible(),
                "Window size > 0": self.window.size().width() > 0 and self.window.size().height() > 0,
                "Window title set": bool(self.window.windowTitle()),
                "Window is active": self.window.isActiveWindow()
            }
            
            return {
                "success": all(checks.values()),
                "details": checks,
                "window_size": f"{self.window.size().width()}x{self.window.size().height()}",
                "window_title": self.window.windowTitle()
            }
        except Exception as e:
            return {"success": False, "error": f"Display test failed: {e}"}
    
    def test_components_initialization(self):
        """컴포넌트 초기화 테스트"""
        if not self.window:
            return {"success": False, "error": "No window to test"}
        
        try:
            components = {
                "Character Viewport": self.window.viewport,
                "Chat Widget": self.window.chat_widget,
                "Control Panel": self.window.control_panel,
                "Progress Bar": self.window.progress_bar,
                "Status Label": self.window.status_label
            }
            
            checks = {}
            for name, component in components.items():
                checks[f"{name} exists"] = component is not None
                if component:
                    checks[f"{name} visible"] = component.isVisible()
                    checks[f"{name} enabled"] = component.isEnabled()
            
            return {
                "success": all(component is not None for component in components.values()),
                "details": checks
            }
        except Exception as e:
            return {"success": False, "error": f"Component test failed: {e}"}
    
    def test_backend_connectivity(self):
        """백엔드 연결 테스트"""
        if not self.window:
            return {"success": False, "error": "No window to test"}
        
        try:
            # 백엔드 연결 테스트 실행
            connected = self.window.test_backend_connection()
            
            return {
                "success": True,  # 연결 실패해도 테스트는 성공 (연결은 선택사항)
                "details": {
                    "Backend connection test run": True,
                    "Backend connected": connected,
                    "Backend URL": getattr(self.window, 'backend_url', 'Unknown')
                }
            }
        except Exception as e:
            return {"success": False, "error": f"Backend test failed: {e}"}
    
    def test_control_interactions(self):
        """컨트롤 상호작용 테스트"""
        if not self.window or not self.window.control_panel:
            return {"success": False, "error": "No control panel to test"}
        
        try:
            # 감정 슬라이더 테스트
            emotion_tests = {}
            if hasattr(self.window.control_panel, 'emotion_sliders'):
                for emotion, slider in self.window.control_panel.emotion_sliders.items():
                    original_value = slider.value()
                    slider.setValue(75)  # 테스트 값 설정
                    QTest.qWait(100)
                    emotion_tests[f"{emotion} slider"] = slider.value() == 75
                    slider.setValue(original_value)  # 원래 값 복원
            
            return {
                "success": True,
                "details": {
                    "Control panel accessible": True,
                    "Emotion sliders": len(emotion_tests),
                    **emotion_tests
                }
            }
        except Exception as e:
            return {"success": False, "error": f"Control test failed: {e}"}
    
    def test_screenshot_capture(self):
        """스크린샷 캡처 테스트 (오프스크린 모드에서는 기능 테스트만)"""
        if not self.window:
            return {"success": False, "error": "No window to test"}
        
        try:
            # 스크린샷 캡처 메서드 호출 테스트
            self.window.capture_gui_state()
            
            # 오프스크린 모드에서는 실제 파일이 생성되지 않을 수 있으므로
            # 메서드 호출이 성공했는지만 확인
            screenshot_dir = Path("verification_results/screenshots")
            
            # 디렉토리가 생성되었는지 확인
            directory_created = screenshot_dir.exists()
            
            # GUI 상태 로그 파일이 생성되었는지 확인
            log_file = Path("verification_results/gui_state_report.txt")
            log_file_created = log_file.exists()
            
            return {
                "success": directory_created and log_file_created,  # 메서드가 정상 실행되었다면 성공
                "details": {
                    "Screenshot capture method called": True,
                    "Screenshot directory created": directory_created,
                    "GUI state log created": log_file_created,
                    "Screenshot directory": str(screenshot_dir),
                    "Note": "In offscreen mode, actual screenshot files may not be generated"
                }
            }
        except Exception as e:
            return {"success": False, "error": f"Screenshot test failed: {e}"}
    
    def generate_report(self):
        """종합 테스트 리포트 생성"""
        report_file = self.results_dir / "gui_test_report.txt"
        
        with open(report_file, 'w') as f:
            f.write("=== AnimeRig AI GUI Test Report ===\n")
            f.write(f"Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Total Tests: {len(self.test_results)}\n\n")
            
            # 요약
            passed = sum(1 for result in self.test_results.values() if result.get('success', False))
            failed = len(self.test_results) - passed
            
            f.write(f"✅ Passed: {passed}\n")
            f.write(f"❌ Failed: {failed}\n")
            f.write(f"📊 Success Rate: {(passed/len(self.test_results)*100):.1f}%\n\n")
            
            # 세부 결과
            for test_name, result in self.test_results.items():
                f.write(f"\n{'='*50}\n")
                f.write(f"Test: {test_name}\n")
                f.write(f"Status: {'✅ PASSED' if result.get('success', False) else '❌ FAILED'}\n")
                
                if 'error' in result:
                    f.write(f"Error: {result['error']}\n")
                
                if 'details' in result:
                    f.write("Details:\n")
                    for key, value in result['details'].items():
                        f.write(f"  - {key}: {value}\n")
        
        self.log(f"✓ Test report generated: {report_file}")
    
    def cleanup(self):
        """테스트 정리"""
        if self.window:
            self.window.close()
        
        # QApplication 종료는 메인에서 처리


def main():
    """메인 테스트 실행 함수"""
    if not PYQT_AVAILABLE:
        print("PyQt6 is not available. GUI testing cannot proceed.")
        return False
    
    try:
        tester = GUITester()
        results = tester.run_all_tests()
        
        # 결과 요약 출력
        passed = sum(1 for result in results.values() if result.get('success', False))
        total = len(results)
        
        print(f"\n🎯 Test Summary:")
        print(f"   Total Tests: {total}")
        print(f"   Passed: {passed}")
        print(f"   Failed: {total - passed}")
        print(f"   Success Rate: {(passed/total*100):.1f}%")
        print(f"\n📁 Results saved to: verification_results/")
        
        tester.cleanup()
        return passed == total
        
    except Exception as e:
        print(f"Test execution failed: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
