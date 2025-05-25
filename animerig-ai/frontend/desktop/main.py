"""
AnimeRig AI - Main Desktop Application
A native desktop app for real-time character animation from single images.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import asyncio
import json
from pathlib import Path
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QSplitter, QTextEdit, QLineEdit, QPushButton,
    QLabel, QGroupBox, QSlider, QSpinBox, QComboBox, QProgressBar,
    QFileDialog, QMessageBox, QTabWidget, QScrollArea, QFrame,
    QCheckBox
)
from PyQt6.QtCore import (
    Qt, QThread, pyqtSignal, QTimer, QSize, QRect,
    pyqtSlot, QEvent, QObject, QDateTime
)
from PyQt6.QtGui import (
    QPixmap, QIcon, QPainter, QPen, QBrush, QColor,
    QFont, QAction, QKeySequence
)
# OpenGL Widget imports (PyQt6 compatibility)
try:
    from PyQt6.QtOpenGLWidgets import QOpenGLWidget
    print("[OK] Using PyQt6.QtOpenGLWidgets.QOpenGLWidget")
except ImportError:
    try:
        from PyQt6.QtOpenGL import QOpenGLWidget
        print("[OK] Using PyQt6.QtOpenGL.QOpenGLWidget")
    except ImportError:
        print("[WARNING] QOpenGLWidget not available - 3D rendering disabled")
        QOpenGLWidget = QWidget  # Fallback to regular widget

# OpenGL imports (conditional)
try:
    from OpenGL import GL
    OPENGL_AVAILABLE = True
except ImportError:
    OPENGL_AVAILABLE = False
    print("⚠ OpenGL not available - using software rendering only")

# Configuration from environment variables
class Config:
    """Application configuration from environment variables"""
    APP_NAME = os.getenv('APP_NAME', 'AnimeRig AI')
    APP_VERSION = os.getenv('APP_VERSION', '1.0.0')
    ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
    
    # Backend Configuration
    BACKEND_HOST = os.getenv('BACKEND_HOST', 'localhost')
    BACKEND_PORT = int(os.getenv('BACKEND_PORT', '8080'))
    BACKEND_API_URL = os.getenv('BACKEND_API_URL', 'http://localhost:8080/api')
    
    # Engine Configuration
    ENGINE_LIBRARY_PATH = os.getenv('ENGINE_LIBRARY_PATH', './animerig-ai/engine/build/libanimerig_engine.so')
    PYTHON_BINDINGS_PATH = os.getenv('PYTHON_BINDINGS_PATH', './animerig-ai/engine/build/animerig_py.cpython-312-x86_64-linux-gnu.so')
    ENGINE_LOG_LEVEL = os.getenv('ENGINE_LOG_LEVEL', 'INFO')
    
    # Rendering Settings
    RENDER_WIDTH = int(os.getenv('RENDER_WIDTH', '1920'))
    RENDER_HEIGHT = int(os.getenv('RENDER_HEIGHT', '1080'))
    RENDER_FPS = int(os.getenv('RENDER_FPS', '60'))
    OPENGL_VERSION = os.getenv('OPENGL_VERSION', '4.5')
    ENABLE_VSYNC = os.getenv('ENABLE_VSYNC', 'true').lower() == 'true'
    ENABLE_ANTIALIASING = os.getenv('ENABLE_ANTIALIASING', 'true').lower() == 'true'
    
    # Physics Settings
    PHYSICS_TIMESTEP = float(os.getenv('PHYSICS_TIMESTEP', '0.016'))
    GRAVITY = float(os.getenv('GRAVITY', '-9.81'))
    ENABLE_CLOTH_PHYSICS = os.getenv('ENABLE_CLOTH_PHYSICS', 'true').lower() == 'true'
    ENABLE_HAIR_PHYSICS = os.getenv('ENABLE_HAIR_PHYSICS', 'true').lower() == 'true'
    
    # Animation Settings
    DEFAULT_ANIMATION_FPS = int(os.getenv('DEFAULT_ANIMATION_FPS', '30'))
    ANIMATION_BLEND_TIME = float(os.getenv('ANIMATION_BLEND_TIME', '0.2'))
    ENABLE_FACIAL_ANIMATION = os.getenv('ENABLE_FACIAL_ANIMATION', 'true').lower() == 'true'
    ENABLE_GESTURE_ANIMATION = os.getenv('ENABLE_GESTURE_ANIMATION', 'true').lower() == 'true'
    
    # File Settings
    MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '10485760'))
    MAX_MODEL_SIZE = int(os.getenv('MAX_MODEL_SIZE', '104857600'))
    SUPPORTED_IMAGE_FORMATS = os.getenv('SUPPORTED_IMAGE_FORMATS', 'jpg,jpeg,png,bmp,tga').split(',')
    
    # Development Settings
    DEBUG_MODE = os.getenv('DEBUG_MODE', 'true').lower() == 'true'
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'DEBUG')

# Add project paths
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'ai'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

# Add C++ engine path - use configured path
engine_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'engine', 'build'))
sys.path.append(engine_path)

from ai.image_to_rig.character_processor import CharacterProcessor
from ai.animation_synthesis.motion_generator import MotionGenerator
from ai.animation.live2d_animator import Live2DAnimator
from ai.animation.professional_animator import ProfessionalAnimator
from frontend.desktop.premium_ui_simple import PremiumUI, FloatingControlPanel, GestureQuickBar, EmotionWheel, AngleControlOrb, PerformanceMonitor
import cv2
import numpy as np
import time

# Import C++ engine
try:
    import animerig_py
    print("[OK] AnimeRig C++ Engine loaded successfully")
    print(f"  Engine version: {getattr(animerig_py, '__version__', 'unknown')}")
    NATIVE_ENGINE_AVAILABLE = True
except ImportError as e:
    print(f"⚠ Native C++ engine not available: {e}")
    print(f"  Engine path: {engine_path}")
    print("  Running in Python-only mode")
    NATIVE_ENGINE_AVAILABLE = False


class CharacterViewport(QOpenGLWidget):
    """OpenGL viewport for professional character rendering"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.character_texture = None
        self.character_mesh = None
        self.animated_mesh = None
        
        # Use professional animator instead of basic Live2D
        self.professional_animator = ProfessionalAnimator(target_fps=60, enable_physics=True)
        self.legacy_animator = Live2DAnimator()  # Keep for fallback
        
        self.animation_params = {}
        self.is_animating = False
        self.animation_frame = 0
        self.last_frame_time = time.time()
        
        # Professional animation state
        self.current_pose = 'idle'
        self.current_emotion = 'neutral'
        self.emotion_intensity = 0.5
        self.head_rotation = [0.0, 0.0, 0.0]  # pitch, yaw, roll
        self.viewing_angle = 0.0
        self.looking_direction = [0.0, 0.0]
        
        # Legacy attributes for compatibility
        self.current_gesture = None
        self.gesture_time = 0.0
        self.blink_factor = 0.0
        self.blink_timer = 0.0
        self.breathing_enabled = True
        self.hair_physics_enabled = True
        self.cloth_physics_enabled = True
        
        # Performance tracking
        self.frame_times = []
        self.target_fps = 60.0
        self.frame_time_target = 1.0 / self.target_fps
        
        # Rendering state
        self.use_professional_renderer = True
        self.character_loaded = False

    def paintGL(self):
        """Professional OpenGL rendering with advanced animation"""
        GL.glClear(GL.GL_COLOR_BUFFER_BIT | GL.GL_DEPTH_BUFFER_BIT)
        GL.glClearColor(0.08, 0.08, 0.12, 1.0)  # Dark blue-gray background
        
        if not self.character_loaded:
            self.render_loading_screen()
            return
        
        # Calculate delta time for smooth animation
        current_time = time.time()
        delta_time = current_time - self.last_frame_time
        self.last_frame_time = current_time
        
        # Cap delta time to prevent large jumps
        delta_time = min(delta_time, 1.0 / 30.0)  # Max 30 FPS minimum
        
        if self.use_professional_renderer:
            self.render_professional_animation(delta_time)
        else:
            self.render_legacy_animation()
        
        # Track performance
        self.track_frame_performance(delta_time)
    
    def render_professional_animation(self, delta_time: float):
        """Render using professional animation system"""
        if not self.is_animating:
            return
        
        # Update professional animator
        rendered_frame = self.professional_animator.update(delta_time)
        
        if rendered_frame is not None and rendered_frame.size > 0:
            # Convert frame to OpenGL texture and render
            self.render_frame_to_opengl(rendered_frame)
        
        self.animation_frame += 1
    
    def render_legacy_animation(self):
        """Render using legacy animation system (fallback)"""
        if self.character_texture:
            # Set up 2D orthographic projection
            GL.glMatrixMode(GL.GL_PROJECTION)
            GL.glLoadIdentity()
            GL.glOrtho(-1, 1, -1, 1, -1, 1)  # Fixed Y-axis orientation
            
            GL.glMatrixMode(GL.GL_MODELVIEW)
            GL.glLoadIdentity()
            
            # Enable proper blending for transparency
            GL.glEnable(GL.GL_BLEND)
            GL.glBlendFunc(GL.GL_SRC_ALPHA, GL.GL_ONE_MINUS_SRC_ALPHA)
            
            # Set up texture rendering
            GL.glEnable(GL.GL_TEXTURE_2D)
            GL.glBindTexture(GL.GL_TEXTURE_2D, self.character_texture)
            GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MAG_FILTER, GL.GL_LINEAR)
            GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MIN_FILTER, GL.GL_LINEAR)
            
            # Apply basic animation transformations
            self.apply_legacy_animation_transforms()
            
            # Render the animated character
            self.render_animated_character()
            
            GL.glDisable(GL.GL_TEXTURE_2D)
            GL.glDisable(GL.GL_BLEND)
    
    def render_frame_to_opengl(self, frame: np.ndarray):
        """Render a frame buffer to OpenGL"""
        height, width = frame.shape[:2]
        
        # Set up 2D orthographic projection
        GL.glMatrixMode(GL.GL_PROJECTION)
        GL.glLoadIdentity()
        GL.glOrtho(0, width, height, 0, -1, 1)  # Screen coordinates
        
        GL.glMatrixMode(GL.GL_MODELVIEW)
        GL.glLoadIdentity()
        
        # Enable blending for transparency
        GL.glEnable(GL.GL_BLEND)
        GL.glBlendFunc(GL.GL_SRC_ALPHA, GL.GL_ONE_MINUS_SRC_ALPHA)
        
        # Create texture from frame
        GL.glEnable(GL.GL_TEXTURE_2D)
        
        # Generate texture if needed
        if not hasattr(self, 'frame_texture'):
            self.frame_texture = GL.glGenTextures(1)
        
        GL.glBindTexture(GL.GL_TEXTURE_2D, self.frame_texture)
        
        # Convert frame to OpenGL format
        if len(frame.shape) == 3:
            if frame.shape[2] == 3:
                gl_format = GL.GL_RGB
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            elif frame.shape[2] == 4:
                gl_format = GL.GL_RGBA
                frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2RGBA)
        else:
            gl_format = GL.GL_LUMINANCE
        
        # Upload texture data
        GL.glTexImage2D(GL.GL_TEXTURE_2D, 0, gl_format, width, height, 0, 
                       gl_format, GL.GL_UNSIGNED_BYTE, frame)
        
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MAG_FILTER, GL.GL_LINEAR)
        GL.glTexParameteri(GL.GL_TEXTURE_2D, GL.GL_TEXTURE_MIN_FILTER, GL.GL_LINEAR)
        
        # Render textured quad
        GL.glBegin(GL.GL_QUADS)
        GL.glTexCoord2f(0, 0); GL.glVertex2f(0, 0)
        GL.glTexCoord2f(1, 0); GL.glVertex2f(width, 0)
        GL.glTexCoord2f(1, 1); GL.glVertex2f(width, height)
        GL.glTexCoord2f(0, 1); GL.glVertex2f(0, height)
        GL.glEnd()
        
        GL.glDisable(GL.GL_TEXTURE_2D)
        GL.glDisable(GL.GL_BLEND)
    
    def render_loading_screen(self):
        """Render a loading screen"""
        GL.glMatrixMode(GL.GL_PROJECTION)
        GL.glLoadIdentity()
        GL.glOrtho(-1, 1, -1, 1, -1, 1)
        
        GL.glMatrixMode(GL.GL_MODELVIEW)
        GL.glLoadIdentity()
        
        # Simple loading animation
        angle = (time.time() * 360) % 360
        GL.glRotatef(angle, 0, 0, 1)
        
        # Draw loading indicator
        GL.glColor3f(0.3, 0.6, 1.0)
        GL.glBegin(GL.GL_TRIANGLES)
        for i in range(3):
            a = i * 2.0 * np.pi / 3
            GL.glVertex2f(0.3 * np.cos(a), 0.3 * np.sin(a))
        GL.glEnd()
        
        GL.glColor3f(1.0, 1.0, 1.0)  # Reset color
    
    def track_frame_performance(self, delta_time: float):
        """Track rendering performance"""
        frame_time_ms = delta_time * 1000
        self.frame_times.append(frame_time_ms)
        
        # Keep only recent frames
        if len(self.frame_times) > 60:
            self.frame_times.pop(0)
    
    def get_average_fps(self) -> float:
        """Get average FPS over recent frames"""
        if len(self.frame_times) == 0:
            return 0.0
        
        avg_frame_time = sum(self.frame_times) / len(self.frame_times)
        return 1000.0 / avg_frame_time if avg_frame_time > 0 else 0.0
        
        # Apply emotion-based transformations
        if hasattr(self, 'current_emotion'):
            self.apply_emotion_transforms()
            
        # Apply gesture transformations
        if hasattr(self, 'current_gesture'):
            self.apply_gesture_transforms()

    def apply_emotion_transforms(self):
        """Apply emotion-based visual transforms"""
        if not hasattr(self, 'current_emotion'):
            return
            
        emotion = self.current_emotion
        intensity = getattr(self, 'emotion_intensity', 0.5)
        
        # Scale transformations based on emotion
        if emotion == 'happy':
            # Slightly scale up and tilt for happiness
            GL.glScalef(1.0 + 0.05 * intensity, 1.0 + 0.03 * intensity, 1.0)
            GL.glRotatef(2.0 * intensity, 0, 0, 1)
        elif emotion == 'sad':
            # Scale down and tilt opposite for sadness
            GL.glScalef(1.0 - 0.03 * intensity, 1.0 - 0.02 * intensity, 1.0)
            GL.glRotatef(-3.0 * intensity, 0, 0, 1)
        elif emotion == 'surprised':
            # Scale up more dramatically
            GL.glScalef(1.0 + 0.08 * intensity, 1.0 + 0.05 * intensity, 1.0)
        elif emotion == 'angry':
            # Slight scale and red tint effect
            GL.glScalef(1.0 + 0.02 * intensity, 1.0, 1.0)

    def apply_gesture_transforms(self):
        """Apply gesture-based transformations"""
        if not hasattr(self, 'current_gesture') or not self.current_gesture:
            return
            
        gesture = self.current_gesture
        gesture_time = getattr(self, 'gesture_time', 0.0)
        
        if gesture == 'wave':
            # Oscillating Y rotation for wave effect
            wave_angle = 10.0 * np.sin(gesture_time * 8.0)
            GL.glRotatef(wave_angle, 0, 1, 0)
        elif gesture == 'nod':
            # X rotation for nod
            nod_angle = 8.0 * np.sin(gesture_time * 6.0)
            GL.glRotatef(nod_angle, 1, 0, 0)
        elif gesture == 'shake_head':
            # Y rotation for head shake
            shake_angle = 12.0 * np.sin(gesture_time * 7.0)
            GL.glRotatef(shake_angle, 0, 1, 0)

    def render_animated_character(self):
        """Render the character sprite with animation effects"""
        # Set character color based on emotion
        if hasattr(self, 'current_emotion'):
            self.set_emotion_color()
        else:
            GL.glColor4f(1.0, 1.0, 1.0, 1.0)  # Default white
            
        # Render main character quad
        GL.glBegin(GL.GL_QUADS)
        GL.glTexCoord2f(0, 1); GL.glVertex2f(-0.8, -0.9)  # Bottom-left
        GL.glTexCoord2f(1, 1); GL.glVertex2f(0.8, -0.9)   # Bottom-right
        GL.glTexCoord2f(1, 0); GL.glVertex2f(0.8, 0.9)    # Top-right
        GL.glTexCoord2f(0, 0); GL.glVertex2f(-0.8, 0.9)   # Top-left
        GL.glEnd()
        
        # Apply blink effect if active
        if hasattr(self, 'blink_factor') and self.blink_factor > 0:
            self.render_blink_effect()
            
        # Reset transformation matrix
        GL.glPopMatrix()
    
    def toggle_professional_renderer(self):
        """Toggle between professional and legacy renderer"""
        self.use_professional_renderer = not self.use_professional_renderer
        print(f"Renderer switched to: {'Professional' if self.use_professional_renderer else 'Legacy'}")
        self.update()  # Trigger repaint
    
    def set_emotion(self, emotion: str, intensity: float = 1.0):
        """Set character emotion"""
        self.current_emotion = emotion
        self.emotion_intensity = intensity
        print(f"🎭 Emotion set to: {emotion} (intensity: {intensity:.2f})")
        self.update()  # Trigger repaint
    
    def set_head_rotation(self, x: float, y: float, z: float = 0.0):
        """Set head rotation angles"""
        self.head_rotation_x = x
        self.head_rotation_y = y
        self.head_rotation_z = z
        print(f"🔄 Head rotation set to: ({x:.1f}, {y:.1f}, {z:.1f})")
        self.update()
    
    def trigger_gesture(self, gesture_name: str):
        """Trigger a gesture animation"""
        self.current_gesture = gesture_name
        self.gesture_time = 0.0
        print(f"👋 Gesture triggered: {gesture_name}")
        self.update()
    
    def set_emotion_color(self):
        """Set OpenGL color based on current emotion"""
        if not hasattr(self, 'current_emotion'):
            GL.glColor4f(1.0, 1.0, 1.0, 1.0)
            return
        
        emotion = self.current_emotion
        intensity = getattr(self, 'emotion_intensity', 1.0)
        
        if emotion == 'happy':
            # Warm yellow tint
            GL.glColor4f(1.0, 1.0 - 0.1 * intensity, 0.8 + 0.2 * intensity, 1.0)
        elif emotion == 'sad':
            # Cool blue tint
            GL.glColor4f(0.8 - 0.2 * intensity, 0.9 - 0.1 * intensity, 1.0, 1.0)
        elif emotion == 'angry':
            # Red tint
            GL.glColor4f(1.0, 0.7 - 0.3 * intensity, 0.7 - 0.3 * intensity, 1.0)
        elif emotion == 'surprised':
            # Bright white
            GL.glColor4f(1.0 + 0.1 * intensity, 1.0 + 0.1 * intensity, 1.0 + 0.1 * intensity, 1.0)
        else:
            # Default white
            GL.glColor4f(1.0, 1.0, 1.0, 1.0)
    
    def render_blink_effect(self):
        """Render blinking effect overlay"""
        if not hasattr(self, 'blink_factor') or self.blink_factor <= 0:
            return
        
        # Draw dark overlay for blink
        GL.glColor4f(0.0, 0.0, 0.0, self.blink_factor * 0.8)
        GL.glBegin(GL.GL_QUADS)
        GL.glVertex2f(-0.6, 0.3)   # Eye area overlay
        GL.glVertex2f(0.6, 0.3)
        GL.glVertex2f(0.6, 0.6)
        GL.glVertex2f(-0.6, 0.6)
        GL.glEnd()
    
    def start_animation(self):
        """Start character animation"""
        self.is_animating = True
        if not self.animation_timer.isActive():
            self.animation_timer.start(16)  # ~60 FPS
        print("🎬 Animation started")
    
    def stop_animation(self):
        """Stop character animation"""
        self.is_animating = False
        if self.animation_timer.isActive():
            self.animation_timer.stop()
        print("⏹ Animation stopped")
    
    def set_character_data(self, character_data):
        """Set character data from processor"""
        self.character_data = character_data
        print("📊 Character data set")
        self.update()


