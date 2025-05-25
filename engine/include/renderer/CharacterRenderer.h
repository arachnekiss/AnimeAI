#pragma once

namespace AnimeRig {
namespace Renderer {

class CharacterRenderer {
public:
    CharacterRenderer();
    ~CharacterRenderer();

    bool initialize();
    void render();
    void cleanup();

private:
    // TODO: Add rendering resources
};

} // namespace Renderer
} // namespace AnimeRig
