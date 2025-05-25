"""
Professional VTuber Animation System Integration
Combines skeletal animation, multi-angle rendering, and facial animation systems
"""

import numpy as np
import cv2
import time
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
import json

# Import our professional animation systems
from .skeletal_system import SkeletalAnimationSystem
from .multi_angle_system import MultiAngleRenderer  
from .facial_animation import AdvancedFacialAnimator

# Performance monitoring
@dataclass
class PerformanceMetrics:
    """Performance tracking for real-time animation"""
    frame_time: float = 0.0
    fps: float = 0.0
    skeletal_time: float = 0.0
    facial_time: float = 0.0
    render_time: float = 0.0
    total_bones: int = 0
    active_blend_shapes: int = 0


class ProfessionalAnimator:
    """
    Professional-grade VTuber animator combining all advanced systems
    Replaces the basic Live2DAnimator with professional capabilities
    """
    
    def __init__(self, target_fps: int = 60, enable_physics: bool = True):
        """Initialize the professional animation system"""
        self.target_fps = target_fps
        self.frame_time_target = 1.0 / target_fps
        self.enable_physics = enable_physics
        
        # Initialize sub-systems
        self.skeletal_system = SkeletalAnimationSystem()
        self.multi_angle_renderer = None  # Will be initialized when character image is loaded
        self.facial_animator = AdvancedFacialAnimator()
        
        # Animation state
        self.current_pose = "idle"
        self.current_emotion = "neutral"
        self.emotion_intensity = 0.5
        self.head_rotation = [0.0, 0.0, 0.0]  # pitch, yaw, roll
        self.viewing_angle = 0.0  # -90 to 90 degrees
        self.looking_direction = [0.0, 0.0]  # up/down, left/right
        
        # Performance tracking
        self.performance = PerformanceMetrics()
        self.frame_times = []
        self.max_frame_history = 60
        
        # Character data
        self.character_image = None
        self.character_mesh = None
        self.character_layers = {}
        
        # Real-time state
        self.is_speaking = False
        self.current_text = ""
        self.auto_blink_enabled = True
        self.breathing_enabled = True
        self.physics_enabled = enable_physics
          # Initialize systems
        self._initialize_character()
        
        logging.info("Professional VTuber Animation System initialized")
        logging.info(f"Target FPS: {target_fps}")
        logging.info(f"Physics enabled: {enable_physics}")
    
    def _initialize_character(self):
        """Initialize default character setup"""
        # All systems are already initialized in their constructors
        pass
        
        # Start auto-animation systems
        if self.auto_blink_enabled:
            self.facial_animator.start_auto_blink()
        
        if self.breathing_enabled:
            self.skeletal_system.enable_breathing_animation()
    
    def load_character(self, image_path: str) -> bool:
        """Load character image and set up animation mesh"""
        try:            # Load character image
            self.character_image = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
            if self.character_image is None:
                logging.error(f"Failed to load character image: {image_path}")
                return False
            
            # Initialize multi-angle renderer with the loaded image
            self.multi_angle_renderer = MultiAngleRenderer(self.character_image)
            
            # Process character for animation
            self._process_character_for_animation()
            
            # Set up layer separation
            self._setup_character_layers()
            
            # Initialize facial landmarks
            self._detect_facial_features()
            
            logging.info(f"Character loaded successfully: {image_path}")
            return True
            
        except Exception as e:
            logging.error(f"Error loading character: {e}")
            return False
    
    def _process_character_for_animation(self):
        """Process character image for professional animation"""
        if self.character_image is None:
            return
        
        # Auto-detect and create animation mesh
        self.character_mesh = self._create_animation_mesh()
        
        # Set up bone binding
        self._bind_mesh_to_skeleton()
        
        # Create facial region mapping
        self._map_facial_regions()
    
    def _create_animation_mesh(self) -> Dict:
        """Create professional animation mesh from character image"""
        height, width = self.character_image.shape[:2]
        
        # Generate dense mesh for smooth deformation
        mesh_density = 50  # Higher density for professional quality
        vertices = []
        triangles = []
        
        # Create regular grid mesh
        for y in range(mesh_density + 1):
            for x in range(mesh_density + 1):
                u = x / mesh_density
                v = y / mesh_density
                vertices.append([u * width, v * height])
        
        # Create triangular mesh
        for y in range(mesh_density):
            for x in range(mesh_density):
                # Two triangles per quad
                i = y * (mesh_density + 1) + x
                triangles.append([i, i + 1, i + mesh_density + 1])
                triangles.append([i + 1, i + mesh_density + 2, i + mesh_density + 1])
        
        return {
            'vertices': np.array(vertices, dtype=np.float32),
            'triangles': np.array(triangles, dtype=np.int32),
            'uv_coords': np.array(vertices, dtype=np.float32) / [width, height],
            'bone_weights': np.zeros((len(vertices), 4), dtype=np.float32),
            'bone_indices': np.zeros((len(vertices), 4), dtype=np.int32)
        }
    
    def _bind_mesh_to_skeleton(self):
        """Bind mesh vertices to skeleton bones"""
        if self.character_mesh is None:
            return
        
        vertices = self.character_mesh['vertices']
        bone_weights = self.character_mesh['bone_weights']
        bone_indices = self.character_mesh['bone_indices']
        
        # Get bone positions from skeletal system
        bones = self.skeletal_system.get_all_bones()
        
        # Calculate bone weights for each vertex
        for i, vertex in enumerate(vertices):
            weights = []
            indices = []
            
            for bone_name, bone_data in bones.items():
                bone_pos = bone_data['world_position']
                distance = np.linalg.norm(vertex - bone_pos[:2])  # 2D distance
                
                # Calculate weight based on distance and bone influence radius
                influence_radius = bone_data.get('influence_radius', 50.0)
                if distance < influence_radius:
                    weight = max(0.0, 1.0 - (distance / influence_radius))
                    weights.append((weight, bone_data['index']))
            
            # Sort by weight and take top 4 influences
            weights.sort(key=lambda x: x[0], reverse=True)
            weights = weights[:4]
              # Normalize weights
            total_weight = sum(w[0] for w in weights)
            if total_weight > 0:
                for j, (weight, bone_idx) in enumerate(weights):
                    bone_weights[i, j] = weight / total_weight
                    bone_indices[i, j] = bone_idx
    
    def _setup_character_layers(self):
        """Set up character layers for 2.5D rendering"""
        if self.character_image is None:
            return
        
        # Auto-detect layer regions (if multi-angle renderer is available)
        if self.multi_angle_renderer:
            layers = self.multi_angle_renderer.auto_detect_layers(self.character_image)
            
            # Store character layers
            self.character_layers = layers
        else:
            # Fallback for when multi-angle renderer is not available
            self.character_layers = {}
        
        # Set up layer depth and parallax settings
        layer_depths = {
            'background_hair': -0.3,
            'background_objects': -0.5,
            'face': 0.0,
            'eyes': 0.1,
            'mouth': 0.05,
            'foreground_hair': 0.2,
            'accessories': 0.15,
            'shadows': -0.1        }
        
        if self.multi_angle_renderer:
            self.multi_angle_renderer.set_layer_depths(layer_depths)
    
    def _detect_facial_features(self):
        """Detect facial features for advanced animation"""
        if self.character_image is None:
            return
        
        # Use facial animator to detect landmarks
        landmarks = self.facial_animator.detect_face_landmarks(self.character_image)
        
        if landmarks:
            # Set up facial regions
            self.facial_animator.setup_facial_regions(landmarks)
            logging.info(f"Detected {len(landmarks)} facial landmarks")
        else:
            # Use default facial setup
            self.facial_animator.setup_default_facial_regions()
            logging.warning("Using default facial regions (no landmarks detected)")
    
    def _map_facial_regions(self):
        """Map facial regions to blend shapes"""
        # This creates the mapping between mesh regions and facial blend shapes
        facial_regions = self.facial_animator.get_facial_regions()
        
        # Create region-to-blend-shape mapping
        self.facial_region_mapping = {
            'left_eye': ['blink_left', 'wink_left', 'eye_wide_left'],
            'right_eye': ['blink_right', 'wink_right', 'eye_wide_right'],
            'left_eyebrow': ['eyebrow_up_left', 'eyebrow_down_left'],
            'right_eyebrow': ['eyebrow_up_right', 'eyebrow_down_right'],
            'mouth': ['smile', 'frown', 'mouth_open', 'lip_sync_A', 'lip_sync_E', 'lip_sync_I', 'lip_sync_O', 'lip_sync_U'],
            'cheeks': ['cheek_puff_left', 'cheek_puff_right'],
            'nose': ['nose_scrunch']
        }
    
    # Main animation methods
    def set_pose(self, pose_name: str, transition_time: float = 0.5):
        """Set body pose with smooth transition"""
        start_time = time.time()
        
        # Use apply_pose method from SkeletalAnimationSystem
        self.skeletal_system.apply_pose(pose_name)
        success = True  # apply_pose doesn't return a value
        if success:
            self.current_pose = pose_name
            logging.info(f"Pose changed to: {pose_name}")
        
        self.performance.skeletal_time = time.time() - start_time
        return success
    
    def set_emotion(self, emotion: str, intensity: float = 0.5, transition_time: float = 0.3):
        """Set facial emotion with intensity"""
        start_time = time.time()
        
        success = self.facial_animator.set_emotion(emotion, intensity, transition_time)
        if success:
            self.current_emotion = emotion
            self.emotion_intensity = intensity
            logging.info(f"Emotion changed to: {emotion} (intensity: {intensity:.2f})")
        
        self.performance.facial_time = time.time() - start_time
        return success
    
    def set_head_rotation(self, pitch: float, yaw: float, roll: float = 0.0):
        """Set head rotation angles (in degrees)"""
        self.head_rotation = [pitch, yaw, roll]
        
        # Apply to skeletal system
        self.skeletal_system.set_bone_rotation('head', 
                                              np.radians(pitch), 
                                              np.radians(yaw), 
                                              np.radians(roll))
          # Update viewing angle for 2.5D rendering
        self.viewing_angle = yaw
        if self.multi_angle_renderer:
            self.multi_angle_renderer.set_viewing_angle(np.radians(yaw))
    
    def set_looking_direction(self, horizontal: float, vertical: float):
        """Set eye looking direction (-1.0 to 1.0)"""
        self.looking_direction = [horizontal, vertical]
        
        # Apply to facial animator
        self.facial_animator.set_eye_direction(horizontal, vertical)
    
    def speak_text(self, text: str, auto_lip_sync: bool = True):
        """Make character speak with automatic lip sync"""
        self.is_speaking = True
        self.current_text = text
        
        if auto_lip_sync:
            # Generate lip sync from text
            self.facial_animator.speak_text(text)
    
    def stop_speaking(self):
        """Stop speaking animation"""
        self.is_speaking = False
        self.current_text = ""
        self.facial_animator.stop_speaking()
    
    def trigger_gesture(self, gesture_name: str):
        """Trigger a gesture animation"""
        self.skeletal_system.trigger_gesture(gesture_name)
    
    def update(self, delta_time: float) -> np.ndarray:
        """
        Main update loop - call this every frame
        Returns the rendered frame
        """
        frame_start = time.time()
        
        # Update skeletal animation
        skeletal_start = time.time()
        self.skeletal_system.update(delta_time)
        self.performance.skeletal_time = time.time() - skeletal_start
        
        # Update facial animation
        facial_start = time.time()
        self.facial_animator.update(delta_time)
        self.performance.facial_time = time.time() - facial_start
        
        # Render frame
        render_start = time.time()
        rendered_frame = self._render_frame()
        self.performance.render_time = time.time() - render_start
          # Update performance metrics
        self.performance.frame_time = time.time() - frame_start
        self.performance.fps = 1.0 / self.performance.frame_time if self.performance.frame_time > 0 else 0
        self.performance.total_bones = len(self.skeletal_system.bones)
        self.performance.active_blend_shapes = len([bs for bs in self.facial_animator.blend_shapes.values() if bs.weight > 0.01])
        
        # Track frame times
        self._update_frame_time_history()
        
        return rendered_frame
    
    def _render_frame(self) -> np.ndarray:
        """Render the current animation frame"""
        if self.character_image is None:
            # Return black frame if no character loaded
            return np.zeros((480, 640, 3), dtype=np.uint8)
        
        render_start = time.time()
        
        # Get current bone transforms
        bone_transforms = self.skeletal_system.get_bone_transforms()
        
        # Get current blend shape weights
        blend_weights = self.facial_animator.get_blend_shape_weights()
          # Apply deformations to character mesh
        deformed_mesh = self._apply_deformations(bone_transforms, blend_weights)
        
        # Render with multi-angle system (if available)
        if self.multi_angle_renderer:
            rendered_frame = self.multi_angle_renderer.render_frame(
                self.character_layers,
                deformed_mesh,
                self.viewing_angle,
                self.looking_direction
            )
        else:
            # Fallback to original image if multi-angle renderer not available
            rendered_frame = self.character_image if self.character_image is not None else np.zeros((512, 512, 3), dtype=np.uint8)
        
        self.performance.render_time = time.time() - render_start
        return rendered_frame
    
    def _apply_deformations(self, bone_transforms: Dict, blend_weights: Dict) -> Dict:
        """Apply skeletal and facial deformations to mesh"""
        if self.character_mesh is None:
            return {}
        
        # Start with original vertices
        vertices = self.character_mesh['vertices'].copy()
        
        # Apply skeletal deformation
        vertices = self._apply_skeletal_deformation(vertices, bone_transforms)
        
        # Apply facial deformation (blend shapes)
        vertices = self._apply_facial_deformation(vertices, blend_weights)
        
        # Return deformed mesh
        deformed_mesh = self.character_mesh.copy()
        deformed_mesh['vertices'] = vertices
        
        return deformed_mesh
    
    def _apply_skeletal_deformation(self, vertices: np.ndarray, bone_transforms: Dict) -> np.ndarray:
        """Apply skeletal bone transformations to vertices"""
        bone_weights = self.character_mesh['bone_weights']
        bone_indices = self.character_mesh['bone_indices']
        
        deformed_vertices = vertices.copy()
        
        # Apply weighted bone transformations
        for i, vertex in enumerate(vertices):
            transformed_vertex = np.zeros(3)  # x, y, z
            
            for j in range(4):  # Up to 4 bone influences per vertex
                weight = bone_weights[i, j]
                if weight > 0.001:  # Skip negligible weights
                    bone_idx = bone_indices[i, j]
                    
                    # Get bone transform matrix
                    if bone_idx < len(bone_transforms):
                        transform = list(bone_transforms.values())[bone_idx]
                        
                        # Apply transformation (simplified 2D transform)
                        vertex_3d = np.array([vertex[0], vertex[1], 0.0, 1.0])
                        transformed = transform @ vertex_3d
                        transformed_vertex += weight * transformed[:3]
            
            deformed_vertices[i] = transformed_vertex[:2]  # Keep only x, y
        
        return deformed_vertices
    
    def _apply_facial_deformation(self, vertices: np.ndarray, blend_weights: Dict) -> np.ndarray:
        """Apply facial blend shape deformations"""
        deformed_vertices = vertices.copy()
        
        # Apply each active blend shape
        for blend_name, weight in blend_weights.items():
            if weight > 0.001:  # Skip negligible weights
                # Get blend shape deltas
                blend_deltas = self.facial_animator.get_blend_shape_deltas(blend_name)
                if blend_deltas is not None:
                    # Apply weighted deltas to facial region vertices
                    deformed_vertices = self._apply_blend_shape_deltas(
                        deformed_vertices, blend_deltas, weight, blend_name
                    )
        
        return deformed_vertices
    
    def _apply_blend_shape_deltas(self, vertices: np.ndarray, deltas: np.ndarray, 
                                 weight: float, blend_name: str) -> np.ndarray:
        """Apply blend shape deltas to specific facial regions"""
        # Get affected region for this blend shape
        affected_region = self._get_blend_shape_region(blend_name)
        
        # Apply deltas to vertices in the affected region
        for vertex_idx in affected_region:
            if vertex_idx < len(vertices):
                vertices[vertex_idx] += weight * deltas[vertex_idx % len(deltas)]
        
        return vertices
    
    def _get_blend_shape_region(self, blend_name: str) -> List[int]:
        """Get vertex indices affected by a blend shape"""
        # Map blend shape to facial region
        region_mapping = {
            'blink_left': self._get_eye_region_vertices('left'),
            'blink_right': self._get_eye_region_vertices('right'),
            'smile': self._get_mouth_region_vertices(),
            'frown': self._get_mouth_region_vertices(),
            'mouth_open': self._get_mouth_region_vertices(),
            # Add more mappings as needed
        }
        
        return region_mapping.get(blend_name, [])
    
    def _get_eye_region_vertices(self, side: str) -> List[int]:
        """Get vertex indices for eye region"""
        # This would be calculated based on facial landmarks
        # For now, return approximate region
        if self.character_mesh is None:
            return []
        
        vertices = self.character_mesh['vertices']
        height, width = self.character_image.shape[:2] if self.character_image is not None else (480, 640)
        
        eye_region = []
        for i, vertex in enumerate(vertices):
            x, y = vertex
            
            # Approximate eye regions (would be more precise with landmarks)
            if side == 'left':
                if width * 0.3 <= x <= width * 0.45 and height * 0.3 <= y <= height * 0.4:
                    eye_region.append(i)
            elif side == 'right':
                if width * 0.55 <= x <= width * 0.7 and height * 0.3 <= y <= height * 0.4:
                    eye_region.append(i)
        
        return eye_region
    
    def _get_mouth_region_vertices(self) -> List[int]:
        """Get vertex indices for mouth region"""
        if self.character_mesh is None:
            return []
        
        vertices = self.character_mesh['vertices']
        height, width = self.character_image.shape[:2] if self.character_image is not None else (480, 640)
        
        mouth_region = []
        for i, vertex in enumerate(vertices):
            x, y = vertex
            
            # Approximate mouth region
            if width * 0.4 <= x <= width * 0.6 and height * 0.55 <= y <= height * 0.7:
                mouth_region.append(i)
        
        return mouth_region
    
    def _update_frame_time_history(self):
        """Update frame time history for performance monitoring"""
        self.frame_times.append(self.performance.frame_time * 1000)  # Convert to ms
        if len(self.frame_times) > self.max_frame_history:
            self.frame_times.pop(0)
    
    # Configuration and control methods
    def enable_auto_blink(self, enabled: bool = True):
        """Enable/disable automatic blinking"""
        self.auto_blink_enabled = enabled
        if enabled:
            self.facial_animator.start_auto_blink()
        else:
            self.facial_animator.stop_auto_blink()
    
    def enable_breathing(self, enabled: bool = True):
        """Enable/disable breathing animation"""
        self.breathing_enabled = enabled
        if enabled:
            self.skeletal_system.enable_breathing_animation()
        else:
            self.skeletal_system.disable_breathing_animation()
    
    def enable_physics(self, enabled: bool = True):
        """Enable/disable physics simulation"""
        self.physics_enabled = enabled
        # Physics would affect hair, clothing, etc.
    
    def set_quality_level(self, level: str):
        """Set rendering quality level"""
        quality_settings = {
            'low': {'mesh_density': 25, 'fps': 30, 'physics': False},
            'medium': {'mesh_density': 35, 'fps': 45, 'physics': True},
            'high': {'mesh_density': 50, 'fps': 60, 'physics': True},
            'ultra': {'mesh_density': 75, 'fps': 120, 'physics': True}
        }
        
        if level in quality_settings:
            settings = quality_settings[level]
            self.target_fps = settings['fps']
            self.frame_time_target = 1.0 / self.target_fps
            self.enable_physics(settings['physics'])
            
            logging.info(f"Quality set to {level}: {settings}")
    
    # Performance and debugging
    def get_performance_metrics(self) -> PerformanceMetrics:
        """Get current performance metrics"""
        return self.performance
    
    def get_animation_state(self) -> Dict[str, Any]:
        """Get current animation state for debugging"""
        return {
            'pose': self.current_pose,
            'emotion': self.current_emotion,
            'emotion_intensity': self.emotion_intensity,
            'head_rotation': self.head_rotation,
            'viewing_angle': self.viewing_angle,
            'looking_direction': self.looking_direction,
            'is_speaking': self.is_speaking,
            'current_text': self.current_text,
            'auto_blink_enabled': self.auto_blink_enabled,
            'breathing_enabled': self.breathing_enabled,
            'physics_enabled': self.physics_enabled,
            'performance': {
                'fps': self.performance.fps,
                'frame_time_ms': self.performance.frame_time * 1000,
                'total_bones': self.performance.total_bones,
                'active_blend_shapes': self.performance.active_blend_shapes            }
        }
    
    def export_animation_data(self, filepath: str):
        """Export current animation state to file"""
        animation_data = {
            'skeletal_data': self.skeletal_system.export_skeleton_data(),
            'facial_data': self.facial_animator.export_blend_shapes(),
            'render_data': self.multi_angle_renderer.export_layer_data() if self.multi_angle_renderer else {},
            'animation_state': self.get_animation_state()
        }
        
        with open(filepath, 'w') as f:
            json.dump(animation_data, f, indent=2)
        
        logging.info(f"Animation data exported to: {filepath}")
    
    def import_animation_data(self, filepath: str):
        """Import animation state from file"""
        try:
            with open(filepath, 'r') as f:
                animation_data = json.load(f)
              # Restore systems
            if 'skeletal_data' in animation_data:
                self.skeletal_system.import_skeleton_data(animation_data['skeletal_data'])
            
            if 'facial_data' in animation_data:
                self.facial_animator.import_blend_shapes(animation_data['facial_data'])
            
            if 'render_data' in animation_data and self.multi_angle_renderer:
                self.multi_angle_renderer.import_layer_data(animation_data['render_data'])
            
            logging.info(f"Animation data imported from: {filepath}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to import animation data: {e}")
            return False


