package main

import (
    "log"
    "net/http"
    "os"
    "time"
    "context"
    "encoding/json"
    "fmt"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "github.com/gorilla/websocket"
    "github.com/joho/godotenv"
    
    "github.com/animerig-ai/backend/internal/llm"
)

// Character represents an animated character instance
type Character struct {
    ID           string                 `json:"id"`
    Name         string                 `json:"name"`
    Personality  string                 `json:"personality"`
    ImagePath    string                 `json:"image_path"`
    State        CharacterState         `json:"state"`
    CreatedAt    time.Time              `json:"created_at"`
    LastActive   time.Time              `json:"last_active"`
    Metadata     map[string]interface{} `json:"metadata"`
}

// CharacterState represents the current state of a character
type CharacterState struct {
    CurrentEmotion    string  `json:"current_emotion"`
    EmotionIntensity  float64 `json:"emotion_intensity"`
    EnergyLevel       float64 `json:"energy_level"`
    IsAnimating       bool    `json:"is_animating"`
    IsSpeaking        bool    `json:"is_speaking"`
    LastMessage       string  `json:"last_message"`
    ConversationCount int     `json:"conversation_count"`
}

// UserMessage represents a message from user to character
type UserMessage struct {
    Text      string    `json:"text"`
    Type      string    `json:"type"` // "text", "voice", "gesture"
    Timestamp time.Time `json:"timestamp"`
    UserID    string    `json:"user_id"`
}

// CharacterResponse represents character's response
type CharacterResponse struct {
    Text             string                 `json:"text"`
    Emotion          string                 `json:"emotion"`
    EmotionIntensity float64                `json:"emotion_intensity"`
    Gesture          string                 `json:"gesture"`
    AnimationData    map[string]interface{} `json:"animation_data"`
    VoiceData        []byte                 `json:"voice_data,omitempty"`
    Duration         float64                `json:"duration"`
    Timestamp        time.Time              `json:"timestamp"`
}

// AnimationCommand represents an animation instruction
type AnimationCommand struct {
    Type      string                 `json:"type"`
    Target    string                 `json:"target"` // "head", "body", "face", etc.
    Data      map[string]interface{} `json:"data"`
    Duration  float64                `json:"duration"`
    Priority  int                    `json:"priority"`
    Timestamp time.Time              `json:"timestamp"`
}

// CharacterSession manages a real-time connection with a character
type CharacterSession struct {
    ID             string
    Character      *Character
    Websocket      *websocket.Conn
    LLMClient      *llm.Client
    AnimationQueue chan AnimationCommand
    Context        context.Context
    Cancel         context.CancelFunc
    LastHeartbeat  time.Time
}

// WebSocket upgrader
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins in development
    },
}

// Global character storage (in production, use proper database)
var characters = make(map[string]*Character)
var sessions = make(map[string]*CharacterSession)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Printf("Warning: .env file not found: %v", err)
    }

    // Initialize Gin router
    r := gin.Default()

    // CORS middleware
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
    r.Use(cors.New(config))

    // Health check endpoint
    r.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status":    "healthy",
            "timestamp": time.Now(),
            "service":   "animerig-api",
            "version":   "1.0.0",
        })
    })

    // WebSocket endpoint for real-time communication
    r.GET("/ws", handleWebSocket)

    // REST API endpoints
    api := r.Group("/api/v1")
    {
        // Character management
        api.POST("/character/create", createCharacter)
        api.GET("/character/:id", getCharacter)
        api.PUT("/character/:id", updateCharacter)
        api.DELETE("/character/:id", deleteCharacter)
        api.GET("/characters", listCharacters)

        // Character interaction
        api.POST("/character/:id/message", sendMessage)
        api.GET("/character/:id/state", getCharacterState)
        api.POST("/character/:id/animation", triggerAnimation)

        // File upload for character images
        api.POST("/upload/character", uploadCharacterImage)

        // System endpoints
        api.GET("/system/stats", getSystemStats)
    }

    // Static file serving
    r.Static("/assets", "./assets")
    r.Static("/uploads", "./uploads")

    // Start server
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("🚀 AnimeRig AI Server starting on port %s", port)
    log.Printf("🌐 WebSocket endpoint: ws://localhost:%s/ws", port)
    log.Printf("📡 API endpoint: http://localhost:%s/api/v1", port)
    
    if err := r.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}

