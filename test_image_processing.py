#!/usr/bin/env python3
"""
Quick test for image-based character processing
"""

import sys
import os
sys.path.append('C:\\ANIMEAI\\animerig-ai')

# Disable GPU for PyTorch
os.environ["CUDA_VISIBLE_DEVICES"] = ""

def test_image_exists():
    """Test if the default character image exists"""
    image_paths = [
        "C:\\ANIMEAI\\public\\images\\start_character.png",
        "C:\\ANIMEAI\\animerig-ai\\assets\\images\\start_character.png"
    ]
    
    for path in image_paths:
        if os.path.exists(path):
            print(f"✅ Found character image: {path}")
            return path
        else:
            print(f"❌ Image not found: {path}")
    
    return None

def test_character_processor_import():
    """Test importing the CharacterProcessor"""
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        print("✅ CharacterProcessor imported successfully")
        return CharacterProcessor
    except Exception as e:
        print(f"❌ Failed to import CharacterProcessor: {e}")
        return None

def test_basic_processing(image_path):
    """Test basic processing functionality"""
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        print("🔄 Initializing CharacterProcessor...")
        processor = CharacterProcessor()
        print("✅ CharacterProcessor initialized")
        
        print(f"🔄 Processing image: {image_path}")
        features = processor.extract_features(image_path)
        print(f"✅ Features extracted: {list(features.keys())}")
        
        return True
    except Exception as e:
        print(f"❌ Processing failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing Image-Based Character Processing")
    print("=" * 50)
    
    # Test 1: Check image exists
    image_path = test_image_exists()
    if not image_path:
        print("❌ No character image found!")
        sys.exit(1)
    
    # Test 2: Check import
    CharacterProcessor = test_character_processor_import()
    if not CharacterProcessor:
        print("❌ Cannot import CharacterProcessor!")
        sys.exit(1)
    
    # Test 3: Basic processing
    if test_basic_processing(image_path):
        print("🎉 Image-based character processing is working!")
    else:
        print("❌ Image processing failed!")
