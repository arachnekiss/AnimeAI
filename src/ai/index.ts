/**
 * AI Services Index - Main entry point for all AI services
 */

// Conversation Engine
export { 
  ConversationEngine,
  type PersonalityTraits,
  type ConversationContext,
  type ConversationMessage,
  type EmotionalState,
  type ConversationSettings,
  type ConversationResponse
} from './conversation/ConversationEngine';

// Analysis Engine
export {
  AnalysisEngine,
  type SentimentAnalysisResult,
  type BehaviorPattern,
  type UserProfile,
  type ContextAnalysis,
  type PredictionResult,
  type AnalysisMetrics
} from './analysis/AnalysisEngine';

// Generation Engine
export {
  GenerationEngine,
  type GenerationRequest,
  type DialogueGenerationOptions,
  type AnimationGenerationOptions,
  type GenerationResult,
  type DialogueResult,
  type AnimationResult,
  type PersonalityGenerationOptions,
  type StoryGenerationOptions
} from './generation/GenerationEngine';

/**
 * Integrated AI Service Manager
 * Coordinates all AI services and provides unified interface
 */
export class AIServiceManager {
  private conversationEngine: ConversationEngine;
  private analysisEngine: AnalysisEngine;
  private generationEngine: GenerationEngine;

  constructor(config: {
    apiEndpoint: string;
    apiKey: string;
    analysisConfig?: any;
    generationConfig?: any;
  }) {
    this.analysisEngine = new AnalysisEngine({
      modelEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      ...config.analysisConfig
    });

    this.generationEngine = new GenerationEngine({
      apiEndpoint: config.apiEndpoint,
      apiKey: config.apiKey,
      ...config.generationConfig
    });

    // ConversationEngine will be initialized with character-specific data
    this.conversationEngine = null as any;
  }

  /**
   * Initialize conversation engine for a specific character
   */
  initializeCharacterConversation(
    personality: PersonalityTraits,
    settings: ConversationSettings,
    context: ConversationContext
  ): void {
    this.conversationEngine = new ConversationEngine(
      personality,
      settings,
      context,
      { endpoint: '', apiKey: '' } // Will be configured
    );
  }

  /**
   * Get conversation engine instance
   */
  getConversationEngine(): ConversationEngine {
    if (!this.conversationEngine) {
      throw new Error('Conversation engine not initialized. Call initializeCharacterConversation first.');
    }
    return this.conversationEngine;
  }

  /**
   * Get analysis engine instance
   */
  getAnalysisEngine(): AnalysisEngine {
    return this.analysisEngine;
  }

  /**
   * Get generation engine instance
   */
  getGenerationEngine(): GenerationEngine {
    return this.generationEngine;
  }

  /**
   * Comprehensive response generation with analysis integration
   */
  async generateSmartResponse(userMessage: string, context: {
    characterId: string;
    userId: string;
    conversationHistory: ConversationMessage[];
  }): Promise<{
    response: ConversationResponse;
    analysis: SentimentAnalysisResult;
    prediction: PredictionResult;
  }> {
    // Analyze user message
    const analysis = await this.analysisEngine.analyzeSentiment(userMessage, {
      userId: context.userId,
      characterId: context.characterId,
      previousMessages: context.conversationHistory.slice(-5).map(m => m.content)
    });

    // Predict user behavior
    const prediction = await this.analysisEngine.predictUserBehavior(
      context.userId,
      userMessage,
      {
        recentMessages: context.conversationHistory.slice(-10).map(m => m.content),
        emotionalState: analysis.emotions
      }
    );

    // Generate response using conversation engine
    const response = await this.conversationEngine.generateResponse(userMessage, {
      emotionalContext: analysis.emotions,
      urgency: analysis.intensity,
      topicHints: analysis.keywords
    });

    // Update user profile based on interaction
    await this.analysisEngine.updateUserProfile(context.userId, {
      message: userMessage,
      response: response.content,
      emotionalState: analysis.emotions,
      timestamp: Date.now(),
      satisfaction: response.confidence
    });

    return {
      response,
      analysis,
      prediction
    };
  }

  /**
   * Generate character content (personality, animations, etc.)
   */
  async generateCharacterContent(type: 'personality' | 'animation' | 'dialogue', options: any): Promise<GenerationResult> {
    switch (type) {
      case 'personality':
        return await this.generationEngine.generatePersonality(options);
      case 'animation':
        return await this.generationEngine.generateAnimation(options);
      case 'dialogue':
        return await this.generationEngine.generateDialogue(options);
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }
  }

  /**
   * Analyze conversation context and provide recommendations
   */
  async analyzeConversationContext(messages: ConversationMessage[]): Promise<{
    context: ContextAnalysis;
    recommendations: string[];
  }> {
    const context = await this.analysisEngine.analyzeContext(
      messages.map(m => ({
        content: m.content,
        timestamp: m.timestamp,
        senderId: m.senderId
      }))
    );

    const recommendations = context.recommendedActions;

    return {
      context,
      recommendations
    };
  }

  /**
   * Get comprehensive AI metrics
   */
  getAIMetrics(): {
    analysis: AnalysisMetrics;
    conversationStats: any;
    generationStats: any;
  } {
    return {
      analysis: this.analysisEngine.getAnalysisMetrics(),
      conversationStats: this.conversationEngine ? {
        messagesProcessed: this.conversationEngine.getContext().messageHistory.length,
        relationshipLevel: this.conversationEngine.getContext().relationshipLevel,
        currentMood: this.conversationEngine.getContext().currentMood
      } : null,
      generationStats: {
        // Would track generation statistics
        totalGenerations: 0,
        averageQuality: 0,
        averageConfidence: 0
      }
    };
  }
}

export default AIServiceManager;
