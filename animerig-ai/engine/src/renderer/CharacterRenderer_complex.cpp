#include "CharacterRenderer.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <cmath>

namespace AnimeRig {

CharacterRenderer::CharacterRenderer() 
    : window(nullptr), characterShader(0), hairShader(0), clothShader(0),
      cameraPos(0.0f, 0.0f, 3.0f), deltaTime(0.0f), lastFrame(0.0f) {
}

CharacterRenderer::~CharacterRenderer() {
    Cleanup();
}

bool CharacterRenderer::Initialize(GLFWwindow* window) {
    this->window = window;
    
    // Initialize OpenGL context
    if (glewInit() != GLEW_OK) {
        std::cerr << "Failed to initialize GLEW" << std::endl;
        return false;
    }
    
    // Enable depth testing and face culling
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_CULL_FACE);
    glCullFace(GL_BACK);
    
    // Enable blending for transparency
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    
    // Set clear color to dark background
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
    
    // Load shaders
    LoadShaders();
    
    // Setup projection matrix
    int width, height;
    glfwGetFramebufferSize(window, &width, &height);
    projection = glm::perspective(glm::radians(45.0f), 
                                 (float)width / (float)height, 
                                 0.1f, 100.0f);
    
    // Initialize view matrix
    UpdateViewMatrix();
    
    // Create default character
    CreateDefaultCharacter();
    
    std::cout << "AnimeRig Engine initialized successfully" << std::endl;
    return true;
}

void CharacterRenderer::LoadCharacter(const std::string& imagePath) {
    std::cout << "Loading character from: " << imagePath << std::endl;
    
    // TODO: Implement AI-based character generation from image
    // For now, use the default character
    CreateDefaultCharacter();
    
    // Initialize physics for hair and clothing
    if (enablePhysics) {
        InitializePhysicsParticles(character.parts.hair);
        InitializePhysicsParticles(character.parts.skirt);
    }
    
    std::cout << "Character loaded successfully" << std::endl;
}

void CharacterRenderer::UpdateAnimation(float deltaTime) {
    this->deltaTime = deltaTime;
    float currentFrame = glfwGetTime();
    this->deltaTime = currentFrame - lastFrame;
    lastFrame = currentFrame;
    
    // Update idle animations
    UpdateIdleAnimations(currentFrame);
    
    // Update physics simulations
    if (enablePhysics) {
        UpdateHairPhysics(deltaTime);
        UpdateClothPhysics(deltaTime);
    }
    
    // Apply any pending expression changes
    ApplyMorphTargets();
}

void CharacterRenderer::Render() {
    // Clear buffers
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    // Use character shader
    glUseProgram(characterShader);
    UpdateShaderUniforms(characterShader);
    
    // Render main character parts
    RenderMeshRegion(character.parts.head, characterShader);
    RenderMeshRegion(character.parts.leftEye, characterShader);
    RenderMeshRegion(character.parts.rightEye, characterShader);
    RenderMeshRegion(character.parts.mouth, characterShader);
    
    // Render fingers
    for (const auto& finger : character.parts.leftFingers) {
        RenderMeshRegion(finger, characterShader);
    }
    for (const auto& finger : character.parts.rightFingers) {
        RenderMeshRegion(finger, characterShader);
    }
    
    // Render clothing
    RenderMeshRegion(character.parts.clothing, characterShader);
    
    // Render hair with special shader
    glUseProgram(hairShader);
    UpdateShaderUniforms(hairShader);
    RenderMeshRegion(character.parts.hair, hairShader);
    
    // Render cloth simulation
    glUseProgram(clothShader);
    UpdateShaderUniforms(clothShader);
    RenderMeshRegion(character.parts.skirt, clothShader);
}

void CharacterRenderer::AnimateFacialExpression(const FacialExpression& expression) {
    // Smooth interpolation to new expression
    InterpolateExpression(expression, 2.0f); // 2 seconds transition
    
    std::cout << "Animating to emotion: " << static_cast<int>(expression.primaryEmotion) 
              << " with intensity: " << expression.intensity << std::endl;
}

void CharacterRenderer::AnimateFingers(Hand hand, const FingerPose& pose) {
    if (hand == Hand::LEFT) {
        character.leftHandPose = pose;
    } else {
        character.rightHandPose = pose;
    }
    
    // Apply finger transforms immediately
    // TODO: Implement smooth finger animation
}

