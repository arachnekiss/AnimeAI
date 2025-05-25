#!/usr/bin/env python3
"""
Advanced Facial Animation System with Blend Shapes
Provides VTuber-quality facial expressions and lip sync
"""

import numpy as np
import cv2
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import math
import logging

logger = logging.getLogger(__name__)

class BlendShapeType(Enum):
    # Eye blend shapes
    EYE_BLINK_L = "eye_blink_L"
    EYE_BLINK_R = "eye_blink_R"
    EYE_WIDE_L = "eye_wide_L"
    EYE_WIDE_R = "eye_wide_R"
    EYE_SQUINT_L = "eye_squint_L"
    EYE_SQUINT_R = "eye_squint_R"
    EYE_HAPPY_L = "eye_happy_L"
    EYE_HAPPY_R = "eye_happy_R"
    
    # Eyebrow blend shapes
    BROW_UP_L = "brow_up_L"
    BROW_UP_R = "brow_up_R"
    BROW_DOWN_L = "brow_down_L"
    BROW_DOWN_R = "brow_down_R"
    BROW_ANGRY_L = "brow_angry_L"
    BROW_ANGRY_R = "brow_angry_R"
    
    # Mouth blend shapes
    MOUTH_SMILE_L = "mouth_smile_L"
    MOUTH_SMILE_R = "mouth_smile_R"
    MOUTH_FROWN_L = "mouth_frown_L"
    MOUTH_FROWN_R = "mouth_frown_R"
    MOUTH_OPEN = "mouth_open"
    MOUTH_PUCKER = "mouth_pucker"
    JAW_OPEN = "jaw_open"
    
    # Phoneme shapes for lip sync
    VISEME_A = "viseme_a"    # ah
    VISEME_E = "viseme_e"    # eh
    VISEME_I = "viseme_i"    # ih
    VISEME_O = "viseme_o"    # oh
    VISEME_U = "viseme_u"    # oo
    VISEME_M = "viseme_m"    # m, b, p
    VISEME_F = "viseme_f"    # f, v
    VISEME_TH = "viseme_th"  # th
    VISEME_S = "viseme_s"    # s, z
    VISEME_T = "viseme_t"    # t, d, n, l
    VISEME_R = "viseme_r"    # r
    
    # Cheek blend shapes
    CHEEK_PUFF_L = "cheek_puff_L"
    CHEEK_PUFF_R = "cheek_puff_R"
    CHEEK_SUCK = "cheek_suck"

@dataclass
class BlendShape:
    """Individual blend shape with deformation data"""
    name: BlendShapeType
    weight: float = 0.0
    target_weight: float = 0.0
    transition_speed: float = 5.0
    
    # Deformation data
    vertex_deltas: Optional[np.ndarray] = None
    texture_deltas: Optional[np.ndarray] = None
    
    # Animation properties
    is_animating: bool = False
    animation_curve: str = "smooth"  # "smooth", "linear", "elastic"

class EmotionPreset:
    """Predefined emotion using multiple blend shapes"""
    
    def __init__(self, name: str):
        self.name = name
        self.blend_weights: Dict[BlendShapeType, float] = {}
        self.duration: float = 0.5
        self.transition_curve: str = "smooth"
    
    @staticmethod
    def create_happy() -> 'EmotionPreset':
        emotion = EmotionPreset("happy")
        emotion.blend_weights = {
            BlendShapeType.EYE_HAPPY_L: 0.7,
            BlendShapeType.EYE_HAPPY_R: 0.7,
            BlendShapeType.MOUTH_SMILE_L: 0.8,
            BlendShapeType.MOUTH_SMILE_R: 0.8,
            BlendShapeType.CHEEK_PUFF_L: 0.3,
            BlendShapeType.CHEEK_PUFF_R: 0.3,
            BlendShapeType.BROW_UP_L: 0.2,
            BlendShapeType.BROW_UP_R: 0.2
        }
        return emotion
    
    @staticmethod
    def create_excited() -> 'EmotionPreset':
        emotion = EmotionPreset("excited")
        emotion.blend_weights = {
            BlendShapeType.EYE_WIDE_L: 0.9,
            BlendShapeType.EYE_WIDE_R: 0.9,
            BlendShapeType.BROW_UP_L: 0.8,
            BlendShapeType.BROW_UP_R: 0.8,
            BlendShapeType.MOUTH_OPEN: 0.6,
            BlendShapeType.MOUTH_SMILE_L: 0.9,
            BlendShapeType.MOUTH_SMILE_R: 0.9
        }
        return emotion
    
    @staticmethod
    def create_sad() -> 'EmotionPreset':
        emotion = EmotionPreset("sad")
        emotion.blend_weights = {
            BlendShapeType.BROW_DOWN_L: 0.6,
            BlendShapeType.BROW_DOWN_R: 0.6,
            BlendShapeType.EYE_SQUINT_L: 0.4,
            BlendShapeType.EYE_SQUINT_R: 0.4,
            BlendShapeType.MOUTH_FROWN_L: 0.7,
            BlendShapeType.MOUTH_FROWN_R: 0.7
        }
        return emotion
    
    @staticmethod
    def create_surprised() -> 'EmotionPreset':
        emotion = EmotionPreset("surprised")
        emotion.blend_weights = {
            BlendShapeType.EYE_WIDE_L: 1.0,
            BlendShapeType.EYE_WIDE_R: 1.0,
            BlendShapeType.BROW_UP_L: 1.0,
            BlendShapeType.BROW_UP_R: 1.0,
            BlendShapeType.MOUTH_OPEN: 0.8,
            BlendShapeType.JAW_OPEN: 0.5
        }
        return emotion
    
    @staticmethod
    def create_angry() -> 'EmotionPreset':
        emotion = EmotionPreset("angry")
        emotion.blend_weights = {
            BlendShapeType.BROW_ANGRY_L: 0.9,
            BlendShapeType.BROW_ANGRY_R: 0.9,
            BlendShapeType.EYE_SQUINT_L: 0.6,
            BlendShapeType.EYE_SQUINT_R: 0.6,
            BlendShapeType.MOUTH_FROWN_L: 0.8,
            BlendShapeType.MOUTH_FROWN_R: 0.8
        }
        return emotion

