#pragma once
#include <string>

namespace AnimeRig {
namespace Skeleton {

class SkeletonRig {
public:
    SkeletonRig();
    ~SkeletonRig();

    bool loadSkeleton(const std::string& filename);
    void updatePose();

private:
    // TODO: Add skeleton data structures
};

} // namespace Skeleton
} // namespace AnimeRig
