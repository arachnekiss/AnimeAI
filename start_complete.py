import sys
import os
os.environ["CUDA_VISIBLE_DEVICES"] = ""  # CPU 전용

from PyQt6.QtWidgets import QApplication
import importlib.util

# sys.path에 animerig-ai와 animerig-ai/ai를 추가
base_dir = os.path.join(os.path.dirname(__file__), 'animerig-ai')
sys.path.insert(0, base_dir)
sys.path.insert(0, os.path.join(base_dir, 'ai'))

main_path = os.path.join(base_dir, 'frontend', 'desktop', 'main.py')
spec = importlib.util.spec_from_file_location('main', main_path)
main = importlib.util.module_from_spec(spec)
spec.loader.exec_module(main)

def main_entry():
    app = QApplication(sys.argv)
    app.setStyleSheet("""
        QMainWindow { background-color: #1a1a1a; }
        QWidget { background-color: #2a2a2a; color: #ffffff; }
        QPushButton { background-color: #3a3a3a; border: 1px solid #555; padding: 5px; border-radius: 3px; }
        QPushButton:hover { background-color: #4a4a4a; }
        QSlider::groove:horizontal { background: #555; height: 6px; }
        QSlider::handle:horizontal { background: #888; width: 16px; margin: -5px 0; border-radius: 8px; }
    """)
    window = main.MainWindow()
    window.setWindowTitle("AnimeRig AI - Live Character Animation")
    window.resize(1280, 800)
    default_char = os.path.join(base_dir, 'assets', 'images', 'start_character.png')
    if os.path.exists(default_char):
        window.load_character(default_char)
    else:
        print(f"⚠️ {default_char} not found! Please add the character image.")
    window.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main_entry()
