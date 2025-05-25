/**
 * ConversationEngine - AI-powered conversation management
 * Handles character personality, context, and natural dialogue generation
 */

export interface PersonalityTraits {
  openness: number;        // 0-100: Creativity, curiosity, openness to experience
  conscientiousness: number; // 0-100: Organization, responsibility, self-discipline
  extraversion: number;    // 0-100: Sociability, assertiveness, energy
  agreeableness: number;   // 0-100: Cooperation, trust, empathy
  neuroticism: number;     // 0-100: Emotional stability, anxiety, stress
  intelligence: number;    // 0-100: Cognitive ability, problem-solving
  humor: number;          // 0-100: Wit, playfulness, humor appreciation
  empathy: number;        // 0-100: Understanding others' emotions
  creativity: number;     // 0-100: Imaginative thinking, artistic expression
  confidence: number;     // 0-100: Self-assurance, boldness
}

export interface ConversationContext {
  characterId: string;
  userId: string;
  sessionId: string;
  messageHistory: ConversationMessage[];
  currentMood: EmotionalState;
  relationshipLevel: number; // 0-100: How well the character knows the user
  topicHistory: string[];
  lastInteractionTime: number;
  conversationGoals: string[];
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  messageType: 'text' | 'voice' | 'action' | 'emotion';
  emotionalTone: EmotionalState;
  confidence: number;
  metadata?: {
    voiceData?: AudioBuffer;
    animationTriggers?: string[];
    contextTags?: string[];
  };
}

export interface EmotionalState {
  happiness: number;    // 0-100
  sadness: number;      // 0-100
  anger: number;        // 0-100
  fear: number;         // 0-100
  surprise: number;     // 0-100
  disgust: number;      // 0-100
  excitement: number;   // 0-100
  calmness: number;     // 0-100
}

export interface ConversationSettings {
  responseStyle: 'casual' | 'formal' | 'playful' | 'serious' | 'adaptive';
  verbosity: 'concise' | 'moderate' | 'detailed';
  creativityLevel: number; // 0-100
  emotionalExpressiveness: number; // 0-100
  memoryRetention: number; // 0-100: How much context to remember
  personalityStrength: number; // 0-100: How strongly personality affects responses
}

export interface ConversationResponse {
  content: string;
  emotionalState: EmotionalState;
  animationTriggers: string[];
  voiceParameters: {
    pitch: number;
    speed: number;
    volume: number;
    emotion: string;
  };
  confidence: number;
  contextUpdates: Partial<ConversationContext>;
}

export class ConversationEngine {
  private personality: PersonalityTraits;
  private settings: ConversationSettings;
  private context: ConversationContext;
  private apiEndpoint: string;
  private apiKey: string;

  constructor(
    personality: PersonalityTraits,
    settings: ConversationSettings,
    context: ConversationContext,
    apiConfig: { endpoint: string; apiKey: string }
  ) {
    this.personality = personality;
    this.settings = settings;
    this.context = context;
    this.apiEndpoint = apiConfig.endpoint;
    this.apiKey = apiConfig.apiKey;
  }

