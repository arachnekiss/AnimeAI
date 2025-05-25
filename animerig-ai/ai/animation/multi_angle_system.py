#!/usr/bin/env python3
"""
2.5D Multi-Angle Layer System for VTuber-style character rendering
Provides realistic depth and angle effects for Live2D-style animation
"""

import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import math
import logging

logger = logging.getLogger(__name__)

class LayerType(Enum):
    BACKGROUND_HAIR = "background_hair"
    FACE_BASE = "face_base"
    FACE_SHADOW = "face_shadow"
    EYES_BASE = "eyes_base"
    EYES_IRIS = "eyes_iris"
    EYES_HIGHLIGHT = "eyes_highlight"
    EYEBROWS = "eyebrows"
    NOSE = "nose"
    MOUTH = "mouth"
    EARS = "ears"
    FOREGROUND_HAIR = "foreground_hair"
    ACCESSORIES = "accessories"
    CLOTHING = "clothing"

@dataclass
class Layer:
    """Represents a renderable layer with depth and parallax"""
    layer_type: LayerType
    texture: Optional[np.ndarray] = None
    z_order: float = 0.0
    parallax_factor: float = 1.0
    offset_x: float = 0.0
    offset_y: float = 0.0
    scale_x: float = 1.0
    scale_y: float = 1.0
    rotation: float = 0.0
    opacity: float = 1.0
    
    # Advanced properties
    depth_offset: float = 0.0  # Additional depth for 3D effect
    deformation_weight: float = 1.0  # How much this layer deforms
    
class ViewAngle:
    """Defines a viewing angle with layer visibility and transforms"""
    
    def __init__(self, name: str, angle_y: float, angle_x: float = 0.0):
        self.name = name
        self.angle_y = angle_y  # Horizontal rotation (-90 to 90 degrees)
        self.angle_x = angle_x  # Vertical rotation
        
        # Layer visibility for this angle
        self.layer_visibility: Dict[LayerType, float] = {}
        
        # Layer transformations for this angle
        self.layer_transforms: Dict[LayerType, Dict] = {}
        
        self._setup_angle_properties()
    
    def _setup_angle_properties(self):
        """Setup layer properties based on viewing angle"""
        abs_angle_y = abs(self.angle_y)
        is_right_side = self.angle_y > 0
        
        # Base visibility for all layers
        front_factor = 1.0 - (abs_angle_y / 90.0)
        side_factor = abs_angle_y / 90.0
        
        # Setup layer visibility
        self.layer_visibility = {
            LayerType.BACKGROUND_HAIR: 1.0,
            LayerType.FACE_BASE: max(0.3, front_factor),
            LayerType.FACE_SHADOW: side_factor * 0.6,
            LayerType.EYES_BASE: max(0.2, front_factor),
            LayerType.EYES_IRIS: max(0.2, front_factor),
            LayerType.EYES_HIGHLIGHT: front_factor,
            LayerType.EYEBROWS: max(0.4, front_factor),
            LayerType.NOSE: front_factor * 0.8 + side_factor * 0.4,
            LayerType.MOUTH: max(0.5, front_factor),
            LayerType.EARS: side_factor,
            LayerType.FOREGROUND_HAIR: 1.0,
            LayerType.ACCESSORIES: max(0.6, front_factor),
            LayerType.CLOTHING: 1.0
        }
        
        # Setup layer transforms for parallax effect
        for layer_type in LayerType:
            z_depth = self._get_layer_depth(layer_type)
            parallax_shift = self.angle_y * z_depth * 0.01
            
            self.layer_transforms[layer_type] = {
                'offset_x': parallax_shift,
                'offset_y': self.angle_x * z_depth * 0.005,
                'scale_x': 1.0 - abs(self.angle_y) * 0.001 * z_depth,
                'scale_y': 1.0 - abs(self.angle_x) * 0.001 * z_depth,
                'rotation': self.angle_y * 0.02 * z_depth if layer_type in [LayerType.EARS, LayerType.NOSE] else 0.0
            }
    
    def _get_layer_depth(self, layer_type: LayerType) -> float:
        """Get relative depth of layer type"""
        depth_map = {
            LayerType.BACKGROUND_HAIR: 0.0,
            LayerType.FACE_BASE: 1.0,
            LayerType.FACE_SHADOW: 1.1,
            LayerType.EYES_BASE: 2.0,
            LayerType.EYES_IRIS: 2.5,
            LayerType.EYES_HIGHLIGHT: 3.0,
            LayerType.EYEBROWS: 2.2,
            LayerType.NOSE: 3.5,
            LayerType.MOUTH: 2.8,
            LayerType.EARS: 0.5,
            LayerType.FOREGROUND_HAIR: 5.0,
            LayerType.ACCESSORIES: 4.0,
            LayerType.CLOTHING: -1.0
        }
        return depth_map.get(layer_type, 1.0)

