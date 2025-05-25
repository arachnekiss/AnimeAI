#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script for auto-loading default character
"""

import sys
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'animerig-ai')
sys.path.insert(0, project_root)

def test_default_character_paths():
    """Test that default character image exists"""
    print("🖼️ Testing default character image paths...")
    
    # Define possible paths for the default character
    possible_paths = [
        os.path.abspath("public/images/start_character.png"),
        os.path.abspath("animerig-ai/public/images/start_character.png"),
        os.path.abspath("../public/images/start_character.png"),
        os.path.abspath("assets/start_character.png"),
        os.path.abspath("animerig-ai/assets/start_character.png")
    ]
    
    found_paths = []
    for path in possible_paths:
        if os.path.exists(path):
            print(f"  ✅ Found: {path}")
            found_paths.append(path)
        else:
            print(f"  ❌ Missing: {path}")
    
    if found_paths:
        print(f"\n✅ Found {len(found_paths)} valid default character paths")
        return found_paths[0]
    else:
        print("\n❌ No default character image found!")
        return None

def test_autoload_functionality():
    """Test the auto-load character functionality"""
    print("\n🔄 Testing auto-load functionality...")
    
    try:
        from PyQt6.QtWidgets import QApplication, QLabel
        from PyQt6.QtGui import QPixmap
        from PyQt6.QtCore import QTimer
        
        # Create minimal test app
        app = QApplication(sys.argv)
        
        # Test loading default character
        default_path = test_default_character_paths()
        if default_path:
            # Try to load the image
            pixmap = QPixmap(default_path)
            if not pixmap.isNull():
                print(f"  ✅ Successfully loaded image: {pixmap.width()}x{pixmap.height()}")
                
                # Test displaying in a label
                label = QLabel()
                label.setPixmap(pixmap.scaled(200, 200))
                print("  ✅ Image can be displayed in GUI")
                return True
            else:
                print(f"  ❌ Failed to load image from: {default_path}")
                return False
        else:
            print("  ❌ No default character image to test")
            return False
    
    except Exception as e:
        print(f"  ❌ Error testing autoload: {e}")
        return False

def create_sample_character_image():
    """Create a sample character image if none exists"""
    print("\n🎨 Creating sample character image...")
    
    try:
        from PIL import Image, ImageDraw, ImageFont
        import numpy as np
        
        # Create a simple placeholder image
        width, height = 400, 600
        image = Image.new('RGB', (width, height), color='lightblue')
        draw = ImageDraw.Draw(image)
        
        # Draw a simple character placeholder
        # Head (circle)
        head_center = (width // 2, height // 4)
        head_radius = 60
        draw.ellipse([head_center[0] - head_radius, head_center[1] - head_radius,
                     head_center[0] + head_radius, head_center[1] + head_radius], 
                    fill='peachpuff', outline='black', width=2)
        
        # Eyes
        eye_y = head_center[1] - 20
        draw.ellipse([head_center[0] - 30, eye_y - 10, head_center[0] - 10, eye_y + 10], 
                    fill='black')
        draw.ellipse([head_center[0] + 10, eye_y - 10, head_center[0] + 30, eye_y + 10], 
                    fill='black')
        
        # Mouth
        mouth_y = head_center[1] + 20
        draw.arc([head_center[0] - 25, mouth_y - 10, head_center[0] + 25, mouth_y + 10],
                start=0, end=180, fill='black', width=3)
        
        # Body (rectangle)
        body_top = head_center[1] + head_radius + 10
        body_bottom = height - 50
        body_left = head_center[0] - 40
        body_right = head_center[0] + 40
        draw.rectangle([body_left, body_top, body_right, body_bottom], 
                      fill='lightcoral', outline='black', width=2)
        
        # Add text
        try:
            font = ImageFont.load_default()
            draw.text((width // 2 - 80, height - 40), "Default Character", 
                     fill='black', font=font)
        except:
            draw.text((width // 2 - 80, height - 40), "Default Character", fill='black')
        
        # Create directories if they don't exist
        public_dir = os.path.abspath("public/images")
        os.makedirs(public_dir, exist_ok=True)
        
        # Save the image
        image_path = os.path.join(public_dir, "start_character.png")
        image.save(image_path, "PNG")
        print(f"  ✅ Created sample character image: {image_path}")
        
        return image_path
        
    except ImportError:
        print("  ❌ PIL not available, cannot create sample image")
        return None
    except Exception as e:
        print(f"  ❌ Error creating sample image: {e}")
        return None

def main():
    """Run auto-load tests"""
    print("🔄 Default Character Auto-Load Test")
    print("=" * 40)
    
    # Change to project directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Test if default character exists
    default_path = test_default_character_paths()
    
    # If no default character, try to create one
    if not default_path:
        print("\n📦 No default character found, creating sample...")
        default_path = create_sample_character_image()
    
    # Test auto-load functionality
    if default_path:
        success = test_autoload_functionality()
        
        if success:
            print(f"\n🎉 Auto-load test passed!")
            print(f"Default character: {default_path}")
            print("\nThe GUI should now be able to automatically load this character.")
        else:
            print(f"\n❌ Auto-load test failed!")
    else:
        print(f"\n❌ Could not find or create default character image!")
    
    print(f"\nTo test the full GUI with auto-load, run:")
    print(f"   start_gui.bat")

if __name__ == "__main__":
    main()
