cmake_minimum_required(VERSION 3.16)
project(AnimeRigEngine VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS_DEBUG "-g -O0 -Wall -Wextra")
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")

# Find required packages
find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)
find_package(GLEW REQUIRED)
find_package(PkgConfig REQUIRED)

# Find Eigen3
find_package(Eigen3 REQUIRED)

# Find Assimp for model loading
find_package(assimp REQUIRED)

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${OPENGL_INCLUDE_DIRS}
    ${GLEW_INCLUDE_DIRS}
    ${EIGEN3_INCLUDE_DIR}
)

# Source files
set(ENGINE_SOURCES
    src/core/Engine.cpp
    src/renderer/CharacterRenderer.cpp
    src/animation/AnimationSystem.cpp
    src/physics/PhysicsEngine.cpp
    src/skeleton/SkeletonManager.cpp
    src/skeleton/SkeletonRig.cpp
    src/mesh/MeshLoader.cpp
)

# Header files
set(ENGINE_HEADERS
    include/core/Engine.h
    include/renderer/CharacterRenderer.h
    include/animation/AnimationSystem.h
    include/physics/PhysicsEngine.h
    include/skeleton/SkeletonManager.h
    include/skeleton/SkeletonRig.h
    include/mesh/MeshLoader.h
)

# Create engine library
add_library(animerig_engine SHARED ${ENGINE_SOURCES} ${ENGINE_HEADERS})

# Link libraries
target_link_libraries(animerig_engine
    ${OPENGL_LIBRARIES}
    glfw
    GLEW::GLEW
    assimp
    Eigen3::Eigen
    pthread
)

# Python bindings (optional)
option(BUILD_PYTHON_BINDINGS "Build Python bindings" ON)

if(BUILD_PYTHON_BINDINGS)
    find_package(pybind11 REQUIRED)
    
    pybind11_add_module(animerig_py
        src/python_bindings/bindings.cpp
    )
    
    target_link_libraries(animerig_py PRIVATE animerig_engine)
    
    # Set properties for Python module
    set_target_properties(animerig_py PROPERTIES
        CXX_VISIBILITY_PRESET "hidden"
        INTERPROCEDURAL_OPTIMIZATION TRUE
    )
endif()

# Installation
install(TARGETS animerig_engine
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

install(FILES ${ENGINE_HEADERS}
    DESTINATION include/animerig
)

# Testing
option(BUILD_TESTS "Build tests" OFF)

if(BUILD_TESTS)
    enable_testing()
    find_package(GTest REQUIRED)
    
    add_executable(engine_tests
        tests/test_renderer.cpp
        tests/test_animation.cpp
        tests/test_physics.cpp
    )
    
    target_link_libraries(engine_tests
        animerig_engine
        GTest::GTest
        GTest::Main
    )
    
    add_test(NAME EngineTests COMMAND engine_tests)
endif()

# Documentation
option(BUILD_DOCS "Build documentation" OFF)

if(BUILD_DOCS)
    find_package(Doxygen)
    if(DOXYGEN_FOUND)
        configure_file(${CMAKE_CURRENT_SOURCE_DIR}/docs/Doxyfile.in
                      ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile @ONLY)
        add_custom_target(docs
            ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_BINARY_DIR}/Doxyfile
            WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
            COMMENT "Generating API documentation with Doxygen" VERBATIM
        )
    endif()
endif()

# Package configuration
include(CMakePackageConfigHelpers)

configure_package_config_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/cmake/AnimeRigEngineConfig.cmake.in"
    "${CMAKE_CURRENT_BINARY_DIR}/AnimeRigEngineConfig.cmake"
    INSTALL_DESTINATION lib/cmake/AnimeRigEngine
)

write_basic_package_version_file(
    "${CMAKE_CURRENT_BINARY_DIR}/AnimeRigEngineConfigVersion.cmake"
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/AnimeRigEngineConfig.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/AnimeRigEngineConfigVersion.cmake"
    DESTINATION lib/cmake/AnimeRigEngine
)
