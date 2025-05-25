#!/usr/bin/env python3
"""
Test specific mesh deformation integration for AnimeRig AI
"""

import numpy as np
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.abspath('.'))

from ai.animation.professional_animator import ProfessionalAnimator

def test_mesh_deformation_integration():
    """Test complete mesh deformation with bone matrix updates"""
    print("🧪 TESTING MESH DEFORMATION INTEGRATION")
    print("=" * 50)
    
    # Create animator
    print("Creating ProfessionalAnimator...")
    animator = ProfessionalAnimator()
    
    # Create test mesh data with proper structure
    test_vertices = np.array([
        [100, 100], [200, 100], [150, 150],
        [120, 180], [180, 180], [150, 200]
    ], dtype=np.float32)
    
    # Create bone weights and indices (6 vertices, up to 4 bone influences each)
    bone_weights = np.zeros((6, 4), dtype=np.float32)
    bone_indices = np.zeros((6, 4), dtype=np.int32)
    
    # Set up basic bone influences for test
    # Vertex 0: influenced by bone 0 (100%)
    bone_weights[0] = [1.0, 0.0, 0.0, 0.0]
    bone_indices[0] = [0, 0, 0, 0]
    
    # Vertex 1: influenced by bone 1 (100%)
    bone_weights[1] = [1.0, 0.0, 0.0, 0.0]
    bone_indices[1] = [1, 0, 0, 0]
    
    # Other vertices with mixed influences
    for i in range(2, 6):
        bone_weights[i] = [0.5, 0.3, 0.2, 0.0]
        bone_indices[i] = [0, 1, 2, 0]
    
    # Set up character mesh in animator
    animator.character_mesh = {
        'vertices': test_vertices,
        'bone_weights': bone_weights,
        'bone_indices': bone_indices
    }
    
    print(f"Test mesh created with {len(test_vertices)} vertices")
    print(f"Bone weights shape: {bone_weights.shape}")
    print(f"Bone indices shape: {bone_indices.shape}")
    
    # Test 1: Get initial bone transforms
    print("\n1. Getting initial bone transforms...")
    initial_transforms = animator.skeletal_system.get_bone_matrices()
    print(f"Available bone transforms: {len(initial_transforms)}")
    
    # Test 2: Apply a pose
    print("\n2. Applying 'wave' pose...")
    animator.set_pose('wave')
    
    # Test 3: Get updated bone transforms
    print("\n3. Getting updated bone transforms...")
    updated_transforms = animator.skeletal_system.get_bone_matrices()
    
    # Test 4: Check if bone transforms actually changed
    print("\n4. Checking bone transform changes...")
    changed_bones = 0
    for bone_name in initial_transforms:
        if bone_name in updated_transforms:
            initial_matrix = initial_transforms[bone_name]
            updated_matrix = updated_transforms[bone_name]
            
            # Calculate matrix difference
            diff = np.linalg.norm(updated_matrix - initial_matrix)
            if diff > 1e-6:
                changed_bones += 1
                print(f"   ✅ {bone_name}: matrix changed by {diff:.6f}")
    
    print(f"\nBone transforms changed: {changed_bones}/{len(initial_transforms)}")
    
    # Test 5: Apply skeletal deformation
    print("\n5. Testing skeletal deformation...")
    try:
        deformed_vertices = animator._apply_skeletal_deformation(
            test_vertices, updated_transforms
        )
        print(f"✅ Skeletal deformation completed")
        print(f"Original vertices shape: {test_vertices.shape}")
        print(f"Deformed vertices shape: {deformed_vertices.shape}")
        
        # Check if vertices actually moved
        vertex_changes = 0
        for i in range(len(test_vertices)):
            original = test_vertices[i]
            deformed = deformed_vertices[i]
            movement = np.linalg.norm(deformed - original)
            if movement > 0.001:
                vertex_changes += 1
                print(f"   ✅ Vertex {i}: moved by {movement:.3f} pixels")
        
        print(f"\nVertices moved: {vertex_changes}/{len(test_vertices)}")
        
        if vertex_changes > 0:
            print("\n🎉 MESH DEFORMATION IS WORKING!")
            return True
        else:
            print("\n❌ Mesh deformation not working - no vertex movement")
            return False
            
    except Exception as e:
        print(f"❌ Skeletal deformation failed: {e}")
        return False

if __name__ == "__main__":
    success = test_mesh_deformation_integration()
    if success:
        print("\n✅ ALL TESTS PASSED - Mesh deformation is fully functional")
    else:
        print("\n❌ TESTS FAILED - Mesh deformation needs fixes")
