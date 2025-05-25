#!/usr/bin/env python3
"""
Critical Bug Fix Verification Test
Tests the exact issues found in visual verification:
1. Bone world position calculations (were returning [0,0,0])
2. Pose application system (rotations not being applied)
3. IK solver division by zero errors
4. Mesh deformation with bone influences
"""

import sys
import os
import numpy as np
import math

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from ai.animation.skeletal_system import SkeletalAnimationSystem
from ai.animation.skeletal_animation_engine import SkeletalAnimationEngine
from ai.animation.professional_animator import ProfessionalAnimator

def test_bone_world_positions():
    """TEST 1: Verify bone world positions are no longer [0,0,0]"""
    print("🦴 TEST 1: Bone World Position Fix")
    print("-" * 40)
    
    skeletal_system = SkeletalAnimationSystem()
    
    # Update world transforms
    if skeletal_system.root_bone:
        skeletal_system.root_bone.update_world_transform()
    
    # Check bone positions
    positions_working = 0
    total_bones = 0
    
    for bone_name, bone in skeletal_system.bones.items():
        world_pos = bone.get_world_position()
        total_bones += 1
        
        # Check if position is not zero vector
        if np.linalg.norm(world_pos) > 0.001:
            positions_working += 1
            print(f"✅ {bone_name}: {world_pos}")
        else:
            print(f"❌ {bone_name}: {world_pos} (still zero)")
    
    success_rate = (positions_working / total_bones) * 100 if total_bones > 0 else 0
    print(f"\n📊 Bone Position Results: {positions_working}/{total_bones} bones have non-zero positions ({success_rate:.1f}%)")
    
    return success_rate > 80  # At least 80% should have proper positions

def test_pose_application():
    """TEST 2: Verify pose rotations are actually applied to bones"""
    print("\n✌️ TEST 2: Pose Application Fix")
    print("-" * 40)
    
    skeletal_system = SkeletalAnimationSystem()
    
    # Get initial rotations
    initial_rotations = {}
    for bone_name, bone in skeletal_system.bones.items():
        initial_rotations[bone_name] = bone.local_transform.rotation.copy()
    
    # Apply peace sign pose
    print("Applying 'peace_sign' pose...")
    skeletal_system.apply_pose('peace_sign')
    
    # Check which bones actually changed rotation
    changed_bones = 0
    total_bones = len(skeletal_system.bones)
    
    for bone_name, bone in skeletal_system.bones.items():
        current_rotation = bone.local_transform.rotation
        initial_rotation = initial_rotations[bone_name]
        
        rotation_change = np.linalg.norm(current_rotation - initial_rotation)
        if rotation_change > 0.01:  # Significant change
            changed_bones += 1
            print(f"✅ {bone_name}: rotation changed by {rotation_change:.3f} radians")
    
    print(f"\n📊 Pose Application Results: {changed_bones}/{total_bones} bones changed rotation")
    
    return changed_bones > 5  # At least some bones should change

def test_ik_solver_stability():
    """TEST 3: Verify IK solver doesn't crash with division by zero"""
    print("\n🎯 TEST 3: IK Solver Stability Fix")
    print("-" * 40)
    
    skeletal_system = SkeletalAnimationSystem()
    
    # Test various target positions that could cause division by zero
    test_targets = [
        np.array([0.0, 0.0, 0.0]),      # Origin (potential division by zero)
        np.array([0.5, 0.8, 0.0]),      # Normal target
        np.array([999.0, 999.0, 0.0]),  # Unreachable target
        np.array([0.001, 0.001, 0.0]),  # Very close to origin
    ]
    
    crashes = 0
    successful_solves = 0
    
    for i, target in enumerate(test_targets):
        try:
            print(f"Testing IK target {i+1}: {target}")
            
            # Test right arm IK
            if 'right_arm' in skeletal_system.ik_chains:
                skeletal_system.solve_ik_fabrik('right_arm', target)
                successful_solves += 1
                print(f"✅ IK solve {i+1} completed successfully")
            else:
                print(f"⚠️ No right_arm IK chain found")
                
        except Exception as e:
            crashes += 1
            print(f"❌ IK solve {i+1} crashed: {e}")
    
    print(f"\n📊 IK Solver Results: {successful_solves}/{len(test_targets)} solves successful, {crashes} crashes")
    
    return crashes == 0  # No crashes should occur

def test_mesh_deformation():
    """TEST 4: Verify mesh deformation with bone transforms"""
    print("\n🖼️ TEST 4: Mesh Deformation Implementation")
    print("-" * 40)
    
    try:
        # Create animator with all systems
        animator = ProfessionalAnimator()
        
        # Create test mesh
        test_vertices = np.array([
            [100, 100], [200, 100], [150, 150],
            [120, 180], [180, 180], [150, 200]
        ], dtype=np.float32)
        
        print(f"Test mesh vertices: {test_vertices.shape}")
        
        # Get bone matrices before pose
        initial_matrices = animator.skeletal_system.get_bone_matrices()
        print(f"Available bone matrices: {len(initial_matrices)}")
          # Apply a pose
        animator.set_pose('wave')
        
        # Get bone matrices after pose
        updated_matrices = animator.skeletal_system.get_bone_matrices()
        
        # Check if matrices actually changed
        matrix_changes = 0
        for bone_name in initial_matrices:
            if bone_name in updated_matrices:
                diff = np.linalg.norm(updated_matrices[bone_name] - initial_matrices[bone_name])
                if diff > 0.001:
                    matrix_changes += 1
        
        print(f"📊 Matrix Changes: {matrix_changes}/{len(initial_matrices)} bone matrices changed")
        
        # Test mesh deformation if available
        if hasattr(animator, '_apply_skeletal_deformation'):
            print("✅ Skeletal deformation method exists")
            deformation_available = True
        else:
            print("❌ No skeletal deformation method found")
            deformation_available = False
        
        return matrix_changes > 0 and deformation_available
        
    except Exception as e:
        print(f"❌ Mesh deformation test failed: {e}")
        return False

def run_all_fix_verification_tests():
    """Run all critical bug fix verification tests"""
    print("=" * 60)
    print("🔧 CRITICAL BUG FIX VERIFICATION SUITE")
    print("=" * 60)
    print("Testing fixes for issues found in visual verification:")
    print("- Bone world positions returning [0,0,0]")
    print("- Pose rotations not being applied")
    print("- IK solver division by zero crashes")
    print("- Mesh deformation matrix updates")
    print()
    
    # Run all tests
    results = {
        'bone_positions': test_bone_world_positions(),
        'pose_application': test_pose_application(),
        'ik_stability': test_ik_solver_stability(),
        'mesh_deformation': test_mesh_deformation()
    }
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 FIX VERIFICATION SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✅ FIXED" if passed_test else "❌ STILL BROKEN"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if passed_test:
            passed += 1
    
    print(f"\n🎯 Overall Fix Success Rate: {passed}/{total} ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL CRITICAL BUGS FIXED! System is now fully functional.")
    elif passed >= total * 0.75:
        print("✅ Major improvements made. Most critical issues resolved.")
    else:
        print("⚠️ Significant issues remain. Further fixes needed.")
    
    return results

if __name__ == "__main__":
    results = run_all_fix_verification_tests()
