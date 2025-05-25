import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { CharacterStateManager } from './CharacterStateManager';
import { APIGateway } from './APIGateway';
import { QueueManager } from './QueueManager';
import { CacheService } from './CacheService';

interface UserSession {
  userId: string;
  characterId?: string;
  lastActivity: Date;
  preferences: {
    language: string;
    voiceEnabled: boolean;
    animationQuality: 'low' | 'medium' | 'high';
  };
}

interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'character';
  emotion?: string;
  voiceData?: Buffer;
}

interface AnimationEvent {
  type: 'emotion' | 'gesture' | 'idle' | 'speaking';
  data: any;
  duration?: number;
  priority: number;
}

export class WebSocketHandler {
  private io: SocketIOServer;
  private userSessions: Map<string, UserSession> = new Map();
  private characterStateManager: CharacterStateManager;
  private apiGateway: APIGateway;
  private queueManager: QueueManager;
  private cacheService: CacheService;

  constructor(
    server: HTTPServer,
    characterStateManager: CharacterStateManager,
    apiGateway: APIGateway,
    queueManager: QueueManager,
    cacheService: CacheService
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.characterStateManager = characterStateManager;
    this.apiGateway = apiGateway;
    this.queueManager = queueManager;
    this.cacheService = cacheService;

    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Initialize user session
      socket.on('user:init', (data: { userId: string; preferences?: any }) => {
        this.initializeUserSession(socket, data);
      });

      // Character management
      socket.on('character:load', (data: { characterId: string }) => {
        this.handleCharacterLoad(socket, data);
      });

      socket.on('character:generate', (data: { description: string; style?: string }) => {
        this.handleCharacterGeneration(socket, data);
      });

      socket.on('character:customize', (data: { characterId: string; customization: any }) => {
        this.handleCharacterCustomization(socket, data);
      });

      // Chat and conversation
      socket.on('chat:message', (data: { message: string; voiceData?: Buffer }) => {
        this.handleChatMessage(socket, data);
      });

      socket.on('chat:voice', (data: { audioBlob: Buffer }) => {
        this.handleVoiceMessage(socket, data);
      });

      // Animation control
      socket.on('animation:trigger', (data: AnimationEvent) => {
        this.handleAnimationTrigger(socket, data);
      });

      socket.on('animation:stop', (data: { animationType?: string }) => {
        this.handleAnimationStop(socket, data);
      });

      // User preferences
      socket.on('preferences:update', (data: any) => {
        this.handlePreferencesUpdate(socket, data);
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Error handling
      socket.on('error', (error: Error) => {
        console.error(`Socket error for ${socket.id}:`, error);
        socket.emit('error', { message: 'An error occurred', code: 'SOCKET_ERROR' });
      });
    });
  }

  private async initializeUserSession(socket: Socket, data: { userId: string; preferences?: any }): Promise<void> {
    try {
      const session: UserSession = {
        userId: data.userId,
        lastActivity: new Date(),
        preferences: {
          language: data.preferences?.language || 'en',
          voiceEnabled: data.preferences?.voiceEnabled || false,
          animationQuality: data.preferences?.animationQuality || 'medium'
        }
      };

      this.userSessions.set(socket.id, session);
      socket.join(`user:${data.userId}`);

      // Load cached character state if exists
      const cachedCharacter = await this.cacheService.get(`character:${data.userId}`);
      if (cachedCharacter) {
        session.characterId = cachedCharacter.id;
        socket.emit('character:loaded', cachedCharacter);
      }

      socket.emit('user:initialized', { 
        sessionId: socket.id,
        preferences: session.preferences 
      });

      console.log(`User session initialized: ${data.userId}`);
    } catch (error) {
      console.error('Error initializing user session:', error);
      socket.emit('error', { message: 'Failed to initialize session', code: 'INIT_ERROR' });
    }
  }

