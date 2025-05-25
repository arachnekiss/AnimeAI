package llm

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "strings"
    "time"
    "log"
)

// UserMessage represents a message from the user
type UserMessage struct {
    Content   string    `json:"content"`
    Text      string    `json:"text"`
    Timestamp time.Time `json:"timestamp"`
}

// Character represents an animated character
type Character struct {
    ID          string                 `json:"id"`
    Name        string                 `json:"name"`
    Personality string                 `json:"personality"`
    Mood        string                 `json:"mood"`
    State       map[string]interface{} `json:"state"`
}

// CharacterResponse represents a response from the character
type CharacterResponse struct {
    Text             string                 `json:"text"`
    Emotion          string                 `json:"emotion"`
    Gesture          string                 `json:"gesture"`
    Intensity        float64                `json:"intensity"`
    EmotionIntensity float64                `json:"emotion_intensity"`
    AnimationData    map[string]interface{} `json:"animation_data"`
    Duration         float64                `json:"duration"`
    Timestamp        time.Time              `json:"timestamp"`
    Metadata         map[string]interface{} `json:"metadata"`
}

// Client handles communication with language model APIs
type Client struct {
    APIKey      string
    BaseURL     string
    Model       string
    MaxTokens   int
    Temperature float64
    Client      *http.Client
}

// OpenAIRequest represents a request to OpenAI API
type OpenAIRequest struct {
    Model       string                   `json:"model"`
    Messages    []OpenAIMessage          `json:"messages"`
    MaxTokens   int                      `json:"max_tokens"`
    Temperature float64                  `json:"temperature"`
    Stream      bool                     `json:"stream"`
    Functions   []OpenAIFunction         `json:"functions,omitempty"`
}

// OpenAIMessage represents a message in the conversation
type OpenAIMessage struct {
    Role    string `json:"role"`
    Content string `json:"content"`
}

// OpenAIFunction represents a function that can be called
type OpenAIFunction struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    Parameters  map[string]interface{} `json:"parameters"`
}

// OpenAIResponse represents the response from OpenAI API
type OpenAIResponse struct {
    ID      string           `json:"id"`
    Object  string           `json:"object"`
    Created int64            `json:"created"`
    Model   string           `json:"model"`
    Choices []OpenAIChoice   `json:"choices"`
    Usage   OpenAIUsage      `json:"usage"`
    Error   *OpenAIError     `json:"error,omitempty"`
}

// OpenAIChoice represents a choice in the response
type OpenAIChoice struct {
    Index        int                    `json:"index"`
    Message      OpenAIMessage          `json:"message"`
    FinishReason string                 `json:"finish_reason"`
    FunctionCall *OpenAIFunctionCall    `json:"function_call,omitempty"`
}

// OpenAIFunctionCall represents a function call
type OpenAIFunctionCall struct {
    Name      string `json:"name"`
    Arguments string `json:"arguments"`
}

// OpenAIUsage represents token usage information
type OpenAIUsage struct {
    PromptTokens     int `json:"prompt_tokens"`
    CompletionTokens int `json:"completion_tokens"`
    TotalTokens      int `json:"total_tokens"`
}

// OpenAIError represents an error from OpenAI API
type OpenAIError struct {
    Message string `json:"message"`
    Type    string `json:"type"`
    Code    string `json:"code"`
}

// ParsedResponse represents the structured response from LLM
type ParsedResponse struct {
    Text             string                 `json:"text"`
    Emotion          string                 `json:"emotion"`
    EmotionIntensity float64                `json:"emotion_intensity"`
    Gesture          string                 `json:"gesture"`
    AnimationHints   map[string]interface{} `json:"animation_hints"`
    Confidence       float64                `json:"confidence"`
}

