#pragma once
#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <memory>
#include <vector>
#include <array>

namespace AnimeRig {

struct Vertex {
    glm::vec3 position;
    glm::vec3 normal;
    glm::vec2 texCoords;
    glm::vec4 boneIds;
    glm::vec4 weights;
};

struct MeshRegion {
    std::vector<Vertex> vertices;
    std::vector<unsigned int> indices;
    unsigned int VAO, VBO, EBO;
    unsigned int textureId;
    
    struct PhysicsParticle {
        glm::vec3 position;
        glm::vec3 oldPosition;
        glm::vec3 acceleration;
        float mass;
        bool pinned;
    };
    
    std::vector<PhysicsParticle> particles;
    std::vector<std::pair<int, int>> constraints;
};

enum class EmotionType {
    NEUTRAL = 0,
    HAPPY,
    SAD,
    SURPRISED,
    ANGRY,
    THINKING,
    EXCITED
};

enum class Hand {
    LEFT = 0,
    RIGHT
};

struct FacialExpression {
    float eyeOpenness = 1.0f;
    float mouthOpenness = 0.0f;
    float smileIntensity = 0.0f;
    float browRaise = 0.0f;
    EmotionType primaryEmotion = EmotionType::NEUTRAL;
    float intensity = 0.5f;
};

struct FingerPose {
    std::array<float, 5> fingerBends = {0.0f, 0.0f, 0.0f, 0.0f, 0.0f}; // thumb to pinky
    glm::vec3 handPosition;
    glm::quat handRotation;
};

class Skeleton;
class PhysicsSimulation;

class CharacterRenderer {
private:
    struct Character {
        std::vector<Vertex> vertices;
        std::vector<unsigned int> indices;
        std::unique_ptr<Skeleton> skeleton;
        std::unique_ptr<PhysicsSimulation> physics;
        
        // Detailed body parts for fine control
        struct BodyParts {
            MeshRegion head;
            MeshRegion hair;           // Individual hair strands
            MeshRegion leftEye, rightEye;
            MeshRegion mouth;
            std::array<MeshRegion, 5> leftFingers;
            std::array<MeshRegion, 5> rightFingers;
            MeshRegion clothing;
            MeshRegion skirt;          // Cloth simulation
        } parts;
        
        // Animation state
        FacialExpression currentExpression;
        FingerPose leftHandPose;
        FingerPose rightHandPose;
        glm::vec3 breathingOffset;
        float blinkTimer;
        
        // Physics properties
        float hairStiffness = 0.8f;
        float clothStiffness = 0.6f;
        glm::vec3 windForce = glm::vec3(0.0f);
    };
    
    Character character;
    GLFWwindow* window;
    
    // Shader programs
    unsigned int characterShader;
    unsigned int hairShader;
    unsigned int clothShader;
    
    // Camera
    glm::mat4 view;
    glm::mat4 projection;
    glm::vec3 cameraPos;
    
    // Animation timing
    float deltaTime;
    float lastFrame;
    
    // Rendering settings
    bool enablePhysics = true;
    bool enableAntiAliasing = true;
    int targetFPS = 60;

public:
    CharacterRenderer();
    ~CharacterRenderer();
    
    // Core functionality
    bool Initialize(GLFWwindow* window);
    void LoadCharacter(const std::string& imagePath);
    void UpdateAnimation(float deltaTime);
    void Render();
    void Cleanup();
    
    // Fine-grained animation controls
    void AnimateFacialExpression(const FacialExpression& expression);
    void AnimateFingers(Hand hand, const FingerPose& pose);
    void SetEmotion(EmotionType emotion, float intensity);
    void TriggerBlink();
    void UpdateBreathing(float time);
    
    // Physics controls
    void SetWindForce(const glm::vec3& force);
    void UpdateHairPhysics(float deltaTime);
    void UpdateClothPhysics(float deltaTime);
    
    // Camera controls
    void SetCameraPosition(const glm::vec3& position);
    void SetCameraTarget(const glm::vec3& target);
    void UpdateViewMatrix();
    
    // Performance settings
    void SetTargetFPS(int fps) { targetFPS = fps; }
    void SetPhysicsEnabled(bool enabled) { enablePhysics = enabled; }
    void SetAntiAliasingEnabled(bool enabled) { enableAntiAliasing = enabled; }
    
    // Getters
    const Character& GetCharacter() const { return character; }
    glm::vec3 GetCameraPosition() const { return cameraPos; }

private:
    // Initialization helpers
    void LoadShaders();
    void SetupMeshBuffers(MeshRegion& region);
    void CreateDefaultCharacter();
    
    // Rendering helpers
    void RenderMeshRegion(const MeshRegion& region, unsigned int shader);
    void UpdateShaderUniforms(unsigned int shader);
    void ApplyBoneTransforms(unsigned int shader);
    
    // Physics helpers
    void InitializePhysicsParticles(MeshRegion& region);
    void SatisfyConstraints(MeshRegion& region);
    void ApplyPhysicsToMesh(MeshRegion& region);
    
    // Animation helpers
    void InterpolateExpression(const FacialExpression& target, float speed);
    void UpdateIdleAnimations(float time);
    void ApplyMorphTargets();
};

} // namespace AnimeRig
