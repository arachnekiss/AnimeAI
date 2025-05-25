#!/usr/bin/env python3
"""
Quick test to verify the CharacterProcessor process_image method fix
"""

import sys
import os

# Add project path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_process_image_method():
    """Test that the process_image method exists and works"""
    print("🧪 Testing CharacterProcessor.process_image method...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        # Initialize processor
        processor = CharacterProcessor()
        print("  ✅ CharacterProcessor initialized successfully")
        
        # Check if process_image method exists
        if hasattr(processor, 'process_image'):
            print("  ✅ process_image method exists!")
            
            # Test with dummy image data
            import numpy as np
            dummy_image = np.zeros((480, 640, 3), dtype=np.uint8)
            
            print("  🔄 Testing process_image with dummy data...")
            result = processor.process_image(dummy_image)
            
            if result and 'metadata' in result:
                print(f"  ✅ process_image works! Vertices: {len(result.get('vertices', []))}")
                print(f"  📊 Bones: {len(result.get('bones', []))}")
                print(f"  🎨 Materials: {len(result.get('materials', {}))}")
                return True
            else:
                print("  ❌ process_image returned invalid data")
                return False
        else:
            print("  ❌ process_image method not found!")
            return False
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔧 CharacterProcessor Fix Verification")
    print("=" * 50)
    
    success = test_process_image_method()
    
    if success:
        print("\n🎉 CharacterProcessor fix is working!")
        print("✅ GUI should now be able to load characters")
    else:
        print("\n❌ CharacterProcessor fix failed")
        
    print("=" * 50)
