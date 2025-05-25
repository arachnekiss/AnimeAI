print("✅ Simple test working!")
print("🧪 Testing image-based character processing...")

import sys
import os

# Add project root to Python path
sys.path.append('C:\\ANIMEAI\\animerig-ai')

# Test 1: Check if image exists
def test_image_exists():
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

# Test 2: Try importing CharacterProcessor
def test_import():
    try:
        print("🔄 Importing CharacterProcessor...")
        from ai.image_to_rig.character_processor import CharacterProcessor
        print("✅ CharacterProcessor imported successfully!")
        return True
    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

# Run tests
if __name__ == "__main__":
    print("=" * 50)
    
    # Test image existence
    image_path = test_image_exists()
    
    # Test import
    if test_import():
        print("🎉 Basic tests passed!")
    else:
        print("❌ Import test failed!")
    
    print("=" * 50)
