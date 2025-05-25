import Bull, { Queue, Job, JobOptions } from 'bull';
import { APIGateway } from './APIGateway';
import { CharacterStateManager } from './CharacterStateManager';
import { WebSocketHandler } from './WebSocketHandler';

interface JobData {
  id: string;
  type: JobType;
  payload: any;
  userId: string;
  socketId?: string;
  createdAt: Date;
  retries: number;
  maxRetries: number;
}

type JobType = 
  | 'character_generation'
  | 'chat_processing'
  | 'voice_transcription'
  | 'voice_synthesis'
  | 'animation_processing'
  | 'image_analysis'
  | 'emotion_detection';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
}

export class QueueManager {
  private queues: Map<JobType, Queue> = new Map();
  private apiGateway: APIGateway;
  private characterStateManager: CharacterStateManager;
  private webSocketHandler: WebSocketHandler | null = null;
  private isInitialized: boolean = false;

  constructor(apiGateway: APIGateway, characterStateManager: CharacterStateManager) {
    this.apiGateway = apiGateway;
    this.characterStateManager = characterStateManager;
    this.initializeQueues();
  }

  setWebSocketHandler(webSocketHandler: WebSocketHandler): void {
    this.webSocketHandler = webSocketHandler;
  }

  private initializeQueues(): void {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    };

    const jobTypes: JobType[] = [
      'character_generation',
      'chat_processing',
      'voice_transcription',
      'voice_synthesis',
      'animation_processing',
      'image_analysis',
      'emotion_detection'
    ];

