/**
 * API Gateway - Centralized API management for OpenAI services
 */

import OpenAI from 'openai';
import { CacheService } from './CacheService';
import { QueueManager } from './QueueManager';
import { logger } from '../utils/logger';
import type { EmotionState, CharacterPersonality, ConversationMessage } from '../../engine/types';

interface APIGatewayConfig {
  openaiApiKey: string;
  cacheService: CacheService;
  queueManager: QueueManager;
  maxRetries?: number;
  retryDelay?: number;
}

interface CharacterGenerationOptions {
  style?: 'anime' | 'realistic' | 'cartoon';
  gender?: 'male' | 'female' | 'neutral';
  age?: 'child' | 'teen' | 'adult' | 'elderly';
  mood?: string;
}

export class APIGateway {
  private openai: OpenAI;
  private cacheService: CacheService;
  private queueManager: QueueManager;
  private config: Required<APIGatewayConfig>;

  constructor(config: APIGatewayConfig) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });

    this.cacheService = config.cacheService;
    this.queueManager = config.queueManager;
  }

  /**
   * Generate character using DALL-E 3
   */
  async generateCharacter(
    description: string,
    options: CharacterGenerationOptions = {}
  ): Promise<any> {
    const cacheKey = `character:${Buffer.from(description + JSON.stringify(options)).toString('base64')}`;
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      logger.info('Character generation cache hit');
      return JSON.parse(cached);
    }

    return this.queueManager.addTask('character-generation', async () => {
      try {
        // Create detailed prompt for DALL-E 3
        const prompt = this.buildCharacterPrompt(description, options);
        
        logger.info(`Generating character with prompt: ${prompt}`);
        
        const response = await this.openai.images.generate({
          model: "dall-e-3",
          prompt,
          size: "1024x1024",
          quality: "hd",
          style: "vivid",
          n: 1,
        });

        if (!response.data[0]?.url) {
          throw new Error('No image generated');
        }

        const character = {
          id: `char_${Date.now()}`,
          name: this.extractNameFromDescription(description),
          description,
          imageUrl: response.data[0].url,
          personality: this.generatePersonality(description),
          createdAt: new Date().toISOString(),
          options,
        };

        // Cache the result
        await this.cacheService.set(cacheKey, JSON.stringify(character), 3600); // 1 hour
        
        logger.info(`Character generated successfully: ${character.id}`);
        return character;
        
      } catch (error) {
        logger.error('Character generation failed:', error);
        throw new Error('Failed to generate character');
      }
    });
  }

  /**
   * Process conversation with GPT-4
   */
  async processConversation(
    message: string,
    characterId: string,
    conversationHistory: ConversationMessage[] = []
  ): Promise<{
    content: string;
    emotion: EmotionState;
    gesture?: string;
  }> {
    return this.queueManager.addTask('conversation', async () => {
      try {
        // Get character personality
        const character = await this.getCharacterPersonality(characterId);
        
        // Build conversation context
        const messages = this.buildConversationMessages(message, character, conversationHistory);
        
        logger.info(`Processing conversation for character ${characterId}`);
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages,
          max_tokens: 500,
          temperature: 0.8,
          presence_penalty: 0.6,
          frequency_penalty: 0.3,
        });

        const content = response.choices[0]?.message?.content || '';
        
        if (!content) {
          throw new Error('No response generated');
        }

        // Analyze emotion in the response
        const emotion = await this.analyzeEmotion(content);
        
        // Determine appropriate gesture
        const gesture = this.determineGesture(content, emotion);
        
        logger.info(`Conversation processed successfully`);
        
        return {
          content,
          emotion,
          gesture,
        };
        
      } catch (error) {
        logger.error('Conversation processing failed:', error);
        throw new Error('Failed to process conversation');
      }
    });
  }

  /**
   * Transcribe audio using Whisper API
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    return this.queueManager.addTask('transcription', async () => {
      try {
        logger.info('Transcribing audio');
        
        // Create a temporary file from buffer
        const file = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });
        
        const response = await this.openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
          language: 'en',
        });

        const transcript = response.text.trim();
        logger.info(`Audio transcribed: "${transcript}"`);
        
        return transcript;
        
      } catch (error) {
        logger.error('Audio transcription failed:', error);
        throw new Error('Failed to transcribe audio');
      }
    });
  }

  /**
   * Synthesize speech using TTS API
   */
  async synthesizeSpeech(text: string, voice: string = 'alloy'): Promise<string> {
    const cacheKey = `tts:${Buffer.from(text + voice).toString('base64')}`;
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      logger.info('TTS cache hit');
      return cached;
    }

    return this.queueManager.addTask('tts', async () => {
      try {
        logger.info(`Synthesizing speech: "${text.substring(0, 50)}..."`);
        
        const response = await this.openai.audio.speech.create({
          model: 'tts-1',
          voice: voice as any,
          input: text,
          response_format: 'mp3',
        });

        // Convert response to base64 URL
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const audioUrl = `data:audio/mp3;base64,${buffer.toString('base64')}`;
        
        // Cache the result
        await this.cacheService.set(cacheKey, audioUrl, 1800); // 30 minutes
        
        logger.info('Speech synthesized successfully');
        return audioUrl;
        
      } catch (error) {
        logger.error('Speech synthesis failed:', error);
        throw new Error('Failed to synthesize speech');
      }
    });
  }

  /**
   * Analyze emotion in text
   */
  async analyzeEmotion(text: string): Promise<EmotionState> {
    const cacheKey = `emotion:${Buffer.from(text).toString('base64')}`;
    
    // Check cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    return this.queueManager.addTask('emotion-analysis', async () => {
      try {
        logger.info('Analyzing emotion in text');
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `Analyze the emotional content of the text and return emotion scores as JSON.
              Return values between 0-1 for: happiness, sadness, anger, surprise, fear, disgust, neutral, arousal, valence.
              Arousal is energy level (0=calm, 1=excited), valence is positivity (-1=negative, 1=positive).
              Only return valid JSON, no other text.`
            },
            {
              role: "user",
              content: text
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
        });

        const content = response.choices[0]?.message?.content || '{}';
        const emotion = JSON.parse(content) as EmotionState;
        
        // Validate and normalize emotion values
        const normalizedEmotion: EmotionState = {
          happiness: Math.max(0, Math.min(1, emotion.happiness || 0)),
          sadness: Math.max(0, Math.min(1, emotion.sadness || 0)),
          anger: Math.max(0, Math.min(1, emotion.anger || 0)),
          surprise: Math.max(0, Math.min(1, emotion.surprise || 0)),
          fear: Math.max(0, Math.min(1, emotion.fear || 0)),
          disgust: Math.max(0, Math.min(1, emotion.disgust || 0)),
          neutral: Math.max(0, Math.min(1, emotion.neutral || 0.5)),
          arousal: Math.max(0, Math.min(1, emotion.arousal || 0.5)),
          valence: Math.max(-1, Math.min(1, emotion.valence || 0)),
        };
        
        // Cache the result
        await this.cacheService.set(cacheKey, JSON.stringify(normalizedEmotion), 1800);
        
        logger.info('Emotion analysis completed');
        return normalizedEmotion;
        
      } catch (error) {
        logger.error('Emotion analysis failed:', error);
        // Return neutral emotion on failure
        return {
          happiness: 0.5,
          sadness: 0,
          anger: 0,
          surprise: 0,
          fear: 0,
          disgust: 0,
          neutral: 0.5,
          arousal: 0.5,
          valence: 0,
        };
      }
    });
  }

  /**
   * Build character prompt for DALL-E 3
   */
  private buildCharacterPrompt(description: string, options: CharacterGenerationOptions): string {
    let prompt = `Create a high-quality ${options.style || 'anime'} style character portrait. `;
    prompt += `${description}. `;
    
    if (options.gender) {
      prompt += `Gender: ${options.gender}. `;
    }
    
    if (options.age) {
      prompt += `Age appearance: ${options.age}. `;
    }
    
    if (options.mood) {
      prompt += `Mood: ${options.mood}. `;
    }
    
    prompt += 'High detail, expressive eyes, clear features, centered composition, clean background. ';
    prompt += 'Professional illustration quality, suitable for character animation.';
    
    return prompt;
  }

  /**
   * Extract character name from description
   */
  private extractNameFromDescription(description: string): string {
    // Simple name extraction - could be enhanced with NLP
    const words = description.split(' ');
    const nameIndicators = ['named', 'called', 'name', 'character'];
    
    for (let i = 0; i < words.length; i++) {
      if (nameIndicators.includes(words[i].toLowerCase()) && words[i + 1]) {
        return words[i + 1].replace(/[^a-zA-Z]/g, '');
      }
    }
    
    // Fallback to first capitalized word
    for (const word of words) {
      if (word[0]?.toUpperCase() === word[0] && word.length > 2) {
        return word.replace(/[^a-zA-Z]/g, '');
      }
    }
    
    return 'Character';
  }

  /**
   * Generate personality from description
   */
  private generatePersonality(description: string): CharacterPersonality {
    return {
      name: this.extractNameFromDescription(description),
      description,
      traits: ['friendly', 'helpful', 'curious'],
      speaking_style: 'conversational',
      emotional_range: {
        expressiveness: 0.7,
        stability: 0.6,
        reactivity: 0.5,
      },
      conversation_context: description,
    };
  }

  /**
   * Get character personality
   */
  private async getCharacterPersonality(characterId: string): Promise<CharacterPersonality> {
    // This would normally fetch from database
    return {
      name: 'AI Character',
      description: 'A helpful AI character companion',
      traits: ['friendly', 'helpful', 'intelligent'],
      speaking_style: 'warm and conversational',
      emotional_range: {
        expressiveness: 0.8,
        stability: 0.7,
        reactivity: 0.6,
      },
      conversation_context: 'You are a helpful AI character who loves to chat and help users.',
    };
  }

  /**
   * Build conversation messages for GPT-4
   */
  private buildConversationMessages(
    message: string,
    character: CharacterPersonality,
    history: ConversationMessage[]
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are ${character.name}, ${character.description}. 
        Your personality traits: ${character.traits.join(', ')}.
        Speaking style: ${character.speaking_style}.
        Context: ${character.conversation_context}
        
        Respond naturally and in character. Keep responses concise but engaging.
        Show appropriate emotions based on the conversation.`
      }
    ];

    // Add recent conversation history (last 10 messages)
    const recentHistory = history.slice(-10);
    recentHistory.forEach(msg => {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Determine appropriate gesture based on content and emotion
   */
  private determineGesture(content: string, emotion: EmotionState): string {
    const contentLower = content.toLowerCase();
    
    if (emotion.happiness > 0.7) {
      return 'happy_wave';
    } else if (emotion.surprise > 0.6) {
      return 'surprised_gesture';
    } else if (emotion.sadness > 0.5) {
      return 'sad_gesture';
    } else if (contentLower.includes('hello') || contentLower.includes('hi')) {
      return 'greeting_wave';
    } else if (contentLower.includes('bye') || contentLower.includes('goodbye')) {
      return 'farewell_wave';
    } else if (contentLower.includes('?')) {
      return 'thinking_gesture';
    } else {
      return 'idle_talk';
    }
  }
}