func handleWebSocket(c *gin.Context) {
    log.Printf("📱 New WebSocket connection from: %s", c.ClientIP())
    
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("❌ WebSocket upgrade failed: %v", err)
        return
    }
    defer conn.Close()

    // Get character ID from query params
    characterID := c.Query("character_id")
    if characterID == "" {
        log.Printf("❌ No character_id provided")
        conn.WriteMessage(websocket.TextMessage, []byte(`{"error":"character_id required"}`))
        return
    }

    // Get or create character
    character, exists := characters[characterID]
    if !exists {
        log.Printf("📝 Creating new character: %s", characterID)
        character = createDefaultCharacter(characterID)
        characters[characterID] = character
    }

    // Create session
    ctx, cancel := context.WithCancel(context.Background())
    session := &CharacterSession{
        ID:             generateSessionID(),
        Character:      character,
        Websocket:      conn,
        LLMClient:      llm.NewClient(),
        AnimationQueue: make(chan AnimationCommand, 100),
        Context:        ctx,
        Cancel:         cancel,
        LastHeartbeat:  time.Now(),
    }

    sessions[session.ID] = session
    defer func() {
        session.Cancel()
        delete(sessions, session.ID)
        log.Printf("🔌 Session closed: %s", session.ID)
    }()

    log.Printf("✅ Session created: %s for character: %s", session.ID, characterID)

    // Start session handlers
    go session.HandleMessages()
    go session.ProcessAnimations()
    go session.HeartbeatMonitor()

    // Keep connection alive
    select {
    case <-ctx.Done():
        log.Printf("📱 Session context cancelled: %s", session.ID)
    }
}

func (s *CharacterSession) HandleMessages() {
    log.Printf("🎧 Starting message handler for session: %s", s.ID)
    
    for {
        select {
        case <-s.Context.Done():
            return
        default:
            // Read message from WebSocket
            _, messageBytes, err := s.Websocket.ReadMessage()
            if err != nil {
                if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                    log.Printf("❌ WebSocket error: %v", err)
                }
                return
            }

            s.LastHeartbeat = time.Now()

            // Parse message
            var userMessage UserMessage
            if err := json.Unmarshal(messageBytes, &userMessage); err != nil {
                log.Printf("❌ Failed to parse message: %v", err)
                continue
            }

            userMessage.Timestamp = time.Now()
            log.Printf("💬 Received message: %s (type: %s)", userMessage.Text, userMessage.Type)

            // Process message and generate response
            go s.ProcessUserMessage(userMessage)
        }
    }
}

func (s *CharacterSession) ProcessUserMessage(message UserMessage) {
    log.Printf("🤖 Processing message for character: %s", s.Character.Name)

    // Update character state
    s.Character.State.LastMessage = message.Text
    s.Character.State.ConversationCount++
    s.Character.LastActive = time.Now()

    // Generate AI response using conversion functions
    llmResponse, err := s.LLMClient.GenerateResponse(message.ToLLMUserMessage(), s.Character.ToLLMCharacter())
    if err != nil {
        log.Printf("❌ Failed to generate response: %v", err)
        llmResponse = &llm.CharacterResponse{
            Text:             "I'm sorry, I'm having trouble understanding right now.",
            Emotion:          "neutral",
            EmotionIntensity: 0.5,
            Gesture:          "none",
            Duration:         2.0,
            Timestamp:        time.Now(),
        }
    }
    
    // Convert LLM response to server response
    response := FromLLMCharacterResponse(llmResponse)

    // Update character state based on response
    s.Character.State.CurrentEmotion = response.Emotion
    s.Character.State.EmotionIntensity = response.EmotionIntensity
    s.Character.State.IsSpeaking = true

    // Send response back to client
    responseJSON, _ := json.Marshal(response)
    if err := s.Websocket.WriteMessage(websocket.TextMessage, responseJSON); err != nil {
        log.Printf("❌ Failed to send response: %v", err)
        return
    }

    // Queue animation commands
    if response.AnimationData != nil {
        animationCmd := AnimationCommand{
            Type:      "full_animation",
            Target:    "character",
            Data:      response.AnimationData,
            Duration:  response.Duration,
            Priority:  1,
            Timestamp: time.Now(),
        }

        select {
        case s.AnimationQueue <- animationCmd:
            log.Printf("🎭 Animation queued: %s", animationCmd.Type)
        default:
            log.Printf("⚠️  Animation queue full, dropping command")
        }
    }

    log.Printf("✅ Response sent: %s (emotion: %s, duration: %.2fs)", 
        response.Text, response.Emotion, response.Duration)
}