// NewClient creates a new LLM client
func NewClient() *Client {
    apiKey := os.Getenv("OPENAI_API_KEY")
    if apiKey == "" {
        log.Printf("⚠️  Warning: OPENAI_API_KEY not set, using mock responses")
    }

    return &Client{
        APIKey:      apiKey,
        BaseURL:     "https://api.openai.com/v1",
        Model:       "gpt-3.5-turbo",
        MaxTokens:   150,
        Temperature: 0.7,
        Client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

// GenerateResponse generates a character response using LLM
func (c *Client) GenerateResponse(input UserMessage, character Character) (*CharacterResponse, error) {
    log.Printf("🤖 Generating LLM response for character: %s", character.Name)

    // If no API key, return mock response
    if c.APIKey == "" {
        return c.generateMockResponse(input, character), nil
    }

    // Build conversation context
    messages := c.buildConversationContext(input, character)

    // Create request
    request := OpenAIRequest{
        Model:       c.Model,
        Messages:    messages,
        MaxTokens:   c.MaxTokens,
        Temperature: c.Temperature,
        Stream:      false,
    }

    // Make API call
    response, err := c.callOpenAI(request)
    if err != nil {
        log.Printf("❌ OpenAI API error: %v", err)
        // Fallback to mock response
        return c.generateMockResponse(input, character), nil
    }

    // Parse response
    parsed, err := c.parseOpenAIResponse(response)
    if err != nil {
        log.Printf("❌ Failed to parse response: %v", err)
        return c.generateMockResponse(input, character), nil
    }

    // Convert to CharacterResponse
    characterResponse := &CharacterResponse{
        Text:             parsed.Text,
        Emotion:          parsed.Emotion,
        EmotionIntensity: parsed.EmotionIntensity,
        Gesture:          parsed.Gesture,
        AnimationData:    parsed.AnimationHints,
        Duration:         c.calculateResponseDuration(parsed.Text),
        Timestamp:        time.Now(),
    }

    log.Printf("✅ Generated response: %s (emotion: %s, gesture: %s)", 
        characterResponse.Text, characterResponse.Emotion, characterResponse.Gesture)

    return characterResponse, nil
}

func (c *Client) buildConversationContext(input UserMessage, character Character) []OpenAIMessage {
    messages := []OpenAIMessage{}

    // System prompt - defines character personality and behavior
    systemPrompt := c.buildSystemPrompt(character)
    messages = append(messages, OpenAIMessage{
        Role:    "system",
        Content: systemPrompt,
    })

    // Add conversation history (simplified - in production would maintain history)
    if lastMsg, ok := character.State["LastMessage"].(string); ok && lastMsg != "" && lastMsg != input.Text {
        messages = append(messages, OpenAIMessage{
            Role:    "assistant", 
            Content: lastMsg,
        })
    }

    // Current user input
    messages = append(messages, OpenAIMessage{
        Role:    "user",
        Content: input.Text,
    })

    return messages
}

func (c *Client) buildSystemPrompt(character Character) string {
    // Get state values with proper type assertions and defaults
    currentEmotion := "neutral"
    if emotion, ok := character.State["CurrentEmotion"].(string); ok {
        currentEmotion = emotion
    }
    
    emotionIntensity := 0.5
    if intensity, ok := character.State["EmotionIntensity"].(float64); ok {
        emotionIntensity = intensity
    }
    
    energyLevel := 0.5
    if energy, ok := character.State["EnergyLevel"].(float64); ok {
        energyLevel = energy
    }
    
    conversationCount := 0
    if count, ok := character.State["ConversationCount"].(int); ok {
        conversationCount = count
    }

    prompt := fmt.Sprintf(`You are %s, an animated AI character with the personality: %s

IMPORTANT: Your response must be in this exact JSON format:
{
    "text": "your response text here",
    "emotion": "one of: neutral, happy, sad, surprised, angry, thinking, excited, confused, embarrassed",
    "emotion_intensity": number between 0.0 and 1.0,
    "gesture": "one of: none, wave, nod, shake_head, shrug, point, thumbs_up, clap, thinking_pose",
    "animation_hints": {
        "head_tilt": number in degrees (-30 to 30),
        "eye_contact": true/false,
        "posture": "upright/relaxed/slouched/alert"
    }
}

Character Details:
- Name: %s
- Current Emotion: %s (intensity: %.2f)
- Energy Level: %.2f
- Conversation Count: %d

Guidelines:
1. Stay in character with the given personality
2. Respond naturally to the user's input
3. Choose appropriate emotions and gestures
4. Keep responses conversational and engaging
5. Emotions should match your response content
6. Use gestures that enhance communication
7. Animation hints should complement your emotion

Remember: You are a living, breathing character - not just a chatbot!`,
        character.Name,
        character.Personality,
        character.Name,
        currentEmotion,
        emotionIntensity,
        energyLevel,
        conversationCount)

    return prompt
}

func (c *Client) callOpenAI(request OpenAIRequest) (*OpenAIResponse, error) {
    // Convert request to JSON
    requestJSON, err := json.Marshal(request)
    if err != nil {
        return nil, fmt.Errorf("failed to marshal request: %v", err)
    }

    // Create HTTP request
    req, err := http.NewRequest("POST", c.BaseURL+"/chat/completions", bytes.NewBuffer(requestJSON))
    if err != nil {
        return nil, fmt.Errorf("failed to create request: %v", err)
    }

    // Set headers
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.APIKey)

    // Make request
    resp, err := c.Client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("failed to make request: %v", err)
    }
    defer resp.Body.Close()

    // Read response
    responseBody, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("failed to read response: %v", err)
    }

    // Parse response
    var openAIResponse OpenAIResponse
    if err := json.Unmarshal(responseBody, &openAIResponse); err != nil {
        return nil, fmt.Errorf("failed to unmarshal response: %v", err)
    }

    // Check for API errors
    if openAIResponse.Error != nil {
        return nil, fmt.Errorf("OpenAI API error: %s", openAIResponse.Error.Message)
    }

    return &openAIResponse, nil
}

