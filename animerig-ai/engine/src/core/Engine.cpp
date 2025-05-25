#include "core/Engine.h"
#include <iostream>

namespace AnimeRig {
namespace Core {

Engine::Engine() : m_running(false) {
    std::cout << "Engine created" << std::endl;
}

Engine::~Engine() {
    shutdown();
}

bool Engine::initialize() {
    std::cout << "Engine::initialize() called" << std::endl;
    return true;
}

void Engine::run() {
    m_running = true;
    std::cout << "Engine started running" << std::endl;
    
    while (m_running) {
        update();
        render();
        // Simple loop break for now
        break;
    }
}

void Engine::shutdown() {
    if (m_running) {
        m_running = false;
        std::cout << "Engine shutdown" << std::endl;
    }
}

void Engine::update() {
    // TODO: Update game logic
}

void Engine::render() {
    // TODO: Render frame
}

} // namespace Core
} // namespace AnimeRig
