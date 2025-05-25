/**
 * AnalysisEngine - Advanced AI analysis for character behavior and user interaction
 * Provides sentiment analysis, behavior prediction, and interaction optimization
 */

export interface SentimentAnalysisResult {
  overall: number; // -1 to 1 (negative to positive)
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
  };
  confidence: number;
  keywords: string[];
  intensity: number;
}

export interface BehaviorPattern {
  id: string;
  name: string;
  frequency: number;
  triggers: string[];
  responses: string[];
  emotionalStates: string[];
  confidence: number;
  lastOccurrence: number;
}

export interface UserProfile {
  userId: string;
  preferredTopics: string[];
  communicationStyle: 'formal' | 'casual' | 'playful' | 'serious';
  responsePreferences: {
    length: 'short' | 'medium' | 'long';
    emotionLevel: number; // 0-100
    creativityLevel: number; // 0-100
  };
  interactionPatterns: BehaviorPattern[];
  emotionalHistory: SentimentAnalysisResult[];
  relationshipMetrics: {
    trust: number;
    engagement: number;
    satisfaction: number;
  };
  lastUpdated: number;
}

export interface ContextAnalysis {
  currentContext: string;
  contextShift: boolean;
  topicCoherence: number;
  emotionalFlow: number;
  engagementLevel: number;
  recommendedActions: string[];
}

export interface PredictionResult {
  likelyResponses: Array<{
    response: string;
    probability: number;
    reasoning: string;
  }>;
  emotionalPredictions: {
    expected: SentimentAnalysisResult;
    alternatives: SentimentAnalysisResult[];
  };
  behaviorPredictions: BehaviorPattern[];
  confidence: number;
}

export interface AnalysisMetrics {
  accuracy: number;
  processingTime: number;
  dataQuality: number;
  confidenceLevel: number;
  samplesAnalyzed: number;
}

export class AnalysisEngine {
  private userProfiles: Map<string, UserProfile> = new Map();
  private behaviorPatterns: Map<string, BehaviorPattern[]> = new Map();
  private analysisHistory: Map<string, SentimentAnalysisResult[]> = new Map();
  private modelEndpoint: string;
  private apiKey: string;

  constructor(config: { modelEndpoint: string; apiKey: string }) {
    this.modelEndpoint = config.modelEndpoint;
    this.apiKey = config.apiKey;
  }

