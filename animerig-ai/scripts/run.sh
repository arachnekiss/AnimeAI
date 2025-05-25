#!/bin/bash
# AnimeRig AI - Application Launcher
# Starts all components of the native desktop application

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if built
check_build() {
    print_status "Checking build status..."
    
    if [ ! -f "engine/build/libanimerig_engine.so" ]; then
        print_error "C++ engine not built. Run ./scripts/build.sh first"
        exit 1
    fi
    
    if [ ! -f "backend/bin/animerig-server" ]; then
        print_error "Go backend not built. Run ./scripts/build.sh first"
        exit 1
    fi
    
    if [ ! -d "venv" ]; then
        print_error "Python environment not setup. Run ./scripts/build.sh first"
        exit 1
    fi
    
    print_status "Build check passed"
}

# Start Go backend server
start_backend() {
    print_status "Starting Go backend server..."
    
    cd backend
    ./bin/animerig-server &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd "$PROJECT_ROOT"
    
    # Wait for server to start
    sleep 2
    
    if kill -0 $BACKEND_PID 2>/dev/null; then
        print_status "Backend server started (PID: $BACKEND_PID)"
    else
        print_error "Failed to start backend server"
        exit 1
    fi
}

# Start Python desktop application
start_desktop_app() {
    print_status "Starting Python desktop application..."
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Add engine to Python path
    export PYTHONPATH="$PROJECT_ROOT/engine/build:$PYTHONPATH"
    export LD_LIBRARY_PATH="$PROJECT_ROOT/engine/build:$LD_LIBRARY_PATH"
    
    # Start Qt application
    cd frontend/desktop
    python3 main.py
}

# Cleanup function
cleanup() {
    print_status "Shutting down AnimeRig AI..."
    
    # Kill backend server
    if [ -f "backend.pid" ]; then
        BACKEND_PID=$(cat backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_status "Backend server stopped"
        fi
        rm -f backend.pid
    fi
    
    print_status "Cleanup complete"
    exit 0
}

# Setup signal handlers
trap cleanup SIGINT SIGTERM

# Main function
main() {
    local dev_mode=false
    local backend_only=false
    local frontend_only=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev)
                dev_mode=true
                shift
                ;;
            --backend-only)
                backend_only=true
                shift
                ;;
            --frontend-only)
                frontend_only=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --dev           Run in development mode with verbose logging"
                echo "  --backend-only  Start only the backend server"
                echo "  --frontend-only Start only the frontend application"
                echo "  -h, --help      Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set environment variables
    if [ "$dev_mode" = true ]; then
        export ANIMERIG_LOG_LEVEL=DEBUG
        export ANIMERIG_DEV_MODE=true
        print_status "Running in development mode"
    fi
    
    echo -e "${BLUE}AnimeRig AI - Character Animation Studio${NC}"
    echo -e "${BLUE}=======================================${NC}"
    
    # Check build status
    check_build
    
    # Start components
    if [ "$frontend_only" = false ]; then
        start_backend
    fi
    
    if [ "$backend_only" = false ]; then
        start_desktop_app
    else
        print_status "Backend running. Press Ctrl+C to stop."
        wait
    fi
}

# Run main function
main "$@"
