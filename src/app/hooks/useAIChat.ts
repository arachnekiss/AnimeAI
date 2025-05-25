import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  type: 'user' | 'character';
  content: string;
  timestamp: Date;
  emotion?: string;
  voiceData?: string;
  isLoading?: boolean;
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  characterId: string | null;
  userId: string;
}

interface ChatControls {
  sendMessage: (message: string, voiceData?: Blob) => Promise<void>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;
  setCharacter: (characterId: string) => void;
  clearMessages: () => void;
  connect: () => void;
  disconnect: () => void;
  retryConnection: () => void;
}

interface UseAIChatOptions {
  serverUrl?: string;
  userId: string;
  autoConnect?: boolean;
  maxMessages?: number;
  enableVoice?: boolean;
  language?: string;
}

interface ServerResponse {
  response: string;
  emotion?: {
    emotion: string;
    confidence: number;
  };
  voiceData?: string;
  timestamp: Date;
}

export const useAIChat = (options: UseAIChatOptions): [ChatState, ChatControls] => {
  const {
    serverUrl = 'http://localhost:3001',
    userId,
    autoConnect = true,
    maxMessages = 100,
    enableVoice = false,
    language = 'en'
  } = options;

  const [state, setState] = useState<ChatState>({
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null,
    characterId: null,
    userId
  });

  const socketRef = useRef<Socket | null>(null);
  const messageQueueRef = useRef<Array<{ message: string; voiceData?: Blob }>>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setState(prevState => ({
      ...prevState,
      error: null
    }));

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('Connected to chat server');
      reconnectAttempts.current = 0;

      // Initialize user session
      socket.emit('user:init', {
        userId,
        preferences: {
          language,
          voiceEnabled: enableVoice,
          animationQuality: 'medium'
        }
      });

      setState(prevState => ({
        ...prevState,
        isConnected: true,
        error: null
      }));

      // Process queued messages
      while (messageQueueRef.current.length > 0) {
        const queuedMessage = messageQueueRef.current.shift();
        if (queuedMessage) {
          sendMessage(queuedMessage.message, queuedMessage.voiceData);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      setState(prevState => ({
        ...prevState,
        isConnected: false,
        isLoading: false
      }));

      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }

      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        setTimeout(() => {
          reconnectAttempts.current++;
          connect();
        }, delay);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setState(prevState => ({
        ...prevState,
        error: `Connection failed: ${error.message}`,
        isConnected: false
      }));
    });

    // User session events
    socket.on('user:initialized', (data) => {
      console.log('User session initialized:', data);
    });

    // Character events
    socket.on('character:loaded', (character) => {
      console.log('Character loaded:', character);
      setState(prevState => ({
        ...prevState,
        characterId: character.id
      }));
    });

    // Chat message events
    socket.on('chat:message_received', (data) => {
      console.log('Message received by server:', data);
    });

    // Job completion events
    socket.on('job:completed', (data) => {
      const { jobId, result } = data;
      
      if (result.response) {
        // Add character response to messages
        const responseMessage: Message = {
          id: generateMessageId(),
          type: 'character',
          content: result.response,
          timestamp: new Date(result.timestamp),
          emotion: result.emotion?.emotion,
          voiceData: result.voiceData
        };

        setState(prevState => ({
          ...prevState,
          messages: [...prevState.messages, responseMessage].slice(-maxMessages),
          isLoading: false
        }));
      }

      if (result.transcript) {
        // Handle voice transcription result
        const transcriptMessage: Message = {
          id: generateMessageId(),
          type: 'user',
          content: result.transcript,
          timestamp: new Date(),
        };

        setState(prevState => ({
          ...prevState,
          messages: [...prevState.messages, transcriptMessage].slice(-maxMessages)
        }));

        // Send transcribed message as chat
        if (state.characterId) {
          socket.emit('chat:message', {
            message: {
              id: transcriptMessage.id,
              userId,
              message: result.transcript,
              timestamp: new Date(),
              type: 'user'
            }
          });
        }
      }
    });

    socket.on('job:error', (data) => {
      console.error('Job error:', data);
      setState(prevState => ({
        ...prevState,
        error: `Processing failed: ${data.error.message}`,
        isLoading: false
      }));
    });

    socket.on('job:progress', (data) => {
      console.log('Job progress:', data);
      // Could show progress indicator here
    });

    // Voice events
    socket.on('voice:processing_started', (data) => {
      console.log('Voice processing started:', data);
      setState(prevState => ({
        ...prevState,
        isLoading: true
      }));
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setState(prevState => ({
        ...prevState,
        error: error.message || 'An error occurred',
        isLoading: false
      }));
    });

  }, [serverUrl, userId, language, enableVoice, generateMessageId, maxMessages, state.characterId]);

  // Disconnect from server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prevState => ({
      ...prevState,
      isConnected: false,
      isLoading: false
    }));
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // Send text message
  const sendMessage = useCallback(async (message: string, voiceData?: Blob) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: generateMessageId(),
      type: 'user',
      content: message,
      timestamp: new Date(),
    };

    setState(prevState => ({
      ...prevState,
      messages: [...prevState.messages, userMessage].slice(-maxMessages),
      isLoading: true,
      error: null
    }));

    if (!socketRef.current?.connected) {
      // Queue message if not connected
      messageQueueRef.current.push({ message, voiceData });
      setState(prevState => ({
        ...prevState,
        error: 'Not connected to server. Message queued.',
        isLoading: false
      }));
      return;
    }

    if (!state.characterId) {
      setState(prevState => ({
        ...prevState,
        error: 'No character selected',
        isLoading: false
      }));
      return;
    }

    try {
      // Convert voice data to buffer if present
      let voiceBuffer;
      if (voiceData) {
        const arrayBuffer = await voiceData.arrayBuffer();
        voiceBuffer = Buffer.from(arrayBuffer);
      }

      socketRef.current.emit('chat:message', {
        message: {
          id: userMessage.id,
          userId,
          message,
          timestamp: new Date(),
          type: 'user',
          voiceData: voiceBuffer
        }
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prevState => ({
        ...prevState,
        error: 'Failed to send message',
        isLoading: false
      }));
    }
  }, [generateMessageId, maxMessages, state.characterId, userId]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    if (!socketRef.current?.connected) {
      setState(prevState => ({
        ...prevState,
        error: 'Not connected to server'
      }));
      return;
    }

    setState(prevState => ({
      ...prevState,
      isLoading: true,
      error: null
    }));

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      socketRef.current.emit('chat:voice', {
        audioBlob: audioBuffer
      });

    } catch (error) {
      console.error('Failed to send voice message:', error);
      setState(prevState => ({
        ...prevState,
        error: 'Failed to send voice message',
        isLoading: false
      }));
    }
  }, []);

  // Set character
  const setCharacter = useCallback((characterId: string) => {
    if (!socketRef.current?.connected) {
      setState(prevState => ({
        ...prevState,
        error: 'Not connected to server'
      }));
      return;
    }

    socketRef.current.emit('character:load', { characterId });
    setState(prevState => ({
      ...prevState,
      characterId
    }));
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      messages: []
    }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Handle browser visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, could pause connection or reduce activity
      } else {
        // Page is visible, ensure connection is active
        if (!socketRef.current?.connected && autoConnect) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoConnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const controls: ChatControls = {
    sendMessage,
    sendVoiceMessage,
    setCharacter,
    clearMessages,
    connect,
    disconnect,
    retryConnection
  };

  return [state, controls];
};