  /**
   * Perform comprehensive sentiment analysis on text
   */
  async analyzeSentiment(text: string, context?: {
    previousMessages?: string[];
    userId?: string;
    characterId?: string;
  }): Promise<SentimentAnalysisResult> {
    try {
      // Preprocess text
      const cleanText = this.preprocessText(text);
      
      // Extract linguistic features
      const features = this.extractLinguisticFeatures(cleanText);
      
      // Perform sentiment analysis
      const sentiment = await this.performSentimentAnalysis(cleanText, features);
      
      // Extract emotions using emotion detection model
      const emotions = await this.extractEmotions(cleanText, context);
      
      // Extract keywords and phrases
      const keywords = this.extractKeywords(cleanText);
      
      // Calculate confidence based on various factors
      const confidence = this.calculateSentimentConfidence(sentiment, emotions, features);
      
      const result: SentimentAnalysisResult = {
        overall: sentiment,
        emotions,
        confidence,
        keywords,
        intensity: this.calculateIntensity(emotions)
      };

      // Store result for future analysis
      if (context?.userId) {
        this.storeSentimentResult(context.userId, result);
      }

      return result;
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return this.getFallbackSentiment();
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeBehaviorPatterns(userId: string, messageHistory: Array<{
    content: string;
    timestamp: number;
    senderId: string;
    emotionalTone?: any;
  }>): Promise<BehaviorPattern[]> {
    try {
      const userMessages = messageHistory.filter(msg => msg.senderId === userId);
      
      if (userMessages.length < 5) {
        return []; // Need more data for pattern analysis
      }

      // Extract temporal patterns
      const temporalPatterns = this.analyzeTemporalPatterns(userMessages);
      
      // Extract linguistic patterns
      const linguisticPatterns = this.analyzeLinguisticPatterns(userMessages);
      
      // Extract emotional patterns
      const emotionalPatterns = this.analyzeEmotionalPatterns(userMessages);
      
      // Extract topic patterns
      const topicPatterns = this.analyzeTopicPatterns(userMessages);
      
      // Combine and rank patterns
      const allPatterns = [
        ...temporalPatterns,
        ...linguisticPatterns,
        ...emotionalPatterns,
        ...topicPatterns
      ];

      // Filter and rank by significance
      const significantPatterns = allPatterns
        .filter(pattern => pattern.confidence > 0.6)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 10);

      // Store patterns for user
      this.behaviorPatterns.set(userId, significantPatterns);

      return significantPatterns;
    } catch (error) {
      console.error('Behavior pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * Analyze conversation context and flow
   */
  async analyzeContext(messageHistory: Array<{
    content: string;
    timestamp: number;
    senderId: string;
  }>, windowSize: number = 10): Promise<ContextAnalysis> {
    try {
      const recentMessages = messageHistory.slice(-windowSize);
      
      // Analyze topic coherence
      const topicCoherence = await this.analyzeTopicCoherence(recentMessages);
      
      // Analyze emotional flow
      const emotionalFlow = await this.analyzeEmotionalFlow(recentMessages);
      
      // Detect context shifts
      const contextShift = await this.detectContextShift(recentMessages);
      
      // Calculate engagement level
      const engagementLevel = this.calculateEngagementLevel(recentMessages);
      
      // Determine current context
      const currentContext = await this.determineCurrentContext(recentMessages);
      
      // Generate recommendations
      const recommendedActions = this.generateContextRecommendations(
        topicCoherence,
        emotionalFlow,
        engagementLevel,
        contextShift
      );

      return {
        currentContext,
        contextShift,
        topicCoherence,
        emotionalFlow,
        engagementLevel,
        recommendedActions
      };
    } catch (error) {
      console.error('Context analysis failed:', error);
      return this.getFallbackContextAnalysis();
    }
  }

  /**
   * Predict likely user responses and behaviors
   */
  async predictUserBehavior(userId: string, currentMessage: string, context: {
    recentMessages: string[];
    emotionalState?: any;
    topicHistory?: string[];
  }): Promise<PredictionResult> {
    try {
      const userProfile = this.userProfiles.get(userId);
      const behaviorPatterns = this.behaviorPatterns.get(userId) || [];
      
      // Analyze current message for triggers
      const triggers = this.extractTriggers(currentMessage);
      
      // Find matching behavior patterns
      const matchingPatterns = behaviorPatterns.filter(pattern =>
        pattern.triggers.some(trigger => triggers.includes(trigger))
      );

      // Predict responses based on patterns
      const likelyResponses = await this.predictResponses(
        matchingPatterns,
        currentMessage,
        context,
        userProfile
      );

      // Predict emotional responses
      const emotionalPredictions = await this.predictEmotionalResponses(
        currentMessage,
        context,
        userProfile
      );

      // Predict behavior patterns
      const behaviorPredictions = this.predictBehaviorPatterns(
        matchingPatterns,
        context
      );

      // Calculate overall confidence
      const confidence = this.calculatePredictionConfidence(
        likelyResponses,
        emotionalPredictions,
        behaviorPredictions
      );

      return {
        likelyResponses,
        emotionalPredictions,
        behaviorPredictions,
        confidence
      };
    } catch (error) {
      console.error('Behavior prediction failed:', error);
      return this.getFallbackPrediction();
    }
  }

  /**
   * Update or create user profile
   */
  async updateUserProfile(userId: string, interactionData: {
    message: string;
    response: string;
    emotionalState: any;
    timestamp: number;
    satisfaction?: number;
  }): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = this.createInitialUserProfile(userId);
    }

    // Update preferred topics
    const topics = this.extractTopics(interactionData.message);
    profile.preferredTopics = this.updatePreferredTopics(profile.preferredTopics, topics);

    // Update communication style
    profile.communicationStyle = this.analyzeCommuncationStyle(interactionData.message);

    // Update response preferences
    profile.responsePreferences = this.updateResponsePreferences(
      profile.responsePreferences,
      interactionData.response
    );

    // Update emotional history
    const sentiment = await this.analyzeSentiment(interactionData.message);
    profile.emotionalHistory.push(sentiment);
    
    // Keep only recent history
    if (profile.emotionalHistory.length > 100) {
      profile.emotionalHistory = profile.emotionalHistory.slice(-50);
    }

    // Update relationship metrics
    profile.relationshipMetrics = this.updateRelationshipMetrics(
      profile.relationshipMetrics,
      interactionData
    );

    profile.lastUpdated = Date.now();
    this.userProfiles.set(userId, profile);

    return profile;
  }

  /**
   * Get analysis metrics and performance statistics
   */
  getAnalysisMetrics(): AnalysisMetrics {
    const totalAnalyses = Array.from(this.analysisHistory.values())
      .reduce((sum, analyses) => sum + analyses.length, 0);
    
    const avgConfidence = Array.from(this.analysisHistory.values())
      .flat()
      .reduce((sum, analysis) => sum + analysis.confidence, 0) / totalAnalyses || 0;

    return {
      accuracy: this.calculateAccuracy(),
      processingTime: this.getAverageProcessingTime(),
      dataQuality: this.assessDataQuality(),
      confidenceLevel: avgConfidence,
      samplesAnalyzed: totalAnalyses
    };
  }

  // Private helper methods

  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\.,!?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractLinguisticFeatures(text: string): {
    wordCount: number;
    avgWordLength: number;
    sentenceCount: number;
    questionMarks: number;
    exclamationMarks: number;
    capitalizedWords: number;
  } {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    return {
      wordCount: words.length,
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length || 0,
      sentenceCount: sentences.length,
      questionMarks: (text.match(/\?/g) || []).length,
      exclamationMarks: (text.match(/!/g) || []).length,
      capitalizedWords: words.filter(word => /^[A-Z]/.test(word)).length
    };
  }

  private async performSentimentAnalysis(text: string, features: any): Promise<number> {
    // Simple rule-based sentiment analysis (in production, use ML models)
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'love', 'like', 'enjoy', 'happy', 'pleased', 'satisfied'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
      'sad', 'angry', 'frustrated', 'disappointed', 'upset'
    ];

    const words = text.split(/\s+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });

    // Normalize score
    const normalizedScore = Math.max(-1, Math.min(1, score / Math.max(words.length / 10, 1)));
    
    // Apply feature-based adjustments
    if (features.exclamationMarks > 0) {
      normalizedScore *= 1.2; // Amplify sentiment with exclamation marks
    }

    return normalizedScore;
  }

