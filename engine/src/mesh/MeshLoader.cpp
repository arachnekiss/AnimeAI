#include "mesh/MeshLoader.h"
#include <iostream>

namespace AnimeRig {
namespace Mesh {

MeshLoader::MeshLoader() {
    std::cout << "MeshLoader created" << std::endl;
}

MeshLoader::~MeshLoader() {
    // Cleanup
}

bool MeshLoader::loadMesh(const std::string& filename) {
    std::cout << "Loading mesh: " << filename << std::endl;
    // TODO: Implement mesh loading using Assimp
    return true;
}

} // namespace Mesh
} // namespace AnimeRig
