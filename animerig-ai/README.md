<<<<<<< HEAD
# 🎭 AI Character Animation Engine

> **Production-ready AI Character Animation Engine with Real-time Expression Mirroring and Interactive Chat**

## 🌟 **[🚀 LIVE DEMO](https://anime-ai-character-demo.surge.sh)** 🌟
*Experience the full interactive demo with AI character generation, real-time animations, and recording capabilities*

[![Deploy on Replit](https://replit.com/badge/github/YOUR_USERNAME/ai-character-engine)](https://replit.com/@YOUR_USERNAME/ai-character-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)Character Engine

> **Production-ready AI Character Animation Engine with Real-time Expression Mirroring and Interactive Chat**

[![Deploy on Replit](https://replit.com/badge/github/YOUR_USERNAME/ai-character-engine)](https://replit.com/@YOUR_USERNAME/ai-character-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## ✨ Features

### 🎯 Core Features
- **Real-time Character Animation** - 60 FPS GPU-accelerated rendering
- **AI-Powered Conversations** - ChatGPT-like interface with living characters
- **Expression Mirroring** - Camera-based facial expression detection and character sync
- **Emotional Voice Synthesis** - AI voice generation with emotional context
- **Character Generation** - Create animated characters from user images
- **Progressive Web App** - Full PWA support with offline capabilities

### 🚀 Advanced Features
- **Physics Simulation** - Realistic hair and cloth dynamics
- **Multi-view Rendering** - 360° character rotation support
- **Performance Monitoring** - Real-time FPS and memory tracking
- **Voice Input/Output** - Speech-to-text and text-to-speech integration
- **Responsive Design** - Optimized for desktop, tablet, and mobile
- **WebSocket Real-time** - Live synchronization and multiplayer support

## 🎮 Live Demo

🌐 **[Try the Live Demo](https://ai-character-engine.repl.co)**

### UI Showcase States
1. **Main Interface** - Default character interaction view
2. **User Typing** - Character reacting to user input
3. **Voice Input** - Active voice recording with visualization
4. **Emotional States** - Different character emotions (happy, sad, surprised, etc.)
5. **Performance Monitor** - Real-time debugging tools
6. **Settings Panel** - Comprehensive customization options
7. **Character Creator** - AI-powered character generation
8. **Mobile View** - Responsive mobile interface

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/ai-character-engine.git
cd ai-character-engine
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Required API Keys
```env
REACT_APP_OPENAI_API_KEY=your_openai_api_key_here
REACT_APP_GPT_MODEL=gpt-4.1
REACT_APP_IMAGE_MODEL=gpt-image-1
REACT_APP_VOICE_MODEL=gpt-4o-mini-tts
```

### 4. Development
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

### 5. Production Build
```bash
npm run build:production
npm run start:production
```

## 🌐 Replit Deployment

### One-Click Deploy
1. **Fork Repository** on GitHub
2. **Import to Replit** from your GitHub repo
3. **Add Secrets** in Replit's environment
4. **Click Run** - Your app is live!

### Manual Deployment Steps
```bash
# 1. Push to GitHub
git add .
git commit -m "feat: Ready for Replit deployment"
git push origin main

# 2. Import to Replit
# - Go to replit.com
# - Click "Create Repl"
# - Select "Import from GitHub"
# - Enter your repo URL

# 3. Configure Environment
# Add these secrets in Replit:
OPENAI_API_KEY=your_key_here
NODE_ENV=production
PORT=3000

# 4. Deploy
npm run deploy:replit
```

For complete documentation, visit our [GitHub repository](https://github.com/YOUR_USERNAME/ai-character-engine).
=======
# AnimeRig AI - Native Desktop Application

<div align="center">
  <img src="assets/images/start_character.png" alt="AnimeRig AI" width="200"/>
  
  **Real-time Character Animation from Single Images**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
  [![Go 1.21+](https://img.shields.io/badge/go-1.21+-00ADD8.svg)](https://golang.org/dl/)
  [![C++17](https://img.shields.io/badge/C++-17-blue.svg)](https://en.cppreference.com/w/cpp/17)
</div>

## Overview

AnimeRig AI is a powerful native desktop application that brings static character images to life through real-time animation, emotion simulation, and AI-powered conversation. Built with a multi-language architecture combining Python for AI/ML, C++ for high-performance rendering, and Go for backend services.

### Key Features

🎭 **Real-time Character Animation**
- Convert single images into animated 3D characters
- Facial expression control with emotion mapping
- Natural breathing and blinking animations
- Gesture recognition and response

🧠 **AI-Powered Intelligence**
- Character conversation using large language models
- Emotion detection and responsive animations
- Personality adaptation over time
- Voice synthesis integration (planned)

⚡ **High-Performance Rendering**
- C++ OpenGL rendering engine
- Physics simulation for hair and clothing
- 60 FPS real-time animation
- GPU acceleration support

🎨 **Advanced Character Control**
- Detailed finger and hand control
- Facial expression blending
- Custom animation creation
- Physics-based secondary motion

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Python Qt6   │    │   C++ Engine    │    │   Go Backend    │
│   Desktop UI    │◄──►│   Rendering     │◄──►│   API Server    │
│                 │    │   Animation     │    │   WebSockets    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Pipeline   │    │   Physics Sim   │    │   LLM Client    │
│  Image→3D→Rig   │    │  Hair/Clothing  │    │  Conversation   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Go 1.21+**
- **C++ compiler** (GCC 9+ or Clang 10+)
- **CMake 3.16+**
- **Qt6** development libraries
- **OpenGL** support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/animerig-ai.git
   cd animerig-ai
   ```

2. **Run the build script**
   ```bash
   # Install system dependencies (Ubuntu/Debian)
   ./scripts/build.sh --install-system
   
   # Or build without system packages
   ./scripts/build.sh
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (e.g., OpenAI API key)
   ```

4. **Launch the application**
   ```bash
   ./scripts/run.sh
   ```

### Manual Build (Advanced)

<details>
<summary>Click to expand manual build instructions</summary>

#### 1. Setup Python Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 2. Build C++ Engine
```bash
cd engine
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_PYTHON_BINDINGS=ON
make -j$(nproc)
cd ../..
```

#### 3. Build Go Backend
```bash
cd backend
go mod tidy
go build -o bin/animerig-server ./cmd/server
cd ..
```

#### 4. Run Components
```bash
# Start backend
./backend/bin/animerig-server &

# Start frontend
source venv/bin/activate
cd frontend/desktop
python3 main.py
```

</details>

## Usage

### Loading a Character

1. Click **File → Load Character Image**
2. Select an image file (PNG, JPG, etc.)
3. Wait for AI processing to complete
4. Your character is now ready for animation!

### Controlling Emotions

Use the **Controls** tab to adjust:
- **Happiness, Sadness, Anger** - Emotional states
- **Surprise, Fear** - Reactive emotions
- **Custom Animations** - Wave, nod, point, etc.

### Chat Interaction

1. Switch to the **Chat** tab
2. Type messages to your character
3. The AI will respond with appropriate animations and text
4. Emotions and gestures adapt to conversation context

### Advanced Features

- **Physics Controls** - Toggle hair/clothing physics
- **Animation Blending** - Smooth transitions between states
- **Custom Rigging** - Import your own 3D models
- **Performance Tuning** - Adjust FPS and quality settings

## Development

### Project Structure

```
animerig-ai/
├── ai/                     # Python AI/ML pipeline
│   ├── image_to_rig/      # Image→3D conversion
│   ├── animation_synthesis/ # Motion generation
│   └── emotion_engine/     # Emotion processing
├── backend/               # Go server & API
│   ├── cmd/server/        # Main server application
│   └── internal/          # Internal packages
├── engine/                # C++ rendering engine
│   ├── src/               # Source code
│   └── include/           # Header files
├── frontend/              # Python Qt6 desktop UI
│   └── desktop/           # Main application
├── models/                # AI model storage
├── assets/                # Images, icons, etc.
└── scripts/               # Build & run scripts
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Running Tests

```bash
# Python tests
python -m pytest tests/

# Go tests
cd backend && go test ./...

# C++ tests (if enabled)
cd engine/build && make test
```

## Configuration

### Environment Variables

Key settings in `.env`:

- `OPENAI_API_KEY` - For AI conversation features
- `RENDER_WIDTH/HEIGHT` - Output resolution
- `USE_GPU` - Enable GPU acceleration
- `LOG_LEVEL` - Debugging verbosity

### Performance Tuning

- **High-end systems**: Increase `MAX_FPS`, enable all physics
- **Low-end systems**: Reduce resolution, disable complex physics
- **GPU acceleration**: Ensure proper CUDA/OpenCL setup

## Troubleshooting

### Common Issues

**Build fails with missing dependencies**
```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libgl1-mesa-dev libglfw3-dev

# macOS
brew install cmake glfw glew eigen assimp

# Windows
# Use vcpkg or install manually
```

**Python modules not found**
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**OpenGL errors**
```bash
# Check GPU drivers are installed
glxinfo | grep "direct rendering"

# For headless systems, use software rendering
export LIBGL_ALWAYS_SOFTWARE=1
```

**Performance issues**
- Reduce render resolution in settings
- Disable physics simulation
- Check GPU utilization with `nvidia-smi`

### Getting Help

- 📖 Check the [Documentation](docs/)
- 🐛 Report bugs in [Issues](https://github.com/yourusername/animerig-ai/issues)
- 💬 Join our [Discord](https://discord.gg/animerig) community
- 📧 Email support: support@animerig.ai

## Roadmap

### Version 1.1 (Q3 2024)
- [ ] Voice synthesis integration
- [ ] Real-time lip sync
- [ ] Custom model import
- [ ] Animation timeline editor

### Version 1.2 (Q4 2024)
- [ ] Multi-character scenes
- [ ] VRM format support
- [ ] Live streaming integration
- [ ] Mobile companion app

### Version 2.0 (2025)
- [ ] VR/AR support
- [ ] Real-time ray tracing
- [ ] Advanced AI personalities
- [ ] Cloud model hosting

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **MediaPipe** - Pose detection and face analysis
- **OpenAI** - Language model integration
- **Qt6** - Cross-platform GUI framework
- **OpenGL** - 3D graphics rendering
- **Eigen** - Linear algebra library
- **Assimp** - 3D model loading

---

<div align="center">
  <strong>Made with ❤️ by the AnimeRig AI team</strong>
  
  [Website](https://animerig.ai) • [Documentation](docs/) • [Discord](https://discord.gg/animerig)
</div>
>>>>>>> eb1edbf (m)
