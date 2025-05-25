// Character Generation Utilities with Real AI Integration
import { Character, Bone, CharacterMesh, AnimationClip } from '../../engine/types';
import { createSampleCharacter } from './sampleCharacters';

interface CharacterGenerationOptions {
  name?: string;
  style?: 'anime' | 'realistic' | 'cartoon' | 'chibi';
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  personality?: string[];
  clothing?: string;
  accessories?: string[];
}

interface ImageAnalysisResult {
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  style: 'anime' | 'realistic' | 'cartoon' | 'chibi';
  mood: string;
  estimatedAge: string;
  features: string[];
}

// Real AI-powered character generation from text prompt using OpenAI
export const generateCharacterFromPrompt = async (prompt: string): Promise<Character> => {
  console.log('🤖 Generating character from prompt using OpenAI API:', prompt);
  
  try {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('⚠️ OpenAI API key not configured, using fallback generation');
      return await generateCharacterFromPromptFallback(prompt);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a character designer for an anime character animation engine. 
            Create detailed character descriptions in JSON format with the following structure:
            {
              "name": "character name",
              "style": "anime|realistic|cartoon|chibi",
              "hairColor": "specific color",
              "eyeColor": "specific color", 
              "skinTone": "specific tone",
              "personality": ["trait1", "trait2", "trait3"],
              "clothing": "clothing description",
              "accessories": ["accessory1", "accessory2"],
              "backstory": "brief character background",
              "specialAbilities": ["ability1", "ability2"]
            }
            Be creative and specific with colors and traits.`
          },
          {
            role: 'user',
            content: `Create an anime character based on this description: ${prompt}`
          }
        ],
        max_tokens: 800,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const characterData = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    console.log('✅ AI character data generated:', characterData);
    
    // Convert AI response to character options
    const options: CharacterGenerationOptions = {
      name: characterData.name || 'AI Generated Character',
      style: characterData.style || 'anime',
      hairColor: characterData.hairColor || 'brown',
      eyeColor: characterData.eyeColor || 'brown',
      skinTone: characterData.skinTone || 'medium',
      personality: characterData.personality || ['friendly'],
      clothing: characterData.clothing || 'casual outfit',
      accessories: characterData.accessories || []
    };
    
    const character = createCharacterFromOptions(options);
    
    // Add AI-generated backstory and abilities
    character.backstory = characterData.backstory || 'A mysterious character with an unknown past.';
    character.specialAbilities = characterData.specialAbilities || [];
    
    return character;

  } catch (error) {
    console.error('❌ AI character generation failed:', error);
    console.log('🔄 Falling back to local generation');
    return await generateCharacterFromPromptFallback(prompt);
  }
};

// Fallback character generation (original simulation method)
const generateCharacterFromPromptFallback = async (prompt: string): Promise<Character> => {
  console.log('🎭 Using fallback character generation for:', prompt);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Parse prompt for character features
  const options = parsePromptForFeatures(prompt);
  
  // Generate character based on parsed options
  return createCharacterFromOptions(options);
};

// Real AI-powered character generation from image using OpenAI Vision
export const generateCharacterFromImage = async (imageFile: File): Promise<Character> => {
  console.log('🖼️ Generating character from image using OpenAI Vision API:', imageFile.name);
  
  try {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('⚠️ OpenAI API key not configured, using fallback generation');
      return await generateCharacterFromImageFallback(imageFile);
    }

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and create an anime character based on what you see. 
                Provide your response in JSON format:
                {
                  "name": "suggested character name",
                  "style": "anime|realistic|cartoon",
                  "hairColor": "detected hair color",
                  "eyeColor": "detected eye color",
                  "skinTone": "detected skin tone",
                  "personality": ["trait1", "trait2", "trait3"],
                  "clothing": "clothing description",
                  "accessories": ["accessory1", "accessory2"],
                  "backstory": "character background based on image",
                  "mood": "detected mood/expression",
                  "estimatedAge": "age category",
                  "specialAbilities": ["ability1", "ability2"]
                }
                Be creative and detailed in your analysis.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI Vision API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const characterData = JSON.parse(data.choices[0]?.message?.content || '{}');
    
    console.log('✅ AI image analysis completed:', characterData);
    
    // Convert AI analysis to character options
    const options: CharacterGenerationOptions = {
      name: characterData.name || `Character from ${imageFile.name}`,
      style: characterData.style === 'chibi' ? 'cartoon' : characterData.style || 'anime',
      hairColor: characterData.hairColor || 'brown',
      eyeColor: characterData.eyeColor || 'brown',
      skinTone: characterData.skinTone || 'medium',
      personality: characterData.personality || [characterData.mood || 'friendly'],
      clothing: characterData.clothing || 'casual',
      accessories: characterData.accessories || []
    };
    
    const character = createCharacterFromOptions(options);
    
    // Add AI analysis results
    character.backstory = characterData.backstory || 'A character inspired by an uploaded image.';
    character.specialAbilities = characterData.specialAbilities || [];
    character.metadata = {
      ...character.metadata,
      imageAnalysis: {
        originalFileName: imageFile.name,
        mood: characterData.mood,
        estimatedAge: characterData.estimatedAge,
        analysisTimestamp: new Date().toISOString()
      }
    };
    
    return character;

  } catch (error) {
    console.error('❌ AI image analysis failed:', error);
    console.log('🔄 Falling back to local analysis');
    return await generateCharacterFromImageFallback(imageFile);
  }
};

// Helper function to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Fallback image analysis (original simulation method)
const generateCharacterFromImageFallback = async (imageFile: File): Promise<Character> => {
  console.log('🎭 Using fallback image analysis for:', imageFile.name);
  
  // Simulate image analysis delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate image analysis results
  const analysis = await analyzeImage(imageFile);
  
  // Convert analysis to character options
  const options: CharacterGenerationOptions = {
    name: `Character from ${imageFile.name}`,
    style: analysis.style === 'chibi' ? 'cartoon' : analysis.style,
    hairColor: analysis.hairColor,
    eyeColor: analysis.eyeColor,
    skinTone: analysis.skinTone,
    personality: [analysis.mood, 'friendly'],
    clothing: 'casual',
    accessories: analysis.features
  };
  
  return createCharacterFromOptions(options);
};

// Parse text prompt for character features
const parsePromptForFeatures = (prompt: string): CharacterGenerationOptions => {
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract style
  let style: 'anime' | 'realistic' | 'cartoon' | 'chibi' = 'anime';
  if (lowerPrompt.includes('realistic')) style = 'realistic';
  else if (lowerPrompt.includes('cartoon')) style = 'cartoon';
  else if (lowerPrompt.includes('chibi')) style = 'chibi';
  
  // Extract colors
  const hairColors = ['blonde', 'brown', 'black', 'red', 'blue', 'pink', 'green', 'purple', 'silver', 'white'];
  const eyeColors = ['blue', 'brown', 'green', 'hazel', 'gray', 'amber', 'red', 'purple'];
  const skinTones = ['light', 'medium', 'dark', 'pale', 'tan'];
  
  const hairColor = hairColors.find(color => lowerPrompt.includes(color)) || 'brown';
  const eyeColor = eyeColors.find(color => lowerPrompt.includes(color)) || 'blue';
  const skinTone = skinTones.find(tone => lowerPrompt.includes(tone)) || 'medium';
  
  // Extract personality traits
  const personality: string[] = [];
  if (lowerPrompt.includes('happy') || lowerPrompt.includes('cheerful')) personality.push('happy');
  if (lowerPrompt.includes('serious') || lowerPrompt.includes('formal')) personality.push('serious');
  if (lowerPrompt.includes('shy') || lowerPrompt.includes('timid')) personality.push('shy');
  if (lowerPrompt.includes('energetic') || lowerPrompt.includes('excited')) personality.push('energetic');
  if (lowerPrompt.includes('cool') || lowerPrompt.includes('calm')) personality.push('calm');
  
  if (personality.length === 0) personality.push('friendly');
  
  return {
    name: extractNameFromPrompt(prompt) || 'AI Generated Character',
    style,
    hairColor,
    eyeColor,
    skinTone,
    personality,
    clothing: 'casual',
    accessories: []
  };
};

// Extract name from prompt
const extractNameFromPrompt = (prompt: string): string | undefined => {
  // Look for patterns like "named X" or "called X"
  const nameMatch = prompt.match(/(?:named|called)\s+([A-Z][a-z]+)/i);
  return nameMatch ? nameMatch[1] : undefined;
};

// Simulate image analysis
const analyzeImage = async (imageFile: File): Promise<ImageAnalysisResult> => {
  // Create a temporary URL for the image
  const imageUrl = URL.createObjectURL(imageFile);
  
  // In a real implementation, this would send the image to an AI vision model
  // For demo purposes, we'll simulate analysis based on file characteristics
  
  const analysisResults: ImageAnalysisResult[] = [
    {
      hairColor: 'brown',
      eyeColor: 'blue',
      skinTone: 'light',
      style: 'anime',
      mood: 'happy',
      estimatedAge: 'young',
      features: ['glasses', 'smile']
    },
    {
      hairColor: 'black',
      eyeColor: 'brown',
      skinTone: 'medium',
      style: 'realistic',
      mood: 'serious',
      estimatedAge: 'adult',
      features: ['professional', 'confident']
    },
    {
      hairColor: 'blonde',
      eyeColor: 'green',
      skinTone: 'pale',
      style: 'cartoon',
      mood: 'energetic',
      estimatedAge: 'young',
      features: ['bright', 'cheerful']
    }
  ];
  
  // Clean up the temporary URL
  URL.revokeObjectURL(imageUrl);
  
  // Return a random analysis result for demo
  return analysisResults[Math.floor(Math.random() * analysisResults.length)];
};

// Create character from generation options
const createCharacterFromOptions = (options: CharacterGenerationOptions): Character => {
  const baseCharacter = createSampleCharacter();
  
  // Generate unique ID
  const characterId = `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create customized character
  const customCharacter: Character = {
    ...baseCharacter,
    id: characterId,
    name: options.name || 'Generated Character',
    style: options.style || 'anime',
    personality: {
      name: options.name || 'Generated Character',
      description: `A ${options.style || 'anime'} character with ${options.hairColor || 'brown'} hair and ${options.eyeColor || 'blue'} eyes`,
      traits: options.personality || ['friendly'],
      speaking_style: options.personality?.includes('serious') ? 'formal and thoughtful' : 'casual and warm',
      emotional_range: {
        expressiveness: options.personality?.includes('energetic') ? 0.9 : 0.7,
        stability: options.personality?.includes('calm') ? 0.9 : 0.6,
        reactivity: options.personality?.includes('shy') ? 0.4 : 0.8
      },
      conversation_context: generatePersonalityContext(options)
    },
    metadata: {
      ...baseCharacter.metadata,
      generatedFrom: 'AI prompt',
      generation_options: options,
      creation_method: 'text-prompt'
    }
  };
  
  return customCharacter;
};

// Generate personality context based on options
const generatePersonalityContext = (options: CharacterGenerationOptions): string => {
  const traits = options.personality || ['friendly'];
  const style = options.style || 'anime';
  
  let context = `I am a ${style} character`;
  
  if (options.hairColor || options.eyeColor) {
    context += ` with ${options.hairColor || 'brown'} hair and ${options.eyeColor || 'blue'} eyes`;
  }
  
  if (traits.length > 0) {
    context += `. I am ${traits.join(', ')} and love interacting with people`;
  }
  
  context += '. How can I help you today?';
  
  return context;
};

// Generate random character variations
export const generateRandomCharacter = (): Character => {
  const styles: Array<'anime' | 'realistic' | 'cartoon'> = ['anime', 'realistic', 'cartoon'];
  const hairColors = ['brown', 'black', 'blonde', 'red', 'blue', 'pink', 'purple', 'silver'];
  const eyeColors = ['blue', 'brown', 'green', 'hazel', 'gray', 'amber', 'purple'];
  const personalities = [
    ['happy', 'energetic'],
    ['calm', 'thoughtful'],
    ['shy', 'gentle'],
    ['confident', 'outgoing'],
    ['mysterious', 'intelligent'],
    ['playful', 'cheerful']
  ];
  
  const names = [
    'Aria', 'Luna', 'Kai', 'Zoe', 'Alex', 'Maya', 'Jin', 'Nora',
    'Ren', 'Lila', 'Sage', 'Quinn', 'Nova', 'Zara', 'Kira', 'Leo'
  ];
  
  const options: CharacterGenerationOptions = {
    name: names[Math.floor(Math.random() * names.length)],
    style: styles[Math.floor(Math.random() * styles.length)],
    hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
    eyeColor: eyeColors[Math.floor(Math.random() * eyeColors.length)],
    personality: personalities[Math.floor(Math.random() * personalities.length)]
  };
  
  return createCharacterFromOptions(options);
};

// Export additional utility functions
export const getCharacterVariationPrompts = (): string[] => {
  return [
    "A cheerful anime girl with blue hair and green eyes",
    "A serious businessman with black hair and brown eyes", 
    "A playful cartoon character with rainbow hair",
    "A mysterious figure with silver hair and purple eyes",
    "A friendly chibi character with pink hair and blue eyes",
    "An energetic young person with red hair and amber eyes",
    "A calm and wise character with white hair and gray eyes",
    "A confident superhero with golden hair and bright blue eyes"
  ];
};
