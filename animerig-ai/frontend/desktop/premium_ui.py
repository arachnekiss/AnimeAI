"""
Premium UI System for AnimeRig AI
Modern glassmorphism interface with floating controls and professional layout
"""

import sys
import os
import math
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel, QPushButton,
    QSlider, QComboBox, QGroupBox, QFrame, QScrollArea, QSpacerItem,
    QSizePolicy, QApplication, QTabWidget, QCheckBox, QSpinBox, QProgressBar,
    QGraphicsBlurEffect, QGraphicsDropShadowEffect
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
    """네온 효과가 있는 버튼"""
    
    def __init__(self, text: str, color: str = "#7877FF", parent=None):
        super().__init__(text, parent)
        self.base_color = QColor(color)
        self.glow_intensity = 0.3
        self.hover_intensity = 1.0
        
        # Animation
        self.glow_animation = QPropertyAnimation(self, b"glow_intensity")
        self.glow_animation.setDuration(300)
        self.glow_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        
        # Style
        self.setFixedSize(120, 40)        self.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        
        # Shadow effect (optional)
        if QGraphicsDropShadowEffect is not None:
            shadow = QGraphicsDropShadowEffect()
            shadow.setBlurRadius(20)
            shadow.setColor(self.base_color)
            shadow.setOffset(0, 0)
            self.setGraphicsEffect(shadow)
        
        self.update_style()
    
    def update_style(self):
        """스타일 업데이트"""
        glow_color = self.base_color
        glow_color.setAlphaF(self.glow_intensity)
        
        self.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 0.8),
                    stop:1 rgba({self.base_color.red() + 40}, {self.base_color.green() + 40}, {self.base_color.blue() + 40}, 0.8));
                border: 2px solid rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 0.6);
                border-radius: 20px;
                color: white;
                padding: 8px 16px;
            }}
            QPushButton:hover {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 1.0),
                    stop:1 rgba({self.base_color.red() + 60}, {self.base_color.green() + 60}, {self.base_color.blue() + 60}, 1.0));
                border: 2px solid rgba({self.base_color.red()}, {self.base_color.green()}, {self.base_color.blue()}, 1.0);
            }}
            QPushButton:pressed {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 rgba({self.base_color.red() - 20}, {self.base_color.green() - 20}, {self.base_color.blue() - 20}, 0.9),
                    stop:1 rgba({self.base_color.red() + 20}, {self.base_color.green() + 20}, {self.base_color.blue() + 20}, 0.9));
            }}
        """)
    
    def enterEvent(self, event):
        """마우스 호버 진입"""
        self.glow_animation.setStartValue(self.glow_intensity)
        self.glow_animation.setEndValue(self.hover_intensity)
        self.glow_animation.start()
        super().enterEvent(event)
    
    def leaveEvent(self, event):
        """마우스 호버 종료"""
        self.glow_animation.setStartValue(self.glow_intensity)
        self.glow_animation.setEndValue(0.3)
        self.glow_animation.start()
        super().leaveEvent(event)

class GlassmorphismPanel(QFrame):
    """글래스모피즘 패널"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.blur_radius = 10        self.background_alpha = 0.15
        self.border_alpha = 0.3
        
        # Blur effect (optional)
        if QGraphicsBlurEffect is not None:
            blur = QGraphicsBlurEffect()
            blur.setBlurRadius(self.blur_radius)
        
        # Shadow (optional)
        if QGraphicsDropShadowEffect is not None:
            shadow = QGraphicsDropShadowEffect()
            shadow.setBlurRadius(25)
            shadow.setColor(QColor(0, 0, 0, 80))
            shadow.setOffset(0, 5)
            self.setGraphicsEffect(shadow)
        
        self.update_style()
    
    def update_style(self):
        """스타일 업데이트"""
        self.setStyleSheet(f"""
            QFrame {{
                background: rgba(255, 255, 255, {int(self.background_alpha * 255)});
                border: 1px solid rgba(255, 255, 255, {int(self.border_alpha * 255)});
                border-radius: 15px;
                backdrop-filter: blur({self.blur_radius}px);
            }}
        """)