func (s *CharacterSession) ProcessAnimations() {
    log.Printf("🎬 Starting animation processor for session: %s", s.ID)
    
    for {
        select {
        case <-s.Context.Done():
            return
        case animation := <-s.AnimationQueue:
            log.Printf("🎭 Processing animation: %s", animation.Type)
            
            // Send animation command to client
            animationJSON, _ := json.Marshal(map[string]interface{}{
                "type":      "animation_command",
                "animation": animation,
            })
            
            if err := s.Websocket.WriteMessage(websocket.TextMessage, animationJSON); err != nil {
                log.Printf("❌ Failed to send animation: %v", err)
                continue
            }
            
            // Update character state
            s.Character.State.IsAnimating = true
            
            // Set timer to mark animation as complete
            go func(duration float64) {
                time.Sleep(time.Duration(duration * float64(time.Second)))
                s.Character.State.IsAnimating = false
                s.Character.State.IsSpeaking = false
            }(animation.Duration)
        }
    }
}

func (s *CharacterSession) HeartbeatMonitor() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case <-s.Context.Done():
            return
        case <-ticker.C:
            // Check if connection is still alive
            if time.Since(s.LastHeartbeat) > 60*time.Second {
                log.Printf("💔 Heartbeat timeout for session: %s", s.ID)
                s.Cancel()
                return
            }
            
            // Send ping
            if err := s.Websocket.WriteMessage(websocket.PingMessage, nil); err != nil {
                log.Printf("❌ Failed to send ping: %v", err)
                s.Cancel()
                return
            }
        }
    }
}

func createCharacter(c *gin.Context) {
    var req struct {
        Name        string `json:"name" binding:"required"`
        Personality string `json:"personality"`
        ImagePath   string `json:"image_path"`
    }

    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    character := &Character{
        ID:          generateCharacterID(),
        Name:        req.Name,
        Personality: req.Personality,
        ImagePath:   req.ImagePath,
        State: CharacterState{
            CurrentEmotion:    "neutral",
            EmotionIntensity:  0.5,
            EnergyLevel:       0.7,
            IsAnimating:       false,
            IsSpeaking:        false,
            ConversationCount: 0,
        },
        CreatedAt:  time.Now(),
        LastActive: time.Now(),
        Metadata:   make(map[string]interface{}),
    }

    characters[character.ID] = character

    log.Printf("📝 Created character: %s (%s)", character.Name, character.ID)
    c.JSON(http.StatusCreated, character)
}

func getCharacter(c *gin.Context) {
    id := c.Param("id")
    character, exists := characters[id]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    c.JSON(http.StatusOK, character)
}

func updateCharacter(c *gin.Context) {
    id := c.Param("id")
    character, exists := characters[id]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    var updates map[string]interface{}
    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Update character fields
    if name, ok := updates["name"].(string); ok {
        character.Name = name
    }
    if personality, ok := updates["personality"].(string); ok {
        character.Personality = personality
    }
    
    character.LastActive = time.Now()

    c.JSON(http.StatusOK, character)
}

func deleteCharacter(c *gin.Context) {
    id := c.Param("id")
    if _, exists := characters[id]; !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    delete(characters, id)
    log.Printf("🗑️  Deleted character: %s", id)
    c.JSON(http.StatusOK, gin.H{"message": "Character deleted"})
}

func listCharacters(c *gin.Context) {
    charList := make([]*Character, 0, len(characters))
    for _, char := range characters {
        charList = append(charList, char)
    }

    c.JSON(http.StatusOK, gin.H{
        "characters": charList,
        "count":      len(charList),
    })
}

func sendMessage(c *gin.Context) {
    id := c.Param("id")
    character, exists := characters[id]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    var message UserMessage
    if err := c.ShouldBindJSON(&message); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // This is for REST API - for real-time use WebSocket
    log.Printf("📨 REST message to %s: %s", character.Name, message.Text)
    
    // Simple response for REST endpoint
    response := CharacterResponse{
        Text:             fmt.Sprintf("Thanks for your message: %s", message.Text),
        Emotion:          "happy",
        EmotionIntensity: 0.7,
        Gesture:          "none",
        Duration:         2.0,
        Timestamp:        time.Now(),
    }

    c.JSON(http.StatusOK, response)
}

