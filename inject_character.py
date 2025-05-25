#!/usr/bin/env python3
"""
실행 중인 GUI에 캐릭터 데이터 주입 스크립트
"""

import os
import sys

# 프로젝트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def create_test_character_data():
    """테스트용 캐릭터 데이터 생성"""
    return {
        'features': {
            'hair': {'type': 'medium', 'color': [0.4, 0.2, 0.1]},
            'face': {'expression': 'neutral', 'skin_tone': [0.9, 0.8, 0.7]},
            'clothing': {'top': {'color': [0.4, 0.6, 0.8]}}
        },
        'model_3d': {
            'vertices': [
                [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],  # Front face
                [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]   # Back face
            ],
            'faces': [
                [0, 1, 2], [0, 2, 3],  # Front
                [4, 7, 6], [4, 6, 5],  # Back
                [0, 4, 5], [0, 5, 1],  # Bottom
                [2, 6, 7], [2, 7, 3],  # Top
                [0, 3, 7], [0, 7, 4],  # Left
                [1, 5, 6], [1, 6, 2]   # Right
            ],
            'materials': {'default': {'color': [0.8, 0.7, 0.6]}},
            'vertex_groups': {'body': [0, 1, 2, 3, 4, 5, 6, 7]}
        },
        'rig': {
            'bones': [
                {'name': 'root', 'position': [0, 0, 0]},
                {'name': 'spine', 'position': [0, 1, 0]}
            ]
        },
        'image_path': 'C:\\ANIMEAI\\public\\images\\start_character.png'
    }

def force_character_update():
    """실행 중인 GUI를 찾아서 캐릭터 데이터 업데이트"""
    print("🔄 Forcing character update in GUI...")
    
    try:
        # PyQt6 애플리케이션이 실행 중인지 확인
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import QTimer
        
        app = QApplication.instance()
        if app is None:
            print("  ❌ No GUI application running")
            return False
        
        # 모든 위젯을 찾아서 MainWindow 식별
        for widget in app.allWidgets():
            if hasattr(widget, 'viewport') and hasattr(widget, 'character_data'):
                print(f"  ✅ Found GUI window: {widget.__class__.__name__}")
                
                # 강제로 캐릭터 데이터 설정
                character_data = create_test_character_data()
                widget.character_data = character_data
                widget.viewport.set_character_data(character_data)
                widget.viewport.start_animation()
                widget.viewport.update()
                
                print("  🎉 Character data injected!")
                print("      GUI should now show the character!")
                return True
        
        print("  ❌ No MainWindow found in running application")
        return False
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """메인 함수"""
    print("💉 Character Data Injection Tool")
    print("=" * 40)
    
    success = force_character_update()
    
    if success:
        print("\n✅ Success! Check your GUI window.")
        print("   The character should now be visible.")
    else:
        print("\n❌ Failed to inject character data.")
        print("   Make sure the GUI is running.")

if __name__ == "__main__":
    main()