class EmotionWheel(QWidget):
    """원형 감정 선택기"""
    
    emotionChanged = pyqtSignal(str, float)  # emotion, intensity
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(200, 200)
        self.center_point = QPoint(100, 100)
        self.radius = 80
        
        # Emotions positioned around the wheel
        self.emotions = {
            'happy': {'angle': 0, 'color': QColor(255, 193, 7)},
            'excited': {'angle': 60, 'color': QColor(255, 152, 0)},
            'surprised': {'angle': 120, 'color': QColor(96, 125, 139)},
            'sad': {'angle': 180, 'color': QColor(63, 81, 181)},
            'angry': {'angle': 240, 'color': QColor(244, 67, 54)},
            'thinking': {'angle': 300, 'color': QColor(156, 39, 176)}
        }
        
        self.current_emotion = 'happy'
        self.intensity = 0.5
        self.mouse_pressed = False
        
        self.setCursor(Qt.CursorShape.PointingHandCursor)
    
    def paintEvent(self, event):
        """사용자 정의 그리기"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Background circle
        bg_gradient = QRadialGradient(self.center_point, self.radius)
        bg_gradient.setColorAt(0, QColor(40, 40, 60, 100))
        bg_gradient.setColorAt(1, QColor(20, 20, 40, 150))
        
        painter.setBrush(QBrush(bg_gradient))
        painter.setPen(QPen(QColor(255, 255, 255, 100), 2))
        painter.drawEllipse(self.center_point, self.radius, self.radius)
        
        # Draw emotion segments
        for emotion, props in self.emotions.items():
            angle = props['angle']
            color = props['color']
            
            # Highlight current emotion
            if emotion == self.current_emotion:
                color = color.lighter(150)
                painter.setPen(QPen(color, 3))
            else:
                painter.setPen(QPen(color, 2))
            
            # Calculate position
            rad = math.radians(angle)
            x = self.center_point.x() + (self.radius - 20) * math.cos(rad)
            y = self.center_point.y() + (self.radius - 20) * math.sin(rad)
            
            # Draw emotion dot
            painter.setBrush(QBrush(color))
            painter.drawEllipse(QPoint(int(x), int(y)), 8, 8)
            
            # Draw emotion line
            inner_x = self.center_point.x() + 30 * math.cos(rad)
            inner_y = self.center_point.y() + 30 * math.sin(rad)
            painter.drawLine(int(inner_x), int(inner_y), int(x), int(y))
        
        # Center intensity indicator
        intensity_radius = self.intensity * 25
        intensity_color = self.emotions[self.current_emotion]['color']
        intensity_color.setAlphaF(0.7)
        
        painter.setBrush(QBrush(intensity_color))
        painter.setPen(QPen(intensity_color.lighter(120), 2))
        painter.drawEllipse(self.center_point, int(intensity_radius), int(intensity_radius))
        
        # Intensity text
        painter.setPen(QPen(QColor(255, 255, 255), 1))
        painter.setFont(QFont("Segoe UI", 8))
        painter.drawText(self.center_point.x() - 10, self.center_point.y() + 3, 
                        f"{int(self.intensity * 100)}%")
    
    def mousePressEvent(self, event):
        """마우스 클릭"""
        if event.button() == Qt.MouseButton.LeftButton:
            self.mouse_pressed = True
            self.update_emotion_from_mouse(event.position())
    
    def mouseMoveEvent(self, event):
        """마우스 드래그"""
        if self.mouse_pressed:
            self.update_emotion_from_mouse(event.position())
    
    def mouseReleaseEvent(self, event):
        """마우스 릴리즈"""
        self.mouse_pressed = False
    
    def update_emotion_from_mouse(self, pos):
        """마우스 위치에서 감정 업데이트"""
        dx = pos.x() - self.center_point.x()
        dy = pos.y() - self.center_point.y()
        
        # Calculate angle and distance
        angle = math.degrees(math.atan2(dy, dx))
        if angle < 0:
            angle += 360
        
        distance = math.sqrt(dx*dx + dy*dy)
        
        # Update intensity based on distance from center
        if distance <= self.radius:
            self.intensity = min(1.0, distance / self.radius)
            
            # Find closest emotion
            closest_emotion = 'happy'
            min_diff = float('inf')
            
            for emotion, props in self.emotions.items():
                diff = abs(angle - props['angle'])
                if diff > 180:
                    diff = 360 - diff
                
                if diff < min_diff:
                    min_diff = diff
                    closest_emotion = emotion
            
            if closest_emotion != self.current_emotion:
                self.current_emotion = closest_emotion
                self.emotionChanged.emit(closest_emotion, self.intensity)
            
            self.update()

class AngleControlOrb(QWidget):
    """3D 각도 제어 오브"""
    
    angleChanged = pyqtSignal(float, float)  # angle_x, angle_y
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(150, 150)
        self.center_point = QPoint(75, 75)
        self.radius = 60
        
        # Current angles
        self.angle_x = 0.0  # Head tilt up/down
        self.angle_y = 0.0  # Head turn left/right
        
        # Control state
        self.mouse_pressed = False
        self.control_point = self.center_point
        
        self.setCursor(Qt.CursorShape.PointingHandCursor)
    
    def paintEvent(self, event):
        """사용자 정의 그리기"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Background sphere
        bg_gradient = QRadialGradient(self.center_point, self.radius)
        bg_gradient.setColorAt(0, QColor(60, 60, 80, 120))
        bg_gradient.setColorAt(1, QColor(30, 30, 50, 200))
        
        painter.setBrush(QBrush(bg_gradient))
        painter.setPen(QPen(QColor(255, 255, 255, 150), 2))
        painter.drawEllipse(self.center_point, self.radius, self.radius)
        
        # Grid lines for depth
        painter.setPen(QPen(QColor(255, 255, 255, 50), 1))
        
        # Horizontal lines (latitude)
        for i in range(-2, 3):
            y = self.center_point.y() + i * 20
            if abs(i * 20) < self.radius:
                width = math.sqrt(self.radius*self.radius - (i*20)*(i*20)) * 2
                painter.drawEllipse(self.center_point.x() - width/2, y - 2, width, 4)
        
        # Vertical line (longitude)
        painter.drawLine(self.center_point.x(), self.center_point.y() - self.radius,
                        self.center_point.x(), self.center_point.y() + self.radius)
        
        # Control point
        control_gradient = QRadialGradient(self.control_point, 8)
        control_gradient.setColorAt(0, QColor(120, 255, 120, 200))
        control_gradient.setColorAt(1, QColor(80, 200, 80, 100))
        
        painter.setBrush(QBrush(control_gradient))
        painter.setPen(QPen(QColor(255, 255, 255, 200), 2))
        painter.drawEllipse(self.control_point, 8, 8)
        
        # Angle indicators
        painter.setFont(QFont("Segoe UI", 8))
        painter.setPen(QPen(QColor(255, 255, 255), 1))
        painter.drawText(10, 20, f"X: {int(self.angle_x)}°")
        painter.drawText(10, 35, f"Y: {int(self.angle_y)}°")
    
    def mousePressEvent(self, event):
        """마우스 클릭"""
        if event.button() == Qt.MouseButton.LeftButton:
            self.mouse_pressed = True
            self.update_angles_from_mouse(event.position())
    
    def mouseMoveEvent(self, event):
        """마우스 드래그"""
        if self.mouse_pressed:
            self.update_angles_from_mouse(event.position())
    
    def mouseReleaseEvent(self, event):
        """마우스 릴리즈"""
        self.mouse_pressed = False
        
        # Smooth return to center if released
        if not self.mouse_pressed:
            self.smoothly_return_to_center()
    
    def update_angles_from_mouse(self, pos):
        """마우스 위치에서 각도 업데이트"""
        dx = pos.x() - self.center_point.x()
        dy = pos.y() - self.center_point.y()
        
        # Constrain to circle
        distance = math.sqrt(dx*dx + dy*dy)
        if distance > self.radius:
            dx = dx / distance * self.radius
            dy = dy / distance * self.radius
        
        # Update control point
        self.control_point = QPoint(int(self.center_point.x() + dx), 
                                   int(self.center_point.y() + dy))
        
        # Calculate angles
        self.angle_x = (dy / self.radius) * 45.0  # -45 to +45 degrees
        self.angle_y = (dx / self.radius) * 90.0  # -90 to +90 degrees
        
        self.angleChanged.emit(self.angle_x, self.angle_y)
        self.update()
    
    def smoothly_return_to_center(self):
        """부드럽게 중앙으로 복귀"""
        # Create animation to return to center
        self.return_animation = QPropertyAnimation(self, b"control_point")
        self.return_animation.setDuration(500)
        self.return_animation.setStartValue(self.control_point)
        self.return_animation.setEndValue(self.center_point)
        self.return_animation.setEasingCurve(QEasingCurve.Type.OutCubic)
        
        # Reset angles during animation
        self.angle_animation = QPropertyAnimation(self, b"angle_x")
        self.angle_animation.setDuration(500)
        self.angle_animation.setStartValue(self.angle_x)
        self.angle_animation.setEndValue(0.0)
        
        self.return_animation.valueChanged.connect(self.update)
        self.return_animation.start()

