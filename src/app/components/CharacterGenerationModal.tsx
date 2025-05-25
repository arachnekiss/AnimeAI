import React, { useState, useRef } from 'react';
import { Character } from '../../engine/types';
import { 
  generateCharacterFromPrompt, 
  generateCharacterFromImage, 
  generateRandomCharacter,
  getCharacterVariationPrompts 
} from '../utils/characterGeneration';

interface CharacterGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterGenerated: (character: Character) => void;
}

export const CharacterGenerationModal: React.FC<CharacterGenerationModalProps> = ({
  isOpen,
  onClose,
  onCharacterGenerated
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'image' | 'random'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const samplePrompts = getCharacterVariationPrompts();

  const handlePromptGeneration = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const character = await generateCharacterFromPrompt(prompt);
      setProgress(100);
      
      setTimeout(() => {
        onCharacterGenerated(character);
        onClose();
        resetForm();
      }, 500);
      
    } catch (error) {
      console.error('Error generating character:', error);
      alert('Failed to generate character. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleImageGeneration = async () => {
    if (!selectedFile) return;

    setIsGenerating(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 8, 90));
    }, 250);

    try {
      const character = await generateCharacterFromImage(selectedFile);
      setProgress(100);
      
      setTimeout(() => {
        onCharacterGenerated(character);
        onClose();
        resetForm();
      }, 500);
      
    } catch (error) {
      console.error('Error generating character from image:', error);
      alert('Failed to generate character from image. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const handleRandomGeneration = () => {
    setIsGenerating(true);
    
    // Quick random generation
    setTimeout(() => {
      const character = generateRandomCharacter();
      onCharacterGenerated(character);
      onClose();
      resetForm();
      setIsGenerating(false);
    }, 1000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    }
  };

  const resetForm = () => {
    setPrompt('');
    setSelectedFile(null);
    setProgress(0);
    setActiveTab('prompt');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="character-generation-modal-overlay" onClick={onClose}>
      <div className="character-generation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎭 Generate New Character</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'prompt' ? 'active' : ''}`}
            onClick={() => setActiveTab('prompt')}
          >
            💬 Text Prompt
          </button>
          <button 
            className={`tab ${activeTab === 'image' ? 'active' : ''}`}
            onClick={() => setActiveTab('image')}
          >
            🖼️ From Image
          </button>
          <button 
            className={`tab ${activeTab === 'random' ? 'active' : ''}`}
            onClick={() => setActiveTab('random')}
          >
            🎲 Random
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'prompt' && (
            <div className="prompt-tab">
              <h3>Describe your character:</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A cheerful anime girl with blue hair and green eyes who loves reading books..."
                rows={4}
                disabled={isGenerating}
              />
              
              <div className="sample-prompts">
                <h4>Sample prompts:</h4>
                <div className="prompt-chips">
                  {samplePrompts.slice(0, 4).map((sample, index) => (
                    <button
                      key={index}
                      className="prompt-chip"
                      onClick={() => setPrompt(sample)}
                      disabled={isGenerating}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className="generate-button"
                onClick={handlePromptGeneration}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? '🔄 Generating...' : '✨ Generate Character'}
              </button>
            </div>
          )}

          {activeTab === 'image' && (
            <div className="image-tab">
              <h3>Upload an image:</h3>
              <div className="file-upload-area">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isGenerating}
                  style={{ display: 'none' }}
                />
                <button 
                  className="file-upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                >
                  📁 Choose Image File
                </button>
                
                {selectedFile && (
                  <div className="selected-file">
                    <p>Selected: {selectedFile.name}</p>
                    <img 
                      src={URL.createObjectURL(selectedFile)} 
                      alt="Preview" 
                      style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>

              <div className="image-info">
                <p>💡 Upload a photo and our AI will analyze facial features, style, and characteristics to create a matching animated character.</p>
              </div>

              <button 
                className="generate-button"
                onClick={handleImageGeneration}
                disabled={!selectedFile || isGenerating}
              >
                {isGenerating ? '🔄 Analyzing Image...' : '🎨 Generate from Image'}
              </button>
            </div>
          )}

          {activeTab === 'random' && (
            <div className="random-tab">
              <h3>Generate Random Character</h3>
              <div className="random-info">
                <p>🎲 Let our AI create a completely random character with unique appearance, personality, and traits.</p>
                
                <div className="random-features">
                  <div className="feature-category">
                    <h4>🎨 Style Options:</h4>
                    <span>Anime • Realistic • Cartoon • Chibi</span>
                  </div>
                  <div className="feature-category">
                    <h4>🌈 Appearance:</h4>
                    <span>Random hair & eye colors, unique features</span>
                  </div>
                  <div className="feature-category">
                    <h4>😊 Personality:</h4>
                    <span>Diverse traits and speaking styles</span>
                  </div>
                </div>
              </div>

              <button 
                className="generate-button"
                onClick={handleRandomGeneration}
                disabled={isGenerating}
              >
                {isGenerating ? '🔄 Creating...' : '🎲 Generate Random Character'}
              </button>
            </div>
          )}

          {isGenerating && progress > 0 && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterGenerationModal;
