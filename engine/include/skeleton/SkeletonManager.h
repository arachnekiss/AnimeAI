#pragma once

namespace AnimeRig {
namespace Skeleton {

class SkeletonManager {
public:
    SkeletonManager();
    ~SkeletonManager();

    bool initialize();
    void update();

private:
    // TODO: Add skeleton management data
};

} // namespace Skeleton
} // namespace AnimeRig
