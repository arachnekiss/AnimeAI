#!/usr/bin/env python3
"""
기본 캐릭터 자동 로드 테스트 스크립트
"""

import os
import sys
from pathlib import Path

def test_default_character_paths():
    """기본 캐릭터 이미지 경로들을 테스트"""
    print("🔍 Testing default character image paths...")
    
    # 테스트할 경로들
    test_paths = [
        r'C:\ANIMEAI\public\images\start_character.png',
        r'C:\ANIMEAI\animerig-ai\assets\images\start_character.png',
        os.path.join(os.path.dirname(__file__), 'public', 'images', 'start_character.png'),
        os.path.join(os.path.dirname(__file__), 'animerig-ai', 'assets', 'images', 'start_character.png')
    ]
    
    found_paths = []
    
    for i, path in enumerate(test_paths, 1):
        abs_path = os.path.abspath(path)
        exists = os.path.exists(abs_path)
        size = os.path.getsize(abs_path) if exists else 0
        
        status = "✅ FOUND" if exists else "❌ NOT FOUND"
        print(f"{i}. {status}: {abs_path}")
        if exists:
            print(f"   📁 Size: {size:,} bytes")
            found_paths.append(abs_path)
        print()
    
    return found_paths

def test_character_processor():
    """CharacterProcessor 기본 기능 테스트"""
    print("🧪 Testing CharacterProcessor...")
    
    try:
        # Add path for imports
        sys.path.append(os.path.join(os.path.dirname(__file__), 'animerig-ai', 'ai'))
        
        from image_to_rig.character_processor import CharacterProcessor
        
        # Initialize processor
        processor = CharacterProcessor()
        print("✅ CharacterProcessor initialized successfully")
        
        # Test with a found image path
        found_paths = test_default_character_paths()
        if found_paths:
            test_image = found_paths[0]
            print(f"🔬 Testing feature extraction with: {test_image}")
            
            try:
                features = processor.extract_features(test_image)
                print("✅ Feature extraction completed")
                print(f"   📊 Extracted features: {list(features.keys())}")
                
                # Test 3D model generation
                print("🔬 Testing 3D model generation...")
                model_3d = processor.generate_3d_model(features)
                print("✅ 3D model generation completed")
                print(f"   🏗️ Model vertices: {len(model_3d.get('vertices', []))}")
                
                # Test rig creation
                print("🔬 Testing animation rig creation...")
                rig = processor.create_animation_rig(model_3d)
                print("✅ Animation rig creation completed")
                print(f"   🦴 Rig bones: {len(rig.get('bones', []))}")
                
                return True
                
            except Exception as e:
                print(f"❌ Processing failed: {e}")
                return False
        else:
            print("❌ No character images found for testing")
            return False
            
    except Exception as e:
        print(f"❌ CharacterProcessor import/init failed: {e}")
        return False

def main():
    """메인 테스트 함수"""
    print("="*60)
    print("🚀 AnimeRig AI - Default Character Auto-Load Test")
    print("="*60)
    
    # 1. 기본 이미지 경로 테스트
    found_paths = test_default_character_paths()
    
    if not found_paths:
        print("⚠️  No default character images found!")
        print("   Please ensure start_character.png exists in one of the expected locations.")
        return False
    
    # 2. CharacterProcessor 테스트
    processor_ok = test_character_processor()
    
    if processor_ok:
        print("="*60)
        print("✅ All tests passed! Auto-load should work properly.")
        print("="*60)
        return True
    else:
        print("="*60)
        print("❌ Some tests failed. Check the errors above.")
        print("="*60)
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
