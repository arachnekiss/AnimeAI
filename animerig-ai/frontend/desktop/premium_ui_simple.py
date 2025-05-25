"""
Simplified Premium UI System for AnimeRig AI
Basic implementation without graphics effects for compatibility
"""

import sys
import os
import math
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel, QPushButton,
    QSlider, QComboBox, QGroupBox, QFrame, QScrollArea, QSpacerItem,
    QSizePolicy, QApplication, QTabWidget, QCheckBox, QSpinBox, QProgressBar
)
from PyQt6.QtCore import (
    Qt, QTimer, QPropertyAnimation, QEasingCurve, QRect,
    pyqtSignal, QPoint, QSize, QParallelAnimationGroup
)
from PyQt6.QtGui import (
    QPainter, QPen, QBrush, QColor, QLinearGradient,
    QRadialGradient, QConicalGradient, QFont, QPainterPath,
    QPixmap, QPalette
)


class NeonButton(QPushButton):
    """Neon effect button (simplified version)"""
    
    def __init__(self, text: str, color: str = "#7877FF", parent=None):
        super().__init__(text, parent)
        self.base_color = QColor(color)
        
        # Style
        self.setFixedSize(120, 40)
        self.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        
        self.update_style()
    
    def update_style(self):
        """Update button style"""
        self.setStyleSheet(f"""
            QPushButton {{
                background-color: rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 0.8);
                border: 2px solid rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 0.6);
                border-radius: 20px;
                color: white;
                padding: 8px 16px;
            }}
            QPushButton:hover {{
                background-color: rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 1.0);
                border: 2px solid rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 1.0);
            }}
            QPushButton:pressed {{
                background-color: rgba({self.base_color.red() - 20}, {self.base_color.green() - 20}, {self.base_color.blue() - 20}, 0.9);
            }}
        """)


