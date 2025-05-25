#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick test script to verify AnimeRig AI system functionality
"""

import sys
import os
import traceback

# Add project root to Python path
project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'animerig-ai')
sys.path.insert(0, project_root)

def test_imports():
    """Test all critical imports"""
    print("🧪 Testing imports...")
    
    try:
        print("  ✅ PyQt6 imports...")
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import QTimer
        from PyQt6.QtOpenGLWidgets import QOpenGLWidget
        
        print("  ✅ AI module imports...")
        from ai.image_to_rig.character_processor import CharacterProcessor
        from ai.animation_synthesis.motion_generator import MotionGenerator
        
        print("  ✅ Main GUI imports...")
        from frontend.desktop.main import MainWindow
        
        print("✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        traceback.print_exc()
        return False

def test_motion_generator():
    """Test MotionGenerator methods"""
    print("\n🎬 Testing MotionGenerator...")
    
    try:
        from ai.animation_synthesis.motion_generator import MotionGenerator
        
        generator = MotionGenerator()
        print("  ✅ MotionGenerator initialized")
        
        # Test missing methods
        emotion_data = generator.generate_emotion_animation("happy", 0.8)
        print("  ✅ generate_emotion_animation works")
        
        gesture_data = generator.generate_gesture_animation("wave", 2.0)
        print("  ✅ generate_gesture_animation works")
        
        conv_data = generator.generate_conversation_animation("Hello", "Hi there!")
        print("  ✅ generate_conversation_animation works")
        
        print("✅ MotionGenerator tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ MotionGenerator error: {e}")
        traceback.print_exc()
        return False

def test_character_processor():
    """Test CharacterProcessor methods"""
    print("\n🎨 Testing CharacterProcessor...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        processor = CharacterProcessor()
        print("  ✅ CharacterProcessor initialized")
        
        # Test methods with dummy data
        features = {"test": "data"}
        model_3d = processor.generate_3d_model(features)
        print("  ✅ generate_3d_model works")
        
        rig = processor.create_animation_rig(model_3d)
        print("  ✅ create_animation_rig works")
        
        extracted = processor.extract_features()
        print("  ✅ extract_features works")
        
        print("✅ CharacterProcessor tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ CharacterProcessor error: {e}")
        traceback.print_exc()
        return False

def test_gui_creation():
    """Test GUI creation without showing it"""
    print("\n🖥️ Testing GUI creation...")
    
    try:
        from PyQt6.QtWidgets import QApplication
        from frontend.desktop.main import MainWindow
        
        # Create QApplication
        app = QApplication(sys.argv)
        print("  ✅ QApplication created")
        
        # Create main window but don't show it
        window = MainWindow()
        print("  ✅ MainWindow created")
        
        print("✅ GUI creation tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ GUI creation error: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("🚀 AnimeRig AI System Test")
    print("=" * 50)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    tests = [
        test_imports,
        test_motion_generator, 
        test_character_processor,
        test_gui_creation
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
    
    print(f"\n📊 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All systems operational! You can now run the GUI.")
        print("\nTo start the application, run:")
        print("   start_gui.bat")
        print("   OR")
        print("   cd animerig-ai && python frontend/desktop/main.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    
    return passed == len(tests)

if __name__ == "__main__":
    main()