void CharacterRenderer::SetEmotion(EmotionType emotion, float intensity) {
    FacialExpression expression = character.currentExpression;
    expression.primaryEmotion = emotion;
    expression.intensity = glm::clamp(intensity, 0.0f, 1.0f);
    
    // Adjust facial features based on emotion
    switch (emotion) {
        case EmotionType::HAPPY:
            expression.smileIntensity = intensity;
            expression.eyeOpenness = 1.0f + intensity * 0.2f;
            break;
        case EmotionType::SAD:
            expression.smileIntensity = -intensity * 0.5f;
            expression.eyeOpenness = 1.0f - intensity * 0.3f;
            expression.browRaise = -intensity * 0.4f;
            break;
        case EmotionType::SURPRISED:
            expression.eyeOpenness = 1.0f + intensity * 0.5f;
            expression.browRaise = intensity * 0.6f;
            expression.mouthOpenness = intensity * 0.3f;
            break;
        case EmotionType::THINKING:
            expression.eyeOpenness = 1.0f - intensity * 0.2f;
            expression.browRaise = intensity * 0.3f;
            break;
        default:
            break;
    }
    
    AnimateFacialExpression(expression);
}

void CharacterRenderer::UpdateIdleAnimations(float time) {
    // Breathing animation
    float breathingFreq = 0.25f; // 15 breaths per minute
    float breathingAmp = 0.02f;
    character.breathingOffset.y = sin(time * breathingFreq * 2.0f * M_PI) * breathingAmp;
    
    // Blinking
    character.blinkTimer += deltaTime;
    if (character.blinkTimer > 3.0f + (rand() % 3)) { // Random blink every 3-6 seconds
        TriggerBlink();
        character.blinkTimer = 0.0f;
    }
    
    // Subtle head movements
    float headSway = 0.01f;
    // Add very subtle head rotation for life-like movement
}

void CharacterRenderer::TriggerBlink() {
    // Quick blink animation
    character.currentExpression.eyeOpenness = 0.1f;
    // TODO: Animate back to normal over 0.2 seconds
}

void CharacterRenderer::UpdateHairPhysics(float deltaTime) {
    if (character.parts.hair.particles.empty()) return;
    
    // Simple Verlet integration for hair
    for (auto& particle : character.parts.hair.particles) {
        if (particle.pinned) continue;
        
        glm::vec3 temp = particle.position;
        glm::vec3 velocity = particle.position - particle.oldPosition;
        
        // Apply gravity and wind
        particle.acceleration = glm::vec3(0.0f, -9.81f, 0.0f) + character.windForce;
        
        // Update position
        particle.position += velocity * 0.99f + particle.acceleration * deltaTime * deltaTime;
        particle.oldPosition = temp;
    }
    
    // Satisfy constraints
    SatisfyConstraints(character.parts.hair);
    
    // Apply to mesh
    ApplyPhysicsToMesh(character.parts.hair);
}

void CharacterRenderer::UpdateClothPhysics(float deltaTime) {
    if (character.parts.skirt.particles.empty()) return;
    
    // Similar to hair physics but with different constraints
    UpdateHairPhysics(deltaTime); // Simplified for now
}

void CharacterRenderer::LoadShaders() {
    // Simple vertex shader
    const char* vertexShaderSource = R"(
        #version 330 core
        layout (location = 0) in vec3 aPos;
        layout (location = 1) in vec3 aNormal;
        layout (location = 2) in vec2 aTexCoord;
        
        uniform mat4 model;
        uniform mat4 view;
        uniform mat4 projection;
        
        out vec3 Normal;
        out vec2 TexCoord;
        out vec3 FragPos;
        
        void main() {
            FragPos = vec3(model * vec4(aPos, 1.0));
            Normal = mat3(transpose(inverse(model))) * aNormal;
            TexCoord = aTexCoord;
            
            gl_Position = projection * view * vec4(FragPos, 1.0);
        }
    )";
    
    // Simple fragment shader
    const char* fragmentShaderSource = R"(
        #version 330 core
        out vec4 FragColor;
        
        in vec3 Normal;
        in vec2 TexCoord;
        in vec3 FragPos;
        
        uniform vec3 lightPos;
        uniform vec3 lightColor;
        uniform vec3 objectColor;
        
        void main() {
            // Ambient
            float ambientStrength = 0.3;
            vec3 ambient = ambientStrength * lightColor;
            
            // Diffuse
            vec3 norm = normalize(Normal);
            vec3 lightDir = normalize(lightPos - FragPos);
            float diff = max(dot(norm, lightDir), 0.0);
            vec3 diffuse = diff * lightColor;
            
            vec3 result = (ambient + diffuse) * objectColor;
            FragColor = vec4(result, 1.0);
        }
    )";
    
    // Create and compile shaders (simplified)
    characterShader = glCreateProgram();
    // TODO: Implement proper shader compilation
    
    std::cout << "Shaders loaded successfully" << std::endl;
}

