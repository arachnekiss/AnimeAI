@echo off
echo 🎭 AnimeRig AI Desktop Application Launcher
echo ==========================================
echo.

cd /d "c:\ANIMEAI\animerig-ai"

echo 📦 Installing core dependencies (this may take a few minutes)...
py -m pip install --upgrade pip --user

echo 📦 Installing PyQt6 and GUI dependencies...
py -m pip install PyQt6>=6.6.0 --user
py -m pip install PyOpenGL>=3.1.7 --user
py -m pip install python-dotenv>=1.0.0 --user

echo 📦 Installing AI/ML dependencies...
py -m pip install torch torchvision --user
py -m pip install opencv-python>=4.8.0 --user
py -m pip install mediapipe>=0.10.13 --user
py -m pip install numpy>=1.24.0 --user
py -m pip install Pillow>=10.0.0 --user
py -m pip install transformers>=4.35.0 --user
py -m pip install timm einops --user

echo 📦 Installing additional dependencies...
py -m pip install scipy imageio scikit-image --user
py -m pip install requests pyyaml aiohttp websockets --user

echo.
echo ✅ Dependencies installation completed!
echo.
echo 🚀 Starting AnimeRig AI GUI...
echo.

set PYTHONPATH=%CD%
py frontend/desktop/main.py

echo.
if errorlevel 1 (
    echo ❌ Application failed to start. Check the error messages above.
    echo.
    echo 🔧 Troubleshooting tips:
    echo - Make sure Python 3.8+ is installed and on PATH.
    echo - If torch installation fails, try: pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    echo.
) else (
    echo ✅ Application closed normally.
)

pause
