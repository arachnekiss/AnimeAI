/**
 * Main Backend Server
 * Express server with WebSocket support for real-time communication
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import { APIGateway } from './services/APIGateway';
import { WebSocketHandler } from './services/WebSocketHandler';
import { CharacterStateManager } from './services/CharacterStateManager';
import { CacheService } from './services/CacheService';
import { QueueManager } from './services/QueueManager';
import openaiRoutes from './routes/openai';
import { logger } from './utils/logger';
// import { rateLimitMiddleware } from './middleware/rateLimit';
// import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  }
});

// Initialize services in proper order
const cacheService = new CacheService();
const characterStateManager = new CharacterStateManager(cacheService);

// Create temporary queue manager for APIGateway
const tempQueueManager = null;
const apiGateway = new APIGateway({
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  cacheService,
  queueManager: tempQueueManager as any // Will be set later
});

// Now create the real queue manager
const queueManager = new QueueManager(apiGateway, characterStateManager);

// Update APIGateway with real queue manager
(apiGateway as any).queueManager = queueManager;

const webSocketHandler = new WebSocketHandler(
  io,
  characterStateManager,
  apiGateway,
  queueManager,
  cacheService
);

// Set WebSocket handler for queue manager
queueManager.setWebSocketHandler(webSocketHandler);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(rateLimitMiddleware);

// API Routes

// OpenAI API routes
app.use('/api/openai', openaiRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const cacheStats = cacheService.getStats();
  const queueStats = await queueManager.getQueueStats();
  const characterStats = await characterStateManager.getCharacterStats();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      cache: {
        connected: cacheService.isRedisConnected(),
        stats: cacheStats
      },
      queues: queueStats,
      characters: characterStats,
      websocket: {
        activeUsers: webSocketHandler.getActiveUsers()
      }
    }
  });
});

// Character management
app.get('/api/characters', async (req, res, next) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const characters = await characterStateManager.getUserCharacters(userId as string);
    res.json({ characters });
  } catch (error) {
    next(error);
  }
});

app.get('/api/characters/:id', async (req, res, next) => {
  try {
    const character = await characterStateManager.getCharacter(req.params.id);
    
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    res.json({ character });
  } catch (error) {
    next(error);
  }
});

app.post('/api/characters/generate', async (req, res, next) => {
  try {
    const { description, style, userId } = req.body;
    
    if (!description || !userId) {
      return res.status(400).json({ error: 'Description and userId are required' });
    }

    // Queue character generation job
    const jobId = await queueManager.addJob('character_generation', {
      description,
      style: style || 'anime',
      userId
    }, { priority: 1 });

    res.json({ 
      message: 'Character generation started',
      jobId 
    });
  } catch (error) {
    next(error);
  }
});

// Character state management
app.get('/api/characters/:id', async (req, res, next) => {
  try {
    const character = await characterStateManager.getCharacter(req.params.id);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

app.post('/api/characters/:id/save', async (req, res, next) => {
  try {
    const { characterData } = req.body;
    await characterStateManager.saveCharacter(req.params.id, characterData);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Chat conversation
app.post('/api/chat/message', async (req, res, next) => {
  try {
    const { message, characterId, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await apiGateway.processConversation(
      message,
      characterId,
      conversationHistory
    );
    
    res.json({ response });
  } catch (error) {
    next(error);
  }
});

// Voice processing
app.post('/api/voice/transcribe', async (req, res, next) => {
  try {
    const { audioData } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const transcript = await apiGateway.transcribeAudio(audioData);
    res.json({ transcript });
  } catch (error) {
    next(error);
  }
});

app.post('/api/voice/synthesize', async (req, res, next) => {
  try {
    const { text, voice } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioUrl = await apiGateway.synthesizeSpeech(text, voice);
    res.json({ audioUrl });
  } catch (error) {
    next(error);
  }
});

// Emotion analysis
app.post('/api/analysis/emotion', async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const emotion = await apiGateway.analyzeEmotion(text);
    res.json({ emotion });
  } catch (error) {
    next(error);
  }
});

// Performance metrics
app.get('/api/metrics', async (req, res, next) => {
  try {
    const metrics = await queueManager.getMetrics();
    const cacheStats = await cacheService.getStats();
    
    res.json({
      queue: metrics,
      cache: cacheStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Serve static files in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });
}

// Error handling middleware
const errorHandler = (err: any, req: any, res: any, next: any) => {
  logger.error('Error occurred:', err);
  res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

// Handle WebSocket connections
webSocketHandler.initialize();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close services
  await cacheService.disconnect();
  await queueManager.shutdown();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Close services
  await cacheService.disconnect();
  await queueManager.shutdown();
  
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  logger.info(`API available at: http://localhost:${PORT}/api`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

export { app, server, io };