  /**
   * Generate a response to user input
   */
  async generateResponse(userMessage: string, options?: {
    emotionalContext?: EmotionalState;
    urgency?: number;
    topicHints?: string[];
  }): Promise<ConversationResponse> {
    try {
      // Update context with user message
      const userMsg: ConversationMessage = {
        id: this.generateMessageId(),
        senderId: this.context.userId,
        content: userMessage,
        timestamp: Date.now(),
        messageType: 'text',
        emotionalTone: options?.emotionalContext || this.getDefaultEmotionalState(),
        confidence: 1.0
      };

      this.context.messageHistory.push(userMsg);

      // Analyze user message for emotional content and intent
      const messageAnalysis = await this.analyzeMessage(userMessage);
      
      // Generate personality-driven prompt
      const prompt = this.buildPersonalityPrompt(userMessage, messageAnalysis);
      
      // Get AI response
      const aiResponse = await this.callAIService(prompt);
      
      // Process and enhance response
      const enhancedResponse = await this.enhanceResponse(aiResponse, messageAnalysis);
      
      // Update conversation context
      this.updateContext(enhancedResponse);
      
      return enhancedResponse;
    } catch (error) {
      console.error('Error generating conversation response:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Analyze user message for emotional content and intent
   */
  private async analyzeMessage(message: string): Promise<{
    intent: string;
    emotionalTone: EmotionalState;
    topics: string[];
    urgency: number;
    sentiment: number;
  }> {
    // Simple sentiment analysis (in production, use more sophisticated NLP)
    const positiveWords = ['happy', 'great', 'awesome', 'love', 'good', 'amazing', 'wonderful'];
    const negativeWords = ['sad', 'bad', 'hate', 'terrible', 'awful', 'horrible', 'angry'];
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'can', 'could', 'would'];
    
    const words = message.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    const questionCount = words.filter(word => questionWords.includes(word)).length;
    
    const sentiment = (positiveCount - negativeCount) / Math.max(words.length, 1);
    const isQuestion = questionCount > 0 || message.includes('?');
    
    return {
      intent: isQuestion ? 'question' : 'statement',
      emotionalTone: this.calculateEmotionalTone(sentiment),
      topics: this.extractTopics(message),
      urgency: this.calculateUrgency(message),
      sentiment
    };
  }

  /**
   * Build personality-driven prompt for AI service
   */
  private buildPersonalityPrompt(userMessage: string, analysis: any): string {
    const personalityDesc = this.getPersonalityDescription();
    const contextSummary = this.getContextSummary();
    const moodDesc = this.getMoodDescription();
    
    return `You are an AI character with the following personality:
${personalityDesc}

Current emotional state: ${moodDesc}
Conversation context: ${contextSummary}
Response style: ${this.settings.responseStyle}
Verbosity: ${this.settings.verbosity}

User message: "${userMessage}"
User's emotional tone: ${JSON.stringify(analysis.emotionalTone)}
Detected intent: ${analysis.intent}

Please respond as this character would, staying true to their personality and current emotional state. 
Keep the response ${this.settings.verbosity} and ${this.settings.responseStyle}.
Include any emotional reactions and animation cues in your response.`;
  }

  /**
   * Call external AI service
   */
  private async callAIService(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          prompt,
          max_tokens: this.getMaxTokens(),
          temperature: this.personality.creativity / 100,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.text || data.content || '';
    } catch (error) {
      console.error('AI service call failed:', error);
      throw error;
    }
  }

  /**
   * Enhance AI response with personality and emotional data
   */
  private async enhanceResponse(aiResponse: string, messageAnalysis: any): Promise<ConversationResponse> {
    // Extract animation triggers from response
    const animationTriggers = this.extractAnimationTriggers(aiResponse);
    
    // Calculate emotional state based on personality and content
    const emotionalState = this.calculateResponseEmotion(aiResponse, messageAnalysis);
    
    // Generate voice parameters
    const voiceParameters = this.generateVoiceParameters(emotionalState);
    
    // Clean up response text
    const cleanContent = this.cleanResponseText(aiResponse);
    
    return {
      content: cleanContent,
      emotionalState,
      animationTriggers,
      voiceParameters,
      confidence: this.calculateConfidence(aiResponse),
      contextUpdates: {
        currentMood: emotionalState,
        lastInteractionTime: Date.now()
      }
    };
  }

  /**
   * Extract animation triggers from response text
   */
  private extractAnimationTriggers(response: string): string[] {
    const triggers: string[] = [];
    const text = response.toLowerCase();
    
    // Define animation trigger patterns
    const triggerPatterns = {
      'wave': /wave|hello|hi|goodbye|bye/,
      'nod': /yes|agree|understand|nod/,
      'shake': /no|disagree|never/,
      'smile': /smile|happy|joy|laugh/,
      'frown': /sad|frown|disappointed/,
      'shrug': /don't know|maybe|shrug|unsure/,
      'point': /look|see|there|point/,
      'think': /think|consider|wonder|hmm/,
      'excited': /excited|amazing|wow|awesome/,
      'surprised': /surprised|shock|unexpected|wow/
    };

    for (const [trigger, pattern] of Object.entries(triggerPatterns)) {
      if (pattern.test(text)) {
        triggers.push(trigger);
      }
    }

    return triggers;
  }

  /**
   * Calculate emotional state for response
   */
  private calculateResponseEmotion(response: string, messageAnalysis: any): EmotionalState {
    const baseEmotion = this.context.currentMood;
    const personalityInfluence = this.getPersonalityEmotionalInfluence();
    const contentEmotion = this.analyzeResponseEmotion(response);
    
    // Blend emotions based on personality and content
    return {
      happiness: this.blendEmotions([
        baseEmotion.happiness,
        contentEmotion.happiness,
        personalityInfluence.happiness
      ]),
      sadness: this.blendEmotions([
        baseEmotion.sadness,
        contentEmotion.sadness,
        personalityInfluence.sadness
      ]),
      anger: this.blendEmotions([
        baseEmotion.anger,
        contentEmotion.anger,
        personalityInfluence.anger
      ]),
      fear: this.blendEmotions([
        baseEmotion.fear,
        contentEmotion.fear,
        personalityInfluence.fear
      ]),
      surprise: this.blendEmotions([
        baseEmotion.surprise,
        contentEmotion.surprise,
        personalityInfluence.surprise
      ]),
      disgust: this.blendEmotions([
        baseEmotion.disgust,
        contentEmotion.disgust,
        personalityInfluence.disgust
      ]),
      excitement: this.blendEmotions([
        baseEmotion.excitement,
        contentEmotion.excitement,
        personalityInfluence.excitement
      ]),
      calmness: this.blendEmotions([
        baseEmotion.calmness,
        contentEmotion.calmness,
        personalityInfluence.calmness
      ])
    };
  }

  /**
   * Generate voice parameters based on emotional state
   */
  private generateVoiceParameters(emotionalState: EmotionalState): {
    pitch: number;
    speed: number;
    volume: number;
    emotion: string;
  } {
    const dominantEmotion = this.getDominantEmotion(emotionalState);
    
    const baseParams = {
      pitch: 50,
      speed: 50,
      volume: 70,
      emotion: dominantEmotion
    };

    // Adjust parameters based on personality and emotion
    switch (dominantEmotion) {
      case 'happiness':
        baseParams.pitch += 10;
        baseParams.speed += 5;
        baseParams.volume += 10;
        break;
      case 'sadness':
        baseParams.pitch -= 15;
        baseParams.speed -= 10;
        baseParams.volume -= 15;
        break;
      case 'anger':
        baseParams.pitch += 5;
        baseParams.speed += 15;
        baseParams.volume += 20;
        break;
      case 'fear':
        baseParams.pitch += 20;
        baseParams.speed += 10;
        baseParams.volume -= 10;
        break;
      case 'excitement':
        baseParams.pitch += 15;
        baseParams.speed += 20;
        baseParams.volume += 15;
        break;
    }

    // Apply personality modifiers
    baseParams.pitch += (this.personality.extraversion - 50) * 0.2;
    baseParams.speed += (this.personality.extraversion - 50) * 0.3;
    baseParams.volume += (this.personality.confidence - 50) * 0.4;

    return baseParams;
  }

  // Helper methods
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultEmotionalState(): EmotionalState {
    return {
      happiness: 50,
      sadness: 0,
      anger: 0,
      fear: 0,
      surprise: 0,
      disgust: 0,
      excitement: 30,
      calmness: 70
    };
  }

  private calculateEmotionalTone(sentiment: number): EmotionalState {
    const baseState = this.getDefaultEmotionalState();
    
    if (sentiment > 0.1) {
      baseState.happiness = Math.min(100, 50 + sentiment * 50);
      baseState.excitement = Math.min(100, 30 + sentiment * 30);
    } else if (sentiment < -0.1) {
      baseState.sadness = Math.min(100, Math.abs(sentiment) * 50);
      baseState.calmness = Math.max(0, 70 - Math.abs(sentiment) * 30);
    }
    
    return baseState;
  }

  private extractTopics(message: string): string[] {
    // Simple topic extraction (in production, use more sophisticated NLP)
    const commonTopics = ['work', 'family', 'hobbies', 'movies', 'music', 'games', 'food', 'travel'];
    const words = message.toLowerCase().split(/\s+/);
    return commonTopics.filter(topic => words.includes(topic));
  }

  private calculateUrgency(message: string): number {
    const urgentWords = ['urgent', 'important', 'asap', 'quickly', 'help', 'emergency'];
    const words = message.toLowerCase().split(/\s+/);
    const urgentCount = words.filter(word => urgentWords.includes(word)).length;
    return Math.min(100, urgentCount * 30 + (message.includes('!') ? 20 : 0));
  }

  private getPersonalityDescription(): string {
    const traits = [];
    
    if (this.personality.extraversion > 70) traits.push('very outgoing and social');
    else if (this.personality.extraversion > 30) traits.push('moderately social');
    else traits.push('introverted and reserved');
    
    if (this.personality.agreeableness > 70) traits.push('kind and empathetic');
    else if (this.personality.agreeableness < 30) traits.push('direct and sometimes blunt');
    
    if (this.personality.humor > 70) traits.push('witty and playful');
    if (this.personality.intelligence > 80) traits.push('highly intelligent');
    if (this.personality.creativity > 70) traits.push('creative and imaginative');
    
    return traits.join(', ');
  }

  private getContextSummary(): string {
    const recentMessages = this.context.messageHistory.slice(-5);
    const topics = this.context.topicHistory.slice(-3);
    return `Recent conversation topics: ${topics.join(', ')}. Relationship level: ${this.context.relationshipLevel}/100`;
  }

  private getMoodDescription(): string {
    const dominant = this.getDominantEmotion(this.context.currentMood);
    const intensity = Math.max(...Object.values(this.context.currentMood));
    return `${dominant} (intensity: ${intensity}/100)`;
  }

  private getMaxTokens(): number {
    switch (this.settings.verbosity) {
      case 'concise': return 100;
      case 'moderate': return 200;
      case 'detailed': return 400;
      default: return 200;
    }
  }

  private getPersonalityEmotionalInfluence(): EmotionalState {
    return {
      happiness: this.personality.extraversion * 0.5 + this.personality.agreeableness * 0.3,
      sadness: (100 - this.personality.extraversion) * 0.3 + this.personality.neuroticism * 0.4,
      anger: (100 - this.personality.agreeableness) * 0.4 + this.personality.neuroticism * 0.2,
      fear: this.personality.neuroticism * 0.5,
      surprise: this.personality.openness * 0.4,
      disgust: (100 - this.personality.agreeableness) * 0.3,
      excitement: this.personality.extraversion * 0.6 + this.personality.openness * 0.2,
      calmness: (100 - this.personality.neuroticism) * 0.5 + this.personality.conscientiousness * 0.3
    };
  }

  private analyzeResponseEmotion(response: string): EmotionalState {
    // Simple emotion detection from text
    const text = response.toLowerCase();
    const emotions = this.getDefaultEmotionalState();
    
    if (/happy|joy|glad|excited|amazing|wonderful/.test(text)) {
      emotions.happiness += 30;
      emotions.excitement += 20;
    }
    if (/sad|sorry|unfortunately|disappointed/.test(text)) {
      emotions.sadness += 25;
    }
    if (/angry|frustrated|annoyed/.test(text)) {
      emotions.anger += 30;
    }
    
    return emotions;
  }

  private blendEmotions(values: number[]): number {
    const weighted = values.reduce((sum, val, index) => {
      const weight = index === 0 ? 0.5 : 0.25; // Base emotion has more weight
      return sum + val * weight;
    }, 0);
    return Math.max(0, Math.min(100, weighted));
  }

  private getDominantEmotion(emotionalState: EmotionalState): string {
    const emotions = Object.entries(emotionalState);
    const dominant = emotions.reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    return dominant[0];
  }

  private calculateConfidence(response: string): number {
    // Simple confidence calculation based on response characteristics
    let confidence = 70;
    
    if (response.includes('I think') || response.includes('maybe')) confidence -= 10;
    if (response.includes('definitely') || response.includes('certainly')) confidence += 15;
    if (response.length > 100) confidence += 10; // Longer responses often more confident
    
    return Math.max(0, Math.min(100, confidence));
  }

  private cleanResponseText(response: string): string {
    // Remove any unwanted formatting or metadata
    return response
      .replace(/\[.*?\]/g, '') // Remove bracketed content
      .replace(/\*.*?\*/g, '') // Remove asterisk content
      .trim();
  }

  private updateContext(response: ConversationResponse): void {
    // Add AI response to message history
    const aiMessage: ConversationMessage = {
      id: this.generateMessageId(),
      senderId: this.context.characterId,
      content: response.content,
      timestamp: Date.now(),
      messageType: 'text',
      emotionalTone: response.emotionalState,
      confidence: response.confidence,
      metadata: {
        animationTriggers: response.animationTriggers
      }
    };

    this.context.messageHistory.push(aiMessage);
    
    // Update current mood
    this.context.currentMood = response.emotionalState;
    
    // Limit message history size
    if (this.context.messageHistory.length > 50) {
      this.context.messageHistory = this.context.messageHistory.slice(-30);
    }
  }

  private getFallbackResponse(): ConversationResponse {
    const fallbackMessages = [
      "I'm sorry, I'm having trouble processing that right now.",
      "Could you repeat that? I didn't quite catch it.",
      "I'm experiencing some technical difficulties. Can we try again?",
      "I need a moment to think about that."
    ];
    
    const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    
    return {
      content: randomMessage,
      emotionalState: this.getDefaultEmotionalState(),
      animationTriggers: ['think'],
      voiceParameters: {
        pitch: 50,
        speed: 45,
        volume: 60,
        emotion: 'confused'
      },
      confidence: 30,
      contextUpdates: {}
    };
  }

  /**
   * Update personality traits
   */
  updatePersonality(newTraits: Partial<PersonalityTraits>): void {
    this.personality = { ...this.personality, ...newTraits };
  }

  /**
   * Update conversation settings
   */
  updateSettings(newSettings: Partial<ConversationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Reset conversation context
   */
  resetContext(): void {
    this.context.messageHistory = [];
    this.context.currentMood = this.getDefaultEmotionalState();
    this.context.relationshipLevel = 0;
    this.context.topicHistory = [];
    this.context.lastInteractionTime = Date.now();
  }
}

export default ConversationEngine;