class LipSyncProcessor:
    """Advanced lip sync using phoneme detection"""
    
    def __init__(self):
        self.phoneme_map = self._create_phoneme_map()
        self.current_viseme = BlendShapeType.VISEME_A
        self.viseme_weights: Dict[BlendShapeType, float] = {}
        
        # Reset all viseme weights
        for viseme in [BlendShapeType.VISEME_A, BlendShapeType.VISEME_E, BlendShapeType.VISEME_I,
                      BlendShapeType.VISEME_O, BlendShapeType.VISEME_U, BlendShapeType.VISEME_M,
                      BlendShapeType.VISEME_F, BlendShapeType.VISEME_TH, BlendShapeType.VISEME_S,
                      BlendShapeType.VISEME_T, BlendShapeType.VISEME_R]:
            self.viseme_weights[viseme] = 0.0
    
    def _create_phoneme_map(self) -> Dict[str, BlendShapeType]:
        """Map phonemes to visemes"""
        return {
            # Vowels
            'a': BlendShapeType.VISEME_A,
            'e': BlendShapeType.VISEME_E,
            'i': BlendShapeType.VISEME_I,
            'o': BlendShapeType.VISEME_O,
            'u': BlendShapeType.VISEME_U,
            
            # Consonants
            'm': BlendShapeType.VISEME_M,
            'b': BlendShapeType.VISEME_M,
            'p': BlendShapeType.VISEME_M,
            'f': BlendShapeType.VISEME_F,
            'v': BlendShapeType.VISEME_F,
            'th': BlendShapeType.VISEME_TH,
            's': BlendShapeType.VISEME_S,
            'z': BlendShapeType.VISEME_S,
            't': BlendShapeType.VISEME_T,
            'd': BlendShapeType.VISEME_T,
            'n': BlendShapeType.VISEME_T,
            'l': BlendShapeType.VISEME_T,
            'r': BlendShapeType.VISEME_R
        }
    
    def process_text(self, text: str, speaking_speed: float = 1.0) -> List[Tuple[BlendShapeType, float, float]]:
        """Convert text to timed viseme sequence"""
        viseme_sequence = []
        
        # Simple phoneme extraction (in real implementation, use proper phoneme analysis)
        words = text.lower().split()
        current_time = 0.0
        
        for word in words:
            for char in word:
                if char in self.phoneme_map:
                    viseme = self.phoneme_map[char]
                    duration = 0.15 / speaking_speed  # Base duration per phoneme
                    
                    viseme_sequence.append((viseme, current_time, duration))
                    current_time += duration
                
            # Add pause between words
            current_time += 0.1 / speaking_speed
        
        return viseme_sequence
    
    def update_visemes(self, viseme_sequence: List[Tuple[BlendShapeType, float, float]], 
                      current_time: float) -> Dict[BlendShapeType, float]:
        """Update viseme weights based on current time"""
        # Reset all visemes
        for viseme in self.viseme_weights:
            self.viseme_weights[viseme] = 0.0
        
        # Find active visemes
        for viseme, start_time, duration in viseme_sequence:
            if start_time <= current_time <= start_time + duration:
                # Calculate weight based on position in duration
                progress = (current_time - start_time) / duration
                
                # Use smooth curve for natural transition
                weight = math.sin(progress * math.pi) * 0.8 + 0.2
                self.viseme_weights[viseme] = max(self.viseme_weights[viseme], weight)
        
        return self.viseme_weights.copy()

