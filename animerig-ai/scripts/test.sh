#!/bin/bash
# AnimeRig AI - Integration Test Script
# Tests all components of the native desktop application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test Python environment
test_python_environment() {
    print_test "Testing Python environment..."
    
    if [ ! -d "venv" ]; then
        print_fail "Virtual environment not found"
        return 1
    fi
    
    source venv/bin/activate
    
    # Test imports
    python3 -c "
import sys
import PyQt6
import numpy
import cv2
import mediapipe
print('All Python dependencies imported successfully')
" 2>/dev/null && print_pass "Python dependencies" || print_fail "Python dependencies"
    
    # Test AI modules
    python3 -c "
sys.path.append('ai')
from image_to_rig.character_processor import CharacterProcessor
from animation_synthesis.motion_generator import MotionGenerator
print('AI modules imported successfully')
" 2>/dev/null && print_pass "AI modules" || print_fail "AI modules"
}

# Test C++ engine build
test_cpp_engine() {
    print_test "Testing C++ engine..."
    
    if [ ! -f "engine/build/libanimerig_engine.so" ]; then
        print_fail "C++ engine library not found"
        return 1
    fi
    
    print_pass "C++ engine library exists"
    
    # Test if library can be loaded
    python3 -c "
import sys
import os
sys.path.append('engine/build')
os.environ['LD_LIBRARY_PATH'] = 'engine/build:' + os.environ.get('LD_LIBRARY_PATH', '')
try:
    import animerig_py
    print('C++ Python bindings loaded successfully')
except ImportError as e:
    print(f'Failed to load bindings: {e}')
    sys.exit(1)
" 2>/dev/null && print_pass "C++ Python bindings" || print_fail "C++ Python bindings"
}

# Test Go backend
test_go_backend() {
    print_test "Testing Go backend..."
    
    if [ ! -f "backend/bin/animerig-server" ]; then
        print_fail "Go backend binary not found"
        return 1
    fi
    
    print_pass "Go backend binary exists"
    
    # Test if binary runs
    cd backend
    timeout 5s ./bin/animerig-server &
    SERVER_PID=$!
    sleep 2
    
    if kill -0 $SERVER_PID 2>/dev/null; then
        print_pass "Go backend starts successfully"
        kill $SERVER_PID
    else
        print_fail "Go backend failed to start"
    fi
    
    cd "$PROJECT_ROOT"
}

# Test file structure
test_file_structure() {
    print_test "Testing file structure..."
    
    local required_files=(
        "requirements.txt"
        "frontend/desktop/main.py"
        "engine/CMakeLists.txt"
        "backend/go.mod"
        "scripts/build.sh"
        "scripts/run.sh"
        ".env.example"
        "assets/images/start_character.png"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -eq 0 ]; then
        print_pass "All required files present"
    else
        print_fail "Missing files: ${missing_files[*]}"
    fi
}

# Test configuration
test_configuration() {
    print_test "Testing configuration..."
    
    if [ ! -f ".env.example" ]; then
        print_fail "Example configuration not found"
        return 1
    fi
    
    # Check if .env exists
    if [ -f ".env" ]; then
        print_pass "Environment configuration exists"
    else
        print_warning "No .env file found (using defaults)"
    fi
    
    # Test configuration parsing
    source venv/bin/activate
    python3 -c "
import os
from pathlib import Path

# Test environment loading
if Path('.env').exists():
    from dotenv import load_dotenv
    load_dotenv()
    print('Environment configuration loaded')
else:
    print('Using default configuration')
" 2>/dev/null && print_pass "Configuration parsing" || print_fail "Configuration parsing"
}

# Test AI pipeline
test_ai_pipeline() {
    print_test "Testing AI pipeline..."
    
    source venv/bin/activate
    
    # Test character processor
    python3 -c "
from ai.image_to_rig.character_processor import CharacterProcessor
processor = CharacterProcessor()
print('CharacterProcessor initialized')
" 2>/dev/null && print_pass "Character processor" || print_fail "Character processor"
    
    # Test motion generator
    python3 -c "
from ai.animation_synthesis.motion_generator import MotionGenerator
generator = MotionGenerator()
print('MotionGenerator initialized')
" 2>/dev/null && print_pass "Motion generator" || print_fail "Motion generator"
}

# Test desktop UI
test_desktop_ui() {
    print_test "Testing desktop UI..."
    
    source venv/bin/activate
    
    # Test UI components without showing window
    python3 -c "
import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import Qt

# Create minimal application
app = QApplication([])
app.setAttribute(Qt.ApplicationAttribute.AA_UseOpenGLES, False)

# Import UI components
sys.path.append('frontend/desktop')
from main import MainWindow, CharacterViewport, ChatWidget, ControlPanel

print('UI components imported successfully')
app.quit()
" 2>/dev/null && print_pass "Desktop UI components" || print_fail "Desktop UI components"
}

# Test integration
test_integration() {
    print_test "Testing integration..."
    
    # Test if all components can work together
    source venv/bin/activate
    
    # Start backend in background
    cd backend
    ./bin/animerig-server &
    SERVER_PID=$!
    sleep 2
    cd "$PROJECT_ROOT"
    
    # Test API connectivity
    python3 -c "
import requests
import time

try:
    response = requests.get('http://localhost:8080/health', timeout=5)
    if response.status_code == 200:
        print('Backend API accessible')
    else:
        print(f'Backend returned status {response.status_code}')
        exit(1)
except Exception as e:
    print(f'Failed to connect to backend: {e}')
    exit(1)
" 2>/dev/null && print_pass "Backend API connectivity" || print_fail "Backend API connectivity"
    
    # Cleanup
    if kill -0 $SERVER_PID 2>/dev/null; then
        kill $SERVER_PID
    fi
}

# Performance test
test_performance() {
    print_test "Testing performance..."
    
    source venv/bin/activate
    
    # Test AI processing speed
    python3 -c "
import time
import numpy as np
from ai.animation_synthesis.motion_generator import MotionGenerator

generator = MotionGenerator()
start_time = time.time()

# Generate test animation
for i in range(10):
    generator.generate_emotion_animation('happy', 0.8)

end_time = time.time()
avg_time = (end_time - start_time) / 10

print(f'Average animation generation time: {avg_time:.3f}s')
if avg_time < 0.1:
    print('Performance: Good')
elif avg_time < 0.5:
    print('Performance: Acceptable')
else:
    print('Performance: Slow')
" 2>/dev/null && print_pass "AI performance" || print_fail "AI performance"
}

# Main test function
main() {
    echo -e "${BLUE}AnimeRig AI - Integration Tests${NC}"
    echo -e "${BLUE}==============================${NC}"
    
    # Run all tests
    test_file_structure
    test_configuration
    test_python_environment
    test_cpp_engine
    test_go_backend
    test_ai_pipeline
    test_desktop_ui
    test_integration
    test_performance
    
    # Print results
    echo ""
    echo -e "${BLUE}Test Results:${NC}"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed! ✅${NC}"
        echo -e "${GREEN}AnimeRig AI is ready to run.${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed! ❌${NC}"
        echo -e "${YELLOW}Please check the failed components before running.${NC}"
        exit 1
    fi
}

# Run tests
main "$@"
