#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test character processing with the default image
"""

import sys
import os

# Add project root to Python path
project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'animerig-ai')
sys.path.insert(0, project_root)

def test_character_processing():
    """Test character processing with default image"""
    print("🧪 Testing character processing...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        processor = CharacterProcessor()
        print("  ✅ CharacterProcessor initialized")
        
        # Test with default character image
        image_path = "C:\\ANIMEAI\\public\\images\\start_character.png"
        
        if not os.path.exists(image_path):
            print(f"  ❌ Image not found: {image_path}")
            return False
        
        print(f"  📸 Processing image: {image_path}")
        
        # Extract features
        features = processor.extract_features(image_path)
        print(f"  ✅ Features extracted: {list(features.keys())}")
        
        # Generate 3D model
        model_3d = processor.generate_3d_model(features)
        print(f"  ✅ 3D model generated with {len(model_3d.get('vertices', []))} vertices")
        
        # Create animation rig
        rig = processor.create_animation_rig(model_3d)
        print(f"  ✅ Animation rig created with {len(rig.get('bones', []))} bones")
        
        # Check if we have valid character data
        character_data = {
            'features': features,
            'model_3d': model_3d,
            'rig': rig,
            'image_path': image_path
        }
        
        print("  📊 Character data structure:")
        print(f"    - Features: {len(features)} categories")
        print(f"    - Vertices: {len(model_3d.get('vertices', []))}")
        print(f"    - Faces: {len(model_3d.get('faces', []))}")
        print(f"    - Materials: {len(model_3d.get('materials', {}))}")
        print(f"    - Bones: {len(rig.get('bones', []))}")
        
        # Test if this looks like our improved data
        if (len(model_3d.get('vertices', [])) > 100 and 
            'materials' in model_3d and 
            len(model_3d['materials']) > 0):
            print("  🎉 Generated robust character data!")
            return True
        else:
            print("  ⚠️ Character data seems minimal")
            return False
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_rendering_preparation():
    """Test if character data is ready for rendering"""
    print("\n🎨 Testing rendering preparation...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        processor = CharacterProcessor()
        
        # Get default features
        features = processor.extract_features()
        model_3d = processor.generate_3d_model(features)
        
        # Check rendering requirements
        vertices = model_3d.get('vertices', [])
        faces = model_3d.get('faces', [])
        materials = model_3d.get('materials', {})
        
        print(f"  📐 Vertices: {len(vertices)}")
        print(f"  🔺 Faces: {len(faces)}")
        print(f"  🎨 Materials: {list(materials.keys())}")
        
        # Check if data is valid for rendering
        valid_vertices = len(vertices) > 0 and all(len(v) >= 3 for v in vertices[:5])
        valid_faces = len(faces) > 0 and all(len(f) >= 3 for f in faces[:5])
        
        if valid_vertices and valid_faces:
            print("  ✅ Character data is valid for 3D rendering!")
            
            # Sample a few data points
            if len(vertices) > 0:
                print(f"  📍 Sample vertex: {vertices[0]}")
            if len(faces) > 0:
                print(f"  🔺 Sample face: {faces[0]}")
            if materials:
                sample_material = list(materials.keys())[0]
                print(f"  🎨 Sample material '{sample_material}': {materials[sample_material]}")
            
            return True
        else:
            print("  ❌ Character data is not valid for rendering")
            return False
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Character Processing Test")
    print("=" * 50)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    tests = [
        test_character_processing,
        test_rendering_preparation
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
        print("🎉 Character processing is working correctly!")
        print("\n💡 The GUI should now show a proper 3D character instead of a brown block.")
        print("   - Character features are extracted properly")
        print("   - 3D model generation creates detailed mesh")
        print("   - Materials and textures are applied")
        print("   - Rendering data is valid")
    else:
        print("❌ Some character processing issues remain.")
    
    return passed == len(tests)

if __name__ == "__main__":
    main()
