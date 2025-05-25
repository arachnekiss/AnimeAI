#!/usr/bin/env python3
"""
Professional Skeletal Animation System for AnimeRig AI - FIXED VERSION
Provides VTuber/Live2D quality character animation with bones, IK, and 2.5D effects

CRITICAL FIXES APPLIED:
1. Fixed bone world position calculations (was returning [0,0,0])
2. Fixed pose application system (rotations now properly applied)
3. Fixed IK solver division by zero errors
4. Improved bone hierarchy with proper length offsets
"""

import numpy as np
import math
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class BoneType(Enum):
    ROOT = "root"
    SPINE = "spine"
    LIMB = "limb"
    FINGER = "finger"
    FACIAL = "facial"

@dataclass
class Transform:
    """3D transformation data"""
    position: np.ndarray = None
    rotation: np.ndarray = None  # Euler angles (x, y, z)
    scale: np.ndarray = None
    
    def __post_init__(self):
        if self.position is None:
            self.position = np.array([0.0, 0.0, 0.0])
        if self.rotation is None:
            self.rotation = np.array([0.0, 0.0, 0.0])
        if self.scale is None:
            self.scale = np.array([1.0, 1.0, 1.0])

class Bone:
    """Professional bone implementation with hierarchical transforms - FIXED"""
    
    def __init__(self, name: str, bone_type: BoneType = BoneType.LIMB, 
                 parent: Optional['Bone'] = None, length: float = 1.0):
        self.name = name
        self.bone_type = bone_type
        self.parent = parent
        self.children: List['Bone'] = []
        self.length = length
        
        # Transform data
        self.local_transform = Transform()
        self.world_transform = Transform()
        self.bind_pose = Transform()
        
        # Animation data
        self.target_rotation = np.array([0.0, 0.0, 0.0])
        self.rotation_speed = 5.0
        self.constraints = {'min_angle': -180, 'max_angle': 180}
        
        # IK data
        self.is_ik_target = False
        self.ik_chain_length = 0
        
        if parent:
            parent.add_child(self)
    
    def add_child(self, child: 'Bone'):
        """Add child bone"""
        if child not in self.children:
            self.children.append(child)
            child.parent = self
    
    def get_world_position(self) -> np.ndarray:
        """Calculate world position from hierarchy - FIXED"""
        if self.parent is None:
            return self.local_transform.position.copy()
        
        parent_world = self.parent.get_world_position()
        parent_rotation_matrix = self._euler_to_matrix(self.parent.get_world_rotation())
        
        # CRITICAL FIX: Add bone length offset along parent's local Y-axis (bone direction)
        bone_direction = np.array([0.0, self.length, 0.0])
        world_bone_direction = parent_rotation_matrix @ bone_direction
        
        # Combine parent position + bone length + local offset
        local_offset = parent_rotation_matrix @ self.local_transform.position
        
        return parent_world + world_bone_direction + local_offset
    
    def get_world_rotation(self) -> np.ndarray:
        """Calculate world rotation from hierarchy"""
        if self.parent is None:
            return self.local_transform.rotation.copy()
        
        parent_rotation = self.parent.get_world_rotation()
        return parent_rotation + self.local_transform.rotation
    
    def update_world_transform(self):
        """Update world transform and propagate to children"""
        self.world_transform.position = self.get_world_position()
        self.world_transform.rotation = self.get_world_rotation()
        self.world_transform.scale = self.local_transform.scale.copy()
        
        for child in self.children:
            child.update_world_transform()
    
    def rotate_to(self, target_rotation: np.ndarray, delta_time: float):
        """Smoothly rotate towards target"""
        diff = target_rotation - self.local_transform.rotation
        
        # Apply constraints
        for i in range(3):
            diff[i] = np.clip(diff[i], self.constraints['min_angle'], self.constraints['max_angle'])
        
        # Smooth interpolation
        rotation_delta = diff * self.rotation_speed * delta_time
        self.local_transform.rotation += rotation_delta
    
    def _euler_to_matrix(self, euler: np.ndarray) -> np.ndarray:
        """Convert Euler angles to rotation matrix"""
        x, y, z = euler
        
        # Rotation matrices
        Rx = np.array([[1, 0, 0],
                       [0, math.cos(x), -math.sin(x)],
                       [0, math.sin(x), math.cos(x)]])
        
        Ry = np.array([[math.cos(y), 0, math.sin(y)],
                       [0, 1, 0],
                       [-math.sin(y), 0, math.cos(y)]])
        
        Rz = np.array([[math.cos(z), -math.sin(z), 0],
                       [math.sin(z), math.cos(z), 0],
                       [0, 0, 1]])
        
        return Rz @ Ry @ Rx