class AnimeRigMainWindow(QMainWindow):
    """Main application window for AnimeRig AI with professional VTuber quality"""
    
    def __init__(self):
        super().__init__()
        self.character_processor = None
        self.motion_generator = None
        self.is_processing = False
        
        # Initialize premium UI components
        self.premium_ui_manager = None
        self.floating_controls = None
        self.premium_ui = None
        self.performance_monitor = None
        
        # Initialize the main window
        self.init_ui()
        self.init_premium_ui()
        self.setup_connections()
        
        # Auto-load default character if available
        self.auto_load_default_character()
        
        print("🎭 AnimeRig AI Main Window initialized successfully")
    
    def init_ui(self):
        """Initialize the main user interface"""
        # Set window properties
        self.setWindowTitle(f"{Config.APP_NAME} v{Config.APP_VERSION} - Professional VTuber Studio")
        self.setMinimumSize(1200, 800)
        self.resize(1600, 1000)
        
        # Set application icon
        self.setWindowIcon(QIcon(os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'icon.png')))
        
        # Create central widget and main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main horizontal layout
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Create main content area with character viewport
        self.viewport = CharacterViewport(self)
        main_layout.addWidget(self.viewport, 1)
        
        # Create menu bar
        self.create_menu_bar()
        
        # Create status bar
        self.create_status_bar()
        
        # Apply dark theme
        self.apply_dark_theme()
    
    def init_premium_ui(self):
        """Initialize premium UI overlay system"""
        try:
            # Create premium UI overlay
            self.premium_ui = PremiumUI(self)
            self.premium_ui.setParent(self.viewport)
            self.premium_ui.resize(self.viewport.size())
            
            # Create floating control panel
            self.floating_controls = FloatingControlPanel(self)
            self.floating_controls.move(50, 50)
            
            # Create performance monitor
            self.performance_monitor = PerformanceMonitor(self)
            self.performance_monitor.move(self.width() - 250, 50)
            
            print("✅ Premium UI system initialized")
            
        except ImportError as e:
            print(f"⚠ Premium UI not available: {e}")
            self.premium_ui = None
            self.floating_controls = None
            self.performance_monitor = None
    
    def setup_connections(self):
        """Setup signal connections between components"""
        if self.premium_ui:
            # Connect emotion wheel to viewport
            self.premium_ui.emotionChanged.connect(self.viewport.set_emotion)
            
            # Connect angle control to viewport
            self.premium_ui.angleChanged.connect(self.viewport.set_head_rotation)
            
            # Connect gesture triggers to viewport
            self.premium_ui.gestureTriggered.connect(self.viewport.trigger_gesture)
        
        # Connect viewport signals to UI updates
        if hasattr(self.viewport, 'animation_updated'):
            self.viewport.animation_updated.connect(self.update_performance_display)
    
    def create_menu_bar(self):
        """Create application menu bar"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu('&File')
        
        # Load character action
        load_action = QAction('&Load Character Image...', self)
        load_action.setShortcut(QKeySequence.StandardKey.Open)
        load_action.triggered.connect(self.load_character_image)
        file_menu.addAction(load_action)
        
        # Export animation action
        export_action = QAction('&Export Animation...', self)
        export_action.setShortcut('Ctrl+E')
        export_action.triggered.connect(self.export_animation)
        file_menu.addAction(export_action)
        
        file_menu.addSeparator()
        
        # Quit action
        quit_action = QAction('&Quit', self)
        quit_action.setShortcut(QKeySequence.StandardKey.Quit)
        quit_action.triggered.connect(self.close)
        file_menu.addAction(quit_action)
        
        # Animation menu
        animation_menu = menubar.addMenu('&Animation')
        
        # Start animation action
        start_anim_action = QAction('&Start Animation', self)
        start_anim_action.setShortcut('Space')
        start_anim_action.triggered.connect(self.start_animation)
        animation_menu.addAction(start_anim_action)
        
        # Stop animation action
        stop_anim_action = QAction('S&top Animation', self)
        stop_anim_action.setShortcut('Escape')
        stop_anim_action.triggered.connect(self.stop_animation)
        animation_menu.addAction(stop_anim_action)
        
        animation_menu.addSeparator()
        
        # Toggle professional renderer
        toggle_renderer_action = QAction('Toggle &Professional Renderer', self)
        toggle_renderer_action.setShortcut('Ctrl+P')
        toggle_renderer_action.triggered.connect(self.viewport.toggle_professional_renderer)
        animation_menu.addAction(toggle_renderer_action)
        
        # View menu
        view_menu = menubar.addMenu('&View')
        
        # Toggle premium UI
        if self.premium_ui:
            toggle_ui_action = QAction('Toggle &Premium Controls', self)
            toggle_ui_action.setShortcut('Ctrl+U')
            toggle_ui_action.triggered.connect(self.toggle_premium_ui)
            view_menu.addAction(toggle_ui_action)
        
        # Toggle performance monitor
        if self.performance_monitor:
            toggle_perf_action = QAction('Toggle &Performance Monitor', self)
            toggle_perf_action.setShortcut('Ctrl+Shift+P')
            toggle_perf_action.triggered.connect(self.toggle_performance_monitor)
            view_menu.addAction(toggle_perf_action)
        
        # Help menu
        help_menu = menubar.addMenu('&Help')
        
        # About action
        about_action = QAction('&About AnimeRig AI', self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
        
        # Controls help action
        controls_action = QAction('&Keyboard Controls', self)
        controls_action.triggered.connect(self.show_controls_help)
        help_menu.addAction(controls_action)
    
    def create_status_bar(self):
        """Create status bar with performance indicators"""
        self.status_bar = self.statusBar()
        
        # FPS indicator
        self.fps_label = QLabel("FPS: --")
        self.fps_label.setMinimumWidth(70)
        self.status_bar.addPermanentWidget(self.fps_label)
        
        # Renderer indicator
        self.renderer_label = QLabel("Renderer: Professional")
        self.renderer_label.setMinimumWidth(150)
        self.status_bar.addPermanentWidget(self.renderer_label)
        
        # Animation status
        self.animation_status_label = QLabel("Animation: Stopped")
        self.animation_status_label.setMinimumWidth(120)
        self.status_bar.addPermanentWidget(self.animation_status_label)
        
        # Update timer for status bar
        self.status_timer = QTimer()
        self.status_timer.timeout.connect(self.update_status_bar)
        self.status_timer.start(1000)  # Update every second
    
    def apply_dark_theme(self):
        """Apply dark theme to the application"""
        dark_style = """
        QMainWindow {
            background-color: #1a1a1a;
            color: #ffffff;
        }
        QMenuBar {
            background-color: #2d2d2d;
            color: #ffffff;
            border-bottom: 1px solid #555;
        }
        QMenuBar::item {
            background-color: transparent;
            padding: 6px 12px;
        }
        QMenuBar::item:selected {
            background-color: #3d3d3d;
            border-radius: 4px;
        }
        QMenu {
            background-color: #2d2d2d;
            color: #ffffff;
            border: 1px solid #555;
            border-radius: 6px;
        }
        QMenu::item {
            padding: 8px 20px;
        }
        QMenu::item:selected {
            background-color: #3d3d3d;
        }
        QStatusBar {
            background-color: #2d2d2d;
            color: #ffffff;
            border-top: 1px solid #555;
        }
        """
        self.setStyleSheet(dark_style)
    
    def load_character_image(self):
        """Load character image with file dialog"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Load Character Image",
            "",
            "Image Files (*.png *.jpg *.jpeg *.bmp *.tga);;All Files (*)"
        )
        
        if file_path:
            self.load_character(file_path)
    
    def load_character(self, image_path: str):
        """Load and process character from image file"""
        if not os.path.exists(image_path):
            QMessageBox.warning(self, "File Not Found", f"Could not find image file:\n{image_path}")
            return
        
        self.status_bar.showMessage(f"Loading character from {os.path.basename(image_path)}...")
        
        try:
            # Initialize processors if needed
            if not self.character_processor:
                self.character_processor = CharacterProcessor()
            if not self.motion_generator:
                self.motion_generator = MotionGenerator()
            
            # Process character image
            self.is_processing = True
            
            # Load image
            import cv2
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError("Could not load image")
            
            # Process character (this would normally be async)
            character_data = self.character_processor.process_image(image)
            
            # Set character data in viewport
            if hasattr(self.viewport, 'set_character_data'):
                self.viewport.set_character_data(character_data)
            
            # Enable character rendering
            self.viewport.character_loaded = True
            
            # Start animation automatically
            self.start_animation()
            
            self.status_bar.showMessage(f"Character loaded: {os.path.basename(image_path)}", 3000)
            
            print(f"✅ Character loaded successfully from {image_path}")
            
        except Exception as e:
            QMessageBox.critical(self, "Character Loading Error", f"Failed to load character:\n{str(e)}")
            self.status_bar.showMessage("Character loading failed", 3000)
            print(f"❌ Character loading failed: {e}")
        
        finally:
            self.is_processing = False
    
    def auto_load_default_character(self):
        """Auto-load default character if available"""
        default_paths = [
            os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'images', 'start_character.png'),
            os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'images', 'start_character.png'),
            os.path.join(os.path.dirname(__file__), '..', '..', 'test_assets', 'character.png'),
        ]
        
        for path in default_paths:
            if os.path.exists(path):
                print(f"🎭 Auto-loading default character: {path}")
                QTimer.singleShot(1000, lambda: self.load_character(path))  # Load after UI initialization
                break
        else:
            print("ℹ No default character found - waiting for user to load character")
    
    def start_animation(self):
        """Start character animation"""
        if hasattr(self.viewport, 'start_animation'):
            self.viewport.start_animation()
            self.animation_status_label.setText("Animation: Running")
            print("🎬 Animation started")
    
    def stop_animation(self):
        """Stop character animation"""
        if hasattr(self.viewport, 'stop_animation'):
            self.viewport.stop_animation()
        else:
            self.viewport.is_animating = False
        
        self.animation_status_label.setText("Animation: Stopped")
        print("⏹ Animation stopped")
    
    def export_animation(self):
        """Export current animation"""
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Export Animation",
            "animation.mp4",
            "Video Files (*.mp4 *.avi *.mov);;All Files (*)"
        )
        
        if file_path:
            # TODO: Implement animation export
            QMessageBox.information(self, "Export", f"Animation export to {file_path} would be implemented here")
    
    def toggle_premium_ui(self):
        """Toggle premium UI visibility"""
        if self.premium_ui:
            if self.premium_ui.isVisible():
                self.premium_ui.hide()
            else:
                self.premium_ui.show()
    
    def toggle_performance_monitor(self):
        """Toggle performance monitor visibility"""
        if self.performance_monitor:
            if self.performance_monitor.isVisible():
                self.performance_monitor.hide()
            else:
                self.performance_monitor.show()
    
    def update_status_bar(self):
        """Update status bar with current information"""
        if hasattr(self.viewport, 'get_average_fps'):
            fps = self.viewport.get_average_fps()
            self.fps_label.setText(f"FPS: {fps:.1f}")
        
        if hasattr(self.viewport, 'use_professional_renderer'):
            renderer = "Professional" if self.viewport.use_professional_renderer else "Legacy"
            self.renderer_label.setText(f"Renderer: {renderer}")
        
        if hasattr(self.viewport, 'is_animating'):
            status = "Running" if self.viewport.is_animating else "Stopped"
            self.animation_status_label.setText(f"Animation: {status}")
    
    def update_performance_display(self):
        """Update performance display from viewport signals"""
        if self.performance_monitor and hasattr(self.viewport, 'get_performance_metrics'):
            metrics = self.viewport.get_performance_metrics()
            self.performance_monitor.update_metrics(metrics)
    
    def show_about(self):
        """Show about dialog"""
        about_text = f"""
        <h2>{Config.APP_NAME} v{Config.APP_VERSION}</h2>
        <p>Professional VTuber Animation Studio</p>
        <p>Transform static images into live, animated characters with AI-powered rigging and professional-quality animation.</p>
        
        <h3>Features:</h3>
        <ul>
        <li>Professional skeletal animation system</li>
        <li>Advanced facial expression synthesis</li>
        <li>2.5D multi-angle rendering</li>
        <li>Real-time physics simulation</li>
        <li>Premium glassmorphism UI</li>
        <li>Live2D compatible output</li>
        </ul>
        
        <p><small>Environment: {Config.ENVIRONMENT}</small></p>
        """
        
        QMessageBox.about(self, "About AnimeRig AI", about_text)
    
    def show_controls_help(self):
        """Show keyboard controls help"""
        controls_text = """
        <h3>Keyboard Controls:</h3>
        <table>
        <tr><td><b>Space</b></td><td>Start/Stop Animation</td></tr>
        <tr><td><b>Ctrl+O</b></td><td>Load Character Image</td></tr>
        <tr><td><b>Ctrl+E</b></td><td>Export Animation</td></tr>
        <tr><td><b>Ctrl+P</b></td><td>Toggle Professional Renderer</td></tr>
        <tr><td><b>Ctrl+U</b></td><td>Toggle Premium Controls</td></tr>
        <tr><td><b>Ctrl+Shift+P</b></td><td>Toggle Performance Monitor</td></tr>
        <tr><td><b>1-3</b></td><td>Quick Gestures (when premium UI active)</td></tr>
        <tr><td><b>Escape</b></td><td>Stop Animation</td></tr>
        <tr><td><b>Ctrl+Q</b></td><td>Quit Application</td></tr>
        </table>
        
        <h3>Mouse Controls:</h3>
        <ul>
        <li>Use Emotion Wheel to change character emotions</li>
        <li>Drag Angle Control Orb to rotate character head</li>
        <li>Click Gesture Quick Bar for instant animations</li>
        </ul>
        """
        
        QMessageBox.information(self, "Keyboard Controls", controls_text)
    
    def resizeEvent(self, event):
        """Handle window resize events"""
        super().resizeEvent(event)
        
        # Resize premium UI overlay to match viewport
        if self.premium_ui and self.viewport:
            self.premium_ui.resize(self.viewport.size())
        
        # Reposition floating controls
        if self.performance_monitor:
            self.performance_monitor.move(self.width() - 250, 50)
    
    def keyPressEvent(self, event):
        """Handle keyboard shortcuts"""
        if event.key() == Qt.Key.Key_Space:
            if hasattr(self.viewport, 'is_animating') and self.viewport.is_animating:
                self.stop_animation()
            else:
                self.start_animation()
        elif self.premium_ui:
            # Forward key events to premium UI for gesture shortcuts
            self.premium_ui.keyPressEvent(event)
        
        super().keyPressEvent(event)
    
    def closeEvent(self, event):
        """Handle application close event"""
        # Stop animation
        if hasattr(self.viewport, 'is_animating') and self.viewport.is_animating:
            self.stop_animation()
        
        # Clean up resources
        if hasattr(self.viewport, 'cleanup'):
            self.viewport.cleanup()
        
        print("👋 AnimeRig AI closing gracefully")
        event.accept()


