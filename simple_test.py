#!/usr/bin/env python3
"""
Very simple test to debug the hanging issue
"""

print("Starting simple test...")

try:
    print("1. Testing basic imports...")
    import sys
    import os
    print("   ✅ Basic imports OK")
    
    print("2. Adding path...")
    sys.path.append('C:\\ANIMEAI\\animerig-ai')
    print("   ✅ Path added")
    
    print("3. Testing torch import...")
    import torch
    print("   ✅ Torch imported successfully")
    
    print("4. Testing opencv import...")
    import cv2
    print("   ✅ OpenCV imported successfully")
    
    print("5. Testing mediapipe import...")
    try:
        import mediapipe as mp
        print("   ✅ MediaPipe imported successfully")
    except ImportError as e:
        print(f"   ⚠️ MediaPipe not available: {e}")
    
    print("6. Testing CharacterProcessor import...")
    from ai.image_to_rig.character_processor import CharacterProcessor
    print("   ✅ CharacterProcessor imported successfully")
    
    print("7. Creating CharacterProcessor instance...")
    processor = CharacterProcessor()
    print("   ✅ CharacterProcessor created successfully")
    
    print("🎉 All tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
