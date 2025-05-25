#pragma once

namespace AnimeRig {
namespace Core {

class Engine {
public:
    Engine();
    ~Engine();

    bool initialize();
    void run();
    void shutdown();

private:
    bool m_running;
    void update();
    void render();
};

} // namespace Core
} // namespace AnimeRig