func getCharacterState(c *gin.Context) {
    id := c.Param("id")
    character, exists := characters[id]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    c.JSON(http.StatusOK, character.State)
}

func triggerAnimation(c *gin.Context) {
    id := c.Param("id")
    character, exists := characters[id]
    if !exists {
        c.JSON(http.StatusNotFound, gin.H{"error": "Character not found"})
        return
    }

    var animationCmd AnimationCommand
    if err := c.ShouldBindJSON(&animationCmd); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    animationCmd.Timestamp = time.Now()
    log.Printf("🎭 Animation triggered for %s: %s", character.Name, animationCmd.Type)

    c.JSON(http.StatusOK, gin.H{
        "message":   "Animation triggered",
        "animation": animationCmd,
    })
}

func uploadCharacterImage(c *gin.Context) {
    file, err := c.FormFile("image")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
        return
    }

    // Save file
    filename := fmt.Sprintf("character_%d_%s", time.Now().Unix(), file.Filename)
    filepath := fmt.Sprintf("./uploads/%s", filename)
    
    if err := c.SaveUploadedFile(file, filepath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
        return
    }

    log.Printf("📁 Uploaded character image: %s", filename)
    c.JSON(http.StatusOK, gin.H{
        "filename": filename,
        "path":     filepath,
        "url":      fmt.Sprintf("/uploads/%s", filename),
    })
}

func getSystemStats(c *gin.Context) {
    stats := gin.H{
        "characters":      len(characters),
        "active_sessions": len(sessions),
        "uptime":         time.Since(time.Now()), // This would be actual uptime
        "memory_usage":   "N/A", // Could add actual memory stats
        "server_time":    time.Now(),
    }

    c.JSON(http.StatusOK, stats)
}

func createDefaultCharacter(id string) *Character {
    return &Character{
        ID:          id,
        Name:        "Default Character",
        Personality: "Friendly and helpful virtual companion",
        ImagePath:   "assets/images/start_character.png",
        State: CharacterState{
            CurrentEmotion:    "neutral",
            EmotionIntensity:  0.5,
            EnergyLevel:       0.7,
            IsAnimating:       false,
            IsSpeaking:        false,
            ConversationCount: 0,
        },
        CreatedAt:  time.Now(),
        LastActive: time.Now(),
        Metadata:   make(map[string]interface{}),
    }
}

func generateCharacterID() string {
    return fmt.Sprintf("char_%d", time.Now().UnixNano())
}

func generateSessionID() string {
    return fmt.Sprintf("sess_%d", time.Now().UnixNano())
}

// Conversion functions to bridge between server types and LLM types

// ToLLMUserMessage converts server UserMessage to LLM UserMessage
func (um UserMessage) ToLLMUserMessage() llm.UserMessage {
    return llm.UserMessage{
        Content:   um.Text,
        Text:      um.Text,
        Timestamp: um.Timestamp,
    }
}

// ToLLMCharacter converts server Character to LLM Character
func (c Character) ToLLMCharacter() llm.Character {
    return llm.Character{
        ID:          c.ID,
        Name:        c.Name,
        Personality: c.Personality,
        Mood:        c.State.CurrentEmotion,
        State: map[string]interface{}{
            "CurrentEmotion":    c.State.CurrentEmotion,
            "EmotionIntensity":  c.State.EmotionIntensity,
            "EnergyLevel":       c.State.EnergyLevel,
            "LastMessage":       c.State.LastMessage,
            "ConversationCount": c.State.ConversationCount,
        },
    }
}

// FromLLMCharacterResponse converts LLM CharacterResponse to server CharacterResponse
func FromLLMCharacterResponse(llmResp *llm.CharacterResponse) *CharacterResponse {
    return &CharacterResponse{
        Text:             llmResp.Text,
        Emotion:          llmResp.Emotion,
        EmotionIntensity: llmResp.EmotionIntensity,
        Gesture:          llmResp.Gesture,
        AnimationData:    llmResp.AnimationData,
        Duration:         llmResp.Duration,
        Timestamp:        llmResp.Timestamp,
    }
}

// CharacterSession manages a real-time connection with a character
