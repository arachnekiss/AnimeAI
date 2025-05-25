import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

import cv2
import numpy as np
from ai.animation.live2d_animator import Live2DAnimator

def test_animation_system():
    print("🧪 Testing AnimeRig AI Animation System...")
    animator = Live2DAnimator()
    test_image = cv2.imread("public/images/start_character.png")
    
    if test_image is not None:
        print("✅ Test image loaded successfully")
        mesh = animator.create_animation_mesh(test_image)
        print("✅ Mesh creation successful")
        print(f"   - Face points: {len(mesh['regions']['face']['points'])}")
        print(f"   - Hair strands: {len(mesh['regions']['hair'])}")
    else:
        print("❌ Test image not found - creating dummy mesh for testing")
        # Create a dummy test image
        test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        mesh = animator.create_animation_mesh(test_image)
        print("✅ Mesh creation successful with dummy image")
    
    test_params = {
        'emotion': {'happy': 0.8, 'neutral': 0.2},
        'blink': 0.5,
        'mouth_open': 0.3
    }
    animated = animator.apply_animation(mesh, test_params)
    print("✅ Animation application successful")
    print("\n🎉 All tests passed!")

if __name__ == '__main__':
    test_animation_system()
