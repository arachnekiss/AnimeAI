#include "physics/PhysicsEngine.h"
#include <iostream>

namespace AnimeRig {
namespace Physics {

PhysicsEngine::PhysicsEngine() : m_running(false) {
    std::cout << "PhysicsEngine created" << std::endl;
}

PhysicsEngine::~PhysicsEngine() {
    stop();
}

bool PhysicsEngine::initialize() {
    std::cout << "PhysicsEngine initialized" << std::endl;
    return true;
}

void PhysicsEngine::start() {
    m_running = true;
    std::cout << "PhysicsEngine started" << std::endl;
}

void PhysicsEngine::stop() {
    if (m_running) {
        m_running = false;
        std::cout << "PhysicsEngine stopped" << std::endl;
    }
}

void PhysicsEngine::update(float deltaTime) {
    if (!m_running) return;
    // TODO: Update physics simulation
}

} // namespace Physics
} // namespace AnimeRig
