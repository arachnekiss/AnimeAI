#pragma once
#include <string>

namespace AnimeRig {
namespace Mesh {

class MeshLoader {
public:
    MeshLoader();
    ~MeshLoader();

    bool loadMesh(const std::string& filename);

private:
    // TODO: Add mesh data structures
};

} // namespace Mesh
} // namespace AnimeRig