class GlassmorphismPanel(QFrame):
    """Glassmorphism panel (simplified version)"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setStyleSheet("""
            QFrame {
                background-color: rgba(255, 255, 255, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 15px;
            }
        """)


class EmotionWheel(QWidget):
    """Simple emotion selector"""
    
    emotionChanged = pyqtSignal(str, float)  # emotion, intensity
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(200, 200)
        self.current_emotion = 'happy'
        self.intensity = 0.5
        
        # Simple grid layout with emotion buttons
        layout = QGridLayout(self)
        layout.setSpacing(5)
        
        emotions = [
            ('😊', 'happy', '#FFD700'),
            ('🎉', 'excited', '#FF6347'),
            ('😲', 'surprised', '#87CEEB'),
            ('😢', 'sad', '#4169E1'),
            ('😠', 'angry', '#DC143C'),
            ('🤔', 'thinking', '#9932CC')
        ]
        
        for i, (emoji, emotion, color) in enumerate(emotions):
            btn = NeonButton(emoji, color)
            btn.setFixedSize(60, 60)
            btn.clicked.connect(lambda checked, e=emotion: self.set_emotion(e))
            row, col = divmod(i, 3)
            layout.addWidget(btn, row, col)
    
    def set_emotion(self, emotion):
        """Set current emotion"""
        self.current_emotion = emotion
        self.emotionChanged.emit(emotion, self.intensity)


class AngleControlOrb(QWidget):
    """Simple angle control"""
    
    angleChanged = pyqtSignal(float, float)  # angle_x, angle_y
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(150, 150)
        
        # Simple slider controls
        layout = QVBoxLayout(self)
        
        # X angle slider
        self.x_slider = QSlider(Qt.Orientation.Horizontal)
        self.x_slider.setRange(-45, 45)
        self.x_slider.setValue(0)
        self.x_slider.valueChanged.connect(self.update_angles)
        
        # Y angle slider
        self.y_slider = QSlider(Qt.Orientation.Horizontal)
        self.y_slider.setRange(-90, 90)
        self.y_slider.setValue(0)
        self.y_slider.valueChanged.connect(self.update_angles)
        
        layout.addWidget(QLabel("Tilt:"))
        layout.addWidget(self.x_slider)
        layout.addWidget(QLabel("Turn:"))
        layout.addWidget(self.y_slider)
    
    def update_angles(self):
        """Update angles from sliders"""
        x_angle = self.x_slider.value()
        y_angle = self.y_slider.value()
        self.angleChanged.emit(x_angle, y_angle)


class GestureQuickBar(QWidget):
    """Gesture quick bar"""
    
    gestureTriggered = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(60)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup UI"""
        layout = QHBoxLayout(self)
        layout.setSpacing(10)
        layout.setContentsMargins(10, 5, 10, 5)
        
        # Gesture buttons with emojis
        gestures = [
            ('👋', 'wave', '#FF6B6B'),
            ('✌️', 'peace_sign', '#4ECDC4'),
            ('👍', 'thumbs_up', '#45B7D1'),
            ('👉', 'point', '#96CEB4'),
            ('🤔', 'thinking', '#FECA57'),
            ('🤘', 'rock_on', '#FF9FF3')
        ]
        
        for emoji, gesture, color in gestures:
            btn = NeonButton(emoji, color)
            btn.setFixedSize(50, 50)
            btn.clicked.connect(lambda checked, g=gesture: self.gestureTriggered.emit(g))
            layout.addWidget(btn)
        
        layout.addStretch()


class FloatingControlPanel(GlassmorphismPanel):
    """Floating control panel"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(300, 400)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup UI"""
        layout = QVBoxLayout(self)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Title
        title = QLabel("Character Control")
        title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        title.setStyleSheet("color: white; margin-bottom: 10px;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # Emotion Wheel
        emotion_label = QLabel("Emotion")
        emotion_label.setStyleSheet("color: rgba(255, 255, 255, 0.8); font-size: 10px;")
        layout.addWidget(emotion_label)
        
        self.emotion_wheel = EmotionWheel()
        layout.addWidget(self.emotion_wheel)
        
        # Angle Control
        angle_label = QLabel("Head Direction")
        angle_label.setStyleSheet("color: rgba(255, 255, 255, 0.8); font-size: 10px;")
        layout.addWidget(angle_label)
        
        self.angle_orb = AngleControlOrb()
        layout.addWidget(self.angle_orb)
        
        layout.addStretch()


class PremiumUI(QWidget):
    """Main premium UI (simplified)"""
    
    emotionChanged = pyqtSignal(str, float)
    angleChanged = pyqtSignal(float, float)
    gestureTriggered = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Floating control panel
        self.floating_panel = FloatingControlPanel()
        
        # Connect signals
        self.floating_panel.emotion_wheel.emotionChanged.connect(self.emotionChanged)
        self.floating_panel.angle_orb.angleChanged.connect(self.angleChanged)
        
        # Gesture quick bar (bottom)
        self.gesture_bar = GestureQuickBar()
        self.gesture_bar.gestureTriggered.connect(self.gestureTriggered)
        
        layout.addWidget(self.floating_panel)
        layout.addStretch()
        layout.addWidget(self.gesture_bar)
    
    def keyPressEvent(self, event):
        """Keyboard shortcuts"""
        if event.key() == Qt.Key.Key_1:
            self.gestureTriggered.emit('wave')
        elif event.key() == Qt.Key.Key_2:
            self.gestureTriggered.emit('peace_sign')
        elif event.key() == Qt.Key.Key_3:
            self.gestureTriggered.emit('thumbs_up')
        
        super().keyPressEvent(event)


class PerformanceMonitor(GlassmorphismPanel):
    """Performance monitoring widget"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(200, 150)
        self.setup_ui()
        
        # Performance data
        self.fps = 0.0
        self.frame_time = 0.0
        
        # Update timer
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self.update_display)
        self.update_timer.start(1000)  # Update every second
    
    def setup_ui(self):
        """Setup the performance monitor UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(5)
        
        # Title
        title = QLabel("Performance")
        title.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        title.setStyleSheet("color: white; margin-bottom: 5px;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # FPS display
        self.fps_label = QLabel("FPS: --")
        self.fps_label.setStyleSheet("color: rgba(255, 255, 255, 0.9); font-size: 9px;")
        layout.addWidget(self.fps_label)
        
        # Frame time display
        self.frame_time_label = QLabel("Frame: --ms")
        self.frame_time_label.setStyleSheet("color: rgba(255, 255, 255, 0.9); font-size: 9px;")
        layout.addWidget(self.frame_time_label)
        
        layout.addStretch()
    
    def update_metrics(self, metrics):
        """Update performance metrics from external source"""
        if hasattr(metrics, 'fps'):
            self.fps = metrics.fps
        if hasattr(metrics, 'frame_time'):
            self.frame_time = metrics.frame_time * 1000  # Convert to ms
        
        self.update_display()
    
    def update_display(self):
        """Update the display with current metrics"""
        # Update FPS
        color = "#4ade80" if self.fps >= 30 else "#fbbf24" if self.fps >= 15 else "#ef4444"
        self.fps_label.setText(f"FPS: {self.fps:.1f}")
        self.fps_label.setStyleSheet(f"color: {color}; font-size: 9px;")
        
        # Update frame time
        self.frame_time_label.setText(f"Frame: {self.frame_time:.1f}ms")


# Demo application
if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # Set application style for dark theme
    app.setStyle('Fusion')
    
    # Dark palette
    palette = QPalette()
    palette.setColor(QPalette.ColorRole.Window, QColor(53, 53, 53))
    palette.setColor(QPalette.ColorRole.WindowText, QColor(255, 255, 255))
    app.setPalette(palette)
    
    # Create main premium UI
    premium_ui = PremiumUI()
    premium_ui.show()
    
    print("🎨 Premium UI System loaded!")
    print("Press 1-3 for quick gestures")
    
    sys.exit(app.exec())
