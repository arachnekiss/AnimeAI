#pragma once

namespace AnimeRig {
namespace Animation {

class AnimationSystem {
public:
    AnimationSystem();
    ~AnimationSystem();

    bool initialize();
    void update(float deltaTime);
    void shutdown();

private:
    bool m_initialized;
};

} // namespace Animation
} // namespace AnimeRig
