/**
 * OpenAI API Routes
 * Handles AI image processing and character generation
 */

import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;

console.log('Debug: OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('Debug: OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('Debug: OPENAI_API_KEY starts with sk-:', process.env.OPENAI_API_KEY?.startsWith('sk-') || false);

if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-openai-api-key-here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI client initialized successfully');
} else {
  console.warn('⚠️  OpenAI API key not configured. OpenAI routes will return mock responses.');
}

// Helper function to check OpenAI availability
const requireOpenAI = () => {
  if (!openai) {
    throw new Error('OpenAI API not configured');
  }
  return openai;
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Schema validation
const CharacterExtractionSchema = z.object({
  image: z.string(),
});

const SkeletonGenerationSchema = z.object({
  imageData: z.object({
    width: z.number(),
    height: z.number(),
    data: z.array(z.number()),
  }),
});

/**
 * Character Extraction Endpoint
 * POST /api/openai/gpt-image-1/character-extract
 */
router.post('/gpt-image-1/character-extract', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    // Check if OpenAI is available
    if (!openai) {
      // Return mock response for development
      const mockResult = {
        id: `char_${Date.now()}`,
        name: "Mock Character",
        style: "anime",
        pose: "standing",
        emotions: ["neutral", "happy"],
        colors: {
          primary: "#FF6B6B",
          secondary: "#4ECDC4"
        },
        features: {
          hair: "long, flowing",
          eyes: "large, expressive",
          clothing: "casual modern outfit"
        },
        sourceImage: imageUrl,
        meta: {
          extractedAt: new Date().toISOString(),
          model: 'mock-dev',
          confidence: 0.85,
        }
      };
      return res.json(mockResult);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Updated to latest model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and extract character information. Return a JSON object with: id (unique), name, style (anime/realistic/cartoon), pose, emotions, colors (primary/secondary), and features (hair/eyes/clothing details)."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const characterData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Add metadata
    const result = {
      ...characterData,
      id: characterData.id || `char_${Date.now()}`,
      sourceImage: imageUrl,
      meta: {
        extractedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        confidence: 0.85,
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Character extraction error:', error);
    res.status(500).json({ 
      error: 'Character extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Skeleton Generation Endpoint
 * POST /api/openai/gpt-4.1-nano/skeleton-generate
 */
router.post('/gpt-4.1-nano/skeleton-generate', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
      return res.status(400).json({ error: 'Invalid image data provided' });
    }

    // Check if OpenAI is available
    if (!openai) {
      // Return mock response for development
      const mockResult = {
        joints: [
          { id: 'head', name: 'Head', x: imageData.width * 0.5, y: imageData.height * 0.15, parentId: null },
          { id: 'neck', name: 'Neck', x: imageData.width * 0.5, y: imageData.height * 0.25, parentId: 'head' },
          { id: 'spine', name: 'Spine', x: imageData.width * 0.5, y: imageData.height * 0.5, parentId: 'neck' },
          { id: 'hip', name: 'Hip', x: imageData.width * 0.5, y: imageData.height * 0.7, parentId: 'spine' }
        ],
        bones: [
          { id: 'bone1', startJoint: 'head', endJoint: 'neck', length: 20 },
          { id: 'bone2', startJoint: 'neck', endJoint: 'spine', length: 40 },
          { id: 'bone3', startJoint: 'spine', endJoint: 'hip', length: 30 }
        ],
        constraints: [
          { jointId: 'neck', minAngle: -30, maxAngle: 30 },
          { jointId: 'spine', minAngle: -15, maxAngle: 15 }
        ],
        meta: {
          generatedAt: new Date().toISOString(),
          model: 'mock-dev',
          imageSize: { width: imageData.width, height: imageData.height }
        }
      };
      return res.json(mockResult);
    }

    // Convert ImageData to a descriptive prompt
    const prompt = `Generate a 2D skeleton structure for character animation based on image dimensions ${imageData.width}x${imageData.height}. 
    Return a JSON object with:
    - joints: array of {id, name, x, y, parentId} for major body points
    - bones: array of {id, startJoint, endJoint, length} connecting joints
    - constraints: array of {jointId, minAngle, maxAngle} for realistic movement
    
    Include standard joints: head, neck, shoulders, elbows, wrists, spine, hips, knees, ankles.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a 2D animation expert. Generate realistic skeleton structures for character rigging."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const skeletonData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Normalize coordinates to image dimensions
    const normalizedSkeleton = {
      ...skeletonData,
      joints: skeletonData.joints?.map((joint: any) => ({
        ...joint,
        x: Math.max(0, Math.min(joint.x || 0, imageData.width)),
        y: Math.max(0, Math.min(joint.y || 0, imageData.height)),
      })) || [],
      meta: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        imageSize: { width: imageData.width, height: imageData.height },
      }
    };

    res.json(normalizedSkeleton);
  } catch (error) {
    console.error('Skeleton generation error:', error);
    res.status(500).json({ 
      error: 'Skeleton generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Multi-view Generation Endpoint
 * POST /api/openai/gpt-image-1/multiview-generate
 */
router.post('/gpt-image-1/multiview-generate', async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData || !imageData.width || !imageData.height) {
      return res.status(400).json({ error: 'Invalid image data provided' });
    }

    // Check if OpenAI is available
    if (!openai) {
      // Return mock response for development
      const mockResult = {
        frontView: { url: "placeholder-front", opacity: 1.0 },
        sideView: { url: "placeholder-side", opacity: 0.8 },
        backView: { url: "placeholder-back", opacity: 0.6 },
        layers: [
          { name: "background", zIndex: 0, blendMode: "normal", opacity: 1.0 },
          { name: "body", zIndex: 1, blendMode: "normal", opacity: 1.0 },
          { name: "head", zIndex: 2, blendMode: "normal", opacity: 1.0 },
          { name: "hair", zIndex: 3, blendMode: "multiply", opacity: 0.9 },
          { name: "clothing", zIndex: 4, blendMode: "normal", opacity: 1.0 },
          { name: "accessories", zIndex: 5, blendMode: "normal", opacity: 0.8 }
        ],
        meta: {
          generatedAt: new Date().toISOString(),
          model: 'mock-dev',
          imageSize: { width: imageData.width, height: imageData.height }
        }
      };
      return res.json(mockResult);
    }

    const prompt = `Generate multiple view layers for 2D character animation from a ${imageData.width}x${imageData.height} character image.
    
    Return a JSON object with:
    - frontView: {url: "placeholder", opacity: 1.0}
    - sideView: {url: "placeholder", opacity: 0.8}
    - backView: {url: "placeholder", opacity: 0.6}
    - layers: array of {name, zIndex, blendMode, opacity} for body parts
    
    Include layers for: background, body, head, hair, clothing, accessories.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a 2D animation expert specializing in character layer separation and multi-view generation."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1200,
    });

    const viewData = JSON.parse(response.choices[0].message.content || '{}');
    
    const result = {
      ...viewData,
      meta: {
        generatedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        sourceSize: { width: imageData.width, height: imageData.height },
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Multi-view generation error:', error);
    res.status(500).json({ 
      error: 'Multi-view generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Auto Rigging Endpoint
 * POST /api/openai/ai-rigger/rig
 */
router.post('/ai-rigger/rig', async (req, res) => {
  try {
    const { skeleton, viewLayers } = req.body;

    if (!skeleton || !viewLayers) {
      return res.status(400).json({ error: 'Skeleton and view layers are required' });
    }

    // Check if OpenAI is available
    if (!openai) {
      // Return mock response for development
      const mockResult = {
        character: {
          skeleton,
          viewLayers,
          riggedMesh: {
            vertices: [[0, 0], [100, 0], [50, 100]],
            faces: [[0, 1, 2]],
            weights: [1.0, 1.0, 1.0]
          },
          controlPoints: [
            { id: 'cp1', name: 'Main Control', x: 50, y: 50, influence: 1.0, type: 'transform' },
            { id: 'cp2', name: 'Head Control', x: 50, y: 25, influence: 0.8, type: 'rotation' }
          ],
          constraints: [
            { type: 'rotation', target: 'head', limits: { min: -30, max: 30 } },
            { type: 'position', target: 'body', limits: { x: [-10, 10], y: [-5, 5] } }
          ],
          animationData: {
            fps: 60,
            keyframes: [],
            curves: ['linear', 'ease-in-out']
          }
        },
        meta: {
          riggedAt: new Date().toISOString(),
          model: 'mock-dev',
          complexity: 'medium'
        }
      };
      return res.json(mockResult);
    }

    const prompt = `Create a rigged character structure for 2D animation.
    
    Input:
    - Skeleton with ${skeleton.joints?.length || 0} joints
    - View layers: ${Object.keys(viewLayers).join(', ')}
    
    Return a JSON object with:
    - riggedMesh: {vertices: [], faces: [], weights: []} for deformation
    - controlPoints: array of {id, name, x, y, influence, type} for animation handles
    - constraints: array of {type, target, limits} for realistic movement
    - animationData: {fps: 60, keyframes: [], curves: []} structure
    
    Ensure proper weight painting for smooth deformation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert in 2D character rigging and animation systems. Create production-ready rig data."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const rigData = JSON.parse(response.choices[0].message.content || '{}');
    
    const result = {
      character: {
        skeleton,
        viewLayers,
        rig: rigData,
      },
      meta: {
        riggedAt: new Date().toISOString(),
        model: 'gpt-4o-mini',
        version: '1.0',
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Auto rigging error:', error);
    res.status(500).json({ 
      error: 'Auto rigging failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
    }
  });
});

export default router;
