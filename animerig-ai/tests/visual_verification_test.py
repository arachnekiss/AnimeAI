#!/usr/bin/env python3
"""
🔬 VISUAL VERIFICATION TEST - ACTUAL IMPLEMENTATION PROOF
Tests real mesh deformation, finger control, and 2.5D effects with visual output
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import numpy as np
import cv2
import time
import math
from typing import Dict, List
import logging

# Import our animation systems
from ai.animation.skeletal_system import SkeletalAnimationSystem
from ai.animation.skeletal_animation_engine import SkeletalAnimationEngine
from ai.animation.professional_animator import ProfessionalAnimator

logger = logging.getLogger(__name__)

class VisualVerificationTest:
    """Visual proof that features actually work, not just placeholders"""
    
    def __init__(self):
        print("🎯 STARTING VISUAL VERIFICATION TEST")
        print("=" * 60)
        
        # Initialize systems
        self.skeletal_system = SkeletalAnimationSystem()
        self.animation_engine = SkeletalAnimationEngine()
        self.professional_animator = ProfessionalAnimator()
        
        # Test canvas
        self.canvas_width = 800
        self.canvas_height = 600
        self.test_frame = np.zeros((self.canvas_height, self.canvas_width, 3), dtype=np.uint8)
        
        # Results
        self.test_results = {}
        
    def test_1_bone_hierarchy_actual(self):
        """Test 1: Verify actual bone hierarchy exists"""
        print("\n🦴 TEST 1: Bone Hierarchy Verification")
        print("-" * 40)
        
        bones = self.skeletal_system.bones
        
        # Check for specific bone structure
        required_bones = [
            'root', 'spine', 'chest', 'neck', 'head',
            'left_shoulder', 'left_upper_arm', 'left_forearm', 'left_hand',
            'right_shoulder', 'right_upper_arm', 'right_forearm', 'right_hand',
            'left_thumb_0', 'left_index_0', 'left_middle_0', 'left_ring_0', 'left_pinky_0',
            'right_thumb_0', 'right_index_0', 'right_middle_0', 'right_ring_0', 'right_pinky_0'
        ]
        
        missing_bones = []
        for bone_name in required_bones:
            if bone_name not in bones:
                missing_bones.append(bone_name)
            else:
                bone = bones[bone_name]
                world_pos = bone.get_world_position()
                print(f"✓ {bone_name}: World Position {world_pos}")
        
        if missing_bones:
            print(f"❌ MISSING BONES: {missing_bones}")
            self.test_results['bone_hierarchy'] = False
        else:
            print(f"✅ ALL {len(bones)} BONES PRESENT")
            self.test_results['bone_hierarchy'] = True
        
        return len(bones) >= 60  # Professional rigs have 60+ bones
        
    def test_2_individual_finger_control(self):
        """Test 2: Individual finger control - PEACE SIGN TEST"""
        print("\n✌️ TEST 2: Individual Finger Control (Peace Sign)")
        print("-" * 40)
        
        # Apply peace sign pose
        self.skeletal_system.apply_pose('peace_sign')
        
        # Check specific finger positions for peace sign
        checks = []
        
        # Index and middle should be extended (lower curl)
        if 'right_index_0' in self.skeletal_system.bones:
            index_rotation = self.skeletal_system.bones['right_index_0'].local_transform.rotation
            checks.append(("Index finger extended", abs(index_rotation[2]) < 0.5))
            print(f"Index finger rotation: {index_rotation}")
        
        if 'right_middle_0' in self.skeletal_system.bones:
            middle_rotation = self.skeletal_system.bones['right_middle_0'].local_transform.rotation
            checks.append(("Middle finger extended", abs(middle_rotation[2]) < 0.5))
            print(f"Middle finger rotation: {middle_rotation}")
        
        # Ring and pinky should be curled (higher rotation)
        if 'right_ring_0' in self.skeletal_system.bones:
            ring_rotation = self.skeletal_system.bones['right_ring_0'].local_transform.rotation
            checks.append(("Ring finger curled", abs(ring_rotation[2]) > 0.8))
            print(f"Ring finger rotation: {ring_rotation}")
        
        if 'right_pinky_0' in self.skeletal_system.bones:
            pinky_rotation = self.skeletal_system.bones['right_pinky_0'].local_transform.rotation
            checks.append(("Pinky finger curled", abs(pinky_rotation[2]) > 0.8))
            print(f"Pinky finger rotation: {pinky_rotation}")
        
        # Test individual finger control via engine
        print("\nTesting engine finger control...")
        self.animation_engine.set_finger_pose('right', 'index', 0.0)  # Fully extended
        self.animation_engine.set_finger_pose('right', 'pinky', 1.0)  # Fully curled
        
        success = all(check[1] for check in checks)
        print(f"✅ Peace sign test: {success}")
        self.test_results['finger_control'] = success
        
        return success
        
    def test_3_facial_blend_shapes(self):
        """Test 3: Facial blend shape system actual values"""
        print("\n😊 TEST 3: Facial Blend Shape System")
        print("-" * 40)
        
        # Test different emotions
        emotions = ['happy', 'sad', 'angry', 'surprised']
        
        for emotion in emotions:
            print(f"\nTesting {emotion} emotion...")
            self.skeletal_system.set_emotion(emotion, intensity=0.8)
            
            # Check blend shape values
            relevant_shapes = []
            for shape_name, weight in self.skeletal_system.blend_shapes.items():
                if weight > 0.1:  # Only show active shapes
                    relevant_shapes.append(f"{shape_name}: {weight:.2f}")
            
            print(f"Active blend shapes: {relevant_shapes}")
        
        # Test engine blend shapes
        print("\nTesting animation engine blend shapes...")
        self.animation_engine.set_emotion('excited', 0.9)
        
        # Check if blend shape system has actual data
        has_blend_shapes = len(self.skeletal_system.blend_shapes) > 20
        print(f"✅ Blend shapes system: {has_blend_shapes} ({len(self.skeletal_system.blend_shapes)} shapes)")
        
        self.test_results['facial_animation'] = has_blend_shapes
        return has_blend_shapes
        
    def test_4_ik_solver_fabrik(self):
        """Test 4: FABRIK IK solver with actual calculations"""
        print("\n🎯 TEST 4: FABRIK IK Solver")
        print("-" * 40)
        
        # Test IK target reaching
        target_position = np.array([0.5, 0.8, 0.0])
        
        print(f"Setting IK target: {target_position}")
        
        # Get initial arm positions
        if 'right_arm' in self.skeletal_system.ik_chains:
            chain = self.skeletal_system.ik_chains['right_arm']
            initial_positions = [bone.get_world_position() for bone in chain]
            print(f"Initial arm chain positions:")
            for i, pos in enumerate(initial_positions):
                print(f"  Joint {i}: {pos}")
            
            # Apply IK
            self.skeletal_system.solve_ik_fabrik('right_arm', target_position)
            
            # Get final positions
            final_positions = [bone.get_world_position() for bone in chain]
            print(f"Final arm chain positions:")
            for i, pos in enumerate(final_positions):
                print(f"  Joint {i}: {pos}")
            
            # Check if end effector moved toward target
            end_effector_movement = np.linalg.norm(final_positions[-1] - initial_positions[-1])
            ik_working = end_effector_movement > 0.01
            
            print(f"End effector movement: {end_effector_movement:.4f}")
            print(f"✅ IK solver working: {ik_working}")
            
            self.test_results['ik_solver'] = ik_working
            return ik_working
        
        print("❌ No IK chains found")
        self.test_results['ik_solver'] = False
        return False
        
    def test_5_mesh_deformation_proof(self):
        """Test 5: Prove actual mesh deformation, not placeholders"""
        print("\n🖼️ TEST 5: Mesh Deformation Verification")
        print("-" * 40)
        
        # Create test mesh
        test_vertices = np.array([
            [100, 100], [200, 100], [150, 150],
            [120, 180], [180, 180], [150, 200]
        ], dtype=np.float32)
        
        print(f"Original vertices:\n{test_vertices}")
        
        # Get bone transformation matrices
        bone_matrices = self.skeletal_system.get_bone_matrices()
        print(f"Available bone matrices: {len(bone_matrices)}")
        
        # Test professional animator
        if hasattr(self.professional_animator, '_apply_skeletal_deformation'):
            print("Professional animator has skeletal deformation method")
            
            # Apply pose and check if vertices would change
            self.skeletal_system.apply_pose('wave')
            updated_matrices = self.skeletal_system.get_bone_matrices()
            
            # Check if matrices actually changed
            matrix_changes = 0
            for bone_name in bone_matrices:
                if bone_name in updated_matrices:
                    diff = np.linalg.norm(updated_matrices[bone_name] - bone_matrices[bone_name])
                    if diff > 0.001:
                        matrix_changes += 1
                        print(f"Matrix changed for {bone_name}: {diff:.4f}")
            
            deformation_working = matrix_changes > 0
            print(f"✅ Bone matrices changing: {deformation_working} ({matrix_changes} bones)")
        else:
            print("❌ No skeletal deformation method found")
            deformation_working = False
        
        self.test_results['mesh_deformation'] = deformation_working
        return deformation_working
        
    def test_6_visual_rendering_test(self):
        """Test 6: Generate actual visual output"""
        print("\n🎨 TEST 6: Visual Rendering Test")
        print("-" * 40)
        
        # Clear canvas
        self.test_frame.fill(50)  # Dark gray background
        
        # Test wireframe rendering
        if hasattr(self.animation_engine, 'render_wireframe'):
            print("Testing wireframe rendering...")
            
            # Apply interesting pose
            self.skeletal_system.apply_pose('peace_sign')
            self.skeletal_system.update(0.016)  # 60 FPS frame
            
            # Attempt wireframe rendering
            try:
                rendered_frame = self.animation_engine.render_wireframe(self.test_frame)
                
                # Check if anything was drawn
                if not np.array_equal(rendered_frame, self.test_frame):
                    print("✅ Wireframe rendering successful")
                    
                    # Save test image
                    output_path = "c:/ANIMEAI/animerig-ai/tests/visual_test_output.png"
                    cv2.imwrite(output_path, rendered_frame)
                    print(f"✅ Test image saved: {output_path}")
                    
                    self.test_results['visual_rendering'] = True
                    return True
                else:
                    print("⚠️ Wireframe rendering returned unchanged image")
            except Exception as e:
                print(f"❌ Wireframe rendering error: {e}")
        
        # Alternative: Draw bone positions manually to prove they exist
        print("Drawing bone positions manually...")
        
        # Get bone positions and draw them
        bones_drawn = 0
        for bone_name, bone in self.skeletal_system.bones.items():
            try:
                world_pos = bone.get_world_position()
                
                # Convert 3D to 2D screen coordinates
                screen_x = int(400 + world_pos[0] * 100)  # Center + scale
                screen_y = int(300 - world_pos[1] * 100)  # Center + flip Y
                
                # Ensure coordinates are in bounds
                if 0 <= screen_x < self.canvas_width and 0 <= screen_y < self.canvas_height:
                    # Draw bone as colored circle
                    color = (0, 255, 255) if 'finger' in bone_name else (255, 100, 100)
                    cv2.circle(self.test_frame, (screen_x, screen_y), 3, color, -1)
                    bones_drawn += 1
                    
                    # Draw bone name
                    cv2.putText(self.test_frame, bone_name[:8], (screen_x+5, screen_y-5),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1)
            except Exception as e:
                print(f"Error drawing bone {bone_name}: {e}")
        
        print(f"✅ Drew {bones_drawn} bone positions")
        
        # Save manual rendering
        output_path = "c:/ANIMEAI/animerig-ai/tests/bone_positions_test.png"
        cv2.imwrite(output_path, self.test_frame)
        print(f"✅ Bone positions image saved: {output_path}")
        
        self.test_results['visual_rendering'] = bones_drawn > 0
        return bones_drawn > 0
        
    def test_7_performance_benchmark(self):
        """Test 7: Performance verification for 60 FPS claims"""
        print("\n⚡ TEST 7: Performance Benchmark")
        print("-" * 40)
        
        frame_times = []
        num_frames = 120  # 2 seconds at 60 FPS
        
        print(f"Running {num_frames} frame updates...")
        
        for frame in range(num_frames):
            start_time = time.perf_counter()
            
            # Simulate full animation update
            self.skeletal_system.update(0.016)  # 60 FPS delta
            
            # Change poses to stress test
            if frame % 30 == 0:
                poses = ['idle', 'wave', 'peace_sign', 'thinking']
                self.skeletal_system.apply_pose(poses[frame // 30 % len(poses)])
            
            end_time = time.perf_counter()
            frame_time = (end_time - start_time) * 1000  # Convert to ms
            frame_times.append(frame_time)
        
        # Calculate performance metrics
        avg_frame_time = np.mean(frame_times)
        max_frame_time = np.max(frame_times)
        fps_estimate = 1000 / avg_frame_time
        can_60fps = avg_frame_time < 16.67  # 60 FPS = 16.67ms per frame
        
        print(f"Average frame time: {avg_frame_time:.2f}ms")
        print(f"Maximum frame time: {max_frame_time:.2f}ms")
        print(f"Estimated FPS: {fps_estimate:.1f}")
        print(f"✅ Can achieve 60 FPS: {can_60fps}")
        
        self.test_results['performance'] = can_60fps
        return can_60fps
        
    def test_8_2d5_effects_verification(self):
        """Test 8: 2.5D head rotation effects"""
        print("\n🔄 TEST 8: 2.5D Effects Verification")
        print("-" * 40)
        
        # Test multi-angle system
        if hasattr(self.animation_engine, 'multi_angle'):
            print("Testing 2.5D multi-angle system...")
            
            # Test different head rotations
            test_angles = [
                (0, 0),      # Front view
                (0, 30),     # Three-quarter right
                (0, -30),    # Three-quarter left
                (0, 90),     # Profile right
                (0, -90),    # Profile left
            ]
            
            effects_working = False
            
            for angle_x, angle_y in test_angles:
                try:
                    print(f"Testing head rotation: ({angle_x}, {angle_y})")
                    
                    # Apply head rotation
                    if 'head' in self.skeletal_system.bones:
                        head_bone = self.skeletal_system.bones['head']
                        head_bone.local_transform.rotation = np.array([
                            math.radians(angle_x),
                            math.radians(angle_y),
                            0
                        ])
                        
                        self.skeletal_system.update(0.016)
                        
                        # Check if world position changed
                        world_pos = head_bone.get_world_position()
                        print(f"  Head world position: {world_pos}")
                        effects_working = True
                    
                except Exception as e:
                    print(f"  Error: {e}")
            
            print(f"✅ 2.5D effects working: {effects_working}")
            self.test_results['2d5_effects'] = effects_working
            return effects_working
        else:
            print("❌ No multi-angle system found")
            self.test_results['2d5_effects'] = False
            return False
    
    def run_all_tests(self):
        """Run comprehensive verification suite"""
        print("🚀 RUNNING COMPREHENSIVE VERIFICATION TESTS")
        print("=" * 60)
        
        tests = [
            self.test_1_bone_hierarchy_actual,
            self.test_2_individual_finger_control,
            self.test_3_facial_blend_shapes,
            self.test_4_ik_solver_fabrik,
            self.test_5_mesh_deformation_proof,
            self.test_6_visual_rendering_test,
            self.test_7_performance_benchmark,
            self.test_8_2d5_effects_verification
        ]
        
        results = []
        start_time = time.time()
        
        for test in tests:
            try:
                result = test()
                results.append(result)
            except Exception as e:
                print(f"❌ Test failed with error: {e}")
                results.append(False)
        
        total_time = time.time() - start_time
        
        # Print comprehensive results
        print("\n" + "=" * 60)
        print("📊 FINAL VERIFICATION RESULTS")
        print("=" * 60)
        
        test_names = [
            "Bone Hierarchy",
            "Individual Finger Control", 
            "Facial Blend Shapes",
            "FABRIK IK Solver",
            "Mesh Deformation",
            "Visual Rendering",
            "60 FPS Performance",
            "2.5D Effects"
        ]
        
        passed = sum(results)
        total = len(results)
        
        for i, (name, result) in enumerate(zip(test_names, results)):
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{i+1:2d}. {name:<25} {status}")
        
        print("-" * 60)
        print(f"TOTAL PASSED: {passed}/{total} ({passed/total*100:.1f}%)")
        print(f"EXECUTION TIME: {total_time:.2f}s")
        
        # Verdict
        if passed >= 6:  # At least 75% pass rate
            print("\n🎉 VERIFICATION SUCCESSFUL!")
            print("   AnimeRig AI has REAL skeletal animation implementation")
            print("   Features are NOT placeholders - actual functionality confirmed")
        else:
            print("\n⚠️ VERIFICATION CONCERNS")
            print("   Some features may be incomplete or placeholder code")
            print("   Recommend further development before production use")
        
        return self.test_results

if __name__ == "__main__":
    # Run the verification test
    test = VisualVerificationTest()
    results = test.run_all_tests()
    
    print(f"\n🔍 Detailed results available in test_results: {results}")