class MultiAngleRenderer:
    """Advanced 2.5D renderer with multi-angle support"""
    
    def __init__(self, character_image: np.ndarray):
        self.original_image = character_image
        self.layers: Dict[LayerType, Layer] = {}
        self.view_angles: Dict[str, ViewAngle] = {}
        
        # Current view state
        self.current_angle_y = 0.0  # -90 (left) to 90 (right)
        self.current_angle_x = 0.0  # -45 (down) to 45 (up)
        
        # Animation state
        self.target_angle_y = 0.0
        self.target_angle_x = 0.0
        self.rotation_speed = 3.0
        
        self._extract_layers()
        self._setup_view_angles()
        
        logger.info(f"MultiAngleRenderer initialized with {len(self.layers)} layers")
    
    def _extract_layers(self):
        """Extract different layers from the character image"""
        height, width = self.original_image.shape[:2]
        
        # For now, create simple layer separation
        # In a real implementation, this would use AI segmentation
        
        # Face base layer (main face)
        face_layer = Layer(
            layer_type=LayerType.FACE_BASE,
            texture=self.original_image.copy(),
            z_order=10.0,
            parallax_factor=1.0
        )
        self.layers[LayerType.FACE_BASE] = face_layer
        
        # Background hair (simple mask)
        hair_mask = self._create_hair_mask(height, width, is_background=True)
        bg_hair_layer = Layer(
            layer_type=LayerType.BACKGROUND_HAIR,
            texture=self._apply_mask(self.original_image, hair_mask),
            z_order=0.0,
            parallax_factor=0.8
        )
        self.layers[LayerType.BACKGROUND_HAIR] = bg_hair_layer
        
        # Foreground hair
        fg_hair_mask = self._create_hair_mask(height, width, is_background=False)
        fg_hair_layer = Layer(
            layer_type=LayerType.FOREGROUND_HAIR,
            texture=self._apply_mask(self.original_image, fg_hair_mask),
            z_order=50.0,
            parallax_factor=1.2
        )
        self.layers[LayerType.FOREGROUND_HAIR] = fg_hair_layer
        
        # Eyes layer
        eyes_mask = self._create_eyes_mask(height, width)
        eyes_layer = Layer(
            layer_type=LayerType.EYES_BASE,
            texture=self._apply_mask(self.original_image, eyes_mask),
            z_order=20.0,
            parallax_factor=1.1
        )
        self.layers[LayerType.EYES_BASE] = eyes_layer
        
        # Mouth layer
        mouth_mask = self._create_mouth_mask(height, width)
        mouth_layer = Layer(
            layer_type=LayerType.MOUTH,
            texture=self._apply_mask(self.original_image, mouth_mask),
            z_order=28.0,
            parallax_factor=1.05
        )
        self.layers[LayerType.MOUTH] = mouth_layer
        
        # Create shadow layer for 3D effect
        shadow_layer = Layer(
            layer_type=LayerType.FACE_SHADOW,
            texture=self._create_shadow_texture(height, width),
            z_order=11.0,
            parallax_factor=1.0,
            opacity=0.0  # Initially invisible
        )
        self.layers[LayerType.FACE_SHADOW] = shadow_layer
    
    def _create_hair_mask(self, height: int, width: int, is_background: bool) -> np.ndarray:
        """Create hair mask for layer separation"""
        mask = np.zeros((height, width), dtype=np.uint8)
        
        if is_background:
            # Background hair - top and sides
            cv2.ellipse(mask, (width//2, height//4), (width//3, height//6), 0, 0, 360, 255, -1)
        else:
            # Foreground hair - bangs and side hair
            cv2.ellipse(mask, (width//2, height//3), (width//4, height//8), 0, 0, 360, 255, -1)
        
        return mask
    
    def _create_eyes_mask(self, height: int, width: int) -> np.ndarray:
        """Create eyes mask"""
        mask = np.zeros((height, width), dtype=np.uint8)
        
        # Left eye
        cv2.ellipse(mask, (width//3, height//3), (width//12, height//20), 0, 0, 360, 255, -1)
        # Right eye
        cv2.ellipse(mask, (2*width//3, height//3), (width//12, height//20), 0, 0, 360, 255, -1)
        
        return mask
    
    def _create_mouth_mask(self, height: int, width: int) -> np.ndarray:
        """Create mouth mask"""
        mask = np.zeros((height, width), dtype=np.uint8)
        
        cv2.ellipse(mask, (width//2, int(height*0.6)), (width//12, height//30), 0, 0, 360, 255, -1)
        
        return mask
    
    def _create_shadow_texture(self, height: int, width: int) -> np.ndarray:
        """Create shadow texture for 3D lighting effect"""
        shadow = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Create gradient shadow
        for y in range(height):
            for x in range(width):
                # Distance from center
                center_x, center_y = width // 2, height // 2
                dist = math.sqrt((x - center_x)**2 + (y - center_y)**2)
                max_dist = math.sqrt(center_x**2 + center_y**2)
                
                # Create radial gradient
                alpha = int(255 * (1.0 - dist / max_dist) * 0.3)
                shadow[y, x] = [0, 0, 0, max(0, alpha)]
        
        return shadow
    
    def _apply_mask(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Apply mask to image with alpha channel"""
        if len(image.shape) == 3:
            # Add alpha channel
            result = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
        else:
            result = image.copy()
        
        # Apply mask to alpha channel
        result[:, :, 3] = mask
        
        return result
    
    def _setup_view_angles(self):
        """Setup predefined view angles"""
        self.view_angles = {
            'front': ViewAngle('front', 0.0, 0.0),
            'three_quarter_left': ViewAngle('three_quarter_left', -30.0, 0.0),
            'three_quarter_right': ViewAngle('three_quarter_right', 30.0, 0.0),
            'profile_left': ViewAngle('profile_left', -70.0, 0.0),
            'profile_right': ViewAngle('profile_right', 70.0, 0.0),
            'looking_up': ViewAngle('looking_up', 0.0, 20.0),
            'looking_down': ViewAngle('looking_down', 0.0, -20.0)
        }
    
    def set_view_angle(self, angle_y: float, angle_x: float = 0.0):
        """Set target viewing angle"""
        self.target_angle_y = np.clip(angle_y, -85.0, 85.0)
        self.target_angle_x = np.clip(angle_x, -40.0, 40.0)
    
    def rotate_to_angle(self, angle_name: str):
        """Rotate to predefined angle"""
        if angle_name in self.view_angles:
            angle = self.view_angles[angle_name]
            self.set_view_angle(angle.angle_y, angle.angle_x)
    
    def update(self, delta_time: float):
        """Update angle interpolation"""
        # Smooth angle interpolation
        angle_diff_y = self.target_angle_y - self.current_angle_y
        angle_diff_x = self.target_angle_x - self.current_angle_x
        
        self.current_angle_y += angle_diff_y * self.rotation_speed * delta_time
        self.current_angle_x += angle_diff_x * self.rotation_speed * delta_time
        
        # Update layer transforms based on current angle
        self._update_layer_transforms()
    
    def _update_layer_transforms(self):
        """Update layer transforms based on current viewing angle"""
        # Create current view angle
        current_view = ViewAngle('current', self.current_angle_y, self.current_angle_x)
        
        # Apply transforms to layers
        for layer_type, layer in self.layers.items():
            if layer_type in current_view.layer_transforms:
                transform = current_view.layer_transforms[layer_type]
                
                layer.offset_x = transform['offset_x']
                layer.offset_y = transform['offset_y']
                layer.scale_x = transform['scale_x']
                layer.scale_y = transform['scale_y']
                layer.rotation = transform['rotation']
                
                # Update opacity based on angle
                if layer_type in current_view.layer_visibility:
                    layer.opacity = current_view.layer_visibility[layer_type]
                
                # Special case for shadow layer
                if layer_type == LayerType.FACE_SHADOW:
                    shadow_intensity = abs(self.current_angle_y) / 90.0
                    layer.opacity = shadow_intensity * 0.4
    
    def render_layer(self, layer: Layer, output_size: Tuple[int, int]) -> np.ndarray:
        """Render a single layer with transforms"""
        if layer.texture is None:
            return np.zeros((*output_size, 4), dtype=np.uint8)
        
        height, width = output_size
        texture = layer.texture
        
        # Apply scaling
        if layer.scale_x != 1.0 or layer.scale_y != 1.0:
            new_width = int(texture.shape[1] * layer.scale_x)
            new_height = int(texture.shape[0] * layer.scale_y)
            texture = cv2.resize(texture, (new_width, new_height))
        
        # Apply rotation
        if abs(layer.rotation) > 0.01:
            center = (texture.shape[1] // 2, texture.shape[0] // 2)
            rotation_matrix = cv2.getRotationMatrix2D(center, layer.rotation, 1.0)
            texture = cv2.warpAffine(texture, rotation_matrix, (texture.shape[1], texture.shape[0]))
        
        # Create output image
        result = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Calculate placement position
        offset_x = int(layer.offset_x + (width - texture.shape[1]) // 2)
        offset_y = int(layer.offset_y + (height - texture.shape[0]) // 2)
        
        # Ensure texture fits in output
        x1 = max(0, offset_x)
        y1 = max(0, offset_y)
        x2 = min(width, offset_x + texture.shape[1])
        y2 = min(height, offset_y + texture.shape[0])
        
        tex_x1 = max(0, -offset_x)
        tex_y1 = max(0, -offset_y)
        tex_x2 = tex_x1 + (x2 - x1)
        tex_y2 = tex_y1 + (y2 - y1)
        
        if x2 > x1 and y2 > y1:
            if len(texture.shape) == 3:
                # Add alpha channel if missing
                if texture.shape[2] == 3:
                    texture = cv2.cvtColor(texture, cv2.COLOR_BGR2BGRA)
                
                result[y1:y2, x1:x2] = texture[tex_y1:tex_y2, tex_x1:tex_x2]
            else:
                # Grayscale texture
                result[y1:y2, x1:x2, :3] = np.stack([texture[tex_y1:tex_y2, tex_x1:tex_x2]] * 3, axis=2)
                result[y1:y2, x1:x2, 3] = texture[tex_y1:tex_y2, tex_x1:tex_x2]
        
        # Apply opacity
        if layer.opacity < 1.0:
            result[:, :, 3] = (result[:, :, 3] * layer.opacity).astype(np.uint8)
        
        return result
    
    def render_composite(self, output_size: Tuple[int, int]) -> np.ndarray:
        """Render all layers composited together"""
        height, width = output_size
        result = np.zeros((height, width, 4), dtype=np.uint8)
        
        # Sort layers by z-order
        sorted_layers = sorted(self.layers.items(), key=lambda x: x[1].z_order)
        
        # Composite layers
        for layer_type, layer in sorted_layers:
            if layer.opacity > 0.01:
                layer_image = self.render_layer(layer, output_size)
                result = self._blend_layer(result, layer_image)
        
        return result
    
    def _blend_layer(self, base: np.ndarray, overlay: np.ndarray) -> np.ndarray:
        """Blend overlay onto base using alpha compositing"""
        if base.shape != overlay.shape:
            return base
        
        # Convert to float for blending
        base_f = base.astype(np.float32) / 255.0
        overlay_f = overlay.astype(np.float32) / 255.0
        
        # Alpha blending
        alpha = overlay_f[:, :, 3:4]
        
        result_rgb = overlay_f[:, :, :3] * alpha + base_f[:, :, :3] * (1 - alpha)
        result_alpha = alpha + base_f[:, :, 3:4] * (1 - alpha)
        
        result = np.concatenate([result_rgb, result_alpha], axis=2)
        
        return (result * 255).astype(np.uint8)
    
    def get_current_angle(self) -> Tuple[float, float]:
        """Get current viewing angle"""
        return self.current_angle_y, self.current_angle_x