  private async extractEmotions(text: string, context?: any): Promise<SentimentAnalysisResult['emotions']> {
    // Simple emotion detection (in production, use specialized models)
    const emotionKeywords = {
      joy: ['happy', 'joy', 'excited', 'cheerful', 'delighted'],
      anger: ['angry', 'mad', 'furious', 'irritated', 'annoyed'],
      fear: ['afraid', 'scared', 'worried', 'anxious', 'nervous'],
      sadness: ['sad', 'depressed', 'disappointed', 'miserable'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
      disgust: ['disgusted', 'revolted', 'sick', 'nauseated'],
      trust: ['trust', 'confident', 'reliable', 'secure'],
      anticipation: ['excited', 'eager', 'looking forward', 'anticipating']
    };

    const emotions: SentimentAnalysisResult['emotions'] = {
      joy: 0, anger: 0, fear: 0, sadness: 0,
      surprise: 0, disgust: 0, trust: 50, anticipation: 0
    };

    const words = text.toLowerCase().split(/\s+/);
    
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      const matches = words.filter(word => keywords.includes(word)).length;
      emotions[emotion as keyof typeof emotions] = Math.min(100, matches * 25);
    });

    return emotions;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  private calculateSentimentConfidence(
    sentiment: number,
    emotions: any,
    features: any
  ): number {
    let confidence = 70;
    
    // Higher confidence for stronger sentiments
    confidence += Math.abs(sentiment) * 20;
    
    // Higher confidence for more emotional language
    const emotionSum = Object.values(emotions).reduce((sum: number, val) => sum + (val as number), 0);
    confidence += Math.min(20, emotionSum / 100);
    
    // Adjust for text length
    if (features.wordCount < 5) confidence -= 15;
    if (features.wordCount > 20) confidence += 10;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private calculateIntensity(emotions: SentimentAnalysisResult['emotions']): number {
    const values = Object.values(emotions);
    const max = Math.max(...values);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.min(100, (max + average) / 2);
  }

  private analyzeTemporalPatterns(messages: any[]): BehaviorPattern[] {
    // Analyze timing patterns in user messages
    const patterns: BehaviorPattern[] = [];
    
    // Example: Regular timing patterns
    const intervals = messages.slice(1).map((msg, i) => 
      msg.timestamp - messages[i].timestamp
    );
    
    if (intervals.length > 5) {
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      
      if (avgInterval < 5000) { // Quick responses
        patterns.push({
          id: 'quick_responder',
          name: 'Quick Responder',
          frequency: 0.8,
          triggers: ['any'],
          responses: ['quick'],
          emotionalStates: ['engaged'],
          confidence: 0.7,
          lastOccurrence: Date.now()
        });
      }
    }
    
    return patterns;
  }

  private analyzeLinguisticPatterns(messages: any[]): BehaviorPattern[] {
    // Analyze language use patterns
    const patterns: BehaviorPattern[] = [];
    const allText = messages.map(msg => msg.content).join(' ');
    
    // Check for formal vs casual language
    const formalWords = ['please', 'thank you', 'would', 'could', 'may I'];
    const casualWords = ['hey', 'yeah', 'cool', 'awesome', 'lol'];
    
    const formalCount = formalWords.filter(word => allText.includes(word)).length;
    const casualCount = casualWords.filter(word => allText.includes(word)).length;
    
    if (formalCount > casualCount) {
      patterns.push({
        id: 'formal_speaker',
        name: 'Formal Communication',
        frequency: 0.8,
        triggers: ['greeting', 'request'],
        responses: ['formal'],
        emotionalStates: ['polite'],
        confidence: 0.75,
        lastOccurrence: Date.now()
      });
    }
    
    return patterns;
  }

  private analyzeEmotionalPatterns(messages: any[]): BehaviorPattern[] {
    // Analyze emotional patterns in messages
    const patterns: BehaviorPattern[] = [];
    
    // This would use the emotional tone data if available
    // For now, return empty array
    return patterns;
  }

  private analyzeTopicPatterns(messages: any[]): BehaviorPattern[] {
    // Analyze topic preferences and patterns
    const patterns: BehaviorPattern[] = [];
    const topics = messages.map(msg => this.extractTopics(msg.content)).flat();
    const topicCounts = topics.reduce((counts, topic) => {
      counts[topic] = (counts[topic] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    // Find dominant topics
    const dominantTopics = Object.entries(topicCounts)
      .filter(([topic, count]) => count > 2)
      .map(([topic]) => topic);
    
    if (dominantTopics.length > 0) {
      patterns.push({
        id: 'topic_preference',
        name: 'Topic Preference',
        frequency: 0.7,
        triggers: dominantTopics,
        responses: ['engaged'],
        emotionalStates: ['interested'],
        confidence: 0.8,
        lastOccurrence: Date.now()
      });
    }
    
    return patterns;
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction
    const topicKeywords = {
      'technology': ['computer', 'software', 'ai', 'tech', 'digital'],
      'entertainment': ['movie', 'music', 'game', 'show', 'film'],
      'personal': ['family', 'friend', 'relationship', 'personal'],
      'work': ['job', 'work', 'career', 'business', 'office']
    };
    
    const topics: string[] = [];
    const words = text.toLowerCase().split(/\s+/);
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => words.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics;
  }

  private storeSentimentResult(userId: string, result: SentimentAnalysisResult): void {
    if (!this.analysisHistory.has(userId)) {
      this.analysisHistory.set(userId, []);
    }
    
    const userHistory = this.analysisHistory.get(userId)!;
    userHistory.push(result);
    
    // Keep only recent history
    if (userHistory.length > 100) {
      userHistory.splice(0, userHistory.length - 50);
    }
  }

  private getFallbackSentiment(): SentimentAnalysisResult {
    return {
      overall: 0,
      emotions: {
        joy: 0, anger: 0, fear: 0, sadness: 0,
        surprise: 0, disgust: 0, trust: 50, anticipation: 0
      },
      confidence: 30,
      keywords: [],
      intensity: 20
    };
  }

  private getFallbackContextAnalysis(): ContextAnalysis {
    return {
      currentContext: 'general',
      contextShift: false,
      topicCoherence: 50,
      emotionalFlow: 50,
      engagementLevel: 50,
      recommendedActions: ['continue_conversation']
    };
  }

  private getFallbackPrediction(): PredictionResult {
    return {
      likelyResponses: [{
        response: 'neutral_response',
        probability: 0.5,
        reasoning: 'insufficient_data'
      }],
      emotionalPredictions: {
        expected: this.getFallbackSentiment(),
        alternatives: []
      },
      behaviorPredictions: [],
      confidence: 30
    };
  }

  // Additional helper methods would be implemented here...
  private async analyzeTopicCoherence(messages: any[]): Promise<number> {
    // Placeholder implementation
    return 75;
  }

  private async analyzeEmotionalFlow(messages: any[]): Promise<number> {
    // Placeholder implementation
    return 70;
  }

  private async detectContextShift(messages: any[]): Promise<boolean> {
    // Placeholder implementation
    return false;
  }

  private calculateEngagementLevel(messages: any[]): number {
    // Placeholder implementation
    return 80;
  }

  private async determineCurrentContext(messages: any[]): Promise<string> {
    // Placeholder implementation
    return 'casual_conversation';
  }

  private generateContextRecommendations(
    topicCoherence: number,
    emotionalFlow: number,
    engagementLevel: number,
    contextShift: boolean
  ): string[] {
    const recommendations: string[] = [];
    
    if (topicCoherence < 50) {
      recommendations.push('clarify_topic');
    }
    if (emotionalFlow < 40) {
      recommendations.push('address_emotional_state');
    }
    if (engagementLevel < 50) {
      recommendations.push('increase_engagement');
    }
    if (contextShift) {
      recommendations.push('acknowledge_context_change');
    }
    
    return recommendations;
  }

  private extractTriggers(message: string): string[] {
    // Placeholder implementation
    return ['general'];
  }

  private async predictResponses(
    patterns: BehaviorPattern[],
    message: string,
    context: any,
    profile?: UserProfile
  ): Promise<Array<{ response: string; probability: number; reasoning: string }>> {
    // Placeholder implementation
    return [{
      response: 'positive_engagement',
      probability: 0.7,
      reasoning: 'based_on_patterns'
    }];
  }

  private async predictEmotionalResponses(
    message: string,
    context: any,
    profile?: UserProfile
  ): Promise<{ expected: SentimentAnalysisResult; alternatives: SentimentAnalysisResult[] }> {
    // Placeholder implementation
    return {
      expected: this.getFallbackSentiment(),
      alternatives: []
    };
  }

  private predictBehaviorPatterns(patterns: BehaviorPattern[], context: any): BehaviorPattern[] {
    // Placeholder implementation
    return patterns.slice(0, 3);
  }

  private calculatePredictionConfidence(
    responses: any[],
    emotions: any,
    behaviors: any[]
  ): number {
    // Placeholder implementation
    return 65;
  }

  private createInitialUserProfile(userId: string): UserProfile {
    return {
      userId,
      preferredTopics: [],
      communicationStyle: 'casual',
      responsePreferences: {
        length: 'medium',
        emotionLevel: 50,
        creativityLevel: 50
      },
      interactionPatterns: [],
      emotionalHistory: [],
      relationshipMetrics: {
        trust: 50,
        engagement: 50,
        satisfaction: 50
      },
      lastUpdated: Date.now()
    };
  }

  private updatePreferredTopics(current: string[], newTopics: string[]): string[] {
    const combined = [...current, ...newTopics];
    const counts = combined.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  private analyzeCommuncationStyle(message: string): 'formal' | 'casual' | 'playful' | 'serious' {
    // Simple style detection
    const formalWords = ['please', 'thank you', 'would', 'could'];
    const casualWords = ['hey', 'yeah', 'cool', 'lol'];
    const playfulWords = ['haha', 'fun', 'awesome', 'wow'];
    
    const text = message.toLowerCase();
    
    if (formalWords.some(word => text.includes(word))) return 'formal';
    if (playfulWords.some(word => text.includes(word))) return 'playful';
    if (casualWords.some(word => text.includes(word))) return 'casual';
    
    return 'serious';
  }

  private updateResponsePreferences(current: any, response: string): any {
    // Analyze response and update preferences
    const wordCount = response.split(/\s+/).length;
    
    let length: 'short' | 'medium' | 'long' = 'medium';
    if (wordCount < 20) length = 'short';
    else if (wordCount > 50) length = 'long';
    
    return {
      ...current,
      length
    };
  }

  private updateRelationshipMetrics(current: any, interaction: any): any {
    // Update relationship metrics based on interaction
    const satisfaction = interaction.satisfaction || 70;
    
    return {
      trust: Math.min(100, current.trust + (satisfaction > 70 ? 1 : -1)),
      engagement: Math.min(100, current.engagement + (interaction.message.length > 10 ? 1 : 0)),
      satisfaction: (current.satisfaction * 0.9) + (satisfaction * 0.1)
    };
  }

  private calculateAccuracy(): number {
    // Placeholder - would need actual validation data
    return 75;
  }

  private getAverageProcessingTime(): number {
    // Placeholder - would track actual processing times
    return 150; // ms
  }

  private assessDataQuality(): number {
    // Placeholder - would assess data completeness and quality
    return 80;
  }
}

export default AnalysisEngine;
