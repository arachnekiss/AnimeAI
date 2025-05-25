// Visual Evidence Capture Component for AI Character Animation Demo
import React, { useState, useRef } from 'react';

interface VisualEvidenceCaptureProps {
  onLog: (message: string) => void;
}

interface CapturedEvidence {
  id: string;
  type: 'screenshot' | 'gif' | 'video';
  timestamp: Date;
  dataUrl: string;
  description: string;
}

const VisualEvidenceCapture: React.FC<VisualEvidenceCaptureProps> = ({ onLog }) => {
  const [evidence, setEvidence] = useState<CapturedEvidence[]>([]);
  const [isRecordingGif, setIsRecordingGif] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const captureScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const newEvidence: CapturedEvidence = {
        id: `screenshot-${Date.now()}`,
        type: 'screenshot',
        timestamp: new Date(),
        dataUrl,
        description: 'Character animation screenshot'
      };
      
      setEvidence(prev => [...prev, newEvidence]);
      onLog('Screenshot captured successfully');
      
      // Auto-download
      const link = document.createElement('a');
      link.download = `${newEvidence.id}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      onLog('No canvas found for screenshot');
    }
  };

  const startGifRecording = () => {
    setIsRecordingGif(true);
    onLog('Starting GIF recording (5 seconds)...');
    
    // Simulate GIF recording with multiple screenshots
    const screenshots: string[] = [];
    const interval = setInterval(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        screenshots.push(canvas.toDataURL('image/png'));
      }
    }, 200); // Capture every 200ms

    setTimeout(() => {
      clearInterval(interval);
      setIsRecordingGif(false);
      
      // Create a simple GIF simulation (using first screenshot as placeholder)
      if (screenshots.length > 0) {
        const newEvidence: CapturedEvidence = {
          id: `gif-${Date.now()}`,
          type: 'gif',
          timestamp: new Date(),
          dataUrl: screenshots[0], // In a real implementation, this would be a GIF
          description: `Animated GIF (${screenshots.length} frames)`
        };
        
        setEvidence(prev => [...prev, newEvidence]);
        onLog(`GIF recording completed - ${screenshots.length} frames captured`);
      }
    }, 5000);
  };

  const startVideoRecording = async () => {
    try {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        onLog('No canvas found for video recording');
        return;
      }

      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const dataUrl = URL.createObjectURL(blob);
        
        const newEvidence: CapturedEvidence = {
          id: `video-${Date.now()}`,
          type: 'video',
          timestamp: new Date(),
          dataUrl,
          description: 'Character animation video'
        };
        
        setEvidence(prev => [...prev, newEvidence]);
        onLog('Video recording completed');
        
        // Auto-download
        const link = document.createElement('a');
        link.download = `${newEvidence.id}.webm`;
        link.href = dataUrl;
        link.click();
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
      onLog('Video recording started');
      
      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecordingVideo(false);
        }
      }, 10000);

    } catch (error) {
      onLog('Video recording failed: ' + (error as Error).message);
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      onLog('Video recording stopped');
    }
  };

  const downloadEvidence = (item: CapturedEvidence) => {
    const link = document.createElement('a');
    link.download = `${item.id}.${item.type === 'screenshot' ? 'png' : item.type === 'gif' ? 'gif' : 'webm'}`;
    link.href = item.dataUrl;
    link.click();
    onLog(`Downloaded ${item.description}`);
  };

  const clearEvidence = () => {
    setEvidence([]);
    onLog('All captured evidence cleared');
  };

  return (
    <div className="visual-evidence-capture">
      <h3>📸 Visual Evidence Capture</h3>
      
      <div className="capture-controls">
        <button onClick={captureScreenshot} className="capture-btn screenshot-btn">
          📷 Screenshot
        </button>
        
        <button 
          onClick={isRecordingGif ? undefined : startGifRecording} 
          disabled={isRecordingGif}
          className="capture-btn gif-btn"
        >
          {isRecordingGif ? '🔴 Recording GIF...' : '🎬 Record GIF'}
        </button>
        
        <button 
          onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
          className="capture-btn video-btn"
        >
          {isRecordingVideo ? '⏹️ Stop Video' : '📹 Record Video'}
        </button>
        
        {evidence.length > 0 && (
          <button onClick={clearEvidence} className="capture-btn clear-btn">
            🗑️ Clear All
          </button>
        )}
      </div>

      {evidence.length > 0 && (
        <div className="evidence-gallery">
          <h4>Captured Evidence ({evidence.length})</h4>
          <div className="evidence-grid">
            {evidence.map((item) => (
              <div key={item.id} className="evidence-item">
                <div className="evidence-preview">
                  {item.type === 'video' ? (
                    <video src={item.dataUrl} controls style={{ width: '100%', height: '80px' }} />
                  ) : (
                    <img src={item.dataUrl} alt={item.description} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                  )}
                </div>
                <div className="evidence-info">
                  <small>{item.type.toUpperCase()}</small>
                  <small>{item.timestamp.toLocaleTimeString()}</small>
                </div>
                <button onClick={() => downloadEvidence(item)} className="download-btn">
                  ⬇️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .visual-evidence-capture {
          margin-top: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.7);
          border-radius: 12px;
          border: 1px solid rgba(35, 41, 70, 0.1);
        }

        .visual-evidence-capture h3 {
          margin-top: 0;
          margin-bottom: 12px;
          color: #232946;
          font-size: 1.1em;
        }

        .capture-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }

        .capture-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .screenshot-btn {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
        }

        .gif-btn {
          background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
          color: white;
        }

        .video-btn {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          color: white;
        }

        .clear-btn {
          background: linear-gradient(135deg, #9E9E9E 0%, #757575 100%);
          color: white;
        }

        .capture-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .capture-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .evidence-gallery h4 {
          margin: 0 0 12px 0;
          color: #232946;
        }

        .evidence-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .evidence-item {
          background: white;
          border-radius: 8px;
          padding: 8px;
          border: 1px solid rgba(35, 41, 70, 0.1);
          position: relative;
        }

        .evidence-preview {
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .evidence-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .evidence-info small {
          color: #666;
          font-size: 0.75em;
        }

        .download-btn {
          width: 100%;
          padding: 4px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8em;
        }

        .download-btn:hover {
          background: #1976D2;
        }
      `}</style>
    </div>
  );
};

export default VisualEvidenceCapture;
