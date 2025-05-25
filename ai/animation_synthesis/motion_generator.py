import torch
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class EmotionType(Enum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    SURPRISED = "surprised"
    ANGRY = "angry"
    THINKING = "thinking"
    EXCITED = "excited"
    CONFUSED = "confused"
    EMBARRASSED = "embarrassed"

class GestureType(Enum):
    NONE = "none"
    WAVE = "wave"
    NOD = "nod"
    SHAKE_HEAD = "shake_head"
    SHRUG = "shrug"
    POINT = "point"
    THUMBS_UP = "thumbs_up"
    CLAP = "clap"
    THINKING_POSE = "thinking_pose"

@dataclass
class AnimationKeyframe:
    time: float
    position: np.ndarray
    rotation: np.ndarray
    scale: np.ndarray = None
    
@dataclass
class BodyMotion:
    head: List[AnimationKeyframe]
    neck: List[AnimationKeyframe]
    spine: List[AnimationKeyframe]
    left_arm: List[AnimationKeyframe]
    right_arm: List[AnimationKeyframe]
    left_hand: List[AnimationKeyframe]
    right_hand: List[AnimationKeyframe]

@dataclass
class FacialAnimation:
    eye_blink: List[AnimationKeyframe]
    eye_movement: List[AnimationKeyframe]
    mouth_shape: List[AnimationKeyframe]
    eyebrow_movement: List[AnimationKeyframe]
    emotion_blend: List[AnimationKeyframe]

@dataclass
class MicroMovements:
    breathing: List[AnimationKeyframe]
    idle_sway: List[AnimationKeyframe]
    weight_shift: List[AnimationKeyframe]
    random_blinks: List[float]  # Timing for random blinks

@dataclass
class SecondaryMotion:
    hair_physics: Dict[str, List[AnimationKeyframe]]
    clothing_physics: Dict[str, List[AnimationKeyframe]]
    accessories: Dict[str, List[AnimationKeyframe]]

@dataclass
class AnimationSequence:
    body: BodyMotion
    face: FacialAnimation
    micro: MicroMovements
    secondary: SecondaryMotion
    duration: float
    fps: int = 60
    
    def get_total_frames(self) -> int:
        return int(self.duration * self.fps)

@dataclass
class AnimationLoop:
    sequences: List[AnimationSequence]
    loop_duration: float
    seamless: bool = True

class MotionGenerator:
    """
    Advanced AI-powered motion generation system
    Generates natural character animations based on text, emotion, and context
    """
    
    def __init__(self, device: str = "auto"):
        self.device = self._select_device(device)
        logger.info(f"Initializing MotionGenerator on device: {self.device}")
        
        # AI Models for animation generation
        self.emotion_model = None
        self.gesture_model = None
        self.physics_predictor = None
        self.lip_sync_model = None
        
        # Animation parameters
        self.fps = 60
        self.default_emotion_transition_time = 0.5
        self.breathing_rate = 12  # breaths per minute
        self.blink_frequency = 15  # blinks per minute
        
        self._load_models()
        self._initialize_emotion_mappings()
    
    def _select_device(self, device: str) -> str:
        """Auto-select best available device"""
        if device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps"
            else:
                return "cpu"
        return device
    
    def _load_models(self):
        """Load AI models for motion generation"""
        try:
            logger.info("Loading motion generation models...")
            
            # Placeholder for actual model loading
            # In production, would load:
            # - Text-to-motion transformer
            # - Emotion recognition model
            # - Gesture classification model
            # - Physics prediction network
            # - Lip-sync model
            
            self.emotion_model = self._create_emotion_model()
            self.gesture_model = self._create_gesture_model()
            self.physics_predictor = self._create_physics_model()
            self.lip_sync_model = self._create_lip_sync_model()
            
            logger.info("Motion generation models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def _create_emotion_model(self):
        """Create emotion analysis model"""
        # Placeholder - would load actual emotion analysis model
        return None
    
    def _create_gesture_model(self):
        """Create gesture generation model"""
        # Placeholder - would load actual gesture model
        return None
    
    def _create_physics_model(self):
        """Create physics prediction model"""
        # Placeholder - would load physics simulation model
        return None
    
    def _create_lip_sync_model(self):
        """Create lip synchronization model"""
        # Placeholder - would load lip sync model
        return None
    
    def _initialize_emotion_mappings(self):
        """Initialize emotion to animation parameter mappings"""
        self.emotion_mappings = {
            EmotionType.HAPPY: {
                'mouth_curve': 0.8,
                'eye_squint': 0.3,
                'eyebrow_raise': 0.2,
                'head_tilt': 5.0,  # degrees
                'body_posture': 'upright'
            },
            EmotionType.SAD: {
                'mouth_curve': -0.6,
                'eye_droop': 0.4,
                'eyebrow_lower': -0.3,
                'head_tilt': -10.0,
                'body_posture': 'slouched'
            },
            EmotionType.SURPRISED: {
                'mouth_open': 0.7,
                'eye_wide': 0.8,
                'eyebrow_raise': 0.9,
                'head_back': 15.0,
                'body_posture': 'alert'
            },
            EmotionType.THINKING: {
                'mouth_slight': 0.1,
                'eye_squint': 0.2,
                'eyebrow_furrow': 0.4,
                'head_tilt': 15.0,
                'body_posture': 'contemplative'
            },
            EmotionType.EXCITED: {
                'mouth_smile': 0.9,
                'eye_bright': 0.7,
                'eyebrow_raise': 0.5,
                'head_bounce': True,
                'body_posture': 'energetic'
            }
        }
    
    async def generate_animation_sequence(
        self, 
        text: str, 
        emotion: Union[str, EmotionType],
        character_state: Dict,
        duration: Optional[float] = None
    ) -> AnimationSequence:
        """
        Generate natural animations based on text input and emotional context
        
        Args:
            text: Input text to animate to
            emotion: Target emotion for the animation
            character_state: Current state of the character
            duration: Override animation duration
            
        Returns:
            Complete animation sequence
        """
        logger.info(f"Generating animation for text: '{text}' with emotion: {emotion}")
        
        try:
            # Convert emotion to enum if string
            if isinstance(emotion, str):
                emotion = EmotionType(emotion.lower())
            
            # Calculate duration if not provided
            if duration is None:
                duration = self._calculate_duration(text)
            
            # 1. Analyze text for gesture cues
            gesture_cues = self._analyze_gesture_context(text)
            
            # 2. Generate base body motion
            body_motion = await self._generate_body_motion(text, emotion, gesture_cues, duration)
            
            # 3. Generate facial animation
            facial_animation = await self._generate_facial_animation(text, emotion, duration)
            
            # 4. Add micro-movements and breathing
            micro_movements = self._generate_micro_movements(character_state, duration)
            
            # 5. Physics-based secondary motion
            secondary_motion = await self._generate_secondary_motion(body_motion, character_state)
            
            sequence = AnimationSequence(
                body=body_motion,
                face=facial_animation,
                micro=micro_movements,
                secondary=secondary_motion,
                duration=duration,
                fps=self.fps
            )
            
            logger.info(f"Generated animation sequence: {duration:.2f}s, {sequence.get_total_frames()} frames")
            return sequence
            
        except Exception as e:
            logger.error(f"Error generating animation: {e}")
            # Return safe fallback animation
            return self._create_fallback_animation(duration or 2.0)
    
    def _analyze_gesture_context(self, text: str) -> List[GestureType]:
        """Analyze text for natural gesture cues"""
        gestures = []
        text_lower = text.lower()
        
        # Simple keyword-based gesture detection
        # In production, would use NLP model
        
        gesture_keywords = {
            GestureType.WAVE: ['hello', 'hi', 'goodbye', 'bye', 'wave'],
            GestureType.POINT: ['that', 'this', 'look', 'see', 'over there'],
            GestureType.THUMBS_UP: ['good', 'great', 'awesome', 'perfect', 'yes'],
            GestureType.SHRUG: ['dunno', "don't know", 'maybe', 'perhaps', 'not sure'],
            GestureType.NOD: ['yes', 'yeah', 'agree', 'absolutely', 'definitely'],
            GestureType.SHAKE_HEAD: ['no', 'nope', 'disagree', 'never'],
            GestureType.THINKING_POSE: ['think', 'wonder', 'consider', 'hmm', 'let me see'],
            GestureType.CLAP: ['applause', 'clap', 'congratulations', 'well done']
        }
        
        for gesture, keywords in gesture_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                gestures.append(gesture)
        
        return gestures
    
    async def _generate_body_motion(
        self, 
        text: str, 
        emotion: EmotionType, 
        gestures: List[GestureType],
        duration: float
    ) -> BodyMotion:
        """Generate body motion based on input parameters"""
        
        # Get emotion-specific parameters
        emotion_params = self.emotion_mappings.get(emotion, {})
        
        # Generate keyframes for each body part
        time_points = np.linspace(0, duration, max(2, int(duration * 4)))  # 4 keyframes per second
        
        # Head motion
        head_keyframes = self._generate_head_motion(time_points, emotion_params, gestures)
        
        # Neck motion (follows head with slight delay)
        neck_keyframes = self._generate_neck_motion(head_keyframes, time_points)
        
        # Spine motion (breathing and posture)
        spine_keyframes = self._generate_spine_motion(time_points, emotion_params)
        
        # Arm motions (based on gestures)
        left_arm_keyframes = self._generate_arm_motion(time_points, gestures, 'left')
        right_arm_keyframes = self._generate_arm_motion(time_points, gestures, 'right')
        
        # Hand motions (detailed finger control)
        left_hand_keyframes = self._generate_hand_motion(time_points, gestures, 'left')
        right_hand_keyframes = self._generate_hand_motion(time_points, gestures, 'right')
        
        return BodyMotion(
            head=head_keyframes,
            neck=neck_keyframes,
            spine=spine_keyframes,
            left_arm=left_arm_keyframes,
            right_arm=right_arm_keyframes,
            left_hand=left_hand_keyframes,
            right_hand=right_hand_keyframes
        )
    
    def _generate_head_motion(
        self, 
        time_points: np.ndarray, 
        emotion_params: Dict, 
        gestures: List[GestureType]
    ) -> List[AnimationKeyframe]:
        """Generate natural head motion"""
        keyframes = []
        
        for i, t in enumerate(time_points):
            # Base position
            position = np.array([0.0, 0.0, 0.0])
            
            # Base rotation (neutral)
            rotation = np.array([0.0, 0.0, 0.0])
            
            # Apply emotion-based modifications
            if 'head_tilt' in emotion_params:
                rotation[2] = np.radians(emotion_params['head_tilt'])
            
            if 'head_back' in emotion_params:
                rotation[0] = np.radians(emotion_params['head_back'])
            
            # Apply gesture-based modifications
            for gesture in gestures:
                if gesture == GestureType.NOD:
                    # Add nodding motion
                    nod_phase = (t * 4) % (2 * np.pi)  # 2 nods per second
                    rotation[0] += np.sin(nod_phase) * 0.2
                
                elif gesture == GestureType.SHAKE_HEAD:
                    # Add head shaking motion
                    shake_phase = (t * 6) % (2 * np.pi)  # 3 shakes per second
                    rotation[1] += np.sin(shake_phase) * 0.3
            
            # Add subtle random variation for life-like movement
            if i > 0:
                variation = np.random.normal(0, 0.02, 3)
                rotation += variation
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=rotation
            ))
        
        return keyframes
    
    def _generate_neck_motion(
        self, 
        head_keyframes: List[AnimationKeyframe], 
        time_points: np.ndarray
    ) -> List[AnimationKeyframe]:
        """Generate neck motion that follows head with slight delay and damping"""
        keyframes = []
        
        for i, t in enumerate(time_points):
            position = np.array([0.0, 0.0, 0.0])
            
            # Neck follows head rotation with damping
            if i < len(head_keyframes):
                head_rotation = head_keyframes[i].rotation
                # Neck rotates about 60% of head rotation
                rotation = head_rotation * 0.6
            else:
                rotation = np.array([0.0, 0.0, 0.0])
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=rotation
            ))
        
        return keyframes
    
    def _generate_spine_motion(
        self, 
        time_points: np.ndarray, 
        emotion_params: Dict
    ) -> List[AnimationKeyframe]:
        """Generate spine motion for posture and breathing"""
        keyframes = []
        
        for t in time_points:
            position = np.array([0.0, 0.0, 0.0])
            rotation = np.array([0.0, 0.0, 0.0])
            
            # Breathing motion
            breathing_phase = t * (self.breathing_rate / 60) * 2 * np.pi
            breathing_amplitude = 0.005  # Subtle breathing movement
            position[2] = np.sin(breathing_phase) * breathing_amplitude
            
            # Posture based on emotion
            posture = emotion_params.get('body_posture', 'neutral')
            if posture == 'slouched':
                rotation[0] = np.radians(5)  # Slight forward lean
            elif posture == 'upright':
                rotation[0] = np.radians(-2)  # Slight backward lean
            elif posture == 'alert':
                position[1] += 0.01  # Lift chest slightly
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=rotation
            ))
        
        return keyframes
    
    def _generate_arm_motion(
        self, 
        time_points: np.ndarray, 
        gestures: List[GestureType], 
        side: str
    ) -> List[AnimationKeyframe]:
        """Generate arm motion based on gestures"""
        keyframes = []
        
        for t in time_points:
            position = np.array([0.0, 0.0, 0.0])
            rotation = np.array([0.0, 0.0, 0.0])
            
            # Default arm position (relaxed)
            if side == 'left':
                rotation = np.array([0.1, 0.0, -0.1])  # Slightly outward
            else:
                rotation = np.array([0.1, 0.0, 0.1])
            
            # Apply gesture-specific motions
            for gesture in gestures:
                if gesture == GestureType.WAVE:
                    # Waving motion (typically right hand)
                    if side == 'right':
                        wave_phase = (t * 8) % (2 * np.pi)  # 4 waves per second
                        rotation[2] = np.radians(45) + np.sin(wave_phase) * 0.5
                        rotation[0] = np.radians(-30)
                
                elif gesture == GestureType.POINT:
                    # Pointing gesture
                    if side == 'right':
                        rotation[0] = np.radians(-15)
                        rotation[1] = np.radians(30)
                
                elif gesture == GestureType.THUMBS_UP:
                    # Thumbs up gesture
                    if side == 'right':
                        rotation[0] = np.radians(-45)
                        rotation[2] = np.radians(30)
                
                elif gesture == GestureType.THINKING_POSE:
                    # Hand to chin thinking pose
                    if side == 'right':
                        rotation[0] = np.radians(-90)
                        rotation[1] = np.radians(45)
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=rotation
            ))
        
        return keyframes
    
    def _generate_hand_motion(
        self, 
        time_points: np.ndarray, 
        gestures: List[GestureType], 
        side: str
    ) -> List[AnimationKeyframe]:
        """Generate detailed hand and finger motion"""
        keyframes = []
        
        for t in time_points:
            position = np.array([0.0, 0.0, 0.0])
            rotation = np.array([0.0, 0.0, 0.0])
            
            # Default hand pose (slightly curved, natural)
            # This would include individual finger positions in production
            
            # Apply gesture-specific hand poses
            for gesture in gestures:
                if gesture == GestureType.WAVE:
                    # Open hand for waving
                    pass  # Fingers extended
                
                elif gesture == GestureType.POINT:
                    # Index finger extended, others curled
                    pass
                
                elif gesture == GestureType.THUMBS_UP:
                    # Thumb up, fingers curled
                    pass
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=rotation
            ))
        
        return keyframes
    
    async def _generate_facial_animation(
        self, 
        text: str, 
        emotion: EmotionType, 
        duration: float
    ) -> FacialAnimation:
        """Generate facial animation including lip sync and expressions"""
        
        time_points = np.linspace(0, duration, max(2, int(duration * 10)))  # 10 keyframes per second
        
        # Eye blinking
        eye_blink = self._generate_eye_blinks(time_points)
        
        # Eye movement (following conversation)
        eye_movement = self._generate_eye_movement(time_points, emotion)
        
        # Mouth shapes for lip sync
        mouth_shape = await self._generate_lip_sync(text, time_points)
        
        # Eyebrow movement
        eyebrow_movement = self._generate_eyebrow_motion(time_points, emotion)
        
        # Overall emotion blend
        emotion_blend = self._generate_emotion_blend(time_points, emotion)
        
        return FacialAnimation(
            eye_blink=eye_blink,
            eye_movement=eye_movement,
            mouth_shape=mouth_shape,
            eyebrow_movement=eyebrow_movement,
            emotion_blend=emotion_blend
        )
    
    def _generate_eye_blinks(self, time_points: np.ndarray) -> List[AnimationKeyframe]:
        """Generate natural eye blinking pattern"""
        keyframes = []
        
        # Generate random blink times
        blink_interval = 60.0 / self.blink_frequency  # Average time between blinks
        blink_times = []
        
        current_time = 0
        while current_time < time_points[-1]:
            # Add some randomness to blink timing
            next_blink = current_time + blink_interval + np.random.normal(0, blink_interval * 0.3)
            if next_blink < time_points[-1]:
                blink_times.append(next_blink)
            current_time = next_blink
        
        for t in time_points:
            # Default eyes open
            eye_openness = 1.0
            
            # Check if this is during a blink
            for blink_time in blink_times:
                blink_duration = 0.15  # Blink lasts 150ms
                if abs(t - blink_time) < blink_duration / 2:
                    # Calculate blink curve
                    blink_phase = abs(t - blink_time) / (blink_duration / 2)
                    eye_openness = 1.0 - (1.0 - blink_phase**2)  # Smooth blink curve
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=np.array([eye_openness]),
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return keyframes
    
    def _generate_eye_movement(
        self, 
        time_points: np.ndarray, 
        emotion: EmotionType
    ) -> List[AnimationKeyframe]:
        """Generate natural eye movement patterns"""
        keyframes = []
        
        for t in time_points:
            # Base eye position (looking forward)
            look_direction = np.array([0.0, 0.0])  # horizontal, vertical
            
            # Add emotion-based eye behavior
            if emotion == EmotionType.THINKING:
                # Look up and to the side when thinking
                look_direction[0] = 0.3  # Look right
                look_direction[1] = 0.2  # Look up slightly
            
            elif emotion == EmotionType.SAD:
                # Look down when sad
                look_direction[1] = -0.3
            
            elif emotion == EmotionType.SURPRISED:
                # Wide eyes, looking forward
                pass  # Keep default
            
            # Add subtle random eye movements for realism
            random_movement = np.random.normal(0, 0.05, 2)
            look_direction += random_movement
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=look_direction,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return keyframes
    
    async def _generate_lip_sync(self, text: str, time_points: np.ndarray) -> List[AnimationKeyframe]:
        """Generate lip synchronization for speech"""
        keyframes = []
        
        # Simple phoneme-based lip sync (placeholder)
        # In production, would use proper TTS and phoneme analysis
        
        words = text.split()
        word_duration = len(time_points) / max(1, len(words))
        
        for i, t in enumerate(time_points):
            # Determine which word we're in
            word_index = int(i / word_duration)
            if word_index < len(words):
                word = words[word_index].lower()
                # Simple mouth shape based on word characteristics
                mouth_shape = self._get_mouth_shape_for_word(word)
            else:
                mouth_shape = np.array([0.0])  # Mouth closed
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=mouth_shape,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return keyframes
    
    def _get_mouth_shape_for_word(self, word: str) -> np.ndarray:
        """Get approximate mouth shape for a word (simplified)"""
        # Very basic phoneme approximation
        if any(vowel in word for vowel in ['a', 'e', 'i', 'o', 'u']):
            return np.array([0.4])  # Open mouth for vowels
        elif any(consonant in word for consonant in ['m', 'p', 'b']):
            return np.array([0.0])  # Closed mouth for bilabials
        else:
            return np.array([0.2])  # Slightly open for other consonants
    
    def _generate_eyebrow_motion(
        self, 
        time_points: np.ndarray, 
        emotion: EmotionType
    ) -> List[AnimationKeyframe]:
        """Generate eyebrow movement based on emotion"""
        keyframes = []
        
        emotion_params = self.emotion_mappings.get(emotion, {})
        
        for t in time_points:
            position = np.array([0.0])  # Neutral position
            
            # Apply emotion-based eyebrow position
            if 'eyebrow_raise' in emotion_params:
                position[0] = emotion_params['eyebrow_raise']
            elif 'eyebrow_lower' in emotion_params:
                position[0] = emotion_params['eyebrow_lower']
            elif 'eyebrow_furrow' in emotion_params:
                position[0] = emotion_params['eyebrow_furrow']
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return keyframes
    
    def _generate_emotion_blend(
        self, 
        time_points: np.ndarray, 
        emotion: EmotionType
    ) -> List[AnimationKeyframe]:
        """Generate overall emotion intensity over time"""
        keyframes = []
        
        for t in time_points:
            # Emotion intensity could vary over time
            intensity = 1.0  # Full emotion intensity
            
            # Could add emotion transitions here
            
            keyframes.append(AnimationKeyframe(
                time=t,
                position=np.array([intensity]),
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return keyframes
    
    def _generate_micro_movements(
        self, 
        character_state: Dict, 
        duration: float
    ) -> MicroMovements:
        """Generate subtle life-like micro movements"""
        
        time_points = np.linspace(0, duration, max(2, int(duration * 60)))  # 60 samples per second
        
        # Breathing animation
        breathing = []
        for t in time_points:
            breathing_phase = t * (self.breathing_rate / 60) * 2 * np.pi
            amplitude = np.array([0.0, np.sin(breathing_phase) * 0.005, 0.0])
            
            breathing.append(AnimationKeyframe(
                time=t,
                position=amplitude,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        # Idle sway (very subtle body movement)
        idle_sway = []
        for t in time_points:
            sway_phase = t * 0.1 * 2 * np.pi  # Very slow sway
            sway_amount = np.array([np.sin(sway_phase) * 0.002, 0.0, 0.0])
            
            idle_sway.append(AnimationKeyframe(
                time=t,
                position=sway_amount,
                rotation=np.array([0.0, 0.0, np.sin(sway_phase * 0.5) * 0.01])
            ))
        
        # Weight shifting
        weight_shift = []
        shift_interval = 8.0  # Shift weight every 8 seconds
        for t in time_points:
            shift_phase = (t / shift_interval) % 1.0
            if shift_phase < 0.1:  # Quick shift
                shift_amount = np.array([0.0, 0.0, np.sin(shift_phase * 10 * np.pi) * 0.01])
            else:
                shift_amount = np.array([0.0, 0.0, 0.0])
            
            weight_shift.append(AnimationKeyframe(
                time=t,
                position=shift_amount,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        # Random blink times
        random_blinks = []
        blink_interval = 60.0 / self.blink_frequency
        current_time = 0
        while current_time < duration:
            current_time += blink_interval + np.random.normal(0, blink_interval * 0.3)
            if current_time < duration:
                random_blinks.append(current_time)
        
        return MicroMovements(
            breathing=breathing,
            idle_sway=idle_sway,
            weight_shift=weight_shift,
            random_blinks=random_blinks
        )
    
    async def _generate_secondary_motion(
        self, 
        body_motion: BodyMotion, 
        character_state: Dict
    ) -> SecondaryMotion:
        """Generate physics-based secondary motion for hair and clothing"""
        
        # Hair physics simulation
        hair_physics = await self._simulate_hair_motion(body_motion, character_state)
        
        # Clothing physics simulation  
        clothing_physics = await self._simulate_clothing_motion(body_motion, character_state)
        
        # Accessories motion
        accessories = {}  # Placeholder for accessories
        
        return SecondaryMotion(
            hair_physics=hair_physics,
            clothing_physics=clothing_physics,
            accessories=accessories
        )
    
    async def _simulate_hair_motion(
        self, 
        body_motion: BodyMotion, 
        character_state: Dict
    ) -> Dict[str, List[AnimationKeyframe]]:
        """Simulate hair motion based on head movement"""
        
        hair_motion = {'hair_main': []}
        
        # Simple hair physics based on head motion
        for head_keyframe in body_motion.head:
            # Hair follows head movement with delay and damping
            hair_offset = head_keyframe.rotation * 0.3  # Hair moves 30% of head rotation
            
            hair_motion['hair_main'].append(AnimationKeyframe(
                time=head_keyframe.time,
                position=np.array([0.0, 0.0, 0.0]),
                rotation=hair_offset
            ))
        
        return hair_motion
    
    async def _simulate_clothing_motion(
        self, 
        body_motion: BodyMotion, 
        character_state: Dict
    ) -> Dict[str, List[AnimationKeyframe]]:
        """Simulate clothing motion based on body movement"""
        
        clothing_motion = {'skirt': [], 'sleeves': []}
        
        # Simple clothing physics
        for spine_keyframe in body_motion.spine:
            # Clothing follows body movement
            clothing_offset = spine_keyframe.position * 0.5
            
            clothing_motion['skirt'].append(AnimationKeyframe(
                time=spine_keyframe.time,
                position=clothing_offset,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        return clothing_motion
    
    def _calculate_duration(self, text: str) -> float:
        """Calculate appropriate animation duration for text"""
        # Simple duration calculation based on text length
        # Average speaking rate is about 150 words per minute
        words = len(text.split())
        duration = (words / 150) * 60  # Convert to seconds
        
        # Minimum duration for very short text
        duration = max(duration, 1.0)
        
        # Maximum duration to prevent overly long animations
        duration = min(duration, 10.0)
        
        return duration
    
    def _create_fallback_animation(self, duration: float) -> AnimationSequence:
        """Create safe fallback animation in case of errors"""
        logger.warning("Creating fallback animation")
        
        # Simple idle animation
        time_points = np.linspace(0, duration, max(2, int(duration * 4)))
        
        # Simple breathing motion
        simple_keyframes = []
        for t in time_points:
            breathing_phase = t * (self.breathing_rate / 60) * 2 * np.pi
            position = np.array([0.0, np.sin(breathing_phase) * 0.005, 0.0])
            
            simple_keyframes.append(AnimationKeyframe(
                time=t,
                position=position,
                rotation=np.array([0.0, 0.0, 0.0])
            ))
        
        # Create minimal animation sequence
        body_motion = BodyMotion(
            head=simple_keyframes.copy(),
            neck=simple_keyframes.copy(),
            spine=simple_keyframes.copy(),
            left_arm=simple_keyframes.copy(),
            right_arm=simple_keyframes.copy(),
            left_hand=simple_keyframes.copy(),
            right_hand=simple_keyframes.copy()
        )
        
        facial_animation = FacialAnimation(
            eye_blink=[],
            eye_movement=[],
            mouth_shape=[],
            eyebrow_movement=[],
            emotion_blend=[]
        )
        
        micro_movements = MicroMovements(
            breathing=simple_keyframes.copy(),
            idle_sway=[],
            weight_shift=[],
            random_blinks=[]
        )
        
        secondary_motion = SecondaryMotion(
            hair_physics={},
            clothing_physics={},
            accessories={}
        )
        
        return AnimationSequence(
            body=body_motion,
            face=facial_animation,
            micro=micro_movements,
            secondary=secondary_motion,
            duration=duration
        )
    
    async def generate_idle_animation(self, character_state: Dict, loop_duration: float = 10.0) -> AnimationLoop:
        """Generate natural idle movements for when character is not actively speaking"""
        
        logger.info(f"Generating idle animation loop: {loop_duration}s")
        
        # Create multiple idle sequences for variety
        sequences = []
        
        # Basic breathing and micro-movements
        basic_sequence = await self.generate_animation_sequence(
            text="",
            emotion=EmotionType.NEUTRAL,
            character_state=character_state,
            duration=loop_duration / 3
        )
        sequences.append(basic_sequence)
        
        # Subtle look around
        look_sequence = await self.generate_animation_sequence(
            text="",
            emotion=EmotionType.THINKING,
            character_state=character_state,
            duration=loop_duration / 3
        )
        sequences.append(look_sequence)
        
        # Return to neutral
        neutral_sequence = await self.generate_animation_sequence(
            text="",
            emotion=EmotionType.NEUTRAL,
            character_state=character_state,
            duration=loop_duration / 3
        )
        sequences.append(neutral_sequence)
        
        return AnimationLoop(
            sequences=sequences,
            loop_duration=loop_duration,
            seamless=True
        )

# Usage example
async def main():
    generator = MotionGenerator()
    
    # Test animation generation
    character_state = {
        'personality': 'friendly',
        'energy_level': 0.7,
        'current_emotion': EmotionType.NEUTRAL
    }
    
    # Generate greeting animation
    sequence = await generator.generate_animation_sequence(
        text="Hello! How are you doing today?",
        emotion=EmotionType.HAPPY,
        character_state=character_state
    )
    
    print(f"Generated animation: {sequence.duration:.2f}s, {sequence.get_total_frames()} frames")
    print(f"Body keyframes: {len(sequence.body.head)}")
    print(f"Facial keyframes: {len(sequence.face.eye_blink)}")

if __name__ == "__main__":
    asyncio.run(main())