  private async handleCharacterLoad(socket: Socket, data: { characterId: string }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'NO_SESSION' });
        return;
      }

      const character = await this.characterStateManager.getCharacter(data.characterId);
      if (!character) {
        socket.emit('error', { message: 'Character not found', code: 'CHARACTER_NOT_FOUND' });
        return;
      }

      session.characterId = data.characterId;
      session.lastActivity = new Date();

      // Cache character for user
      await this.cacheService.set(`character:${session.userId}`, character, 3600);

      socket.emit('character:loaded', character);
      console.log(`Character loaded: ${data.characterId} for user: ${session.userId}`);
    } catch (error) {
      console.error('Error loading character:', error);
      socket.emit('error', { message: 'Failed to load character', code: 'LOAD_ERROR' });
    }
  }

  private async handleCharacterGeneration(socket: Socket, data: { description: string; style?: string }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'NO_SESSION' });
        return;
      }

      // Queue character generation job
      const jobId = await this.queueManager.addJob('character_generation', {
        userId: session.userId,
        description: data.description,
        style: data.style || 'anime',
        socketId: socket.id
      }, { priority: 1 });

      socket.emit('character:generation_started', { jobId });
      console.log(`Character generation queued: ${jobId} for user: ${session.userId}`);
    } catch (error) {
      console.error('Error queueing character generation:', error);
      socket.emit('error', { message: 'Failed to start character generation', code: 'GENERATION_ERROR' });
    }
  }

  private async handleCharacterCustomization(socket: Socket, data: { characterId: string; customization: any }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'NO_SESSION' });
        return;
      }

      const updatedCharacter = await this.characterStateManager.updateCharacter(
        data.characterId, 
        data.customization
      );

      // Update cache
      await this.cacheService.set(`character:${session.userId}`, updatedCharacter, 3600);

      socket.emit('character:updated', updatedCharacter);
      console.log(`Character customized: ${data.characterId} for user: ${session.userId}`);
    } catch (error) {
      console.error('Error customizing character:', error);
      socket.emit('error', { message: 'Failed to customize character', code: 'CUSTOMIZATION_ERROR' });
    }
  }

  private async handleChatMessage(socket: Socket, data: { message: string; voiceData?: Buffer }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.characterId) {
        socket.emit('error', { message: 'No character loaded', code: 'NO_CHARACTER' });
        return;
      }

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chatMessage: ChatMessage = {
        id: messageId,
        userId: session.userId,
        message: data.message,
        timestamp: new Date(),
        type: 'user',
        voiceData: data.voiceData
      };

      // Queue chat processing job
      const jobId = await this.queueManager.addJob('chat_processing', {
        message: chatMessage,
        characterId: session.characterId,
        socketId: socket.id,
        preferences: session.preferences
      }, { priority: 2 });

      socket.emit('chat:message_received', { messageId, jobId });
      session.lastActivity = new Date();

      console.log(`Chat message queued: ${jobId} for user: ${session.userId}`);
    } catch (error) {
      console.error('Error handling chat message:', error);
      socket.emit('error', { message: 'Failed to process message', code: 'CHAT_ERROR' });
    }
  }

  private async handleVoiceMessage(socket: Socket, data: { audioBlob: Buffer }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'NO_SESSION' });
        return;
      }

      // Queue voice transcription job
      const jobId = await this.queueManager.addJob('voice_transcription', {
        audioData: data.audioBlob,
        language: session.preferences.language,
        socketId: socket.id
      }, { priority: 2 });

      socket.emit('voice:processing_started', { jobId });
      session.lastActivity = new Date();

      console.log(`Voice transcription queued: ${jobId} for user: ${session.userId}`);
    } catch (error) {
      console.error('Error handling voice message:', error);
      socket.emit('error', { message: 'Failed to process voice', code: 'VOICE_ERROR' });
    }
  }

  private async handleAnimationTrigger(socket: Socket, data: AnimationEvent): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.characterId) {
        socket.emit('error', { message: 'No character loaded', code: 'NO_CHARACTER' });
        return;
      }

      // Update character animation state
      await this.characterStateManager.updateAnimationState(session.characterId, {
        type: data.type,
        data: data.data,
        duration: data.duration,
        priority: data.priority,
        timestamp: new Date()
      });

      // Broadcast animation to user
      socket.emit('animation:triggered', data);
      session.lastActivity = new Date();

      console.log(`Animation triggered: ${data.type} for character: ${session.characterId}`);
    } catch (error) {
      console.error('Error triggering animation:', error);
      socket.emit('error', { message: 'Failed to trigger animation', code: 'ANIMATION_ERROR' });
    }
  }

  private async handleAnimationStop(socket: Socket, data: { animationType?: string }): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session || !session.characterId) {
        socket.emit('error', { message: 'No character loaded', code: 'NO_CHARACTER' });
        return;
      }

      await this.characterStateManager.stopAnimation(session.characterId, data.animationType);
      socket.emit('animation:stopped', data);
      session.lastActivity = new Date();

      console.log(`Animation stopped: ${data.animationType || 'all'} for character: ${session.characterId}`);
    } catch (error) {
      console.error('Error stopping animation:', error);
      socket.emit('error', { message: 'Failed to stop animation', code: 'ANIMATION_STOP_ERROR' });
    }
  }

  private async handlePreferencesUpdate(socket: Socket, data: any): Promise<void> {
    try {
      const session = this.userSessions.get(socket.id);
      if (!session) {
        socket.emit('error', { message: 'Session not found', code: 'NO_SESSION' });
        return;
      }

      session.preferences = { ...session.preferences, ...data };
      session.lastActivity = new Date();

      // Cache updated preferences
      await this.cacheService.set(`preferences:${session.userId}`, session.preferences, 86400);

      socket.emit('preferences:updated', session.preferences);
      console.log(`Preferences updated for user: ${session.userId}`);
    } catch (error) {
      console.error('Error updating preferences:', error);
      socket.emit('error', { message: 'Failed to update preferences', code: 'PREFERENCES_ERROR' });
    }
  }

  private handleDisconnect(socket: Socket): void {
    const session = this.userSessions.get(socket.id);
    if (session) {
      console.log(`User disconnected: ${session.userId}`);
      this.userSessions.delete(socket.id);
    } else {
      console.log(`Client disconnected: ${socket.id}`);
    }
  }

  // Public methods for external services
  public async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public async notifyJobCompletion(socketId: string, jobId: string, result: any): Promise<void> {
    this.io.to(socketId).emit('job:completed', { jobId, result });
  }

  public async notifyJobError(socketId: string, jobId: string, error: any): Promise<void> {
    this.io.to(socketId).emit('job:error', { jobId, error });
  }

  public getActiveUsers(): number {
    return this.userSessions.size;
  }

  public getUserSessions(): Map<string, UserSession> {
    return this.userSessions;
  }

  private startCleanupInterval(): void {
    // Clean up inactive sessions every 30 minutes
    setInterval(() => {
      const now = new Date();
      const timeout = 30 * 60 * 1000; // 30 minutes

      for (const [socketId, session] of this.userSessions.entries()) {
        if (now.getTime() - session.lastActivity.getTime() > timeout) {
          console.log(`Cleaning up inactive session: ${session.userId}`);
          this.userSessions.delete(socketId);
          this.io.to(socketId).disconnect(true);
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
  }
}
