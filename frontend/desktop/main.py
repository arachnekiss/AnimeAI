"""
AnimeRig AI - Main Desktop Application
A native desktop app for real-time character animation from single images.
"""

import sys
import os
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
    print("✓ Using PyQt6.QtOpenGLWidgets.QOpenGLWidget")
except ImportError:
    try:
        from PyQt6.QtOpenGL import QOpenGLWidget
        print("✓ Using PyQt6.QtOpenGL.QOpenGLWidget")
    except ImportError:
        print("⚠ QOpenGLWidget not available - 3D rendering disabled")
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

# Import C++ engine
try:
    import animerig_py
    print("✓ AnimeRig C++ Engine loaded successfully")
    print(f"  Engine version: {getattr(animerig_py, '__version__', 'unknown')}")
    NATIVE_ENGINE_AVAILABLE = True
except ImportError as e:
    print(f"⚠ Native C++ engine not available: {e}")
    print(f"  Engine path: {engine_path}")
    print("  Running in Python-only mode")
    NATIVE_ENGINE_AVAILABLE = False


class CharacterViewport(QOpenGLWidget):
    """OpenGL viewport for character rendering"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.character_data = None
        self.animation_frame = 0
        self.is_animating = False
        
        # Initialize C++ engine if available
        self.engine = None
        self.renderer = None
        if NATIVE_ENGINE_AVAILABLE:
            try:
                self.engine = animerig_py.Engine()
                self.renderer = animerig_py.CharacterRenderer()
                print("✓ C++ rendering engine initialized")
            except Exception as e:
                print(f"⚠ Failed to initialize C++ engine: {e}")
        
        # Animation timer - use configured FPS
        self.animation_timer = QTimer()
        self.animation_timer.timeout.connect(self.update_animation)
        frame_interval = 1000 // Config.RENDER_FPS  # Convert FPS to milliseconds
        self.animation_timer.start(frame_interval)
        
    def initializeGL(self):
        """Initialize OpenGL context"""
        if not OPENGL_AVAILABLE:
            return
            
        # Set viewport size from config
        GL.glViewport(0, 0, Config.RENDER_WIDTH, Config.RENDER_HEIGHT)
        
        # Enable features based on config
        if Config.ENABLE_ANTIALIASING:
            GL.glEnable(GL.GL_MULTISAMPLE)
            
        # Set clear color
        GL.glClearColor(0.2, 0.2, 0.2, 1.0)
        GL.glEnable(GL.GL_DEPTH_TEST)
        
        # Initialize C++ renderer if available
        if self.engine and self.renderer:
            success = self.engine.initialize()
            if success:
                success = self.renderer.initialize()
                if success:
                    print("✓ Native rendering initialized")
                else:
                    print("⚠ Failed to initialize native renderer")
            else:
                print("⚠ Failed to initialize native engine")
        
    def resizeGL(self, width, height):
        """Handle viewport resize"""
        if not OPENGL_AVAILABLE:
            return
            
        GL.glViewport(0, 0, width, height)
        
        # Update projection matrix
        GL.glMatrixMode(GL.GL_PROJECTION)
        GL.glLoadIdentity()
        GL.glOrtho(-1, 1, -1, 1, -1, 1)
        GL.glMatrixMode(GL.GL_MODELVIEW)
        
    def set_character_data(self, character_data: Dict[str, Any]):
        """Load character data for rendering"""
        self.character_data = character_data
        self.update()
        
    def update_animation(self):
        """Update animation frame"""
        if self.is_animating:
            self.animation_frame += 1
            self.update()
            
    def start_animation(self):
        """Start character animation"""
        self.is_animating = True
        
    def stop_animation(self):
        """Stop character animation"""
        self.is_animating = False
        
    def paintGL(self):
        """Render character in OpenGL"""
        if not OPENGL_AVAILABLE:
            return
            
        GL.glClear(GL.GL_COLOR_BUFFER_BIT | GL.GL_DEPTH_BUFFER_BIT)
        
        # Use native renderer if available
        if self.renderer and self.character_data:
            try:
                self.renderer.render()
            except Exception as e:
                if Config.DEBUG_MODE:
                    print(f"Native rendering failed: {e}")
                self.fallback_render()
        else:
            self.fallback_render()
    
    def fallback_render(self):
        """Software fallback rendering"""
        if not OPENGL_AVAILABLE:
            return
            
        GL.glLoadIdentity()
        
        # Basic rendering placeholder
        if self.character_data:
            # Simple quad for character placeholder
            GL.glColor3f(0.8, 0.6, 0.4)  # Skin color
            GL.glBegin(GL.GL_QUADS)
            GL.glVertex2f(-0.3, -0.5)
            GL.glVertex2f(0.3, -0.5)
            GL.glVertex2f(0.3, 0.5)
            GL.glVertex2f(-0.3, 0.5)
            GL.glEnd()
        else:
            # Render placeholder
            GL.glColor3f(0.7, 0.7, 0.7)
            GL.glBegin(GL.GL_QUADS)
            GL.glVertex2f(-0.5, -0.5)
            GL.glVertex2f(0.5, -0.5)
            GL.glVertex2f(0.5, 0.5)
            GL.glVertex2f(-0.5, 0.5)
            GL.glEnd()
            
    def resizeGL(self, w, h):
        """Handle viewport resize"""
        try:
            if GL:
                GL.glViewport(0, 0, w, h)
                GL.glMatrixMode(GL.GL_PROJECTION)
                GL.glLoadIdentity()
                GL.glOrtho(-1, 1, -1, 1, -1, 1)
                GL.glMatrixMode(GL.GL_MODELVIEW)
        except (ImportError, AttributeError):
            pass


class ProcessingThread(QThread):
    """Background thread for AI processing"""
    
    progress_updated = pyqtSignal(int, str)
    character_ready = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, image_path: str, parent=None):
        super().__init__(parent)
        self.image_path = image_path
        self.character_processor = CharacterProcessor()
        
    def run(self):
        """Process character image in background"""
        try:
            self.progress_updated.emit(10, "Loading image...")
            
            # Load and process image
            self.progress_updated.emit(25, "Analyzing character features...")
            features = self.character_processor.extract_features(self.image_path)
            
            self.progress_updated.emit(50, "Generating 3D model...")
            model_3d = self.character_processor.generate_3d_model(features)
            
            self.progress_updated.emit(75, "Creating animation rig...")
            rig = self.character_processor.create_animation_rig(model_3d)
            
            self.progress_updated.emit(90, "Finalizing character...")
            character_data = {
                'features': features,
                'model_3d': model_3d,
                'rig': rig,
                'image_path': self.image_path
            }
            
            self.progress_updated.emit(100, "Character ready!")
            self.character_ready.emit(character_data)
            
        except Exception as e:
            self.error_occurred.emit(str(e))


class ChatWidget(QWidget):
    """Chat interface for character interaction"""
    
    message_sent = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup chat interface"""
        layout = QVBoxLayout(self)
        
        # Chat history
        self.chat_history = QTextEdit()
        self.chat_history.setReadOnly(True)
        self.chat_history.setStyleSheet("""
            QTextEdit {
                background-color: #2b2b2b;
                color: #ffffff;
                border: 1px solid #555;
                border-radius: 5px;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 14px;
            }
        """)
        layout.addWidget(self.chat_history)
        
        # Input area
        input_layout = QHBoxLayout()
        
        self.message_input = QLineEdit()
        self.message_input.setPlaceholderText("Type a message to your character...")
        self.message_input.setStyleSheet("""
            QLineEdit {
                background-color: #3b3b3b;
                color: #ffffff;
                border: 1px solid #555;
                border-radius: 5px;
                padding: 8px;
                font-size: 14px;
            }
        """)
        self.message_input.returnPressed.connect(self.send_message)
        input_layout.addWidget(self.message_input)
        
        self.send_button = QPushButton("Send")
        self.send_button.setStyleSheet("""
            QPushButton {
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 8px 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #005a9e;
            }
        """)
        self.send_button.clicked.connect(self.send_message)
        input_layout.addWidget(self.send_button)
        
        layout.addLayout(input_layout)
        
    def send_message(self):
        """Send message to character"""
        message = self.message_input.text().strip()
        if message:
            self.add_message("You", message, is_user=True)
            self.message_input.clear()
            self.message_sent.emit(message)
            
    def add_message(self, sender: str, message: str, is_user: bool = False):
        """Add message to chat history"""
        color = "#007acc" if is_user else "#ff6b35"
        self.chat_history.append(f'<span style="color: {color}; font-weight: bold;">{sender}:</span> {message}')
        
    def add_character_response(self, response: str):
        """Add character response"""
        self.add_message("Character", response, is_user=False)