class GestureQuickBar(QWidget):
    """제스처 퀵 바"""
    
    gestureTriggered = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedHeight(60)
        self.setup_ui()
        
    def setup_ui(self):
        """UI 설정"""
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
    """플로팅 컨트롤 패널"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(300, 400)
        self.setup_ui()
        
        # Auto-hide functionality
        self.hide_timer = QTimer()
        self.hide_timer.setSingleShot(True)
        self.hide_timer.timeout.connect(self.fade_out)
        
        self.fade_animation = QPropertyAnimation(self, b"windowOpacity")
        self.fade_animation.setDuration(300)
        
    def setup_ui(self):
        """UI 설정"""
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
    
    def enterEvent(self, event):
        """마우스 진입"""
        self.hide_timer.stop()
        self.fade_in()
        super().enterEvent(event)
    
    def leaveEvent(self, event):
        """마우스 이탈"""
        self.hide_timer.start(2000)  # 2초 후 숨기기
        super().leaveEvent(event)
    
    def fade_in(self):
        """페이드 인"""
        self.fade_animation.setStartValue(self.windowOpacity())
        self.fade_animation.setEndValue(1.0)
        self.fade_animation.start()
    
    def fade_out(self):
        """페이드 아웃"""
        self.fade_animation.setStartValue(self.windowOpacity())
        self.fade_animation.setEndValue(0.3)
        self.fade_animation.start()

class PremiumUI(QWidget):
    """메인 프리미엄 UI"""
    
    emotionChanged = pyqtSignal(str, float)
    angleChanged = pyqtSignal(float, float)
    gestureTriggered = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        self.setup_ui()
        self.setup_animations()
        
        # Start with controls hidden
        self.controls_visible = False
        self.floating_panel.setWindowOpacity(0.0)
    
    def setup_ui(self):
        """UI 설정"""
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
    
    def setup_animations(self):
        """애니메이션 설정"""
        # Floating animation for the panel
        self.float_animation = QPropertyAnimation(self.floating_panel, b"geometry")
        self.float_animation.setDuration(2000)
        self.float_animation.setLoopCount(-1)  # Infinite loop
        
        # Glow pulse animation
        self.glow_timer = QTimer()
        self.glow_timer.timeout.connect(self.update_glow)
        self.glow_timer.start(50)  # 20 FPS for smooth glow
        
        self.glow_phase = 0
    
    def update_glow(self):
        """글로우 효과 업데이트"""
        self.glow_phase += 0.05
        
        # Pulse effect for UI elements
        intensity = 0.5 + 0.3 * math.sin(self.glow_phase)
        
        # Apply to gesture bar buttons (would need access to individual buttons)
        # This is a simplified version
        
    def toggle_controls(self):
        """컨트롤 표시/숨김 토글"""
        if self.controls_visible:
            self.hide_controls()
        else:
            self.show_controls()
    
    def show_controls(self):
        """컨트롤 표시"""
        self.controls_visible = True
        self.floating_panel.fade_in()
    
    def hide_controls(self):
        """컨트롤 숨김"""
        self.controls_visible = False
        self.floating_panel.fade_out()
    
    def keyPressEvent(self, event):
        """키보드 단축키"""
        if event.key() == Qt.Key.Key_Space:
            self.toggle_controls()
        elif event.key() == Qt.Key.Key_1:
            self.gestureTriggered.emit('wave')
        elif event.key() == Qt.Key.Key_2:
            self.gestureTriggered.emit('peace_sign')
        elif event.key() == Qt.Key.Key_3:
            self.gestureTriggered.emit('thumbs_up')
        
        super().keyPressEvent(event)

class MinimalCharacterViewer(QWidget):
    """미니멀 캐릭터 뷰어 - 투명 배경"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        # Character state
        self.character_image = None
        self.background_removed = False
        
        self.setFixedSize(400, 600)
    
    def set_character_image(self, image_path: str):
        """캐릭터 이미지 설정"""
        pixmap = QPixmap(image_path)
        if not pixmap.isNull():
            self.character_image = pixmap.scaled(
                self.size(), Qt.AspectRatioMode.KeepAspectRatio, 
                Qt.TransformationMode.SmoothTransformation
            )
            self.update()
    
    def remove_background(self):
        """배경 제거 (실제로는 AI 모델 사용)"""
        self.background_removed = True
        self.update()
    
    def paintEvent(self, event):
        """사용자 정의 그리기"""
        if self.character_image is None:
            return
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # Draw character with optional background removal effect
        if self.background_removed:
            # Create a subtle glow effect around character
            glow_color = QColor(255, 255, 255, 30)
            painter.setBrush(QBrush(glow_color))
            painter.setPen(Qt.PenStyle.NoPen)
            
            # Draw glow halo
            painter.drawEllipse(self.rect().adjusted(20, 50, -20, -50))
        
        # Draw character
        x = (self.width() - self.character_image.width()) // 2
        y = (self.height() - self.character_image.height()) // 2
        painter.drawPixmap(x, y, self.character_image)


