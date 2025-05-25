import { Character, AnimationStateType, Emotion, Bone, CharacterData } from '../../engine/types';
import { CacheService } from './CacheService';

interface CharacterData extends Character {
  createdAt: Date;
  lastModified: Date;
  userId: string;
  version: number;
  metadata: {
    generationPrompt?: string;
    style?: string;
    totalInteractions: number;
    lastInteraction: Date;
  };
}

interface AnimationStateData {
  characterId: string;
  currentState: AnimationStateType;
  queuedAnimations: QueuedAnimation[];
  activeEmotions: ActiveEmotion[];
  lastUpdate: Date;
}

interface QueuedAnimation {
  id: string;
  type: 'emotion' | 'gesture' | 'idle' | 'speaking';
  data: any;
  duration?: number;
  priority: number;
  delay?: number;
  scheduledTime: Date;
}

interface ActiveEmotion {
  emotion: Emotion;
  intensity: number;
  startTime: Date;
  duration: number;
  fadeOut: boolean;
}

interface CharacterStats {
  totalCharacters: number;
  activeCharacters: number;
  averageInteractions: number;
  popularEmotions: { emotion: string; count: number }[];
}

export class CharacterStateManager {
  private characters: Map<string, CharacterData> = new Map();
  private animationStates: Map<string, AnimationStateData> = new Map();
  private cacheService: CacheService;
  private animationQueue: Map<string, QueuedAnimation[]> = new Map();
  private persistenceInterval: NodeJS.Timeout;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
    this.startPersistenceInterval();
    this.loadPersistedData();
  }

  // Character Management
  async createCharacter(characterData: Omit<Character, 'id'>, userId: string, metadata?: any): Promise<CharacterData> {
    const id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const character: CharacterData = {
      ...characterData,
      id,
      createdAt: new Date(),
      lastModified: new Date(),
      userId,
      version: 1,
      metadata: {
        generationPrompt: metadata?.prompt,
        style: metadata?.style || 'anime',
        totalInteractions: 0,
        lastInteraction: new Date(),
        ...metadata
      }
    };

    this.characters.set(id, character);
    
    // Initialize animation state
    const animationState: AnimationStateData = {
      characterId: id,
      currentState: 'idle',
      queuedAnimations: [],
      activeEmotions: [],
      lastUpdate: new Date()
    };
    this.animationStates.set(id, animationState);

    // Cache character
    await this.cacheService.set(`character:${id}`, character, 3600);
    await this.cacheService.set(`animation:${id}`, animationState, 1800);

    console.log(`Character created: ${id} for user: ${userId}`);
    return character;
  }

  async getCharacter(characterId: string): Promise<CharacterData | null> {
    // Try cache first
    const cached = await this.cacheService.get(`character:${characterId}`);
    if (cached) {
      return cached as CharacterData;
    }

    // Try memory
    const character = this.characters.get(characterId);
    if (character) {
      // Update cache
      await this.cacheService.set(`character:${characterId}`, character, 3600);
      return character;
    }

    return null;
  }

  async updateCharacter(characterId: string, updates: Partial<Character>): Promise<CharacterData | null> {
    const character = this.characters.get(characterId);
    if (!character) {
      return null;
    }

    const updatedCharacter: CharacterData = {
      ...character,
      ...updates,
      lastModified: new Date(),
      version: character.version + 1
    };

    this.characters.set(characterId, updatedCharacter);
    
    // Update cache
    await this.cacheService.set(`character:${characterId}`, updatedCharacter, 3600);
    
    console.log(`Character updated: ${characterId}`);
    return updatedCharacter;
  }

  async deleteCharacter(characterId: string): Promise<boolean> {
    const deleted = this.characters.delete(characterId);
    this.animationStates.delete(characterId);
    this.animationQueue.delete(characterId);

    if (deleted) {
      // Remove from cache
      await this.cacheService.delete(`character:${characterId}`);
      await this.cacheService.delete(`animation:${characterId}`);
      
      console.log(`Character deleted: ${characterId}`);
    }

    return deleted;
  }

  async getUserCharacters(userId: string): Promise<CharacterData[]> {
    const userCharacters: CharacterData[] = [];
    
    for (const character of this.characters.values()) {
      if (character.userId === userId) {
        userCharacters.push(character);
      }
    }

    return userCharacters.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
  }

  // Animation State Management
  async getAnimationState(characterId: string): Promise<AnimationStateData | null> {
    // Try cache first
    const cached = await this.cacheService.get(`animation:${characterId}`);
    if (cached) {
      return cached as AnimationStateData;
    }

    return this.animationStates.get(characterId) || null;
  }

  async updateAnimationState(characterId: string, animation: {
    type: 'emotion' | 'gesture' | 'idle' | 'speaking';
    data: any;
    duration?: number;
    priority: number;
    timestamp: Date;
  }): Promise<void> {
    let animationState = this.animationStates.get(characterId);
    
    if (!animationState) {
      animationState = {
        characterId,
        currentState: 'idle',
        queuedAnimations: [],
        activeEmotions: [],
        lastUpdate: new Date()
      };
    }

    // Create queued animation
    const queuedAnimation: QueuedAnimation = {
      id: `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: animation.type,
      data: animation.data,
      duration: animation.duration,
      priority: animation.priority,
      scheduledTime: animation.timestamp
    };

    // Add to queue based on priority
    animationState.queuedAnimations.push(queuedAnimation);
    animationState.queuedAnimations.sort((a, b) => b.priority - a.priority);

    // Process emotion animations immediately
    if (animation.type === 'emotion') {
      this.processEmotionAnimation(animationState, animation);
    }

    // Update current state if higher priority
    if (animation.priority >= 3 || animationState.currentState === 'idle') {
      animationState.currentState = animation.type as AnimationState;
    }

    animationState.lastUpdate = new Date();
    this.animationStates.set(characterId, animationState);

    // Update cache
    await this.cacheService.set(`animation:${characterId}`, animationState, 1800);

    // Update character interaction stats
    await this.updateCharacterStats(characterId);
  }

  private processEmotionAnimation(animationState: AnimationStateData, animation: any): void {
    const activeEmotion: ActiveEmotion = {
      emotion: animation.data.emotion || 'neutral',
      intensity: animation.data.intensity || 0.8,
      startTime: new Date(),
      duration: animation.duration || 3000,
      fadeOut: animation.data.fadeOut !== false
    };

    // Remove conflicting emotions
    animationState.activeEmotions = animationState.activeEmotions.filter(
      emotion => emotion.emotion !== activeEmotion.emotion
    );

    animationState.activeEmotions.push(activeEmotion);

    // Limit active emotions
    if (animationState.activeEmotions.length > 3) {
      animationState.activeEmotions = animationState.activeEmotions
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 3);
    }
  }

  async stopAnimation(characterId: string, animationType?: string): Promise<void> {
    const animationState = this.animationStates.get(characterId);
    if (!animationState) return;

    if (animationType) {
      // Remove specific animation type
      animationState.queuedAnimations = animationState.queuedAnimations.filter(
        anim => anim.type !== animationType
      );
      
      if (animationType === 'emotion') {
        animationState.activeEmotions = [];
      }
      
      if (animationState.currentState === animationType) {
        animationState.currentState = 'idle';
      }
    } else {
      // Stop all animations
      animationState.queuedAnimations = [];
      animationState.activeEmotions = [];
      animationState.currentState = 'idle';
    }

    animationState.lastUpdate = new Date();
    this.animationStates.set(characterId, animationState);

    // Update cache
    await this.cacheService.set(`animation:${characterId}`, animationState, 1800);
  }

  async processAnimationQueue(characterId: string): Promise<QueuedAnimation[]> {
    const animationState = this.animationStates.get(characterId);
    if (!animationState) return [];

    const now = new Date();
    const readyAnimations: QueuedAnimation[] = [];

    // Find animations ready to play
    animationState.queuedAnimations = animationState.queuedAnimations.filter(animation => {
      if (animation.scheduledTime <= now) {
        readyAnimations.push(animation);
        return false;
      }
      return true;
    });

    // Clean up expired emotions
    animationState.activeEmotions = animationState.activeEmotions.filter(emotion => {
      const elapsed = now.getTime() - emotion.startTime.getTime();
      return elapsed < emotion.duration;
    });

    if (readyAnimations.length > 0 || animationState.activeEmotions.length === 0) {
      animationState.lastUpdate = now;
      this.animationStates.set(characterId, animationState);
      
      // Update cache
      await this.cacheService.set(`animation:${characterId}`, animationState, 1800);
    }

    return readyAnimations;
  }

  // Character Statistics
  async updateCharacterStats(characterId: string): Promise<void> {
    const character = this.characters.get(characterId);
    if (!character) return;

    character.metadata.totalInteractions++;
    character.metadata.lastInteraction = new Date();
    character.lastModified = new Date();

    this.characters.set(characterId, character);
    
    // Update cache
    await this.cacheService.set(`character:${characterId}`, character, 3600);
  }

  async getCharacterStats(): Promise<CharacterStats> {
    const now = new Date();
    const activeThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    let totalCharacters = 0;
    let activeCharacters = 0;
    let totalInteractions = 0;
    const emotionCounts: Map<string, number> = new Map();

    for (const character of this.characters.values()) {
      totalCharacters++;
      totalInteractions += character.metadata.totalInteractions;

      if (now.getTime() - character.metadata.lastInteraction.getTime() < activeThreshold) {
        activeCharacters++;
      }

      // Count emotions from animation states
      const animationState = this.animationStates.get(character.id);
      if (animationState) {
        for (const emotion of animationState.activeEmotions) {
          const count = emotionCounts.get(emotion.emotion) || 0;
          emotionCounts.set(emotion.emotion, count + 1);
        }
      }
    }

    const popularEmotions = Array.from(emotionCounts.entries())
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCharacters,
      activeCharacters,
      averageInteractions: totalCharacters > 0 ? totalInteractions / totalCharacters : 0,
      popularEmotions
    };
  }

  // Bone and Rigging Management
  async updateCharacterBones(characterId: string, bones: Bone[]): Promise<boolean> {
    const character = this.characters.get(characterId);
    if (!character) return false;

    character.bones = bones;
    character.lastModified = new Date();
    character.version++;

    this.characters.set(characterId, character);
    
    // Update cache
    await this.cacheService.set(`character:${characterId}`, character, 3600);
    
    console.log(`Character bones updated: ${characterId}`);
    return true;
  }

  async getCharacterBones(characterId: string): Promise<Bone[] | null> {
    const character = await this.getCharacter(characterId);
    return character?.bones || null;
  }

  // Persistence
  private async loadPersistedData(): Promise<void> {
    try {
      // In a real implementation, this would load from a database
      // For now, we'll rely on cache and memory
      console.log('CharacterStateManager initialized');
    } catch (error) {
      console.error('Error loading persisted character data:', error);
    }
  }

  private startPersistenceInterval(): void {
    // Persist critical data every 5 minutes
    this.persistenceInterval = setInterval(async () => {
      try {
        // In a real implementation, this would save to a database
        // For now, we ensure cache is updated
        for (const [id, character] of this.characters.entries()) {
          await this.cacheService.set(`character:${id}`, character, 3600);
        }
        
        for (const [id, animationState] of this.animationStates.entries()) {
          await this.cacheService.set(`animation:${id}`, animationState, 1800);
        }
        
        console.log('Character data persisted to cache');
      } catch (error) {
        console.error('Error persisting character data:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
    }
    
    // Final persistence
    for (const [id, character] of this.characters.entries()) {
      await this.cacheService.set(`character:${id}`, character, 86400); // 24 hours
    }
    
    console.log('CharacterStateManager cleanup completed');
  }

  // Utility methods
  getAllCharacters(): CharacterData[] {
    return Array.from(this.characters.values());
  }

  getCharacterCount(): number {
    return this.characters.size;
  }

  getActiveAnimationStates(): AnimationStateData[] {
    return Array.from(this.animationStates.values());
  }
}