    for (const jobType of jobTypes) {
      try {
        const queue = new Bull(jobType, {
          redis: redisConfig,
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 50,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          }
        });

        this.setupQueueProcessor(queue, jobType);
        this.setupQueueEvents(queue, jobType);
        this.queues.set(jobType, queue);

        console.log(`Queue initialized: ${jobType}`);
      } catch (error) {
        console.error(`Failed to initialize queue ${jobType}:`, error);
      }
    }

    this.isInitialized = true;
  }

  private setupQueueProcessor(queue: Queue, jobType: JobType): void {
    queue.process(async (job: Job<JobData>) => {
      const startTime = Date.now();
      console.log(`Processing job: ${job.id} (${jobType})`);

      try {
        let result: any;

        switch (jobType) {
          case 'character_generation':
            result = await this.processCharacterGeneration(job.data);
            break;
          case 'chat_processing':
            result = await this.processChatMessage(job.data);
            break;
          case 'voice_transcription':
            result = await this.processVoiceTranscription(job.data);
            break;
          case 'voice_synthesis':
            result = await this.processVoiceSynthesis(job.data);
            break;
          case 'animation_processing':
            result = await this.processAnimation(job.data);
            break;
          case 'image_analysis':
            result = await this.processImageAnalysis(job.data);
            break;
          case 'emotion_detection':
            result = await this.processEmotionDetection(job.data);
            break;
          default:
            throw new Error(`Unknown job type: ${jobType}`);
        }

        const processingTime = Date.now() - startTime;
        console.log(`Job completed: ${job.id} in ${processingTime}ms`);

        // Notify client via WebSocket
        if (this.webSocketHandler && job.data.socketId) {
          await this.webSocketHandler.notifyJobCompletion(job.data.socketId, job.id as string, result);
        }

        return { success: true, data: result, processingTime };
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`Job failed: ${job.id}`, error);

        // Notify client of error
        if (this.webSocketHandler && job.data.socketId) {
          await this.webSocketHandler.notifyJobError(job.data.socketId, job.id as string, {
            message: error.message,
            type: jobType
          });
        }

        throw error;
      }
    });
  }

  private setupQueueEvents(queue: Queue, jobType: JobType): void {
    queue.on('completed', (job: Job, result: ProcessingResult) => {
      console.log(`Job ${job.id} (${jobType}) completed successfully`);
    });

    queue.on('failed', (job: Job, error: Error) => {
      console.error(`Job ${job.id} (${jobType}) failed:`, error.message);
    });

    queue.on('stalled', (job: Job) => {
      console.warn(`Job ${job.id} (${jobType}) stalled`);
    });

    queue.on('progress', (job: Job, progress: number) => {
      if (this.webSocketHandler && job.data.socketId) {
        this.webSocketHandler.io.to(job.data.socketId).emit('job:progress', {
          jobId: job.id,
          progress,
          type: jobType
        });
      }
    });
  }

  async addJob(
    type: JobType,
    payload: any,
    options: JobOptions & { priority?: number } = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('QueueManager not initialized');
    }

    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`Queue not found for type: ${type}`);
    }

    const jobData: JobData = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      userId: payload.userId || 'anonymous',
      socketId: payload.socketId,
      createdAt: new Date(),
      retries: 0,
      maxRetries: options.attempts || 3
    };

    const job = await queue.add(jobData, {
      ...options,
      priority: options.priority || 0,
      delay: options.delay || 0
    });

    console.log(`Job queued: ${job.id} (${type})`);
    return job.id as string;
  }

  async getJob(jobId: string, type: JobType): Promise<Job | null> {
    const queue = this.queues.get(type);
    if (!queue) return null;

    return await queue.getJob(jobId);
  }

  async getQueueStats(type?: JobType): Promise<QueueStats | Map<JobType, QueueStats>> {
    if (type) {
      const queue = this.queues.get(type);
      if (!queue) {
        throw new Error(`Queue not found for type: ${type}`);
      }

      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      const delayed = await queue.getDelayed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: await queue.isPaused() ? 1 : 0
      };
    } else {
      const stats = new Map<JobType, QueueStats>();
      
      for (const [queueType, queue] of this.queues.entries()) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        const delayed = await queue.getDelayed();

        stats.set(queueType, {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          paused: await queue.isPaused() ? 1 : 0
        });
      }

      return stats;
    }
  }

  // Job processors
  private async processCharacterGeneration(data: JobData): Promise<any> {
    const { description, style, userId } = data.payload;

    // Generate character image using DALL-E 3
    const imageResult = await this.apiGateway.generateCharacterImage(description, style);
    if (!imageResult.success) {
      throw new Error(`Image generation failed: ${imageResult.error}`);
    }

    // Analyze image for rigging
    const analysisResult = await this.apiGateway.analyzeImage(imageResult.data.imageUrl);
    if (!analysisResult.success) {
      throw new Error(`Image analysis failed: ${analysisResult.error}`);
    }

    // Create character with generated data
    const character = await this.characterStateManager.createCharacter({
      name: `Character_${Date.now()}`,
      imageUrl: imageResult.data.imageUrl,
      mesh: analysisResult.data.mesh,
      bones: analysisResult.data.bones,
      emotions: ['neutral', 'happy', 'sad', 'angry', 'surprised', 'confused'],
      personality: description
    }, userId, {
      prompt: description,
      style,
      generatedAt: new Date()
    });

    return {
      character,
      imageUrl: imageResult.data.imageUrl,
      analysisData: analysisResult.data
    };
  }

  private async processChatMessage(data: JobData): Promise<any> {
    const { message, characterId, preferences } = data.payload;

    // Get character for context
    const character = await this.characterStateManager.getCharacter(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Generate AI response
    const chatResult = await this.apiGateway.chatWithCharacter(
      message.message,
      character.personality,
      preferences.language
    );

    if (!chatResult.success) {
      throw new Error(`Chat processing failed: ${chatResult.error}`);
    }

    // Detect emotion from response
    const emotionResult = await this.apiGateway.detectEmotion(chatResult.data.response);
    
    // Update character animation state with detected emotion
    if (emotionResult.success) {
      await this.characterStateManager.updateAnimationState(characterId, {
        type: 'emotion',
        data: { emotion: emotionResult.data.emotion, intensity: emotionResult.data.confidence },
        duration: 3000,
        priority: 2,
        timestamp: new Date()
      });
    }

    // Generate voice if enabled
    let voiceData = null;
    if (preferences.voiceEnabled) {
      const voiceResult = await this.apiGateway.generateSpeech(
        chatResult.data.response,
        preferences.language
      );
      if (voiceResult.success) {
        voiceData = voiceResult.data;
      }
    }

    return {
      response: chatResult.data.response,
      emotion: emotionResult.success ? emotionResult.data : null,
      voiceData,
      timestamp: new Date()
    };
  }

  private async processVoiceTranscription(data: JobData): Promise<any> {
    const { audioData, language } = data.payload;

    const transcriptionResult = await this.apiGateway.transcribeAudio(audioData, language);
    if (!transcriptionResult.success) {
      throw new Error(`Voice transcription failed: ${transcriptionResult.error}`);
    }

    return {
      transcript: transcriptionResult.data.text,
      confidence: transcriptionResult.data.confidence,
      language: transcriptionResult.data.language
    };
  }

  private async processVoiceSynthesis(data: JobData): Promise<any> {
    const { text, language, voice } = data.payload;

    const synthesisResult = await this.apiGateway.generateSpeech(text, language, voice);
    if (!synthesisResult.success) {
      throw new Error(`Voice synthesis failed: ${synthesisResult.error}`);
    }

    return synthesisResult.data;
  }

  private async processAnimation(data: JobData): Promise<any> {
    const { characterId, animationType, animationData } = data.payload;

    await this.characterStateManager.updateAnimationState(characterId, {
      type: animationType,
      data: animationData,
      duration: animationData.duration || 2000,
      priority: animationData.priority || 1,
      timestamp: new Date()
    });

    return {
      success: true,
      animationType,
      characterId
    };
  }

  private async processImageAnalysis(data: JobData): Promise<any> {
    const { imageUrl, analysisType } = data.payload;

    const analysisResult = await this.apiGateway.analyzeImage(imageUrl, analysisType);
    if (!analysisResult.success) {
      throw new Error(`Image analysis failed: ${analysisResult.error}`);
    }

    return analysisResult.data;
  }

  private async processEmotionDetection(data: JobData): Promise<any> {
    const { text, imageUrl } = data.payload;

    let result;
    if (text) {
      result = await this.apiGateway.detectEmotion(text);
    } else if (imageUrl) {
      result = await this.apiGateway.analyzeImage(imageUrl, 'emotion');
    } else {
      throw new Error('No input provided for emotion detection');
    }

    if (!result.success) {
      throw new Error(`Emotion detection failed: ${result.error}`);
    }

    return result.data;
  }

  // Queue management
  async pauseQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (queue) {
      await queue.pause();
      console.log(`Queue paused: ${type}`);
    }
  }

  async resumeQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (queue) {
      await queue.resume();
      console.log(`Queue resumed: ${type}`);
    }
  }

  async clearQueue(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (queue) {
      await queue.empty();
      console.log(`Queue cleared: ${type}`);
    }
  }

  async retryFailedJobs(type: JobType): Promise<void> {
    const queue = this.queues.get(type);
    if (queue) {
      const failedJobs = await queue.getFailed();
      for (const job of failedJobs) {
        await job.retry();
      }
      console.log(`Retried ${failedJobs.length} failed jobs in queue: ${type}`);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    console.log('Shutting down queue manager...');
    
    for (const [type, queue] of this.queues.entries()) {
      try {
        await queue.close();
        console.log(`Queue closed: ${type}`);
      } catch (error) {
        console.error(`Error closing queue ${type}:`, error);
      }
    }

    this.queues.clear();
    console.log('QueueManager cleanup completed');
  }
}