# Legacy compatibility alias
MainWindow = AnimeRigMainWindow


def main():
    """Main application entry point"""
    # Create QApplication
    app = QApplication(sys.argv)
    app.setApplicationName(Config.APP_NAME)
    app.setApplicationVersion(Config.APP_VERSION)
    app.setOrganizationName("AnimeRig AI")
    
    # Set application icon
    icon_path = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'icon.png')
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))
    
    print(f"🚀 Starting {Config.APP_NAME} v{Config.APP_VERSION}")
    print(f"Environment: {Config.ENVIRONMENT}")
    print(f"Debug mode: {Config.DEBUG_MODE}")
    print(f"✓ C++ Engine: {'Available' if NATIVE_ENGINE_AVAILABLE else 'Not Available'}")
    print(f"✓ OpenGL: {'Available' if OPENGL_AVAILABLE else 'Not Available'}")
    
    # Create main window
    try:
        window = AnimeRigMainWindow()
        window.show()
        
        print("✓ Native rendering initialized")
        
        # Check backend connection
        try:
            import requests
            response = requests.get(f"{Config.BACKEND_API_URL}/health", timeout=2)
            if response.status_code == 200:
                print(f"✓ Go Backend: Healthy ({Config.BACKEND_HOST}:{Config.BACKEND_PORT})")
            else:
                print(f"⚠ Go Backend: Unhealthy (status {response.status_code})")
        except:
            print("⚠ Go Backend: Not accessible")
        
        print("\n🎭 AnimeRig AI Professional VTuber Studio Ready!")
        print("📖 Press F1 or go to Help > Keyboard Controls for usage instructions")
        
        # Start event loop
        return app.exec()
        
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