class ControlPanel(QWidget):
    """Animation and emotion control panel"""
    
    emotion_changed = pyqtSignal(str, float)
    animation_triggered = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup control panel"""
        layout = QVBoxLayout(self)
        
        # Emotion controls
        emotion_group = QGroupBox("Emotions")
        emotion_layout = QGridLayout(emotion_group)
        
        emotions = ["Happy", "Sad", "Angry", "Surprised", "Neutral"]
        self.emotion_sliders = {}
        
        for i, emotion in enumerate(emotions):
            label = QLabel(emotion)
            slider = QSlider(Qt.Orientation.Horizontal)
            slider.setRange(0, 100)
            slider.setValue(20 if emotion == "Neutral" else 0)
            slider.valueChanged.connect(
                lambda value, e=emotion: self.emotion_changed.emit(e.lower(), value / 100.0)
            )
            
            emotion_layout.addWidget(label, i, 0)
            emotion_layout.addWidget(slider, i, 1)
            self.emotion_sliders[emotion] = slider
            
        layout.addWidget(emotion_group)
        
        # Animation controls
        animation_group = QGroupBox("Animations")
        animation_layout = QVBoxLayout(animation_group)
        
        animations = ["Wave", "Nod", "Shake Head", "Point", "Clap"]
        for animation in animations:
            button = QPushButton(animation)
            button.clicked.connect(
                lambda checked, a=animation: self.animation_triggered.emit(a.lower().replace(" ", "_"))
            )
            animation_layout.addWidget(button)
            
        layout.addWidget(animation_group)
        
        # Physics controls
        physics_group = QGroupBox("Physics")
        physics_layout = QVBoxLayout(physics_group)
        
        # Hair physics
        hair_physics = QCheckBox("Hair Physics")
        hair_physics.setChecked(True)
        physics_layout.addWidget(hair_physics)
        
        # Clothing physics
        clothing_physics = QCheckBox("Clothing Physics")
        clothing_physics.setChecked(True)
        physics_layout.addWidget(clothing_physics)
        
        layout.addWidget(physics_group)


class MainWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self):
        super().__init__()
        self.character_data = None
        self.motion_generator = MotionGenerator()
        self.backend_connected = False
        self.setup_ui()
        self.setup_menu()
        
        # GUI 검증을 위한 초기화
        self.gui_state = {
            'window_initialized': True,
            'opengl_available': OPENGL_AVAILABLE,
            'engine_available': NATIVE_ENGINE_AVAILABLE
        }
        
    def setup_ui(self):
        """Setup main UI"""
        self.setWindowTitle("AnimeRig AI - Character Animation Studio")
        self.setGeometry(100, 100, 1400, 900)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #2b2b2b;
                color: #ffffff;
            }
        """)
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QHBoxLayout(central_widget)
        
        # Create splitter
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # Left panel (character viewport)
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        # Character viewport
        self.viewport = CharacterViewport()
        self.viewport.setMinimumSize(600, 400)
        left_layout.addWidget(self.viewport)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        left_layout.addWidget(self.progress_bar)
        
        # Status label
        self.status_label = QLabel("Ready - Load a character image to begin")
        self.status_label.setStyleSheet("color: #cccccc; padding: 5px;")
        left_layout.addWidget(self.status_label)
        
        splitter.addWidget(left_panel)
        
        # Right panel (controls and chat)
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        # Tab widget
        tab_widget = QTabWidget()
        tab_widget.setStyleSheet("""
            QTabWidget::pane {
                border: 1px solid #555;
                background-color: #3b3b3b;
            }
            QTabBar::tab {
                background-color: #2b2b2b;
                color: #ffffff;
                padding: 8px 16px;
                margin-right: 2px;
            }
            QTabBar::tab:selected {
                background-color: #007acc;
            }
        """)
        
        # Control panel tab
        self.control_panel = ControlPanel()
        self.control_panel.emotion_changed.connect(self.on_emotion_changed)
        self.control_panel.animation_triggered.connect(self.on_animation_triggered)
        tab_widget.addTab(self.control_panel, "Controls")
        
        # Chat tab
        self.chat_widget = ChatWidget()
        self.chat_widget.message_sent.connect(self.on_message_sent)
        tab_widget.addTab(self.chat_widget, "Chat")
        
        right_layout.addWidget(tab_widget)
        right_panel.setMaximumWidth(400)
        
        splitter.addWidget(right_panel)
        splitter.setSizes([1000, 400])
        
        main_layout.addWidget(splitter)
        
    def setup_menu(self):
        """Setup application menu"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu("File")
        
        load_action = QAction("Load Character Image", self)
        load_action.setShortcut(QKeySequence.StandardKey.Open)
        load_action.triggered.connect(self.load_character_image)
        file_menu.addAction(load_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Exit", self)
        exit_action.setShortcut(QKeySequence.StandardKey.Quit)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # View menu
        view_menu = menubar.addMenu("View")
        
        reset_view_action = QAction("Reset Camera", self)
        reset_view_action.triggered.connect(self.reset_camera)
        view_menu.addAction(reset_view_action)
        
        # Help menu
        help_menu = menubar.addMenu("Help")
        
        about_action = QAction("About", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
        
    def load_character_image(self):
        """Load character image for processing"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Character Image",
            str(Path.home()),
            "Image Files (*.png *.jpg *.jpeg *.bmp *.gif)"
        )
        
        if file_path:
            self.process_character_image(file_path)
            
    def process_character_image(self, image_path: str):
        """Process character image in background"""
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.status_label.setText("Processing character image...")
        
        # Start processing thread
        self.processing_thread = ProcessingThread(image_path)
        self.processing_thread.progress_updated.connect(self.on_progress_updated)
        self.processing_thread.character_ready.connect(self.on_character_ready)
        self.processing_thread.error_occurred.connect(self.on_error_occurred)
        self.processing_thread.start()
        
    @pyqtSlot(int, str)
    def on_progress_updated(self, progress: int, message: str):
        """Update progress bar"""
        self.progress_bar.setValue(progress)
        self.status_label.setText(message)
        
    @pyqtSlot(dict)
    def on_character_ready(self, character_data: Dict[str, Any]):
        """Handle character processing completion"""
        self.character_data = character_data
        self.viewport.set_character_data(character_data)
        self.viewport.start_animation()
        
        self.progress_bar.setVisible(False)
        self.status_label.setText("Character loaded and ready!")
        
        # Add welcome message to chat
        self.chat_widget.add_character_response(
            "Hello! I'm your new AI companion. Feel free to chat with me or control my emotions and animations!"
        )
        
    @pyqtSlot(str)
    def on_error_occurred(self, error: str):
        """Handle processing error"""
        self.progress_bar.setVisible(False)
        self.status_label.setText("Error occurred")
        QMessageBox.critical(self, "Error", f"Failed to process character: {error}")
        
    @pyqtSlot(str, float)
    def on_emotion_changed(self, emotion: str, intensity: float):
        """Handle emotion change"""
        if self.character_data:
            # Generate emotion animation
            animation_data = self.motion_generator.generate_emotion_animation(emotion, intensity)
            # Apply to character (would integrate with C++ renderer)
            self.status_label.setText(f"Emotion: {emotion.title()} ({intensity:.1%})")
            
    @pyqtSlot(str)
    def on_animation_triggered(self, animation: str):
        """Handle animation trigger"""
        if self.character_data:
            # Generate gesture animation
            animation_data = self.motion_generator.generate_gesture_animation(animation)
            # Apply to character (would integrate with C++ renderer)
            self.status_label.setText(f"Playing animation: {animation.replace('_', ' ').title()}")
            
    @pyqtSlot(str)
    def on_message_sent(self, message: str):
        """Handle chat message"""
        if self.character_data:
            # Generate response using LLM
            # This would connect to the Go backend
            response = f"Thanks for your message! You said: '{message}'"
            self.chat_widget.add_character_response(response)
            
            # Generate emotional response animation
            animation_data = self.motion_generator.generate_conversation_animation(message, response)
            
    def reset_camera(self):
        """Reset viewport camera"""
        self.viewport.update()
        
    def show_about(self):
        """Show about dialog"""
        QMessageBox.about(
            self,
            "About AnimeRig AI",
            "AnimeRig AI v1.0\n\n"
            "A native desktop application for real-time character animation from single images.\n\n"
            "Built with Python, C++, and Go for optimal performance and AI capabilities."
        )
        
    def closeEvent(self, event):
        """Handle application close"""
        if hasattr(self, 'processing_thread') and self.processing_thread.isRunning():
            self.processing_thread.quit()
            self.processing_thread.wait()
        event.accept()
        
    def capture_gui_state(self):
        """GUI 상태를 캡처하여 검증"""
        import os
        from pathlib import Path
        
        # 스크린샷 디렉토리 생성
        screenshot_dir = Path("verification_results/screenshots")
        screenshot_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # 메인 윈도우 캡처
            screen = QApplication.primaryScreen()
            if screen:
                screenshot = screen.grabWindow(self.winId())
                screenshot.save(str(screenshot_dir / "main_window.png"))
                print("✓ Captured: main_window.png")
                
                # 각 컴포넌트별 캡처
                components = {
                    'character_viewport': self.viewport,
                    'control_panel': self.control_panel,
                    'chat_interface': self.chat_widget
                }
                
                for name, widget in components.items():
                    if widget and widget.isVisible():
                        widget_screenshot = screen.grabWindow(widget.winId())
                        widget_screenshot.save(str(screenshot_dir / f"{name}.png"))
                        print(f"✓ Captured: {name}.png")
        
        except Exception as e:
            print(f"Screenshot capture failed: {e}")
        
        # GUI 상태 로그
        self.log_gui_state()
        
    def log_gui_state(self):
        """GUI 상태를 텍스트로 로깅"""
        log_dir = Path("verification_results")
        log_dir.mkdir(exist_ok=True)
        
        with open(log_dir / "gui_state_report.txt", 'w') as f:
            f.write("=== AnimeRig AI GUI State Report ===\n\n")
            f.write(f"Timestamp: {QDateTime.currentDateTime().toString()}\n\n")
            
            # 윈도우 상태
            f.write("=== Main Window ===\n")
            f.write(f"Window Size: {self.size().width()}x{self.size().height()}\n")
            f.write(f"Window Position: {self.pos().x()}, {self.pos().y()}\n")
            f.write(f"Is Visible: {self.isVisible()}\n")
            f.write(f"Is Active: {self.isActiveWindow()}\n\n")
            
            # 3D 뷰포트 상태
            f.write("=== Character Viewport ===\n")
            f.write(f"OpenGL Available: {OPENGL_AVAILABLE}\n")
            f.write(f"Native Engine Available: {NATIVE_ENGINE_AVAILABLE}\n")
            f.write(f"Character Loaded: {self.character_data is not None}\n")
            f.write(f"Animation Playing: {self.viewport.is_animating}\n")
            f.write(f"Animation Frame: {self.viewport.animation_frame}\n\n")
            
            # 채팅 인터페이스 상태
            f.write("=== Chat Interface ===\n")
            chat_text = self.chat_widget.chat_history.toPlainText()
            f.write(f"Message Count: {len(chat_text.split('\\n')) if chat_text else 0}\n")
            f.write(f"Input Field Enabled: {self.chat_widget.message_input.isEnabled()}\n")
            f.write(f"Send Button Enabled: {self.chat_widget.send_button.isEnabled()}\n\n")
            
            # 컨트롤 패널 상태
            f.write("=== Control Panel ===\n")
            if hasattr(self.control_panel, 'emotion_sliders'):
                for emotion, slider in self.control_panel.emotion_sliders.items():
                    f.write(f"{emotion.capitalize()}: {slider.value()}%\n")
            f.write(f"Controls Enabled: {self.control_panel.isEnabled()}\n\n")
            
            # 백엔드 연결 상태
            f.write("=== Backend Connection ===\n")
            f.write(f"Backend Connected: {self.backend_connected}\n")
            f.write(f"Backend URL: {Config.BACKEND_API_URL}\n\n")
            
        print("✓ GUI state logged to gui_state_report.txt")
        
    def test_backend_connection(self):
        """백엔드 연결 테스트"""
        try:
            import requests
            response = requests.get(f"{Config.BACKEND_API_URL}/health", timeout=5)
            if response.status_code == 200:
                self.backend_connected = True
                print("✓ Backend connection successful")
                return True
        except Exception as e:
            print(f"✗ Backend connection failed: {e}")
            self.backend_connected = False
            return False