func (c *Client) parseOpenAIResponse(response *OpenAIResponse) (*ParsedResponse, error) {
    if len(response.Choices) == 0 {
        return nil, fmt.Errorf("no choices in response")
    }

    content := response.Choices[0].Message.Content
    
    // Try to parse as JSON first
    var parsed ParsedResponse
    if err := json.Unmarshal([]byte(content), &parsed); err == nil {
        // Successfully parsed as JSON
        c.validateParsedResponse(&parsed)
        return &parsed, nil
    }

    // If JSON parsing fails, extract information using pattern matching
    log.Printf("⚠️  Response not in JSON format, using fallback parsing")
    return c.fallbackParsing(content), nil
}

func (c *Client) validateParsedResponse(parsed *ParsedResponse) {
    // Validate emotion
    validEmotions := []string{"neutral", "happy", "sad", "surprised", "angry", "thinking", "excited", "confused", "embarrassed"}
    if !contains(validEmotions, parsed.Emotion) {
        parsed.Emotion = "neutral"
    }

    // Validate emotion intensity
    if parsed.EmotionIntensity < 0 {
        parsed.EmotionIntensity = 0
    } else if parsed.EmotionIntensity > 1 {
        parsed.EmotionIntensity = 1
    }

    // Validate gesture
    validGestures := []string{"none", "wave", "nod", "shake_head", "shrug", "point", "thumbs_up", "clap", "thinking_pose"}
    if !contains(validGestures, parsed.Gesture) {
        parsed.Gesture = "none"
    }

    // Set default confidence
    if parsed.Confidence == 0 {
        parsed.Confidence = 0.8
    }
}

func (c *Client) fallbackParsing(content string) *ParsedResponse {
    // Simple fallback parsing using keywords
    text := strings.TrimSpace(content)
    
    // Extract emotion based on keywords
    emotion := "neutral"
    intensity := 0.5
    
    lowerContent := strings.ToLower(content)
    
    if strings.Contains(lowerContent, "happy") || strings.Contains(lowerContent, "glad") || 
       strings.Contains(lowerContent, "excited") || strings.Contains(lowerContent, "great") {
        emotion = "happy"
        intensity = 0.7
    } else if strings.Contains(lowerContent, "sad") || strings.Contains(lowerContent, "sorry") {
        emotion = "sad"
        intensity = 0.6
    } else if strings.Contains(lowerContent, "surprised") || strings.Contains(lowerContent, "wow") {
        emotion = "surprised"
        intensity = 0.8
    } else if strings.Contains(lowerContent, "think") || strings.Contains(lowerContent, "consider") {
        emotion = "thinking"
        intensity = 0.6
    }

    // Extract gesture based on keywords
    gesture := "none"
    if strings.Contains(lowerContent, "hello") || strings.Contains(lowerContent, "hi") {
        gesture = "wave"
    } else if strings.Contains(lowerContent, "yes") || strings.Contains(lowerContent, "agree") {
        gesture = "nod"
    } else if strings.Contains(lowerContent, "no") || strings.Contains(lowerContent, "disagree") {
        gesture = "shake_head"
    } else if strings.Contains(lowerContent, "think") {
        gesture = "thinking_pose"
    }

    return &ParsedResponse{
        Text:             text,
        Emotion:          emotion,
        EmotionIntensity: intensity,
        Gesture:          gesture,
        AnimationHints: map[string]interface{}{
            "head_tilt":   0.0,
            "eye_contact": true,
            "posture":     "upright",
        },
        Confidence: 0.6,
    }
}

