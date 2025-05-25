/**
 * Python bindings for AnimeRig Engine
 * Provides Python interface to C++ rendering and animation systems
 */

#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <string>

#include "../../include/core/Engine.h"
#include "../../include/renderer/CharacterRenderer.h"
#include "../../include/animation/AnimationSystem.h"
#include "../../include/physics/PhysicsEngine.h"
#include "../../include/skeleton/SkeletonManager.h"

namespace py = pybind11;

PYBIND11_MODULE(animerig_py, m) {
    m.doc() = "AnimeRig AI Engine - Python Bindings";
    
    // Engine class
    py::class_<AnimeRig::Core::Engine>(m, "Engine")
        .def(py::init<>())
        .def("initialize", &AnimeRig::Core::Engine::initialize)
        .def("run", &AnimeRig::Core::Engine::run)
        .def("shutdown", &AnimeRig::Core::Engine::shutdown);
    
    // CharacterRenderer class
    py::class_<AnimeRig::Renderer::CharacterRenderer>(m, "CharacterRenderer")
        .def(py::init<>())
        .def("initialize", &AnimeRig::Renderer::CharacterRenderer::initialize)
        .def("render", &AnimeRig::Renderer::CharacterRenderer::render)
        .def("cleanup", &AnimeRig::Renderer::CharacterRenderer::cleanup);
    
    // AnimationSystem class
    py::class_<AnimeRig::Animation::AnimationSystem>(m, "AnimationSystem")
        .def(py::init<>())
        .def("initialize", &AnimeRig::Animation::AnimationSystem::initialize)
        .def("update", &AnimeRig::Animation::AnimationSystem::update)
        .def("shutdown", &AnimeRig::Animation::AnimationSystem::shutdown);
    
    // PhysicsEngine class  
    py::class_<AnimeRig::Physics::PhysicsEngine>(m, "PhysicsEngine")
        .def(py::init<>())
        .def("initialize", &AnimeRig::Physics::PhysicsEngine::initialize)
        .def("start", &AnimeRig::Physics::PhysicsEngine::start)
        .def("stop", &AnimeRig::Physics::PhysicsEngine::stop)
        .def("update", &AnimeRig::Physics::PhysicsEngine::update);
    
    // SkeletonManager class
    py::class_<AnimeRig::Skeleton::SkeletonManager>(m, "SkeletonManager")
        .def(py::init<>())
        .def("initialize", &AnimeRig::Skeleton::SkeletonManager::initialize)
        .def("update", &AnimeRig::Skeleton::SkeletonManager::update);
    
        
    // Version info
    m.attr("__version__") = "1.0.0";
}