def main():
    """Main application entry point"""
    app = QApplication(sys.argv)
    app.setApplicationName(Config.APP_NAME)
    app.setApplicationVersion(Config.APP_VERSION)
    
    # Print startup information
    print(f"🚀 Starting {Config.APP_NAME} v{Config.APP_VERSION}")
    print(f"Environment: {Config.ENVIRONMENT}")
    print(f"Debug mode: {Config.DEBUG_MODE}")
    if NATIVE_ENGINE_AVAILABLE:
        print("✓ C++ Engine: Available")
    if OPENGL_AVAILABLE:
        print("✓ OpenGL: Available")
    
    # Set application icon
    app_icon = QIcon()
    icon_path = Path(__file__).parent.parent.parent / "assets" / "icons" / "app_icon.png"
    if icon_path.exists():
        app_icon.addFile(str(icon_path))
        app.setWindowIcon(app_icon)
    
    # Apply dark theme
    app.setStyleSheet("""
        QWidget {
            background-color: #2b2b2b;
            color: #ffffff;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        QGroupBox {
            font-weight: bold;
            border: 2px solid #555;
            border-radius: 5px;
            margin: 10px 0;
            padding-top: 10px;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 5px 0 5px;
        }
        QPushButton {
            background-color: #3b3b3b;
            border: 1px solid #555;
            border-radius: 3px;
            padding: 5px 10px;
        }
        QPushButton:hover {
            background-color: #4b4b4b;
        }
        QPushButton:pressed {
            background-color: #1b1b1b;
        }
        QSlider::groove:horizontal {
            border: 1px solid #555;
            height: 8px;
            background: #3b3b3b;
            border-radius: 4px;
        }
        QSlider::handle:horizontal {
            background: #007acc;
            border: 1px solid #005a9e;
            width: 18px;
            margin: -2px 0;
            border-radius: 3px;
        }
        QProgressBar {
            border: 1px solid #555;
            border-radius: 5px;
            background-color: #3b3b3b;
        }
        QProgressBar::chunk {
            background-color: #007acc;
            border-radius: 3px;
        }
    """)
    
    # Create and show main window
    window = MainWindow()
    window.show()
    
    # Load default character if available (commented out for testing)
    # default_character_path = Path(__file__).parent.parent.parent / "assets" / "images" / "start_character.png"
    # if default_character_path.exists():
    #     QTimer.singleShot(1000, lambda: window.process_character_image(str(default_character_path)))
    
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
