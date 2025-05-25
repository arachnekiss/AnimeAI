#!/usr/bin/env python3
"""
AnimeRig AI 스크린샷 캡처 도구
실행 중인 애플리케이션의 스크린샷을 캡처합니다.
"""

import sys
import time
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QPixmap
from PyQt6.QtCore import QRect

def capture_application_screenshots():
    """실행 중인 애플리케이션의 스크린샷 캡처"""
    
    app = QApplication.instance()
    if not app:
        app = QApplication(sys.argv)
    
    # 결과 디렉토리 생성
    screenshot_dir = Path("verification_results/screenshots")
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    
    # 기본 화면 캡처
    screen = QApplication.primaryScreen()
    if screen:
        print("📸 Capturing desktop screenshot...")
        
        # 전체 화면 캡처
        screenshot = screen.grabWindow(0)
        screenshot_path = screenshot_dir / f"desktop_screenshot_{int(time.time())}.png"
        screenshot.save(str(screenshot_path))
        print(f"✓ Desktop screenshot saved: {screenshot_path}")
        
        # 윈도우별 캡처 시도
        for widget in app.topLevelWidgets():
            if widget.isVisible():
                widget_name = widget.objectName() or widget.__class__.__name__
                widget_screenshot = screen.grabWindow(widget.winId())
                widget_path = screenshot_dir / f"{widget_name}_{int(time.time())}.png"
                widget_screenshot.save(str(widget_path))
                print(f"✓ Widget screenshot saved: {widget_path}")
    
    print(f"\n📁 All screenshots saved to: {screenshot_dir}")
    return screenshot_dir

def create_screenshot_report():
    """스크린샷 캡처 보고서 생성"""
    
    screenshot_dir = Path("verification_results/screenshots")
    report_file = Path("verification_results/screenshot_report.txt")
    
    with open(report_file, 'w') as f:
        f.write("=== AnimeRig AI Screenshot Capture Report ===\n")
        f.write(f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        if screenshot_dir.exists():
            screenshots = list(screenshot_dir.glob("*.png"))
            f.write(f"Total Screenshots: {len(screenshots)}\n\n")
            
            for screenshot in screenshots:
                f.write(f"- {screenshot.name} ({screenshot.stat().st_size} bytes)\n")
        else:
            f.write("No screenshots directory found.\n")
        
        f.write(f"\nScreenshots Directory: {screenshot_dir}\n")
        f.write("\nNote: Screenshots are captured from the running AnimeRig AI application.\n")
        f.write("Use these images for visual verification and documentation.\n")
    
    print(f"✓ Screenshot report created: {report_file}")

if __name__ == "__main__":
    print("🎭 AnimeRig AI Screenshot Capture Tool")
    print("=====================================")
    
    try:
        screenshot_dir = capture_application_screenshots()
        create_screenshot_report()
        
        print("\n✨ Screenshot capture completed successfully!")
        print(f"📁 Check {screenshot_dir} for captured images")
        
    except Exception as e:
        print(f"❌ Screenshot capture failed: {e}")
        sys.exit(1)