class PerformanceMonitor(GlassmorphismPanel):
    """Performance monitoring widget for real-time metrics"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(200, 150)
        self.setup_ui()
        
        # Performance data
        self.fps = 0.0
        self.frame_time = 0.0
        self.cpu_usage = 0.0
        self.memory_usage = 0.0
        
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
        
        # CPU usage
        self.cpu_label = QLabel("CPU: --%")
        self.cpu_label.setStyleSheet("color: rgba(255, 255, 255, 0.9); font-size: 9px;")
        layout.addWidget(self.cpu_label)
        
        # Memory usage
        self.memory_label = QLabel("Memory: --MB")
        self.memory_label.setStyleSheet("color: rgba(255, 255, 255, 0.9); font-size: 9px;")
        layout.addWidget(self.memory_label)
        
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
        
        # Update CPU (placeholder - would need actual CPU monitoring)
        self.cpu_label.setText(f"CPU: {self.cpu_usage:.1f}%")
        
        # Update Memory (placeholder - would need actual memory monitoring)
        self.memory_label.setText(f"Memory: {self.memory_usage:.0f}MB")


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
    
    # Create character viewer
    character_viewer = MinimalCharacterViewer()
    character_viewer.set_character_image("public/images/start_character.png")
    character_viewer.remove_background()
    character_viewer.show()
    
    # Position windows
    premium_ui.move(100, 100)
    character_viewer.move(500, 100)
    
    print("🎨 Premium UI System loaded!")
    print("Press SPACE to toggle controls")
    print("Press 1-3 for quick gestures")
    
    sys.exit(app.exec())
