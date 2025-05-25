#!/usr/bin/env python3
"""
GUI 디버깅 스크립트 - 캐릭터 렌더링 문제 진단
"""

import os
import sys

# 프로젝트 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'animerig-ai'))

def test_character_data():
    """캐릭터 데이터 생성 테스트"""
    print("🔍 Testing character data generation...")
    
    try:
        from ai.image_to_rig.character_processor import CharacterProcessor
        
        # CharacterProcessor 초기화
        processor = CharacterProcessor()
        print("  ✅ CharacterProcessor initialized")
        
        # 기본 캐릭터 이미지 경로
        image_path = "C:\\ANIMEAI\\public\\images\\start_character.png"
        
        if not os.path.exists(image_path):
            print(f"  ❌ Image not found: {image_path}")
            return None
        
        print(f"  📸 Processing: {image_path}")
        
        # 특징 추출
        features = processor.extract_features(image_path)
        print(f"  ✅ Features extracted: {len(features)} categories")
        print(f"      Features: {list(features.keys())}")
        
        # 3D 모델 생성
        model_3d = processor.generate_3d_model(features)
        print(f"  ✅ 3D model generated")
        print(f"      Vertices: {len(model_3d.get('vertices', []))}")
        print(f"      Faces: {len(model_3d.get('faces', []))}")
        print(f"      Materials: {list(model_3d.get('materials', {}).keys())}")
        
        # 애니메이션 리그 생성
        rig = processor.create_animation_rig(model_3d)
        print(f"  ✅ Animation rig created")
        print(f"      Bones: {len(rig.get('bones', []))}")
        
        # 캐릭터 데이터 구조 생성
        character_data = {
            'features': features,
            'model_3d': model_3d,
            'rig': rig,
            'image_path': image_path
        }
        
        print("  🎉 Character data ready for rendering!")
        return character_data
        
    except Exception as e:
        print(f"  ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_opengl_rendering():
    """OpenGL 렌더링 가능성 테스트"""
    print("\n🎨 Testing OpenGL rendering capabilities...")
    
    try:
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtOpenGLWidgets import QOpenGLWidget
        from PyQt6.QtCore import Qt
        
        # 최소한의 앱 생성
        app = QApplication([])
        
        # OpenGL 위젯 생성 테스트
        widget = QOpenGLWidget()
        print("  ✅ QOpenGLWidget created successfully")
        
        # OpenGL 컨텍스트 확인
        widget.show()
        widget.makeCurrent()
        
        # OpenGL 가져오기 테스트
        try:
            import OpenGL.GL as GL
            print("  ✅ OpenGL imported successfully")
            
            # 기본 OpenGL 정보
            vendor = GL.glGetString(GL.GL_VENDOR)
            renderer = GL.glGetString(GL.GL_RENDERER)
            version = GL.glGetString(GL.GL_VERSION)
            
            print(f"      Vendor: {vendor}")
            print(f"      Renderer: {renderer}")
            print(f"      Version: {version}")
            
        except Exception as e:
            print(f"  ❌ OpenGL import failed: {e}")
            return False
        
        widget.hide()
        app.quit()
        return True
        
    except Exception as e:
        print(f"  ❌ OpenGL test failed: {e}")
        return False

def main():
    """메인 진단 함수"""
    print("🔧 AnimeRig AI GUI Debug")
    print("=" * 40)
    
    # 1. 캐릭터 데이터 생성 테스트
    character_data = test_character_data()
    
    # 2. OpenGL 렌더링 테스트
    opengl_ok = test_opengl_rendering()
    
    print("\n📋 Diagnosis Summary:")
    print("=" * 40)
    
    if character_data:
        print("✅ Character data generation: OK")
        print(f"   - Vertices: {len(character_data['model_3d'].get('vertices', []))}")
        print(f"   - Faces: {len(character_data['model_3d'].get('faces', []))}")
    else:
        print("❌ Character data generation: FAILED")
    
    if opengl_ok:
        print("✅ OpenGL rendering: OK")
    else:
        print("❌ OpenGL rendering: FAILED")
    
    if character_data and opengl_ok:
        print("\n🎉 GUI should be able to render character!")
        print("   If you still see blank screen, the issue might be:")
        print("   - Character data not being passed to viewport")
        print("   - Rendering logic error in paintGL")
        print("   - Camera positioning issue")
    else:
        print("\n⚠️  Issues detected that prevent character rendering")

if __name__ == "__main__":
    main()
