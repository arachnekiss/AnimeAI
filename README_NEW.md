# 🎭 AnimeRig AI - Desktop Character Animation System

> **Native Desktop Application for Real-time AI Character Animation and Interaction**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org/)
[![Qt](https://img.shields.io/badge/Qt-6.0+-green.svg)](https://qt.io/)
[![C++](https://img.shields.io/badge/C++-17-red.svg)](https://isocpp.org/)
[![Go](https://img.shields.io/badge/Go-1.23+-cyan.svg)](https://golang.org/)

## 🌟 Overview

AnimeRig AI는 단일 이미지에서 실시간 캐릭터 애니메이션을 생성하는 네이티브 데스크톱 애플리케이션입니다. Python Qt6 인터페이스, C++ 렌더링 엔진, Go 백엔드 서비스를 결합하여 고성능 AI 기반 캐릭터 애니메이션 시스템을 제공합니다.

## ✨ 주요 기능

- 🖼️ **Single Image to Rig**: 단일 이미지에서 자동 캐릭터 리깅
- 🎭 **Real-time Animation**: 실시간 표정 및 제스처 애니메이션
- 🗣️ **AI Chat Integration**: LLM 기반 지능형 캐릭터 대화
- 🎨 **3D Rendering**: OpenGL 기반 고성능 3D 렌더링
- 🎵 **Voice Synthesis**: 감정 기반 음성 합성
- 📹 **Export Capabilities**: 애니메이션 녹화 및 내보내기

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   C++ Engine    │    │   Go Backend    │
│   (Python Qt6) │◄──►│   (OpenGL)      │◄──►│   (WebSocket)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐            ┌─────▼─────┐         ┌───────▼───────┐
    │ Desktop │            │ 3D Render │         │ LLM Service   │
    │   UI    │            │  Engine   │         │ & AI Models   │
    └─────────┘            └───────────┘         └───────────────┘
```

## 🛠️ 기술 스택

- **Frontend**: Python 3.8+, PyQt6, OpenCV, MediaPipe
- **Engine**: C++17, OpenGL, GLFW, Eigen3, Assimp
- **Backend**: Go 1.23+, Gin, WebSocket, AI/LLM APIs
- **AI/ML**: TensorFlow, PyTorch, Hugging Face Transformers

## 🚀 빠른 시작

### 1. 시스템 요구사항

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y \
    python3 python3-pip python3-venv \
    build-essential cmake \
    libgl1-mesa-dev libglu1-mesa-dev \
    libglfw3-dev libglew-dev \
    libeigen3-dev libassimp-dev \
    qt6-base-dev \
    golang-go

# macOS (Homebrew)
brew install python qt cmake eigen glfw glew assimp go

# Windows (see detailed instructions in docs/)
```

### 2. 설치 및 빌드

```bash
# 저장소 클론
git clone https://github.com/your-username/AnimeAI.git
cd AnimeAI/animerig-ai

# 환경 설정 복사
cp .env.example .env
# .env 파일을 편집하여 API 키 등을 설정

# 전체 빌드 (자동 의존성 설치 포함)
./scripts/build.sh

# 애플리케이션 실행
./scripts/run.sh
```

### 3. 개발 모드 실행

```bash
# Python 가상환경 활성화
source venv/bin/activate

# 각 컴포넌트 개별 실행
# 1. Go 백엔드 서버
cd backend && go run cmd/server/main.go &

# 2. Python 데스크톱 앱
cd frontend/desktop && python main.py
```

## 📁 프로젝트 구조

```
animerig-ai/
├── ai/                    # AI/ML 모델 및 파이프라인
│   ├── emotion_engine/    # 감정 분석 엔진
│   ├── image_to_rig/      # 이미지-리그 변환
│   ├── animation_synthesis/ # 애니메이션 생성
│   └── voice_synthesis/   # 음성 합성
├── backend/               # Go 백엔드 서비스
│   ├── cmd/server/        # 메인 서버
│   └── internal/          # 내부 패키지들
├── engine/                # C++ 렌더링 엔진
│   ├── src/               # C++ 소스코드
│   ├── include/           # 헤더 파일
│   └── python_bindings/   # Python 바인딩
├── frontend/              # Python Qt6 데스크톱 앱
│   └── desktop/           # 메인 데스크톱 인터페이스
├── models/                # 사전 훈련된 AI 모델
├── scripts/               # 빌드 및 실행 스크립트
└── docs/                  # 문서
```

## 🔧 환경 설정

`.env` 파일 설정:

```env
# AI 서비스 API 키
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_TOKEN=your_hf_token

# 서버 설정
GO_SERVER_PORT=8080
WEBSOCKET_PORT=8081

# 모델 경로
MODELS_PATH=./models
ASSETS_PATH=./assets

# 렌더링 설정
RENDER_WIDTH=1920
RENDER_HEIGHT=1080
FPS=60
```

## 🎮 사용법

1. **애플리케이션 시작**: `./scripts/run.sh` 실행
2. **캐릭터 로드**: 이미지 파일을 업로드하여 자동 리깅
3. **실시간 채팅**: AI 캐릭터와 대화하며 반응 확인
4. **애니메이션 제어**: 수동 제스처 및 표정 조정
5. **녹화 및 내보내기**: 애니메이션을 비디오로 저장

## 🧪 테스트

```bash
# 전체 시스템 테스트
./scripts/test.sh

# 개별 컴포넌트 테스트
cd backend && go test ./...
cd frontend && python -m pytest
cd engine && make test
```

## 📖 문서

- [AI Character Engine Guide](docs/AI_CHARACTER_ENGINE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Documentation](docs/API.md)
- [Development Guide](docs/DEVELOPMENT.md)

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- OpenAI GPT 모델
- MediaPipe Face Detection
- Qt Framework
- OpenGL Community
- Go Community

## 📞 지원

- 🐛 Issues: [GitHub Issues](https://github.com/your-username/AnimeAI/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/AnimeAI/discussions)
- 📧 Email: support@animerig-ai.com

---

**Made with ❤️ for the AI Animation Community**
