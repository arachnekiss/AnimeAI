#!/usr/bin/env python3
"""
Step-by-step debugging test
"""

import sys
import os
sys.path.append('C:\\ANIMEAI\\animerig-ai')

print("🔍 Step 1: Basic imports test")
try:
    import torch
    print("✅ PyTorch imported")
except Exception as e:
    print(f"❌ PyTorch failed: {e}")

try:
    import cv2
    print("✅ OpenCV imported")
except Exception as e:
    print(f"❌ OpenCV failed: {e}")

try:
    import numpy as np
    print("✅ NumPy imported")
except Exception as e:
    print(f"❌ NumPy failed: {e}")

print("\n🔍 Step 2: MediaPipe import test")
try:
    import mediapipe as mp
    print("✅ MediaPipe imported successfully")
except Exception as e:
    print(f"❌ MediaPipe failed: {e}")

print("\n🔍 Step 3: CharacterProcessor import test")
try:
    from ai.image_to_rig.character_processor import CharacterProcessor
    print("✅ CharacterProcessor imported successfully")
except Exception as e:
    print(f"❌ CharacterProcessor failed: {e}")
    import traceback
    traceback.print_exc()

print("\n🎯 Testing completed!")
