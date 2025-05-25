#!/bin/bash
# AnimeRig AI - Complete Build Script
# Builds all components of the native desktop application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}AnimeRig AI - Build Script${NC}"
echo -e "${BLUE}===========================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_status "Checking system dependencies..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        print_error "Go is required but not installed"
        exit 1
    fi
    
    # Check CMake
    if ! command -v cmake &> /dev/null; then
        print_error "CMake is required but not installed"
        exit 1
    fi
    
    # Check C++ compiler
    if ! command -v g++ &> /dev/null && ! command -v clang++ &> /dev/null; then
        print_error "C++ compiler (g++ or clang++) is required but not installed"
        exit 1
    fi
    
    print_status "All dependencies found"
}

# Install system packages (Ubuntu/Debian)
install_system_packages() {
    print_status "Installing system packages..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y \
            build-essential \
            cmake \
            pkg-config \
            libgl1-mesa-dev \
            libglfw3-dev \
            libglew-dev \
            libeigen3-dev \
            libassimp-dev \
            python3-dev \
            python3-pip \
            python3-venv \
            qt6-base-dev \
            qt6-tools-dev \
            libqt6opengl6-dev
    else
        print_warning "Package manager not supported. Please install dependencies manually."
    fi
}

# Setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python environment..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    print_status "Python environment ready"
}

# Build C++ engine
build_cpp_engine() {
    print_status "Building C++ engine..."
    
    cd engine
    
    # Create build directory
    if [ -d "build" ]; then
        rm -rf build
    fi
    mkdir build
    cd build
    
    # Configure with CMake
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_PYTHON_BINDINGS=ON \
        -DBUILD_TESTS=OFF
    
    # Build
    make -j$(nproc)
    
    # Install Python bindings
    cd ..
    python3 -m pip install pybind11
    
    print_status "C++ engine built successfully"
    cd "$PROJECT_ROOT"
}

# Build Go backend
build_go_backend() {
    print_status "Building Go backend..."
    
    cd backend
    
    # Download dependencies
    go mod tidy
    go mod download
    
    # Build server
    go build -o bin/animerig-server ./cmd/server
    
    print_status "Go backend built successfully"
    cd "$PROJECT_ROOT"
}

# Download AI models
download_models() {
    print_status "Downloading AI models..."
    
    mkdir -p models/depth_estimation
    mkdir -p models/pose_detection
    mkdir -p models/view_synthesis
    
    # MediaPipe models (will be downloaded automatically)
    python3 -c "
import mediapipe as mp
print('MediaPipe models will be downloaded on first use')
"
    
    print_status "Model setup complete"
}

# Create desktop entry (Linux)
create_desktop_entry() {
    print_status "Creating desktop entry..."
    
    cat > ~/.local/share/applications/animerig-ai.desktop << EOF
[Desktop Entry]
Name=AnimeRig AI
Comment=Real-time character animation from single images
Exec=$PROJECT_ROOT/scripts/run.sh
Icon=$PROJECT_ROOT/assets/icons/app_icon.png
Terminal=false
Type=Application
Categories=Graphics;3DGraphics;
EOF
    
    print_status "Desktop entry created"
}

# Main build function
main() {
    local install_system=false
    local skip_deps=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --install-system)
                install_system=true
                shift
                ;;
            --skip-deps)
                skip_deps=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --install-system  Install system packages (requires sudo)"
                echo "  --skip-deps      Skip dependency checking"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Install system packages if requested
    if [ "$install_system" = true ]; then
        install_system_packages
    fi
    
    # Check dependencies
    if [ "$skip_deps" = false ]; then
        check_dependencies
    fi
    
    # Setup Python environment
    setup_python_env
    
    # Download models
    download_models
    
    # Build components
    build_cpp_engine
    build_go_backend
    
    # Create desktop entry
    create_desktop_entry
    
    print_status "Build completed successfully!"
    echo -e "${GREEN}You can now run AnimeRig AI with: ./scripts/run.sh${NC}"
}

# Run main function
main "$@"
