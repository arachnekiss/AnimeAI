#pragma once

namespace AnimeRig {
namespace Physics {

class PhysicsEngine {
public:
    PhysicsEngine();
    ~PhysicsEngine();

    bool initialize();
    void start();
    void stop();
    void update(float deltaTime);

private:
    bool m_running;
};

} // namespace Physics
} // namespace AnimeRig
