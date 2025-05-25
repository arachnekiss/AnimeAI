#!/usr/bin/env python3
"""
AnimeRig AI 수동 UI 테스트 도우미
실제 GUI 애플리케이션과 상호작용하여 수동 테스트를 진행합니다.
"""

import sys
import time
import threading
from pathlib import Path

# PyQt6 imports
try:
    from PyQt6.QtWidgets import QApplication, QMessageBox, QDialog, QVBoxLayout, QHBoxLayout
    from PyQt6.QtWidgets import QLabel, QPushButton, QTextEdit, QCheckBox, QGroupBox, QScrollArea
    from PyQt6.QtCore import QTimer, Qt
    from PyQt6.QtGui import QFont, QPixmap
    PYQT_AVAILABLE = True
except ImportError:
    PYQT_AVAILABLE = False
    print("PyQt6 not available for manual testing")

class ManualTestDialog(QDialog):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("AnimeRig AI - Manual UI Test Assistant")
        self.setGeometry(100, 100, 800, 600)
        self.test_results = {}
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout()
        
        # 제목
        title = QLabel("🎭 AnimeRig AI Manual UI Test Assistant")
        title.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # 설명
        desc = QLabel("실행 중인 AnimeRig AI 애플리케이션을 보면서 아래 항목들을 확인하세요.")
        desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(desc)
        
        # 스크롤 영역
        scroll = QScrollArea()
        scroll_widget = QVBoxLayout()
        scroll_content = self.create_test_sections()
        scroll.setWidget(scroll_content)
        scroll.setWidgetResizable(True)
        layout.addWidget(scroll)
        
        # 버튼들
        button_layout = QHBoxLayout()
        
        launch_btn = QPushButton("🚀 Launch AnimeRig AI")
        launch_btn.clicked.connect(self.launch_app)
        button_layout.addWidget(launch_btn)
        
        screenshot_btn = QPushButton("📸 Take Screenshot")
        screenshot_btn.clicked.connect(self.take_screenshot)
        button_layout.addWidget(screenshot_btn)
        
        save_btn = QPushButton("💾 Save Results")
        save_btn.clicked.connect(self.save_results)
        button_layout.addWidget(save_btn)
        
        layout.addLayout(button_layout)
        self.setLayout(layout)
        
    def create_test_sections(self):
        main_widget = QVBoxLayout()
        
        # 테스트 섹션들
        sections = [
            self.create_main_window_section(),
            self.create_viewport_section(),
            self.create_chat_section(),
            self.create_control_panel_section(),
            self.create_interaction_section()
        ]
        
        for section in sections:
            main_widget.addWidget(section)
            
        widget = QVBoxLayout()
        widget.addLayout(main_widget)
        return widget
        
    def create_main_window_section(self):
        group = QGroupBox("1. 메인 윈도우 검증")
        layout = QVBoxLayout()
        
        checks = [
            "다크 테마가 적용되어 배경이 어두운 색상",
            "윈도우 크기가 적절하게 표시 (1400x900 권장)",
            "타이틀바에 'AnimeRig AI - Character Animation Studio' 표시",
            "윈도우가 화면에 적절히 위치",
            "윈도우 크기 조절 가능",
            "최소화/최대화/닫기 버튼 정상 작동"
        ]
        
        self.main_window_checks = []
        for check in checks:
            checkbox = QCheckBox(check)
            checkbox.stateChanged.connect(lambda: self.update_results())
            self.main_window_checks.append(checkbox)
            layout.addWidget(checkbox)
            
        group.setLayout(layout)
        return group
        
    def create_viewport_section(self):
        group = QGroupBox("2. 3D 캐릭터 뷰포트 검증")
        layout = QVBoxLayout()
        
        checks = [
            "OpenGL 뷰포트가 회색 배경으로 표시",
            "뷰포트 크기가 충분히 큼 (600x400 이상)",
            "마우스로 뷰포트 영역 클릭 가능",
            "뷰포트 경계가 명확히 구분됨",
            "기본 도형이나 캐릭터가 표시됨",
            "3D 렌더링이 부드럽게 작동"
        ]
        
        self.viewport_checks = []
        for check in checks:
            checkbox = QCheckBox(check)
            checkbox.stateChanged.connect(lambda: self.update_results())
            self.viewport_checks.append(checkbox)
            layout.addWidget(checkbox)
            
        group.setLayout(layout)
        return group
        
    def create_chat_section(self):
        group = QGroupBox("3. 채팅 인터페이스 검증")
        layout = QVBoxLayout()
        
        checks = [
            "채팅 히스토리 영역이 어두운 배경으로 표시",
            "스크롤 가능한 텍스트 영역",
            "입력 필드에 적절한 플레이스홀더 텍스트",
            "입력 필드가 활성화되어 텍스트 입력 가능",
            "Send 버튼이 파란색 배경으로 표시",
            "채팅 텍스트가 읽기 쉽게 표시"
        ]
        
        self.chat_checks = []
        for check in checks:
            checkbox = QCheckBox(check)
            checkbox.stateChanged.connect(lambda: self.update_results())
            self.chat_checks.append(checkbox)
            layout.addWidget(checkbox)
            
        group.setLayout(layout)
        return group
        
    def create_control_panel_section(self):
        group = QGroupBox("4. 컨트롤 패널 검증")
        layout = QVBoxLayout()
        
        checks = [
            "Controls 탭이 기본 선택되어 표시",
            "Chat 탭이 함께 표시",
            "Emotions 그룹박스 표시",
            "5개 감정 슬라이더 모두 표시",
            "슬라이더가 수평으로 배치되고 조작 가능",
            "Neutral 슬라이더가 20 값으로 초기 설정",
            "Animations 그룹박스 표시",
            "5개 애니메이션 버튼 모두 표시"
        ]
        
        self.control_checks = []
        for check in checks:
            checkbox = QCheckBox(check)
            checkbox.stateChanged.connect(lambda: self.update_results())
            self.control_checks.append(checkbox)
            layout.addWidget(checkbox)
            
        group.setLayout(layout)
        return group
        
    def create_interaction_section(self):
        group = QGroupBox("5. 상호작용 테스트")
        layout = QVBoxLayout()
        
        checks = [
            "감정 슬라이더 조작 시 값이 실시간 업데이트",
            "애니메이션 버튼 클릭 시 반응",
            "채팅 입력 후 Enter 키 작동",
            "Send 버튼 클릭 작동",
            "탭 전환 시 내용이 올바르게 변경",
            "전체적인 UI 반응성이 양호"
        ]
        
        self.interaction_checks = []
        for check in checks:
            checkbox = QCheckBox(check)
            checkbox.stateChanged.connect(lambda: self.update_results())
            self.interaction_checks.append(checkbox)
            layout.addWidget(checkbox)
            
        group.setLayout(layout)
        return group
        
    def launch_app(self):
        """메인 애플리케이션 실행"""
        import subprocess
        import os
        
        try:
            # 새 터미널에서 앱 실행
            subprocess.Popen([
                'python3', 'frontend/desktop/main.py'
            ], cwd='/workspaces/AnimeAI/animerig-ai')
            
            QMessageBox.information(self, "앱 실행", 
                "AnimeRig AI 애플리케이션이 실행되었습니다.\n"
                "새 창이 나타나면 체크리스트를 확인하세요.")
                
        except Exception as e:
            QMessageBox.warning(self, "실행 오류", f"앱 실행 중 오류 발생:\n{e}")
            
    def take_screenshot(self):
        """스크린샷 캡처 (수동 안내)"""
        QMessageBox.information(self, "스크린샷 캡처", 
            "스크린샷을 수동으로 캡처하세요:\n\n"
            "1. Print Screen 키를 누르거나\n"
            "2. Ctrl+Alt+T로 터미널을 열고\n"
            "3. gnome-screenshot 명령어 사용\n\n"
            "스크린샷을 verification_results/screenshots/ 폴더에 저장하세요.")
            
    def update_results(self):
        """테스트 결과 업데이트"""
        all_checks = (
            self.main_window_checks + 
            self.viewport_checks + 
            self.chat_checks + 
            self.control_checks + 
            self.interaction_checks
        )
        
        checked = sum(1 for check in all_checks if check.isChecked())
        total = len(all_checks)
        
        # 윈도우 타이틀 업데이트
        self.setWindowTitle(f"AnimeRig AI - Manual UI Test ({checked}/{total} completed)")
        
    def save_results(self):
        """테스트 결과 저장"""
        results_dir = Path("verification_results")
        results_dir.mkdir(exist_ok=True)
        
        # 결과 수집
        sections = [
            ("메인 윈도우", self.main_window_checks),
            ("3D 뷰포트", self.viewport_checks),
            ("채팅 인터페이스", self.chat_checks),
            ("컨트롤 패널", self.control_checks),
            ("상호작용", self.interaction_checks)
        ]
        
        # 결과 파일 생성
        with open(results_dir / "manual_test_results.txt", 'w', encoding='utf-8') as f:
            f.write("=== AnimeRig AI Manual UI Test Results ===\n")
            f.write(f"Test Date: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            total_checks = 0
            passed_checks = 0
            
            for section_name, checks in sections:
                f.write(f"=== {section_name} ===\n")
                section_passed = 0
                
                for i, check in enumerate(checks, 1):
                    status = "✅ PASS" if check.isChecked() else "❌ FAIL"
                    f.write(f"{i}. {status} - {check.text()}\n")
                    
                    total_checks += 1
                    if check.isChecked():
                        section_passed += 1
                        passed_checks += 1
                        
                f.write(f"\nSection Result: {section_passed}/{len(checks)} passed\n\n")
                
            # 전체 요약
            success_rate = (passed_checks / total_checks * 100) if total_checks > 0 else 0
            f.write(f"=== Overall Summary ===\n")
            f.write(f"Total Tests: {total_checks}\n")
            f.write(f"Passed: {passed_checks}\n")
            f.write(f"Failed: {total_checks - passed_checks}\n")
            f.write(f"Success Rate: {success_rate:.1f}%\n")
            
        QMessageBox.information(self, "결과 저장", 
            f"테스트 결과가 저장되었습니다:\n"
            f"verification_results/manual_test_results.txt\n\n"
            f"성공률: {success_rate:.1f}% ({passed_checks}/{total_checks})")

def main():
    if not PYQT_AVAILABLE:
        print("❌ PyQt6가 필요합니다.")
        return 1
        
    app = QApplication(sys.argv)
    
    # 다크 테마 적용
    app.setStyleSheet("""
        QDialog {
            background-color: #2b2b2b;
            color: #ffffff;
        }
        QGroupBox {
            font-weight: bold;
            border: 2px solid #555;
            border-radius: 5px;
            margin-top: 1ex;
            padding-top: 10px;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 5px 0 5px;
        }
        QCheckBox {
            spacing: 5px;
            color: #ffffff;
        }
        QCheckBox::indicator {
            width: 18px;
            height: 18px;
        }
        QCheckBox::indicator:unchecked {
            border: 2px solid #555;
            background-color: #3b3b3b;
        }
        QCheckBox::indicator:checked {
            border: 2px solid #007acc;
            background-color: #007acc;
        }
        QPushButton {
            background-color: #007acc;
            border: 1px solid #005a9e;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
        }
        QPushButton:hover {
            background-color: #005a9e;
        }
        QLabel {
            color: #ffffff;
        }
    """)
    
    dialog = ManualTestDialog()
    dialog.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())