# Example usage and testing
if __name__ == "__main__":
    # Set up logging
    logging.basicConfig(level=logging.INFO, 
                       format='%(asctime)s - %(levelname)s - %(message)s')
    
    # Create professional animator
    animator = ProfessionalAnimator(target_fps=60, enable_physics=True)
    
    # Load character (would use actual image in real usage)
    print("Professional VTuber Animation System")
    print("=====================================")
    
    # Simulate animation loop
    print("Simulating animation...")
    
    delta_time = 1.0 / 60.0  # 60 FPS
    
    for frame in range(300):  # 5 seconds at 60 FPS
        # Update animation
        rendered_frame = animator.update(delta_time)
        
        # Change pose every 2 seconds
        if frame % 120 == 0:
            poses = ["idle", "wave", "peace_sign", "thinking"]
            pose = poses[frame // 120 % len(poses)]
            animator.set_pose(pose)
        
        # Change emotion every 3 seconds
        if frame % 180 == 0:
            emotions = ["neutral", "happy", "excited", "sad"]
            emotion = emotions[frame // 180 % len(emotions)]
            animator.set_emotion(emotion, 0.7)
        
        # Simulate head movement
        time_factor = frame * 0.05
        head_yaw = 30.0 * np.sin(time_factor)
        head_pitch = 15.0 * np.cos(time_factor * 0.7)
        animator.set_head_rotation(head_pitch, head_yaw)
        
        # Print performance every second
        if frame % 60 == 0:
            metrics = animator.get_performance_metrics()
            print(f"Frame {frame}: FPS={metrics.fps:.1f}, "
                  f"Frame Time={metrics.frame_time*1000:.1f}ms, "
                  f"Bones={metrics.total_bones}, "
                  f"Blend Shapes={metrics.active_blend_shapes}")
    
    # Print final state
    print("\nFinal Animation State:")
    print(json.dumps(animator.get_animation_state(), indent=2))
    
    print("\nProfessional Animation System test completed!")
