import numpy as np
import cv2
from scipy.spatial import Delaunay
import logging

class Live2DAnimator:
    """2D 이미지를 Live2D 스타일로 애니메이션화"""
    def __init__(self):
        self.backend = None
        self.backend_status = 'Uninitialized'
        # Initialize MediaPipe attributes to None (ensures they always exist)
        self.mp_face_mesh = None
        self.mp_pose = None
        self.mp = None
        self.face_mesh = None
        self.cv2 = None
        self._init_backend()
    
    def _init_backend(self):
        # Try MediaPipe
        try:
            import mediapipe as mp
            self.mp = mp
            self.mp_face_mesh = mp.solutions.face_mesh.FaceMesh(static_image_mode=False)
            self.mp_pose = mp.solutions.pose.Pose(static_image_mode=False)
            self.face_mesh = self.mp_face_mesh  # Alias for backward compatibility
            self.backend = 'mediapipe'
            self.backend_status = 'MediaPipe OK'
            logging.info("Live2DAnimator: MediaPipe backend initialized successfully")
            return
        except Exception as e:
            logging.warning(f"MediaPipe backend failed: {e}")
            # Ensure MediaPipe attributes remain None for safe fallback
            self.mp_face_mesh = None
            self.mp_pose = None
            self.mp = None
            self.face_mesh = None
        
        # Try OpenCV
        try:
            import cv2
            self.cv2 = cv2
            self.backend = 'opencv'
            self.backend_status = 'OpenCV fallback'
            logging.info("Live2DAnimator: OpenCV backend initialized")
            return
        except Exception as e:
            logging.warning(f"OpenCV backend failed: {e}")
            self.cv2 = None
        
        # Dummy rule-based fallback
        self.backend = 'dummy'
        self.backend_status = 'Rule-based fallback (minimal)'
        logging.warning("Live2DAnimator: Using minimal rule-based fallback")
    def get_backend_status(self):
        return self.backend_status
    def create_animation_mesh(self, image):
        height, width = image.shape[:2]
        face_landmarks = self.extract_face_landmarks(image)
        body_keypoints = self.extract_body_keypoints(image)
        hair_region = self.detect_hair_region(image, face_landmarks)
        clothing_region = self.detect_clothing_region(image, body_keypoints)
        mesh_data = {
            'vertices': [],
            'triangles': [],
            'uv_coords': [],
            'regions': {
                'face': self.create_face_mesh(face_landmarks),
                'eyes': self.create_eye_meshes(face_landmarks),
                'mouth': self.create_mouth_mesh(face_landmarks),
                'hair': self.create_hair_mesh(hair_region),
                'body': self.create_body_mesh(body_keypoints),
                'clothing': self.create_clothing_mesh(clothing_region)
            }
        }
        return mesh_data
    
    def extract_face_landmarks(self, image):
        # Safe fallback implementation when MediaPipe is not available
        try:
            if self.mp_face_mesh is not None:
                results = self.mp_face_mesh.process(cv2.cvtColor(image, cv2.COLOR_RGBA2RGB))
                if results.multi_face_landmarks:
                    return [(lm.x, lm.y) for lm in results.multi_face_landmarks[0].landmark]
        except Exception as e:
            logging.warning(f"MediaPipe face landmark extraction failed: {e}")
        
        # Fallback: return basic face region points
        h, w = image.shape[:2]
        return [
            (0.3, 0.3), (0.7, 0.3),  # Eye region
            (0.5, 0.4),              # Nose
            (0.5, 0.6),              # Mouth
            (0.2, 0.5), (0.8, 0.5),  # Face sides
        ]

    def extract_body_keypoints(self, image):
        # Safe fallback implementation for body keypoints
        try:
            if self.mp_pose is not None:
                results = self.mp_pose.process(cv2.cvtColor(image, cv2.COLOR_RGBA2RGB))
                if results.pose_landmarks:
                    return [(lm.x, lm.y) for lm in results.pose_landmarks.landmark]
        except Exception as e:
            logging.warning(f"MediaPipe body keypoint extraction failed: {e}")
        
        # Fallback: return basic body keypoints
        h, w = image.shape[:2]
        return [
            (0.5, 0.2),   # Head
            (0.5, 0.35),  # Neck
            (0.5, 0.5),   # Torso center
            (0.3, 0.45),  # Left shoulder
            (0.7, 0.45),  # Right shoulder
            (0.25, 0.6),  # Left elbow
            (0.75, 0.6),  # Right elbow
            (0.2, 0.75),  # Left wrist
            (0.8, 0.75),  # Right wrist
            (0.4, 0.7),   # Left hip
            (0.6, 0.7),   # Right hip
            (0.35, 0.85), # Left knee
            (0.65, 0.85), # Right knee
            (0.3, 1.0),   # Left ankle
            (0.7, 1.0),   # Right ankle
        ]
    def detect_hair_region(self, image, face_landmarks):
        # 단순히 얼굴 위쪽 영역을 머리카락으로 가정
        h, w = image.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        cv2.rectangle(mask, (0, 0), (w, h//4), 255, -1)
        return mask    def detect_clothing_region(self, image, body_keypoints):
        h, w = image.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        cv2.rectangle(mask, (w//4, 3*h//5), (3*w//4, h), 255, -1)
        return mask
    
    def create_face_mesh(self, landmarks):
        if not landmarks:
            return {'points': [], 'triangles': [], 'deform_weights': []}
        face_points = landmarks[:27]
        tri = Delaunay(np.array(face_points))
        return {
            'points': face_points,
            'triangles': tri.simplices,
            'deform_weights': self.calculate_deform_weights(face_points)
        }
    
    def create_eye_meshes(self, landmarks):
        return {'left': {}, 'right': {}}  # 생략
    
    def create_mouth_mesh(self, landmarks):
        return {}  # 생략
    
    def create_hair_mesh(self, hair_region):
        return []  # 생략
    
    def create_body_mesh(self, body_keypoints):
        return {}  # 생략
    
    def create_clothing_mesh(self, clothing_region):
        return {}  # 생략
    
    def calculate_deform_weights(self, points):
        return [1.0 for _ in points]
        
    def apply_animation(self, mesh, params):
        """Enhanced animation with Live2D-style features"""
        try:
            if self.backend == 'mediapipe':
                return self._apply_mediapipe_animation(mesh, params)
            elif self.backend == 'opencv':
                return self._apply_opencv_animation(mesh, params)
            else:
                return self._apply_fallback_animation(mesh, params)
        except Exception as e:
            logging.error(f"apply_animation error: {e}")
            return self._apply_fallback_animation(mesh, params)

    def _apply_fallback_animation(self, mesh, params):
        """Enhanced fallback animation with visual effects"""
        try:
            # Convert mesh to PIL Image if needed
            if hasattr(mesh, 'shape') and len(mesh.shape) == 3:  # numpy array
                from PIL import Image
                pil_img = Image.fromarray(mesh.astype('uint8'))
            elif hasattr(mesh, 'copy'):
                pil_img = mesh.copy()
            else:
                pil_img = mesh
                
            from PIL import ImageDraw, ImageEnhance
            
            # Create a copy for animation
            animated_img = pil_img.copy()
            draw = ImageDraw.Draw(animated_img)
            
            # Apply breathing effect (subtle image scaling)
            if params.get('chest_scale', 1.0) != 1.0:
                scale = params['chest_scale']
                enhancer = ImageEnhance.Brightness(animated_img)
                animated_img = enhancer.enhance(0.95 + 0.05 * scale)
            
            # Apply emotion-based color tinting
            emotion = params.get('emotion', {})
            if emotion.get('happy', 0) > 0.3:
                enhancer = ImageEnhance.Color(animated_img)
                animated_img = enhancer.enhance(1.1)  # More vibrant colors
            elif emotion.get('sad', 0) > 0.3:
                enhancer = ImageEnhance.Brightness(animated_img)
                animated_img = enhancer.enhance(0.9)  # Slightly darker
            elif emotion.get('angry', 0) > 0.3:
                # Add slight red tint (would need more complex implementation)
                pass
                
            # Apply blink effect
            if params.get('blink', 0) > 0.5:
                # Draw eye closure lines
                img_width, img_height = animated_img.size
                eye_y = int(img_height * 0.4)  # Approximate eye level
                eye_left_x = int(img_width * 0.35)
                eye_right_x = int(img_width * 0.65)
                eye_width = int(img_width * 0.1)
                
                # Draw closed eyes
                draw.rectangle([
                    eye_left_x, eye_y - 5,
                    eye_left_x + eye_width, eye_y + 5
                ], fill=(0, 0, 0, 128))
                
                draw.rectangle([
                    eye_right_x, eye_y - 5,
                    eye_right_x + eye_width, eye_y + 5
                ], fill=(0, 0, 0, 128))
            
            # Apply mouth animation for talking
            if params.get('mouth_open', 0) > 0.3:
                img_width, img_height = animated_img.size
                mouth_x = int(img_width * 0.5)
                mouth_y = int(img_height * 0.6)
                mouth_size = int(params['mouth_open'] * 20)
                
                # Draw open mouth
                draw.ellipse([
                    mouth_x - mouth_size//2, mouth_y - mouth_size//4,
                    mouth_x + mouth_size//2, mouth_y + mouth_size//4
                ], fill=(50, 20, 20), outline=(0, 0, 0))
            
            # Convert back to numpy array if original was numpy
            if hasattr(mesh, 'shape'):
                return np.array(animated_img)
            else:
                return animated_img
                
        except Exception as e:
            logging.error(f"Fallback animation error: {e}")
            return mesh  # Return original mesh if all else fails
    def animate(self, image, params):
        if self.backend == 'mediapipe':
            try:
                # ...MediaPipe animation logic...
                return image  # placeholder
            except Exception as e:
                logging.error(f"MediaPipe animate error: {e}")
                self._init_backend()
                return self.animate(image, params)
        elif self.backend == 'opencv':
            try:
                # ...OpenCV animation logic...
                return image  # placeholder
            except Exception as e:
                logging.error(f"OpenCV animate error: {e}")
                self._init_backend()
                return self.animate(image, params)
        else:
            # Rule-based fallback: simple blink/breathing/expressions
            import numpy as np
            from PIL import ImageDraw
            pil_img = image.copy() if hasattr(image, 'copy') else image
            d = ImageDraw.Draw(pil_img)
            # Simulate blink by drawing lines over eyes
            if params.get('blink', False):
                d.line([(200, 300), (300, 300)], fill=(0,0,0), width=5)
            # Simulate breathing by scaling
            # ...
            return pil_img
    def _apply_mediapipe_animation(self, mesh, params):
        """Apply MediaPipe-based animation"""
        # TODO: Implement MediaPipe mesh deformation
        return self._apply_fallback_animation(mesh, params)
    
    def _apply_opencv_animation(self, mesh, params):
        """Apply OpenCV-based animation"""
        # TODO: Implement OpenCV animation effects
        return self._apply_fallback_animation(mesh, params)