class SkeletalAnimationSystem:
    """Professional skeletal animation system - FIXED"""
    
    def __init__(self):
        self.bones: Dict[str, Bone] = {}
        self.root_bone: Optional[Bone] = None
        self.ik_chains: Dict[str, List[Bone]] = {}
        self.blend_shapes: Dict[str, float] = {}
        
        # Animation state
        self.current_pose = "idle"
        self.animation_time = 0.0
        self.pose_transitions = {}
        self.breathing_enabled = True
        
        self._create_humanoid_skeleton()
        self._setup_ik_chains()
        self._init_blend_shapes()
    
    def _create_humanoid_skeleton(self):
        """Create complete humanoid skeleton with proper bone lengths"""
        # Root and spine
        self.root_bone = Bone("root", BoneType.ROOT, length=0.0)
        spine = Bone("spine", BoneType.SPINE, self.root_bone, length=0.3)
        chest = Bone("chest", BoneType.SPINE, spine, length=0.25)
        neck = Bone("neck", BoneType.SPINE, chest, length=0.1)
        head = Bone("head", BoneType.FACIAL, neck, length=0.15)
        
        self.bones.update({
            "root": self.root_bone, "spine": spine, "chest": chest,
            "neck": neck, "head": head
        })
        
        # Arms with proper lengths
        left_shoulder = Bone("left_shoulder", BoneType.LIMB, chest, length=0.05)
        left_upper_arm = Bone("left_upper_arm", BoneType.LIMB, left_shoulder, length=0.3)
        left_forearm = Bone("left_forearm", BoneType.LIMB, left_upper_arm, length=0.25)
        left_hand = Bone("left_hand", BoneType.LIMB, left_forearm, length=0.1)
        
        right_shoulder = Bone("right_shoulder", BoneType.LIMB, chest, length=0.05)
        right_upper_arm = Bone("right_upper_arm", BoneType.LIMB, right_shoulder, length=0.3)
        right_forearm = Bone("right_forearm", BoneType.LIMB, right_upper_arm, length=0.25)
        right_hand = Bone("right_hand", BoneType.LIMB, right_forearm, length=0.1)
        
        self.bones.update({
            "left_shoulder": left_shoulder, "left_upper_arm": left_upper_arm,
            "left_forearm": left_forearm, "left_hand": left_hand,
            "right_shoulder": right_shoulder, "right_upper_arm": right_upper_arm,
            "right_forearm": right_forearm, "right_hand": right_hand
        })
        
        # Fingers with individual joints
        finger_names = ["thumb", "index", "middle", "ring", "pinky"]
        finger_lengths = [0.05, 0.06, 0.065, 0.06, 0.05]
        
        # Left hand fingers
        for finger_name, finger_length in zip(finger_names, finger_lengths):
            for i in range(3):
                bone_name = f"left_{finger_name}_{i}"
                parent = left_hand if i == 0 else self.bones[f"left_{finger_name}_{i-1}"]
                bone = Bone(bone_name, BoneType.FINGER, parent, finger_length/3)
                self.bones[bone_name] = bone
        
        # Right hand fingers
        for finger_name, finger_length in zip(finger_names, finger_lengths):
            for i in range(3):
                bone_name = f"right_{finger_name}_{i}"
                parent = right_hand if i == 0 else self.bones[f"right_{finger_name}_{i-1}"]
                bone = Bone(bone_name, BoneType.FINGER, parent, finger_length/3)
                self.bones[bone_name] = bone
        
        # Legs with proper lengths
        left_hip = Bone("left_hip", BoneType.LIMB, self.root_bone, length=0.1)
        left_thigh = Bone("left_thigh", BoneType.LIMB, left_hip, length=0.4)
        left_shin = Bone("left_shin", BoneType.LIMB, left_thigh, length=0.4)
        left_foot = Bone("left_foot", BoneType.LIMB, left_shin, length=0.15)
        
        right_hip = Bone("right_hip", BoneType.LIMB, self.root_bone, length=0.1)
        right_thigh = Bone("right_thigh", BoneType.LIMB, right_hip, length=0.4)
        right_shin = Bone("right_shin", BoneType.LIMB, right_thigh, length=0.4)
        right_foot = Bone("right_foot", BoneType.LIMB, right_shin, length=0.15)
        
        self.bones.update({
            "left_hip": left_hip, "left_thigh": left_thigh,
            "left_shin": left_shin, "left_foot": left_foot,
            "right_hip": right_hip, "right_thigh": right_thigh,
            "right_shin": right_shin, "right_foot": right_foot
        })
        
        logger.info(f"Created humanoid skeleton with {len(self.bones)} bones")
    
    def _setup_ik_chains(self):
        """Setup IK chains for natural limb movement"""
        # Arm IK chains
        self.ik_chains["left_arm"] = [
            self.bones["left_shoulder"],
            self.bones["left_upper_arm"],
            self.bones["left_forearm"],
            self.bones["left_hand"]
        ]
        
        self.ik_chains["right_arm"] = [
            self.bones["right_shoulder"],
            self.bones["right_upper_arm"],
            self.bones["right_forearm"],
            self.bones["right_hand"]
        ]
        
        # Leg IK chains
        self.ik_chains["left_leg"] = [
            self.bones["left_hip"],
            self.bones["left_thigh"],
            self.bones["left_shin"],
            self.bones["left_foot"]
        ]
        
        self.ik_chains["right_leg"] = [
            self.bones["right_hip"],
            self.bones["right_thigh"],
            self.bones["right_shin"],
            self.bones["right_foot"]
        ]
    
    def _init_blend_shapes(self):
        """Initialize blend shapes for facial animation"""
        # Professional blend shape setup
        blend_shape_names = [
            'blink_left', 'blink_right', 'wink_left', 'wink_right',
            'eye_wide_left', 'eye_wide_right', 'eyebrow_up_left', 'eyebrow_up_right',
            'eyebrow_down_left', 'eyebrow_down_right', 'smile', 'frown',
            'mouth_open', 'lip_sync_A', 'lip_sync_E', 'lip_sync_I', 'lip_sync_O', 'lip_sync_U',
            'cheek_puff_left', 'cheek_puff_right', 'nose_scrunch', 'jaw_open'
        ]
        
        for shape_name in blend_shape_names:
            self.blend_shapes[shape_name] = 0.0
    
    def solve_ik_fabrik(self, chain_name: str, target_position: np.ndarray, iterations: int = 10):
        """Solve IK using FABRIK algorithm - FIXED (no more division by zero)"""
        if chain_name not in self.ik_chains:
            return
        
        chain = self.ik_chains[chain_name]
        if len(chain) < 2:
            return
        
        # Store original positions
        positions = [bone.get_world_position() for bone in chain]
        distances = []
        
        # Calculate distances between consecutive bones with safety check
        for i in range(len(positions)-1):
            dist = np.linalg.norm(positions[i+1] - positions[i])
            if dist < 1e-6:  # CRITICAL FIX: Minimum distance to avoid zero lengths
                dist = 0.1
            distances.append(dist)
        
        # Check if target is reachable
        total_length = sum(distances)
        target_distance = np.linalg.norm(target_position - positions[0])
        
        if target_distance > total_length:
            # Target unreachable - stretch towards target
            if target_distance > 1e-6:  # CRITICAL FIX: Avoid division by zero
                direction = (target_position - positions[0]) / target_distance
                for i in range(1, len(positions)):
                    positions[i] = positions[i-1] + direction * distances[i-1]
        else:
            # FABRIK algorithm with safety checks
            for _ in range(iterations):
                # Forward pass
                positions[-1] = target_position.copy()
                for i in range(len(positions)-2, -1, -1):
                    direction = (positions[i] - positions[i+1])
                    norm = np.linalg.norm(direction)
                    if norm > 1e-6:  # CRITICAL FIX: Avoid division by zero
                        direction = direction / norm
                        positions[i] = positions[i+1] + direction * distances[i]
                
                # Backward pass
                positions[0] = chain[0].get_world_position()
                for i in range(len(positions)-1):
                    direction = (positions[i+1] - positions[i])
                    norm = np.linalg.norm(direction)
                    if norm > 1e-6:  # CRITICAL FIX: Avoid division by zero
                        direction = direction / norm
                        positions[i+1] = positions[i] + direction * distances[i]
        
        # Apply solved positions back to bones
        for i, bone in enumerate(chain):
            if i < len(positions):
                # Calculate rotation needed to point to next position
                if i < len(positions) - 1:
                    direction = positions[i+1] - positions[i]
                    norm = np.linalg.norm(direction)
                    if norm > 1e-6:  # CRITICAL FIX: Avoid division by zero
                        direction = direction / norm
                        
                        # Convert direction to Euler angles with clipping
                        pitch = math.asin(np.clip(-direction[1], -1.0, 1.0))
                        yaw = math.atan2(direction[0], direction[2])
                        
                        bone.local_transform.rotation = np.array([pitch, yaw, 0])

    def apply_pose(self, pose_name: str, weight: float = 1.0):
        """Apply predefined pose - FIXED (rotations now properly applied)"""
        poses = {
            'idle': self._get_idle_pose(),
            'wave': self._get_wave_pose(),
            'peace_sign': self._get_peace_pose(),
            'thinking': self._get_thinking_pose(),
            'crossed_arms': self._get_crossed_arms_pose(),
            'dancing': self._get_dancing_pose()
        }
        
        if pose_name not in poses:
            return
        
        pose_data = poses[pose_name]
        
        for bone_name, rotation in pose_data.items():
            if bone_name in self.bones:
                # CRITICAL FIX: Convert degrees to radians and apply weight
                target = np.array(rotation) * weight * (math.pi / 180.0)
                self.bones[bone_name].target_rotation = target
                
                # Apply immediately for testing (remove smooth transition for now)
                self.bones[bone_name].local_transform.rotation = target
    
    def _get_idle_pose(self) -> Dict[str, List[float]]:
        """Natural idle pose"""
        return {
            'spine': [0, 0, 0],
            'chest': [0, 0, 0],
            'head': [0, 0, 0],
            'left_shoulder': [0, 0, -10],
            'right_shoulder': [0, 0, 10]
        }
    
    def _get_wave_pose(self) -> Dict[str, List[float]]:
        """Waving gesture"""
        return {
            'right_shoulder': [0, 0, 45],
            'right_upper_arm': [0, 0, -90],
            'right_forearm': [0, 0, -30],
            'right_hand': [0, 0, 20]
        }
    
    def _get_peace_pose(self) -> Dict[str, List[float]]:
        """Peace sign gesture - FIXED finger control"""
        return {
            'right_shoulder': [0, 0, 30],
            'right_upper_arm': [0, 0, -60],
            'right_forearm': [0, 0, -45],
            'right_index_0': [0, 0, -30],
            'right_middle_0': [0, 0, -30],
            'right_ring_0': [0, 0, 60],
            'right_pinky_0': [0, 0, 60],
            'right_thumb_0': [0, 0, 45]
        }
    
    def _get_thinking_pose(self) -> Dict[str, List[float]]:
        """Thinking pose"""
        return {
            'head': [15, 0, 0],
            'right_shoulder': [0, 0, 15],
            'right_upper_arm': [0, 45, -45],
            'right_forearm': [0, 0, -90],
            'right_hand': [0, 0, 0]
        }
    
    def _get_crossed_arms_pose(self) -> Dict[str, List[float]]:
        """Crossed arms pose"""
        return {
            'left_shoulder': [0, 0, -20],
            'left_upper_arm': [0, 45, -45],
            'left_forearm': [0, 0, -60],
            'right_shoulder': [0, 0, 20],
            'right_upper_arm': [0, -45, 45],
            'right_forearm': [0, 0, 60]
        }
    
    def _get_dancing_pose(self) -> Dict[str, List[float]]:
        """Dynamic dancing pose"""
        return {
            'spine': [0, 15, 0],
            'chest': [0, -10, 0],
            'head': [0, 5, 0],
            'left_shoulder': [0, 0, -30],
            'left_upper_arm': [0, 30, -60],
            'right_shoulder': [0, 0, 30],
            'right_upper_arm': [0, -30, 60]
        }
    
    def set_emotion(self, emotion: str, intensity: float = 1.0):
        """Set facial expression using blend shapes"""
        emotion_presets = {
            'happy': {'smile': 0.8, 'eyebrow_up_left': 0.3, 'eyebrow_up_right': 0.3},
            'sad': {'frown': 0.6, 'eyebrow_down_left': 0.4, 'eyebrow_down_right': 0.4},
            'surprised': {'eye_wide_left': 0.9, 'eye_wide_right': 0.9, 'mouth_open': 0.7},
            'angry': {'eyebrow_down_left': 0.8, 'eyebrow_down_right': 0.8, 'frown': 0.5}
        }
        
        # Reset all blend shapes
        for shape in self.blend_shapes:
            self.blend_shapes[shape] = 0.0
        
        # Apply emotion preset
        if emotion in emotion_presets:
            for shape, weight in emotion_presets[emotion].items():
                if shape in self.blend_shapes:
                    self.blend_shapes[shape] = weight * intensity
    
    def update(self, delta_time: float):
        """Update animation system"""
        self.animation_time += delta_time
        
        # Update bone rotations towards targets
        for bone in self.bones.values():
            bone.rotate_to(bone.target_rotation, delta_time)
        
        # Update world transforms
        if self.root_bone:
            self.root_bone.update_world_transform()
        
        # Apply breathing animation
        if self.breathing_enabled:
            breathing_intensity = 0.02 * math.sin(self.animation_time * 2.0)
            if 'chest' in self.bones:
                self.bones['chest'].local_transform.scale[1] = 1.0 + breathing_intensity
        else:
            # Reset chest scale when breathing is disabled
            if 'chest' in self.bones:
                self.bones['chest'].local_transform.scale[1] = 1.0
        
        # Apply natural head movement
        if 'head' in self.bones:
            head_sway = 0.01 * math.sin(self.animation_time * 1.5)
            self.bones['head'].local_transform.rotation[2] = head_sway
    
    def get_bone_matrices(self) -> Dict[str, np.ndarray]:
        """Get transformation matrices for all bones - FIXED"""
        matrices = {}
        
        for name, bone in self.bones.items():
            # Create transformation matrix
            translation_matrix = np.eye(4)
            translation_matrix[:3, 3] = bone.world_transform.position
            
            rotation_matrix = np.eye(4)
            rotation_matrix[:3, :3] = bone._euler_to_matrix(bone.world_transform.rotation)
            
            scale_matrix = np.eye(4)
            np.fill_diagonal(scale_matrix[:3, :3], bone.world_transform.scale)
            
            matrices[name] = translation_matrix @ rotation_matrix @ scale_matrix
        
        return matrices
    
    def enable_breathing_animation(self):
        """Enable breathing animation"""
        self.breathing_enabled = True
        logger.info("Breathing animation enabled")
    
    def disable_breathing_animation(self):
        """Disable breathing animation"""
        self.breathing_enabled = False
        logger.info("Breathing animation disabled")
    
    def get_all_bones(self) -> Dict[str, Dict]:
        """Get all bone data for external systems"""
        bone_data = {}
        
        for name, bone in self.bones.items():
            bone_data[name] = {
                'world_position': bone.get_world_position(),
                'world_rotation': bone.get_world_rotation(),
                'local_position': bone.local_transform.position,
                'local_rotation': bone.local_transform.rotation,
                'bone_type': bone.bone_type.value,
                'length': bone.length,
                'influence_radius': 50.0  # Default influence for mesh deformation
            }
        
        return bone_data