void CharacterRenderer::CreateDefaultCharacter() {
    // Create a simple default character representation
    // This would normally be loaded from the AI processing pipeline
    
    std::cout << "Creating default character..." << std::endl;
    
    // Initialize basic mesh regions
    character.parts.head.vertices.clear();
    character.parts.head.indices.clear();
    
    // Create simple geometric primitives for each body part
    // TODO: Implement proper mesh generation
    
    // Set default expressions
    character.currentExpression = FacialExpression();
    character.blinkTimer = 0.0f;
    
    std::cout << "Default character created" << std::endl;
}

void CharacterRenderer::RenderMeshRegion(const MeshRegion& region, unsigned int shader) {
    if (region.vertices.empty()) return;
    
    // Bind and render the mesh
    glBindVertexArray(region.VAO);
    glDrawElements(GL_TRIANGLES, region.indices.size(), GL_UNSIGNED_INT, 0);
    glBindVertexArray(0);
}

void CharacterRenderer::UpdateShaderUniforms(unsigned int shader) {
    glUseProgram(shader);
    
    // Update transformation matrices
    glm::mat4 model = glm::mat4(1.0f);
    model = glm::translate(model, character.breathingOffset);
    
    // TODO: Set uniform values
    // glUniformMatrix4fv(glGetUniformLocation(shader, "model"), 1, GL_FALSE, glm::value_ptr(model));
    // glUniformMatrix4fv(glGetUniformLocation(shader, "view"), 1, GL_FALSE, glm::value_ptr(view));
    // glUniformMatrix4fv(glGetUniformLocation(shader, "projection"), 1, GL_FALSE, glm::value_ptr(projection));
}

void CharacterRenderer::UpdateViewMatrix() {
    view = glm::lookAt(cameraPos, 
                       glm::vec3(0.0f, 0.0f, 0.0f), 
                       glm::vec3(0.0f, 1.0f, 0.0f));
}

void CharacterRenderer::InitializePhysicsParticles(MeshRegion& region) {
    // Create physics particles for each vertex
    region.particles.clear();
    region.particles.reserve(region.vertices.size());
    
    for (size_t i = 0; i < region.vertices.size(); ++i) {
        MeshRegion::PhysicsParticle particle;
        particle.position = region.vertices[i].position;
        particle.oldPosition = particle.position;
        particle.acceleration = glm::vec3(0.0f);
        particle.mass = 1.0f;
        particle.pinned = (i < 10); // Pin some vertices to the head
        
        region.particles.push_back(particle);
    }
    
    // Create constraints between adjacent particles
    // TODO: Implement proper constraint generation
}

void CharacterRenderer::SatisfyConstraints(MeshRegion& region) {
    // Satisfy distance constraints
    for (const auto& constraint : region.constraints) {
        int i = constraint.first;
        int j = constraint.second;
        
        if (i >= region.particles.size() || j >= region.particles.size()) continue;
        
        auto& p1 = region.particles[i];
        auto& p2 = region.particles[j];
        
        glm::vec3 delta = p2.position - p1.position;
        float distance = glm::length(delta);
        float restLength = 0.1f; // Default rest length
        
        if (distance > 0.0f) {
            float difference = (restLength - distance) / distance;
            glm::vec3 translate = delta * difference * 0.5f;
            
            if (!p1.pinned) p1.position -= translate;
            if (!p2.pinned) p2.position += translate;
        }
    }
}

void CharacterRenderer::ApplyPhysicsToMesh(MeshRegion& region) {
    // Update mesh vertices with physics simulation results
    for (size_t i = 0; i < region.particles.size() && i < region.vertices.size(); ++i) {
        region.vertices[i].position = region.particles[i].position;
    }
    
    // Update GPU buffers
    // TODO: Update VBO with new vertex data
}

void CharacterRenderer::InterpolateExpression(const FacialExpression& target, float speed) {
    // Smooth interpolation to target expression
    float factor = deltaTime * speed;
    
    character.currentExpression.eyeOpenness = glm::mix(
        character.currentExpression.eyeOpenness, 
        target.eyeOpenness, 
        factor
    );
    
    character.currentExpression.mouthOpenness = glm::mix(
        character.currentExpression.mouthOpenness, 
        target.mouthOpenness, 
        factor
    );
    
    character.currentExpression.smileIntensity = glm::mix(
        character.currentExpression.smileIntensity, 
        target.smileIntensity, 
        factor
    );
    
    character.currentExpression.browRaise = glm::mix(
        character.currentExpression.browRaise, 
        target.browRaise, 
        factor
    );
}

void CharacterRenderer::ApplyMorphTargets() {
    // Apply current expression to mesh vertices
    // TODO: Implement morph target blending
}

void CharacterRenderer::Cleanup() {
    if (characterShader) glDeleteProgram(characterShader);
    if (hairShader) glDeleteProgram(hairShader);
    if (clothShader) glDeleteProgram(clothShader);
    
    // Cleanup mesh buffers
    // TODO: Delete VAOs, VBOs, EBOs
}

} // namespace AnimeRig
