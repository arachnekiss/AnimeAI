#include "animation/AnimationSystem.h"
#include <iostream>

namespace AnimeRig {
namespace Animation {

AnimationSystem::AnimationSystem() : m_initialized(false) {
    std::cout << "AnimationSystem created" << std::endl;
}

AnimationSystem::~AnimationSystem() {
    shutdown();
}

bool AnimationSystem::initialize() {
    m_initialized = true;
    std::cout << "AnimationSystem initialized" << std::endl;
    return true;
}

void AnimationSystem::update(float deltaTime) {
    if (!m_initialized) return;
    // TODO: Update animations
}

void AnimationSystem::shutdown() {
    if (m_initialized) {
        m_initialized = false;
        std::cout << "AnimationSystem shutdown" << std::endl;
    }
}

} // namespace Animation
} // namespace AnimeRig