func (c *Client) generateMockResponse(input UserMessage, character Character) *CharacterResponse {
    log.Printf("🎭 Generating mock response for: %s", input.Text)

    // Simple response generation based on input
    text := c.generateMockText(input.Text, character)
    emotion, intensity := c.determineMockEmotion(input.Text)
    gesture := c.determineMockGesture(input.Text)

    return &CharacterResponse{
        Text:             text,
        Emotion:          emotion,
        EmotionIntensity: intensity,
        Gesture:          gesture,
        AnimationData: map[string]interface{}{
            "head_tilt":   0.0,
            "eye_contact": true,
            "posture":     "upright",
        },
        Duration:  c.calculateResponseDuration(text),
        Timestamp: time.Now(),
    }
}

func (c *Client) generateMockText(input string, character Character) string {
    input = strings.ToLower(input)
    
    // Simple response patterns
    responses := map[string][]string{
        "hello": {
            "Hello there! It's great to see you!",
            "Hi! How are you doing today?",
            "Hello! I'm so happy you're here!",
        },
        "how": {
            "I'm doing wonderfully, thank you for asking!",
            "I'm great! How about you?",
            "I'm feeling fantastic today!",
        },
        "what": {
            "That's an interesting question! Let me think about it.",
            "I'd be happy to help you with that!",
            "That's something I can definitely help you with!",
        },
        "thanks": {
            "You're very welcome!",
            "I'm so glad I could help!",
            "My pleasure! Is there anything else you'd like to know?",
        },
        "bye": {
            "Goodbye! It was lovely talking with you!",
            "See you later! Take care!",
            "Farewell! I hope to see you again soon!",
        },
    }

    // Find matching pattern
    for keyword, responseList := range responses {
        if strings.Contains(input, keyword) {
            // Return random response from list
            return responseList[int(time.Now().UnixNano())%len(responseList)]
        }
    }

    // Default responses
    defaultResponses := []string{
        "That's very interesting! Tell me more about that.",
        "I see what you mean. That sounds important to you.",
        "Thanks for sharing that with me! I appreciate it.",
        "That's a great point. I'd love to hear more of your thoughts.",
        "I'm listening! Please continue.",
    }

    return defaultResponses[int(time.Now().UnixNano())%len(defaultResponses)]
}

func (c *Client) determineMockEmotion(input string) (string, float64) {
    input = strings.ToLower(input)

    emotionMap := map[string][]interface{}{
        "happy":     {"happy", 0.8},
        "excited":   {"excited", 0.9},
        "great":     {"happy", 0.7},
        "love":      {"happy", 0.8},
        "sad":       {"sad", 0.7},
        "sorry":     {"sad", 0.6},
        "worried":   {"sad", 0.5},
        "angry":     {"angry", 0.7},
        "frustrated": {"angry", 0.6},
        "surprised": {"surprised", 0.8},
        "wow":       {"surprised", 0.9},
        "confused":  {"confused", 0.6},
        "think":     {"thinking", 0.6},
        "wonder":    {"thinking", 0.5},
    }

    for keyword, emotionData := range emotionMap {
        if strings.Contains(input, keyword) {
            return emotionData[0].(string), emotionData[1].(float64)
        }
    }

    return "neutral", 0.5
}

func (c *Client) determineMockGesture(input string) string {
    input = strings.ToLower(input)

    gestureMap := map[string]string{
        "hello":    "wave",
        "hi":       "wave",
        "bye":      "wave",
        "yes":      "nod",
        "agree":    "nod",
        "no":       "shake_head",
        "disagree": "shake_head",
        "think":    "thinking_pose",
        "wonder":   "thinking_pose",
        "good":     "thumbs_up",
        "great":    "thumbs_up",
        "awesome":  "thumbs_up",
        "dunno":    "shrug",
        "maybe":    "shrug",
    }

    for keyword, gesture := range gestureMap {
        if strings.Contains(input, keyword) {
            return gesture
        }
    }

    return "none"
}

func (c *Client) calculateResponseDuration(text string) float64 {
    // Simple duration calculation: ~150 words per minute
    words := len(strings.Fields(text))
    duration := float64(words) / 150.0 * 60.0 // Convert to seconds
    
    // Minimum 1 second, maximum 10 seconds
    if duration < 1.0 {
        duration = 1.0
    } else if duration > 10.0 {
        duration = 10.0
    }
    
    return duration
}

// Helper function to check if slice contains string
func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}
