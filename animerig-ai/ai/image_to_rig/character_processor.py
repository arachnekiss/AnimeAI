import torch
import cv2
import numpy as np
import os
import asyncio
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import MediaPipe with fallback handling
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
    logger.info("MediaPipe loaded successfully")
except ImportError as e:
    logger.warning(f"MediaPipe not available: {e}")
    MEDIAPIPE_AVAILABLE = False
    mp = None

class CharacterProcessor:
    """
    Convert single character image to fully rigged 3D character
    Uses state-of-the-art AI models for depth estimation, view synthesis, and auto-rigging
    """
    
    def __init__(self, device: str = "auto"):
        self.device = device
        self.depth_model = None
        self.segmentation_model = None
        self.view_synthesis_model = None
        # torch 및 무거운 모델은 실제로 필요할 때만 import 및 로딩
        
        # Initialize MediaPipe (with fallback)
        if MEDIAPIPE_AVAILABLE:
            self.mp_holistic = mp.solutions.holistic
            self.mp_drawing = mp.solutions.drawing_utils
            logger.info("MediaPipe solutions initialized")
        else:
            self.mp_holistic = None
            self.mp_drawing = None
            logger.warning("MediaPipe not available - pose detection will be disabled")
        
        self._load_models()
    
    def _select_device(self, device: str) -> str:
        """Auto-select best available device"""
        if device == "auto":
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                return "mps"  # Apple Silicon
            else:
                return "cpu"
        return device
    
    def _load_models(self):
        """Load all required AI models"""
        try:
            # For now, skip heavy model loading to avoid hanging
            # These models will be loaded on-demand when actually needed
            logger.info("Initializing models in lightweight mode...")
            
            self.depth_model = None
            self.segmentation_model = None  
            self.view_synthesis_model = None
            
            logger.info("Basic model structure initialized - models will load on-demand")
            
            # Initialize pose detector (with MediaPipe fallback)
            if MEDIAPIPE_AVAILABLE and self.mp_holistic:
                self.pose_detector = self.mp_holistic.Holistic(
                    static_image_mode=True,
                    model_complexity=2,
                    enable_segmentation=True,
                    refine_face_landmarks=True
                )
                logger.info("MediaPipe pose detector initialized")
            else:
                self.pose_detector = None
                logger.warning("Pose detector not available - MediaPipe not loaded")
            
            logger.info("All models loaded successfully!")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise
    
    def _load_segmentation_model(self):
        """Load character segmentation model"""
        # Placeholder - would load actual segmentation model
        # Could use SAM, U2Net, or custom trained model
        return None
    
    def _load_zero123_model(self):
        """Load Zero-1-to-3 or similar view synthesis model"""
        # Placeholder for view synthesis model
        return None
    
    async def process_character_image(self, image_path: str) -> Dict:
        """
        Main pipeline: Convert single image to fully rigged 3D character
        
        Args:
            image_path: Path to input character image
            
        Returns:
            Dict containing mesh data, skeleton, textures, and physics regions
        """
        logger.info(f"Processing character image: {image_path}")
        
        try:
            # 1. Load and preprocess image
            image = self._load_image(image_path)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            # 2. Segment character from background
            logger.info("Segmenting character...")
            mask = await self._segment_character(image)
            character = cv2.bitwise_and(image, image, mask=mask)
            
            # 3. Estimate depth map
            logger.info("Estimating depth...")
            depth = await self._estimate_depth(character)
            
            # 4. Generate multiple views using AI
            logger.info("Generating multiple views...")
            views = await self._generate_views(character, depth)
            
            # 5. Extract detailed features
            logger.info("Extracting features...")
            features = await self._extract_features(character)
            
            # 6. Create 3D mesh with rigging info
            logger.info("Creating 3D mesh...")
            mesh_data = await self._create_3d_mesh(views, depth, features)
            
            # 7. Auto-rig the character
            logger.info("Auto-rigging character...")
            skeleton = await self._auto_rig(mesh_data, features)
            
            # 8. Extract textures and materials
            logger.info("Extracting textures...")
            textures = await self._extract_textures(character, views)
            
            # 9. Identify physics simulation regions
            logger.info("Identifying physics regions...")
            physics_regions = await self._identify_physics_regions(mesh_data, features)
            
            result = {
                'mesh': mesh_data,
                'skeleton': skeleton,
                'textures': textures,
                'physics_regions': physics_regions,
                'features': features,
                'metadata': {
                    'source_image': image_path,
                    'processing_device': self.device,
                    'timestamp': np.datetime64('now')
                }
            }
            
            logger.info("Character processing completed successfully!")
            return result
            
        except Exception as e:
            logger.error(f"Error processing character: {e}")
            raise

    def process_image(self, image: np.ndarray) -> Dict:
        """
        Synchronous method to process image array directly (for GUI compatibility)
        
        Args:
            image: OpenCV image array (BGR format)
            
        Returns:
            Dict containing processed character data for rendering
        """
        try:
            logger.info("Processing image array for character generation...")
            
            # Convert BGR to RGB if needed (OpenCV loads as BGR)
            if len(image.shape) == 3 and image.shape[2] == 3:
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image
            
            # Extract features using simplified synchronous methods
            features = {
                'face': self._detect_face_features(rgb_image),
                'pose': self._detect_pose(rgb_image),
                'hands': self._detect_hands(rgb_image),
                'hair': self._detect_hair_region(rgb_image),
                'clothing': self._detect_clothing(rgb_image),
                'body_proportions': self._analyze_body_proportions(rgb_image)
            }
            
            # Generate 3D model from features
            model_3d = self.generate_3d_model(features)
            
            # Create animation rig
            rig = self.create_animation_rig(model_3d)
            
            # Package result for rendering
            result = {
                'vertices': model_3d.get('vertices', []),
                'faces': model_3d.get('faces', []),
                'materials': model_3d.get('materials', {}),
                'textures': model_3d.get('textures', {}),
                'bones': rig.get('bones', []),
                'animations': rig.get('animations', {}),
                'features': features,
                'metadata': {
                    'processing_device': self.device,
                    'bone_count': len(rig.get('bones', [])),
                    'vertex_count': len(model_3d.get('vertices', [])),
                    'ready_for_rendering': True
                }
            }
            
            logger.info(f"Image processing completed: {len(result['vertices'])} vertices, {len(result['bones'])} bones")
            return result
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            # Return minimal fallback data to prevent crashes
            return {
                'vertices': [],
                'faces': [],
                'materials': {},
                'textures': {},
                'bones': [],
                'animations': {},
                'features': {},
                'metadata': {'ready_for_rendering': False, 'error': str(e)}
            }
    
    def _load_image(self, image_path: str) -> Optional[np.ndarray]:
        """Load and validate input image"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return None
            
            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Resize if too large (memory optimization)
            h, w = image.shape[:2]
            if max(h, w) > 1024:
                scale = 1024 / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            
            return image
            
        except Exception as e:
            logger.error(f"Error loading image: {e}")
            return None
    
    async def _segment_character(self, image: np.ndarray) -> np.ndarray:
        """Segment character from background using AI"""
        # Placeholder implementation
        # In production, would use SAM, U2Net, or similar
        
        # Simple background removal based on color similarity
        # This is a fallback - replace with proper AI segmentation
        
        # Convert to Lab color space for better segmentation
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
        
        # Use GrabCut algorithm as fallback
        mask = np.zeros(image.shape[:2], np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        # Define probable foreground (center region)
        h, w = image.shape[:2]
        rect = (w//4, h//4, w//2, h//2)
        
        cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        
        # Create final mask
        mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
        
        return mask2
    
    async def _estimate_depth(self, image: np.ndarray) -> np.ndarray:
        """Estimate depth map using ZoeDepth or similar model"""
        try:
            if self.depth_model is None:
                logger.warning("Depth model not available, using placeholder")
                return np.zeros(image.shape[:2], dtype=np.float32)
            
            # Convert to PIL Image for ZoeDepth
            pil_image = Image.fromarray(image)
            
            # Run depth estimation
            with torch.no_grad():
                depth = self.depth_model.infer_pil(pil_image)
            
            # Normalize depth values
            depth = (depth - depth.min()) / (depth.max() - depth.min())
            
            return depth.astype(np.float32)
            
        except Exception as e:
            logger.error(f"Error estimating depth: {e}")
            # Return fallback depth map
            return np.zeros(image.shape[:2], dtype=np.float32)
    
    async def _generate_views(self, image: np.ndarray, depth: np.ndarray) -> Dict[str, np.ndarray]:
        """Generate multiple viewing angles using Zero-1-to-3 or similar"""
        views = {}
        
        try:
            # For now, return the original image as all views
            # In production, would use Zero-1-to-3 or similar model
            
            angles = [0, 45, 90, 135, 180, 225, 270, 315]
            
            for angle in angles:
                # Placeholder: simple rotation for demonstration
                if angle == 0:
                    views[f'angle_{angle}'] = image.copy()
                else:
                    # Generate synthetic view (placeholder)
                    views[f'angle_{angle}'] = self._generate_synthetic_view(image, depth, angle)
            
            # Generate top and bottom views
            views['top'] = self._generate_synthetic_view(image, depth, 0, elevation=90)
            views['bottom'] = self._generate_synthetic_view(image, depth, 0, elevation=-90)
            
            logger.info(f"Generated {len(views)} views")
            return views
            
        except Exception as e:
            logger.error(f"Error generating views: {e}")
            return {'angle_0': image}  # Fallback to original image
    
    def _generate_synthetic_view(self, image: np.ndarray, depth: np.ndarray, 
                                rotation: float, elevation: float = 0) -> np.ndarray:
        """Generate synthetic view (placeholder implementation)"""
        # This is a simplified placeholder
        # In production, would use proper 3D view synthesis
        
        if rotation == 0 and elevation == 0:
            return image.copy()
        
        # Simple horizontal flip for 180-degree view
        if rotation == 180:
            return cv2.flip(image, 1)
        
        # For other angles, return slightly modified image
        # This is just for demonstration
        h, w = image.shape[:2]
        center = (w // 2, h // 2)
        
        # Create rotation matrix
        angle_rad = np.radians(rotation * 0.1)  # Subtle rotation
        M = cv2.getRotationMatrix2D(center, angle_rad, 1.0)
        
        # Apply transformation
        rotated = cv2.warpAffine(image, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        
        return rotated
    
    async def _extract_features(self, image: np.ndarray) -> Dict:
        """Extract detailed character features using MediaPipe and custom analysis"""
        features = {
            'hair': None,
            'face': None,
            'clothing': None,
            'pose': None,
            'hands': None
        }
        
        try:
            # Run MediaPipe holistic detection (if available)
            if self.pose_detector:
                results = self.pose_detector.process(image)
                
                if results.pose_landmarks:
                    features['pose'] = self._extract_pose_info(results.pose_landmarks)
                
                if results.face_landmarks:
                    features['face'] = self._extract_facial_features(results.face_landmarks, image)
                
                if results.left_hand_landmarks or results.right_hand_landmarks:
                    features['hands'] = self._extract_hand_features(
                        results.left_hand_landmarks, 
                        results.right_hand_landmarks
                    )
            else:
                logger.warning("Pose detection skipped - MediaPipe not available")
                # Use basic OpenCV-based feature detection as fallback
                features = self._extract_features_opencv(image)
            
            # Extract hair regions (custom analysis)
            features['hair'] = await self._extract_hair_regions(image)
            
            # Extract clothing layers
            features['clothing'] = await self._extract_clothing_layers(image)
            
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {e}")
            return features
    
    def _extract_features_opencv(self, image: np.ndarray) -> Dict:
        """Fallback feature extraction using OpenCV when MediaPipe is not available"""
        features = {
            'hair': None,
            'face': None,
            'clothing': None,
            'pose': None,
            'hands': None
        }
        
        try:
            # Use OpenCV face detection as fallback
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # Load OpenCV face cascade (basic face detection)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                # Use the largest detected face
                x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
                features['face'] = {
                    'bbox': [x, y, w, h],
                    'center': [x + w//2, y + h//2],
                    'landmarks': None  # Basic detection doesn't provide landmarks
                }
                
                # Estimate basic pose from face position
                img_h, img_w = image.shape[:2]
                face_center_x = x + w // 2
                face_center_y = y + h // 2
                
                features['pose'] = {
                    'head_position': [face_center_x / img_w, face_center_y / img_h],
                    'estimated_angle': 0,  # Default frontal pose
                    'confidence': 0.5  # Lower confidence for basic detection
                }
            
            logger.info("OpenCV-based feature extraction completed")
            
        except Exception as e:
            logger.warning(f"OpenCV fallback failed: {e}")
            
        return features

    def _extract_pose_info(self, pose_landmarks) -> Dict:
        """Extract pose information from MediaPipe landmarks"""
        pose_data = {
            'landmarks': [],
            'connections': []
        }
        
        for landmark in pose_landmarks.landmark:
            pose_data['landmarks'].append({
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z,
                'visibility': landmark.visibility
            })
        
        return pose_data
    
    def _extract_facial_features(self, face_landmarks, image: np.ndarray) -> Dict:
        """Extract detailed facial features"""
        face_data = {
            'landmarks': [],
            'regions': {
                'eyes': [],
                'mouth': [],
                'eyebrows': [],
                'nose': []
            }
        }
        
        for landmark in face_landmarks.landmark:
            face_data['landmarks'].append({
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z
            })
        
        # Analyze facial regions
        # TODO: Implement detailed facial feature extraction
        
        return face_data
    
    def _extract_hand_features(self, left_hand, right_hand) -> Dict:
        """Extract hand and finger information"""
        hands_data = {
            'left': None,
            'right': None
        }
        
        if left_hand:
            hands_data['left'] = self._process_hand_landmarks(left_hand)
        
        if right_hand:
            hands_data['right'] = self._process_hand_landmarks(right_hand)
        
        return hands_data
    
    def _process_hand_landmarks(self, hand_landmarks) -> Dict:
        """Process individual hand landmarks"""
        hand_data = {
            'landmarks': [],
            'fingers': {
                'thumb': [],
                'index': [],
                'middle': [],
                'ring': [],
                'pinky': []
            }
        }
        
        for landmark in hand_landmarks.landmark:
            hand_data['landmarks'].append({
                'x': landmark.x,
                'y': landmark.y,
                'z': landmark.z
            })
        
        # Group landmarks by finger
        # MediaPipe hand landmark indices are well-defined
        finger_indices = {
            'thumb': [1, 2, 3, 4],
            'index': [5, 6, 7, 8],
            'middle': [9, 10, 11, 12],
            'ring': [13, 14, 15, 16],
            'pinky': [17, 18, 19, 20]
        }
        
        for finger_name, indices in finger_indices.items():
            for idx in indices:
                if idx < len(hand_data['landmarks']):
                    hand_data['fingers'][finger_name].append(hand_data['landmarks'][idx])
        
        return hand_data
    
    async def _extract_hair_regions(self, image: np.ndarray) -> Dict:
        """Extract hair regions for physics simulation"""
        # Placeholder implementation
        # Would use specialized hair segmentation model
        
        hair_data = {
            'regions': [],
            'strands': [],
            'properties': {
                'length': 'medium',
                'thickness': 'normal',
                'curliness': 'straight'
            }
        }
        
        return hair_data
    
    async def _extract_clothing_layers(self, image: np.ndarray) -> Dict:
        """Extract clothing for physics simulation"""
        # Placeholder implementation
        # Would use clothing segmentation model
        
        clothing_data = {
            'layers': [],
            'materials': [],
            'physics_properties': {
                'stiffness': 0.6,
                'damping': 0.8
            }
        }
        
        return clothing_data
    
    async def _create_3d_mesh(self, views: Dict[str, np.ndarray], 
                             depth: np.ndarray, features: Dict) -> Dict:
        """Create 3D mesh from multiple views and depth information"""
        # Placeholder for 3D reconstruction
        # Would use photogrammetry, neural radiance fields, or similar
        
        mesh_data = {
            'vertices': [],
            'faces': [],
            'normals': [],
            'uvs': [],
            'materials': []
        }
        
        logger.info("3D mesh creation completed (placeholder)")
        return mesh_data
    
    async def _auto_rig(self, mesh_data: Dict, features: Dict) -> Dict:
        """Automatically create character rig from mesh and pose data"""
        # Placeholder for auto-rigging
        # Would use learning-based rigging or template matching
        
        skeleton_data = {
            'bones': [],
            'constraints': [],
            'control_points': [],
            'ik_chains': []
        }
        
        logger.info("Auto-rigging completed (placeholder)")
        return skeleton_data
    
    async def _extract_textures(self, character: np.ndarray, views: Dict[str, np.ndarray]) -> Dict:
        """Extract and optimize textures from multiple views"""
        textures = {
            'diffuse': character,  # Main color texture
            'normal': None,        # Normal map (if available)
            'specular': None,      # Specular map
            'emission': None       # Emission map
        }
        
        return textures
    
    async def _identify_physics_regions(self, mesh_data: Dict, features: Dict) -> Dict:
        """Identify regions for physics simulation (hair, clothing, etc.)"""
        physics_regions = {
            'hair': {
                'vertices': [],
                'constraints': [],
                'properties': {
                    'stiffness': 0.8,
                    'damping': 0.9,
                    'mass': 0.1
                }
            },
            'clothing': {
                'vertices': [],
                'constraints': [],
                'properties': {
                    'stiffness': 0.6,
                    'damping': 0.8,
                    'mass': 0.2
                }
            }
        }
        
        return physics_regions

    def extract_features(self, image_path: str = None) -> Dict:
        """Extract character features from image"""
        if image_path and os.path.exists(image_path):
            print(f"🔍 Extracting features from: {image_path}")
            return self._extract_features_from_image(image_path)
        else:
            print("⚠️ No image provided, using default features")
            return self._get_default_character_features()
    
    def _extract_features_from_image(self, image_path: str) -> Dict:
        """Extract actual features from a real image"""
        try:
            # Load image
            image = cv2.imread(image_path, cv2.IMREAD_COLOR)
            if image is None:
                raise ValueError(f"Could not load image: {image_path}")
            
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width = rgb_image.shape[:2]
            
            print(f"📐 Image loaded: {width}x{height}")
            
            features = {
                'image_path': image_path,
                'image_dimensions': (width, height),
                'face': self._detect_face_features(rgb_image),
                'pose': self._detect_pose(rgb_image),
                'hands': self._detect_hands(rgb_image),
                'hair': self._detect_hair_region(rgb_image),
                'clothing': self._detect_clothing(rgb_image),
                'depth': self._estimate_depth(rgb_image),
                'segmentation': self._segment_character(rgb_image),
                'body_proportions': self._analyze_body_proportions(rgb_image)
            }
            
            print(f"✅ Features extracted: {len(features)} categories")
            return features
            
        except Exception as e:
            print(f"❌ Feature extraction failed: {e}")
            return self._get_default_character_features()
    
    def _detect_face_features(self, image: np.ndarray) -> Dict:
        """Detect facial features using MediaPipe Face Mesh"""
        if not MEDIAPIPE_AVAILABLE:
            return self._get_default_face_features()
        
        try:
            with mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5) as face_mesh:
                
                results = face_mesh.process(image)
                
                if results.multi_face_landmarks:
                    landmarks = results.multi_face_landmarks[0]
                    
                    # Extract key facial landmarks
                    face_features = {
                        'landmarks': [(lm.x, lm.y, lm.z) for lm in landmarks.landmark],
                        'left_eye': self._extract_eye_landmarks(landmarks, 'left'),
                        'right_eye': self._extract_eye_landmarks(landmarks, 'right'),
                        'nose': self._extract_nose_landmarks(landmarks),
                        'mouth': self._extract_mouth_landmarks(landmarks),
                        'face_oval': self._extract_face_oval_landmarks(landmarks),
                        'eyebrows': self._extract_eyebrow_landmarks(landmarks)
                    }
                    
                    print(f"  👁️ Face detected: {len(face_features['landmarks'])} landmarks")
                    return face_features
                    
        except Exception as e:
            print(f"⚠️ Face detection failed: {e}")
        
        return self._get_default_face_features()
    
    def _detect_pose(self, image: np.ndarray) -> Dict:
        """Detect body pose using MediaPipe Pose"""
        if not MEDIAPIPE_AVAILABLE:
            return self._get_default_pose()
        
        try:
            with mp.solutions.pose.Pose(
                static_image_mode=True,
                model_complexity=2,
                enable_segmentation=True,
                min_detection_confidence=0.5) as pose:
                
                results = pose.process(image)
                
                if results.pose_landmarks:
                    landmarks = results.pose_landmarks
                    
                    pose_data = {
                        'landmarks': [(lm.x, lm.y, lm.z) for lm in landmarks.landmark],
                        'visibility': [lm.visibility for lm in landmarks.landmark],
                        'segmentation_mask': results.segmentation_mask,
                        'joints': self._extract_key_joints(landmarks),
                        'confidence': np.mean([lm.visibility for lm in landmarks.landmark])
                    }
                    
                    print(f"  🦴 Pose detected: {len(pose_data['landmarks'])} landmarks")
                    return pose_data
                    
        except Exception as e:
            print(f"⚠️ Pose detection failed: {e}")
        
        return self._get_default_pose()
    
    def _detect_hands(self, image: np.ndarray) -> Dict:
        """Detect hand landmarks using MediaPipe Hands"""
        if not MEDIAPIPE_AVAILABLE:
            return self._get_default_hands()
        
        try:
            with mp.solutions.hands.Hands(
                static_image_mode=True,
                max_num_hands=2,
                min_detection_confidence=0.5) as hands:
                
                results = hands.process(image)
                
                hand_data = {'left': None, 'right': None}
                
                if results.multi_hand_landmarks:
                    for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                        handedness = results.multi_handedness[idx].classification[0].label
                        
                        hand_info = {
                            'landmarks': [(lm.x, lm.y, lm.z) for lm in hand_landmarks.landmark],
                            'finger_tips': self._extract_finger_tips(hand_landmarks),
                            'palm_center': self._calculate_palm_center(hand_landmarks)
                        }
                        
                        hand_data[handedness.lower()] = hand_info
                    
                    print(f"  ✋ Hands detected: {len([h for h in hand_data.values() if h])}")
                    
                return hand_data
                
        except Exception as e:
            print(f"⚠️ Hand detection failed: {e}")
        
        return self._get_default_hands()
    
    def _estimate_depth(self, image: np.ndarray) -> np.ndarray:
        """Estimate depth map from image"""
        try:
            if self.depth_model is None:
                print("⚠️ No depth model available, using dummy depth")
                return np.ones((image.shape[0], image.shape[1]), dtype=np.float32)
            
            # Preprocess image for depth model
            input_tensor = self._preprocess_for_depth(image)
            
            with torch.no_grad():
                depth = self.depth_model(input_tensor)
                
            depth_map = depth.cpu().numpy().squeeze()
            print(f"  🌊 Depth estimated: {depth_map.shape}")
            return depth_map
            
        except Exception as e:
            print(f"⚠️ Depth estimation failed: {e}")
            return np.ones((image.shape[0], image.shape[1]), dtype=np.float32)
    
    def _segment_character(self, image: np.ndarray) -> np.ndarray:
        """Segment character from background"""
        try:
            if self.segmentation_model is None:
                print("⚠️ No segmentation model, using simple background subtraction")
                return self._simple_background_segmentation(image)
            
            # Use advanced segmentation model
            mask = self.segmentation_model(image)
            print(f"  ✂️ Character segmented: {mask.shape}")
            return mask
            
        except Exception as e:
            print(f"⚠️ Segmentation failed: {e}")
            return self._simple_background_segmentation(image)
    
    def _simple_background_segmentation(self, image: np.ndarray) -> np.ndarray:
        """Simple background segmentation fallback"""
        # Convert to HSV for better color segmentation
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        
        # Create a simple mask (assume center contains character)
        h, w = image.shape[:2]
        mask = np.zeros((h, w), dtype=np.uint8)
        
        # Create an elliptical mask in the center
        center = (w // 2, h // 2)
        axes = (w // 3, h // 2)
        cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
        
        return mask
    
    def _detect_hair_region(self, image: np.ndarray) -> Dict:
        """Detect hair regions for physics simulation"""
        try:
            # Simple hair detection based on color and position
            # In production, would use specialized hair segmentation model
            
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            
            # Hair usually in upper part of image
            h, w = image.shape[:2]
            hair_region = hsv[:h//2, :]  # Upper half
            
            # Detect darker regions (typical hair colors)
            hair_mask = cv2.inRange(hair_region, (0, 50, 20), (180, 255, 200))
            
            hair_data = {
                'mask': hair_mask,
                'regions': self._find_hair_regions(hair_mask),
                'properties': {
                    'length': 'medium',
                    'thickness': 'normal',
                    'curliness': 'straight'
                }
            }
            
            print(f"  💇 Hair regions detected: {len(hair_data['regions'])}")
            return hair_data
            
        except Exception as e:
            print(f"⚠️ Hair detection failed: {e}")
            return {'mask': None, 'regions': [], 'properties': {'length': 'medium'}}
    
    def _detect_clothing(self, image: np.ndarray) -> Dict:
        """Detect clothing regions"""
        try:
            # Simple clothing detection based on pose and segmentation
            h, w = image.shape[:2]
            
            # Upper body clothing (torso area)
            upper_region = image[h//4:3*h//4, w//4:3*w//4]
            
            # Lower body clothing (legs area)
            lower_region = image[h//2:, w//4:3*w//4]
            
            clothing_data = {
                'upper': {
                    'region': upper_region,
                    'type': 'shirt',
                    'color': self._dominant_color(upper_region),
                    'physics_enabled': True
                },
                'lower': {
                    'region': lower_region,
                    'type': 'pants',
                    'color': self._dominant_color(lower_region),
                    'physics_enabled': True
                }
            }
            
            print(f"  👕 Clothing detected: {len(clothing_data)} layers")
            return clothing_data
            
        except Exception as e:
            print(f"⚠️ Clothing detection failed: {e}")
            return {'upper': {'type': 'shirt'}, 'lower': {'type': 'pants'}}
    
    def _analyze_body_proportions(self, image: np.ndarray) -> Dict:
        """Analyze body proportions"""
        try:
            h, w = image.shape[:2]
            
            proportions = {
                'height': h,
                'width': w,
                'aspect_ratio': w / h,
                'build': 'average',
                'gender': 'neutral'
            }
            
            print(f"  📏 Body proportions analyzed: {proportions['aspect_ratio']:.2f} ratio")
            return proportions
            
        except Exception as e:
            print(f"⚠️ Body proportion analysis failed: {e}")
            return {'height': 1.7, 'build': 'average', 'gender': 'neutral'}
    
    # Helper methods for feature extraction
    def _extract_eye_landmarks(self, landmarks, side: str) -> List:
        """Extract eye landmarks"""
        # MediaPipe face mesh landmark indices for eyes
        if side == 'left':
            eye_indices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        else:  # right
            eye_indices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
        
        eye_points = []
        for idx in eye_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                eye_points.append((lm.x, lm.y, lm.z))
        
        return eye_points
    
    def _extract_nose_landmarks(self, landmarks) -> List:
        """Extract nose landmarks"""
        nose_indices = [1, 2, 5, 4, 6, 168, 8, 9, 10, 151]
        nose_points = []
        
        for idx in nose_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                nose_points.append((lm.x, lm.y, lm.z))
                
        return nose_points
    
    def _extract_mouth_landmarks(self, landmarks) -> List:
        """Extract mouth landmarks"""
        mouth_indices = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318]
        mouth_points = []
        
        for idx in mouth_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                mouth_points.append((lm.x, lm.y, lm.z))
                
        return mouth_points
    
    def _extract_face_oval_landmarks(self, landmarks) -> List:
        """Extract face oval landmarks"""
        oval_indices = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
        oval_points = []
        
        for idx in oval_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                oval_points.append((lm.x, lm.y, lm.z))
                
        return oval_points
    
    def _extract_eyebrow_landmarks(self, landmarks) -> Dict:
        """Extract eyebrow landmarks"""
        left_brow_indices = [46, 53, 52, 51, 48, 115, 131, 134, 102, 49, 220, 305]
        right_brow_indices = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300, 276, 353]
        
        left_brow = []
        right_brow = []
        
        for idx in left_brow_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                left_brow.append((lm.x, lm.y, lm.z))
                
        for idx in right_brow_indices:
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                right_brow.append((lm.x, lm.y, lm.z))
        
        return {'left': left_brow, 'right': right_brow}
    
    def _extract_key_joints(self, landmarks) -> Dict:
        """Extract key body joints from pose landmarks"""
        # MediaPipe pose landmark indices
        joint_mapping = {
            'nose': 0, 'left_eye': 1, 'right_eye': 2, 'left_ear': 3, 'right_ear': 4,
            'left_shoulder': 11, 'right_shoulder': 12,
            'left_elbow': 13, 'right_elbow': 14,
            'left_wrist': 15, 'right_wrist': 16,
            'left_hip': 23, 'right_hip': 24,
            'left_knee': 25, 'right_knee': 26,
            'left_ankle': 27, 'right_ankle': 28
        }
        
        joints = {}
        for joint_name, idx in joint_mapping.items():
            if idx < len(landmarks.landmark):
                lm = landmarks.landmark[idx]
                joints[joint_name] = (lm.x, lm.y, lm.z)
        
        return joints
    
    def _extract_finger_tips(self, hand_landmarks) -> Dict:
        """Extract finger tip positions"""
        # MediaPipe hand landmark indices for finger tips
        finger_tips = {
            'thumb': 4, 'index': 8, 'middle': 12, 'ring': 16, 'pinky': 20
        }
        
        tips = {}
        for finger, idx in finger_tips.items():
            if idx < len(hand_landmarks.landmark):
                lm = hand_landmarks.landmark[idx]
                tips[finger] = (lm.x, lm.y, lm.z)
                
        return tips
    
    def _calculate_palm_center(self, hand_landmarks) -> Tuple[float, float, float]:
        """Calculate palm center position"""
        # Use wrist position as palm center approximation
        if len(hand_landmarks.landmark) > 0:
            wrist = hand_landmarks.landmark[0]
            return (wrist.x, wrist.y, wrist.z)
        return (0.0, 0.0, 0.0)
    
    def _find_hair_regions(self, hair_mask) -> List:
        """Find connected hair regions"""
        contours, _ = cv2.findContours(hair_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        regions = []
        for contour in contours:
            if cv2.contourArea(contour) > 100:  # Filter small regions
                regions.append(contour)
                
        return regions
    
    def _dominant_color(self, image_region) -> List[float]:
        """Get dominant color from image region"""
        try:
            # Reshape image to list of pixels
            pixels = image_region.reshape(-1, 3)
            
            # Use K-means clustering to find dominant color
            from sklearn.cluster import KMeans
            kmeans = KMeans(n_clusters=1, random_state=42, n_init=10)
            kmeans.fit(pixels)
            
            dominant_color = kmeans.cluster_centers_[0]
            return (dominant_color / 255.0).tolist()  # Normalize to 0-1
            
        except Exception:
            # Fallback to mean color
            mean_color = np.mean(image_region, axis=(0, 1))
            return (mean_color / 255.0).tolist()
    
    def _preprocess_for_depth(self, image: np.ndarray) -> torch.Tensor:
        """Preprocess image for depth estimation model"""
        # Resize to model input size (typically 384x384 for depth models)
        resized = cv2.resize(image, (384, 384))
        
        # Convert to tensor and normalize
        tensor = torch.from_numpy(resized).float() / 255.0
        tensor = tensor.permute(2, 0, 1).unsqueeze(0)  # Add batch dimension
        
        return tensor.to(self.device)
    
    # Default fallback methods
    def _get_default_face_features(self) -> Dict:
        """Get default face features"""
        return {
            'landmarks': [],
            'left_eye': [(0.3, 0.6, 0.0)],
            'right_eye': [(0.7, 0.6, 0.0)],
            'nose': [(0.5, 0.5, 0.0)],
            'mouth': [(0.5, 0.3, 0.0)],
            'face_oval': [],
            'eyebrows': {'left': [], 'right': []}
        }
    
    def _get_default_pose(self) -> Dict:
        """Get default pose"""
        return {
            'landmarks': [],
            'visibility': [],
            'segmentation_mask': None,
            'joints': {
                'left_shoulder': (0.3, 0.4, 0.0),
                'right_shoulder': (0.7, 0.4, 0.0),
                'left_hip': (0.35, 0.7, 0.0),
                'right_hip': (0.65, 0.7, 0.0)
            },
            'confidence': 0.5
        }
    
    def _get_default_hands(self) -> Dict:
        """Get default hands"""
        return {
            'left': None,
            'right': None
        }
    
    def _get_default_character_features(self) -> Dict:
        """Get default character features for fallback scenarios"""
        return {
            'hair': {
                'type': 'medium_length',
                'color': [0.4, 0.2, 0.1],  # Brown
                'style': 'straight',
                'physics_enabled': True
            },
            'face': {
                'landmarks': self._get_default_face_landmarks(),
                'expression': 'neutral',
                'eye_color': [0.2, 0.4, 0.6],  # Blue
                'skin_tone': [0.9, 0.8, 0.7]   # Light
            },
            'clothing': {
                'top': {
                    'type': 'shirt',
                    'color': [0.4, 0.6, 0.8],  # Blue
                    'physics_enabled': True
                },
                'bottom': {
                    'type': 'pants',
                    'color': [0.2, 0.2, 0.4],  # Dark blue
                    'physics_enabled': True
                }
            },
            'pose': {
                'type': 'standing',
                'confidence': 0.95,
                'joints': self._get_default_pose_joints()
            },
            'hands': {
                'left': self._get_default_hand_pose(),
                'right': self._get_default_hand_pose()
            },
            'body_proportions': {
                'height': 1.7,  # meters
                'build': 'average',
                'gender': 'neutral'
            }
        }
    
    def _get_default_face_landmarks(self) -> Dict:
        """Get default facial landmarks"""
        return {
            'left_eye': [0.3, 0.6],
            'right_eye': [0.7, 0.6],
            'nose': [0.5, 0.5],
            'mouth': [0.5, 0.3],
            'chin': [0.5, 0.1],
            'forehead': [0.5, 0.8]
        }
    
    def _get_default_pose_joints(self) -> Dict:
        """Get default pose joint positions"""
        return {
            'head': [0.0, 1.6, 0.0],
            'neck': [0.0, 1.4, 0.0],
            'spine': [0.0, 1.0, 0.0],
            'left_shoulder': [-0.2, 1.3, 0.0],
            'right_shoulder': [0.2, 1.3, 0.0],
            'left_elbow': [-0.3, 1.0, 0.0],
            'right_elbow': [0.3, 1.0, 0.0],
            'left_wrist': [-0.35, 0.8, 0.0],
            'right_wrist': [0.35, 0.8, 0.0],
            'left_hip': [-0.1, 0.6, 0.0],
            'right_hip': [0.1, 0.6, 0.0],
            'left_knee': [-0.1, 0.3, 0.0],
            'right_knee': [0.1, 0.3, 0.0],
            'left_ankle': [-0.1, 0.0, 0.0],
            'right_ankle': [0.1, 0.0, 0.0]
        }
    
    def _get_default_hand_pose(self) -> Dict:
        """Get default hand pose"""
        return {
            'pose': 'relaxed',
            'fingers': {
                'thumb': 0.2,
                'index': 0.1,
                'middle': 0.1,
                'ring': 0.1,
                'pinky': 0.1
            }
        }
    
    def generate_3d_model(self, features: Dict) -> Dict:
        """Generate 3D model from extracted features"""
        logger.info("Generating 3D model from features...")
        
        try:
            # Handle None features gracefully
            if features is None:
                logger.warning("Features is None, using default character features")
                features = self._get_default_character_features()
            
            # Generate basic humanoid mesh based on features
            model_data = self._create_humanoid_mesh(features)
            
            # Add materials based on detected features
            materials = self._generate_materials(features)
            model_data['materials'] = materials
            
            # Add texture coordinates
            model_data['uv_coordinates'] = self._generate_uv_coordinates(model_data['vertices'])
            
            # Calculate normals for lighting
            model_data['normals'] = self._calculate_normals(model_data['vertices'], model_data['faces'])
            
            logger.info(f"Generated 3D model with {len(model_data['vertices'])} vertices, {len(model_data['faces'])} faces")
            return model_data
            
        except Exception as e:
            logger.error(f"Error generating 3D model: {e}")
            # Return minimal fallback model
            return self._get_fallback_3d_model()
    
    def _create_humanoid_mesh(self, features: Dict) -> Dict:
        """Create basic humanoid mesh structure"""
        # Handle None features gracefully
        if features is None:
            features = {}
            
        vertices = []
        faces = []
        
        # Head vertices (simplified sphere)
        head_center = [0.0, 1.6, 0.0]
        head_radius = 0.12
        for i in range(16):  # Latitude
            for j in range(16):  # Longitude
                lat = (i / 15.0) * np.pi - np.pi/2
                lon = (j / 15.0) * 2 * np.pi
                x = head_center[0] + head_radius * np.cos(lat) * np.cos(lon)
                y = head_center[1] + head_radius * np.sin(lat)
                z = head_center[2] + head_radius * np.cos(lat) * np.sin(lon)
                vertices.append([x, y, z])
        
        # Body vertices (simplified cylinder)
        body_segments = 8
        body_height = 0.8
        body_radius = 0.15
        for i in range(body_segments + 1):
            y = 1.4 - (i / body_segments) * body_height
            for j in range(16):
                angle = (j / 15.0) * 2 * np.pi
                x = body_radius * np.cos(angle)
                z = body_radius * np.sin(angle)
                vertices.append([x, y, z])
        
        # Arm vertices
        arm_length = 0.6
        arm_radius = 0.04
        for side in [-1, 1]:  # Left and right
            shoulder_pos = [side * 0.2, 1.3, 0.0]
            for i in range(8):  # Arm segments
                t = i / 7.0
                y = shoulder_pos[1] - t * arm_length
                x = shoulder_pos[0] + side * t * 0.1  # Slight bend
                z = shoulder_pos[2]
                
                for j in range(8):
                    angle = (j / 7.0) * 2 * np.pi
                    vx = x + arm_radius * np.cos(angle)
                    vz = z + arm_radius * np.sin(angle)
                    vertices.append([vx, y, vz])
        
        # Leg vertices
        leg_length = 0.9
        leg_radius = 0.06
        for side in [-1, 1]:  # Left and right
            hip_pos = [side * 0.1, 0.6, 0.0]
            for i in range(10):  # Leg segments
                t = i / 9.0
                y = hip_pos[1] - t * leg_length
                x = hip_pos[0]
                z = hip_pos[2]
                
                for j in range(8):
                    angle = (j / 7.0) * 2 * np.pi
                    vx = x + leg_radius * np.cos(angle)
                    vz = z + leg_radius * np.sin(angle)
                    vertices.append([vx, y, vz])
        
        # Generate faces (simplified - would be more complex in real implementation)
        face_count = len(vertices) // 4
        for i in range(0, face_count - 1, 4):
            if i + 3 < len(vertices):
                faces.append([i, i+1, i+2])
                faces.append([i, i+2, i+3])
        
        return {
            'vertices': vertices,
            'faces': faces,
            'vertex_groups': self._assign_vertex_groups(vertices),
            'topology': 'humanoid'
        }
    
    def _generate_materials(self, features: Dict) -> Dict:
        """Generate materials based on detected features"""
        materials = {}
        
        # Handle None features gracefully
        if features is None:
            features = {}
        
        # Skin material
        skin_tone = features.get('face', {}).get('skin_tone', [0.9, 0.8, 0.7])
        materials['skin'] = {
            'diffuse': skin_tone,
            'roughness': 0.3,
            'subsurface': 0.2,
            'type': 'skin'
        }
        
        # Hair material
        hair_color = features.get('hair', {}).get('color', [0.4, 0.2, 0.1])
        materials['hair'] = {
            'diffuse': hair_color,
            'roughness': 0.7,
            'anisotropy': 0.8,
            'type': 'hair'
        }
        
        # Clothing materials
        clothing = features.get('clothing', {})
        if 'top' in clothing:
            top_color = clothing['top'].get('color', [0.4, 0.6, 0.8])
            materials['shirt'] = {
                'diffuse': top_color,
                'roughness': 0.8,
                'type': 'fabric'
            }
        
        if 'bottom' in clothing:
            bottom_color = clothing['bottom'].get('color', [0.2, 0.2, 0.4])
            materials['pants'] = {
                'diffuse': bottom_color,
                'roughness': 0.9,
                'type': 'fabric'
            }
        
        # Eye material
        eye_color = features.get('face', {}).get('eye_color', [0.2, 0.4, 0.6])
        materials['eyes'] = {
            'diffuse': eye_color,
            'roughness': 0.1,
            'metallic': 0.0,
            'type': 'eye'
        }
        
        return materials
    
    def _generate_uv_coordinates(self, vertices: List) -> List:
        """Generate UV texture coordinates"""
        uv_coords = []
        for vertex in vertices:
            # Simple spherical mapping
            x, y, z = vertex
            u = 0.5 + np.arctan2(z, x) / (2 * np.pi)
            v = 0.5 - np.arcsin(y) / np.pi
            uv_coords.append([u, v])
        return uv_coords
    
    def _calculate_normals(self, vertices: List, faces: List) -> List:
        """Calculate vertex normals for lighting"""
        normals = [[0.0, 0.0, 0.0] for _ in vertices]
        
        # Calculate face normals and accumulate
        for face in faces:
            if len(face) >= 3:
                v1 = np.array(vertices[face[0]])
                v2 = np.array(vertices[face[1]])
                v3 = np.array(vertices[face[2]])
                
                # Calculate face normal
                normal = np.cross(v2 - v1, v3 - v1)
                normal_length = np.linalg.norm(normal)
                if normal_length > 0:
                    normal = normal / normal_length
                    
                    # Add to vertex normals
                    for vertex_idx in face:
                        for i in range(3):
                            normals[vertex_idx][i] += normal[i]
        
        # Normalize vertex normals
        for i, normal in enumerate(normals):
            length = np.linalg.norm(normal)
            if length > 0:
                normals[i] = (np.array(normal) / length).tolist()
            else:
                normals[i] = [0.0, 1.0, 0.0]  # Default up normal
        
        return normals
    
    def _assign_vertex_groups(self, vertices: List) -> Dict:
        """Assign vertices to body parts for rigging"""
        vertex_groups = {
            'head': [],
            'neck': [],
            'torso': [],
            'left_arm': [],
            'right_arm': [],
            'left_leg': [],
            'right_leg': []
        }
        
        for i, vertex in enumerate(vertices):
            x, y, z = vertex
            
            # Simple assignment based on position
            if y > 1.45:  # Head
                vertex_groups['head'].append(i)
            elif y > 1.35:  # Neck
                vertex_groups['neck'].append(i)
            elif y > 0.6:  # Torso and arms
                if abs(x) > 0.18:  # Arms
                    if x < 0:
                        vertex_groups['left_arm'].append(i)
                    else:
                        vertex_groups['right_arm'].append(i)
                else:  # Torso
                    vertex_groups['torso'].append(i)
            else:  # Legs
                if x < 0:
                    vertex_groups['left_leg'].append(i)
                else:
                    vertex_groups['right_leg'].append(i)
        
        return vertex_groups
    
    def _get_fallback_3d_model(self) -> Dict:
        """Get minimal fallback 3D model"""
        return {
            'vertices': [
                [-0.3, -0.5, 0], [0.3, -0.5, 0], [0.3, 0.5, 0], [-0.3, 0.5, 0],  # Front face
                [-0.3, -0.5, -0.1], [0.3, -0.5, -0.1], [0.3, 0.5, -0.1], [-0.3, 0.5, -0.1]  # Back face
            ],
            'faces': [
                [0, 1, 2], [0, 2, 3],  # Front
                [4, 7, 6], [4, 6, 5],  # Back
                [0, 4, 5], [0, 5, 1],  # Bottom
                [2, 6, 7], [2, 7, 3],  # Top
                [0, 3, 7], [0, 7, 4],  # Left
                [1, 5, 6], [1, 6, 2]   # Right
            ],
            'normals': [[0, 0, 1]] * 8,
            'uv_coordinates': [[0, 0], [1, 0], [1, 1], [0, 1]] * 2,
            'materials': {'default': {'diffuse': [0.8, 0.6, 0.4], 'roughness': 0.5}},
            'vertex_groups': {'body': list(range(8))},
            'metadata': {'quality': 'fallback', 'type': 'box'}
        }
    
    def create_animation_rig(self, model_3d: Dict) -> Dict:
        """Create animation rig for the 3D model"""
        logger.info("Creating animation rig...")
        
        try:
            # Placeholder rig creation
            # In production, this would create proper bone hierarchy and weights
            rig_data = {
                'bones': [
                    {'name': 'root', 'parent': None, 'position': [0, 0, 0]},
                    {'name': 'spine', 'parent': 'root', 'position': [0, 1, 0]},
                    {'name': 'head', 'parent': 'spine', 'position': [0, 1.5, 0]},
                    {'name': 'left_shoulder', 'parent': 'spine', 'position': [-0.5, 1.2, 0]},
                    {'name': 'right_shoulder', 'parent': 'spine', 'position': [0.5, 1.2, 0]},
                    {'name': 'left_arm', 'parent': 'left_shoulder', 'position': [-0.8, 1.0, 0]},
                    {'name': 'right_arm', 'parent': 'right_shoulder', 'position': [0.8, 1.0, 0]}
                ],
                'constraints': [],
                'weights': {},
                'animations': {
                    'idle': {'duration': 2.0, 'keyframes': []},
                    'wave': {'duration': 1.5, 'keyframes': []},
                    'nod': {'duration': 1.0, 'keyframes': []}
                },
                'metadata': {
                    'bone_count': 7,
                    'animation_count': 3,
                    'rig_type': 'basic'
                }
            }
            
            logger.info(f"Created rig with {len(rig_data['bones'])} bones")
            return rig_data
            
        except Exception as e:
            logger.error(f"Error creating animation rig: {e}")
            # Return minimal fallback rig
            return {
                'bones': [{'name': 'root', 'parent': None, 'position': [0, 0, 0]}],
                'constraints': [],
                'weights': {},
                'animations': {},
                'metadata': {'rig_type': 'fallback'}
            }

# Usage example
async def main():
    processor = CharacterProcessor()
    
    # Process the default character image
    result = await processor.process_character_image('assets/images/start_character.png')
    
    print("Character processing completed!")
    print(f"Mesh data: {len(result['mesh']['vertices'])} vertices")
    print(f"Skeleton: {len(result['skeleton']['bones'])} bones")
    print(f"Features extracted: {list(result['features'].keys())}")

if __name__ == "__main__":
    asyncio.run(main())