class AdvancedFacialAnimator:
    """Professional facial animation system"""
    
    def __init__(self):
        self.blend_shapes: Dict[BlendShapeType, BlendShape] = {}
        self.emotion_presets: Dict[str, EmotionPreset] = {}
        self.lip_sync = LipSyncProcessor()
        
        # Animation state
        self.current_emotion = "neutral"
        self.emotion_intensity = 1.0
        self.is_speaking = False
        self.speech_text = ""
        self.speech_start_time = 0.0
        self.animation_time = 0.0
          # Auto-animation
        self.auto_blink_enabled = True
        self.blink_timer = 0.0
        self.next_blink_time = 3.0
        self.eye_movement_timer = 0.0
        self.micro_expression_timer = 0.0
        
        self._initialize_blend_shapes()
        self._initialize_emotion_presets()
        
        logger.info("AdvancedFacialAnimator initialized with professional blend shapes")
    
    def _initialize_blend_shapes(self):
        """Initialize all blend shapes"""
        for blend_type in BlendShapeType:
            self.blend_shapes[blend_type] = BlendShape(
                name=blend_type,
                transition_speed=self._get_blend_speed(blend_type)
            )
    
    def _get_blend_speed(self, blend_type: BlendShapeType) -> float:
        """Get appropriate transition speed for blend shape type"""
        if blend_type in [BlendShapeType.EYE_BLINK_L, BlendShapeType.EYE_BLINK_R]:
            return 20.0  # Fast blinks
        elif "viseme" in blend_type.value:
            return 8.0   # Quick lip movements
        else:
            return 5.0   # Standard expression changes
    
    def _initialize_emotion_presets(self):
        """Initialize emotion presets"""
        self.emotion_presets = {
            "happy": EmotionPreset.create_happy(),
            "excited": EmotionPreset.create_excited(),
            "sad": EmotionPreset.create_sad(),
            "surprised": EmotionPreset.create_surprised(),
            "angry": EmotionPreset.create_angry()
        }
    
    def set_emotion(self, emotion_name: str, intensity: float = 1.0, transition_time: float = 0.5):
        """Set character emotion with smooth transition"""
        if emotion_name not in self.emotion_presets:
            logger.warning(f"Unknown emotion: {emotion_name}")
            return
        
        self.current_emotion = emotion_name
        self.emotion_intensity = np.clip(intensity, 0.0, 1.0)
        
        # Clear current emotion
        for blend_shape in self.blend_shapes.values():
            blend_shape.target_weight = 0.0
        
        # Apply new emotion
        emotion = self.emotion_presets[emotion_name]
        for blend_type, weight in emotion.blend_weights.items():
            if blend_type in self.blend_shapes:
                self.blend_shapes[blend_type].target_weight = weight * self.emotion_intensity
                self.blend_shapes[blend_type].transition_speed = 1.0 / transition_time
    
    def start_speaking(self, text: str, speaking_speed: float = 1.0):
        """Start speaking with lip sync"""
        self.is_speaking = True
        self.speech_text = text
        self.speech_start_time = self.animation_time
        
        # Generate viseme sequence
        self.viseme_sequence = self.lip_sync.process_text(text, speaking_speed)
        
        logger.info(f"Started speaking: '{text}' with {len(self.viseme_sequence)} visemes")
    
    def stop_speaking(self):
        """Stop speaking and close mouth"""
        self.is_speaking = False
        
        # Clear all visemes
        for viseme_type in [BlendShapeType.VISEME_A, BlendShapeType.VISEME_E, BlendShapeType.VISEME_I,
                           BlendShapeType.VISEME_O, BlendShapeType.VISEME_U, BlendShapeType.VISEME_M,
                           BlendShapeType.VISEME_F, BlendShapeType.VISEME_TH, BlendShapeType.VISEME_S,
                           BlendShapeType.VISEME_T, BlendShapeType.VISEME_R]:
            if viseme_type in self.blend_shapes:
                self.blend_shapes[viseme_type].target_weight = 0.0
    
    def trigger_blink(self, duration: float = 0.15):
        """Trigger manual blink"""
        self.blend_shapes[BlendShapeType.EYE_BLINK_L].target_weight = 1.0
        self.blend_shapes[BlendShapeType.EYE_BLINK_R].target_weight = 1.0
        
        # Schedule blink end
        def end_blink():
            self.blend_shapes[BlendShapeType.EYE_BLINK_L].target_weight = 0.0
            self.blend_shapes[BlendShapeType.EYE_BLINK_R].target_weight = 0.0
        
        # In real implementation, use timer callback
        # For now, we'll handle this in update loop
        self.blink_end_time = self.animation_time + duration
    
    def set_blend_shape_weight(self, blend_type: BlendShapeType, weight: float):
        """Manually set blend shape weight"""
        if blend_type in self.blend_shapes:
            self.blend_shapes[blend_type].target_weight = np.clip(weight, 0.0, 1.0)
    
    def update(self, delta_time: float):
        """Update facial animation system"""
        self.animation_time += delta_time
        
        # Update blend shape weights towards targets
        for blend_shape in self.blend_shapes.values():
            weight_diff = blend_shape.target_weight - blend_shape.weight
            
            if abs(weight_diff) > 0.001:
                blend_shape.weight += weight_diff * blend_shape.transition_speed * delta_time
                blend_shape.weight = np.clip(blend_shape.weight, 0.0, 1.0)
        
        # Handle lip sync if speaking
        if self.is_speaking:
            speech_time = self.animation_time - self.speech_start_time
            viseme_weights = self.lip_sync.update_visemes(self.viseme_sequence, speech_time)
            
            # Apply viseme weights
            for viseme_type, weight in viseme_weights.items():
                if viseme_type in self.blend_shapes:
                    self.blend_shapes[viseme_type].target_weight = weight
            
            # Check if speech finished
            max_speech_time = max([start + duration for _, start, duration in self.viseme_sequence], default=0)
            if speech_time > max_speech_time + 0.5:
                self.stop_speaking()
          # Auto-blink
        if self.auto_blink_enabled:
            self.blink_timer += delta_time
            if self.blink_timer >= self.next_blink_time:
                self.trigger_blink()
                self.blink_timer = 0.0
                self.next_blink_time = np.random.uniform(2.0, 5.0)  # Random blink interval
        
        # Handle blink end
        if hasattr(self, 'blink_end_time') and self.animation_time >= self.blink_end_time:
            self.blend_shapes[BlendShapeType.EYE_BLINK_L].target_weight = 0.0
            self.blend_shapes[BlendShapeType.EYE_BLINK_R].target_weight = 0.0
            delattr(self, 'blink_end_time')
        
        # Subtle eye movement
        self.eye_movement_timer += delta_time
        if self.eye_movement_timer > 0.1:  # Update every 100ms
            # Add subtle random eye variations
            if not self.is_speaking:  # Don't interfere with expressions while speaking
                eye_variation = np.random.normal(0, 0.02)
                base_happy_L = self.blend_shapes[BlendShapeType.EYE_HAPPY_L].target_weight
                base_happy_R = self.blend_shapes[BlendShapeType.EYE_HAPPY_R].target_weight
                
                self.blend_shapes[BlendShapeType.EYE_HAPPY_L].target_weight = np.clip(
                    base_happy_L + eye_variation, 0.0, 1.0)
                self.blend_shapes[BlendShapeType.EYE_HAPPY_R].target_weight = np.clip(
                    base_happy_R + eye_variation, 0.0, 1.0)
            
            self.eye_movement_timer = 0.0
          # Micro expressions
        self.micro_expression_timer += delta_time
        if self.micro_expression_timer > 8.0:  # Every 8 seconds
            self._apply_micro_expression()
            self.micro_expression_timer = 0.0
    
    def _apply_micro_expression(self):
        """Apply subtle micro expressions"""
        if not self.is_speaking:
            # Random micro expression
            expressions = ['slight_smile', 'eyebrow_raise', 'eye_squint']
            expression = np.random.choice(expressions)
            
            if expression == 'slight_smile':
                self.blend_shapes[BlendShapeType.MOUTH_SMILE_L].target_weight += 0.1
                self.blend_shapes[BlendShapeType.MOUTH_SMILE_R].target_weight += 0.1
            elif expression == 'eyebrow_raise':
                self.blend_shapes[BlendShapeType.BROW_UP_L].target_weight += 0.05
                self.blend_shapes[BlendShapeType.BROW_UP_R].target_weight += 0.05
            elif expression == 'eye_squint':
                self.blend_shapes[BlendShapeType.EYE_SQUINT_L].target_weight += 0.03
                self.blend_shapes[BlendShapeType.EYE_SQUINT_R].target_weight += 0.03
    
    def get_all_weights(self) -> Dict[BlendShapeType, float]:
        """Get current weights for all blend shapes"""
        return {bs_type: bs.weight for bs_type, bs in self.blend_shapes.items()}
    
    def get_active_weights(self, threshold: float = 0.01) -> Dict[BlendShapeType, float]:
        """Get only active blend shape weights above threshold"""
        return {bs_type: bs.weight for bs_type, bs in self.blend_shapes.items() 
                if bs.weight > threshold}
    
    def start_auto_blink(self):
        """Start automatic blinking"""
        self.auto_blink_enabled = True
        logger.info("Auto-blink enabled")
    
    def stop_auto_blink(self):
        """Stop automatic blinking"""
        self.auto_blink_enabled = False
        logger.info("Auto-blink disabled")
