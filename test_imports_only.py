#!/usr/bin/env python3
"""
Simple import test for professional animator
"""

import sys
import os

# Add animerig-ai to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_imports():
    """Test just the imports"""
    print("Testing imports...")
    
    try:
        from ai.animation.skeletal_system import SkeletalAnimationSystem
        print("✅ SkeletalAnimationSystem imported")
        
        from ai.animation.multi_angle_system import MultiAngleRenderer
        print("✅ MultiAngleRenderer imported")
        
        from ai.animation.facial_animation import AdvancedFacialAnimator
        print("✅ AdvancedFacialAnimator imported")
        
        from ai.animation.professional_animator import ProfessionalAnimator
        print("✅ ProfessionalAnimator imported")
        
        print("🎉 All imports successful!")
        return True
        
    except Exception as e:
        print(f"❌ Import error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
