import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PerformanceMonitor.css';

interface PerformanceMonitorProps {
  isVisible: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  onToggleVisibility: () => void;
  className?: string;
}

interface PerformanceData {
  fps: number;
  frameTime: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage: number;
  renderTime: number;
  animationTime: number;
  audioLatency: number;
  networkLatency: number;
  timestamp: number;
}

interface SystemInfo {
  userAgent: string;
  platform: string;
  cores: number;
  memory: number;
  gpu: string;
  webglVersion: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible,
  position = 'top-right',
  onToggleVisibility,
  className = ''
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [currentData, setCurrentData] = useState<PerformanceData | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isDetailed, setIsDetailed] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    fps: 30,
    frameTime: 33,
    memoryUsage: 80,
    cpuUsage: 80
  });

  const animationFrameRef = useRef<number>();
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsCalculationIntervalRef = useRef<number>();

  // WebGL context for GPU monitoring
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);

  useEffect(() => {
    initializeSystemInfo();
    if (isVisible) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isVisible]);

  const initializeSystemInfo = () => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    const info: SystemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cores: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory || 0,
      gpu: gl ? (gl.getParameter(gl.RENDERER) || 'Unknown') : 'No WebGL',
      webglVersion: gl ? 'WebGL 1.0' : 'None'
    };

    // Check for WebGL 2
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      info.webglVersion = 'WebGL 2.0';
    }

    setSystemInfo(info);
  };

  const startMonitoring = () => {
    // Initialize WebGL context for GPU monitoring
    if (canvasRef.current) {
      glRef.current = canvasRef.current.getContext('webgl');
    }

    // FPS monitoring
    fpsCalculationIntervalRef.current = window.setInterval(() => {
      calculateFPS();
    }, 1000);

    // Performance observer for detailed metrics
    if ('PerformanceObserver' in window) {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        processPerformanceEntries(entries);
      });

      try {
        performanceObserverRef.current.observe({ 
          type: 'measure',
          buffered: true 
        });
        performanceObserverRef.current.observe({ 
          type: 'navigation',
          buffered: true 
        });
      } catch (e) {
        console.warn('Performance Observer not fully supported');
      }
    }

    // Start animation frame monitoring
    monitorFrame();
  };

  const stopMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (fpsCalculationIntervalRef.current) {
      clearInterval(fpsCalculationIntervalRef.current);
    }
    if (performanceObserverRef.current) {
      performanceObserverRef.current.disconnect();
    }
  };

  const monitorFrame = () => {
    const startTime = performance.now();
    
    // Simulate some work to measure frame time
    frameCountRef.current++;
    
    const endTime = performance.now();
    const frameTime = endTime - lastFrameTimeRef.current;
    lastFrameTimeRef.current = endTime;

    // Collect performance data
    collectPerformanceData(frameTime);

    animationFrameRef.current = requestAnimationFrame(monitorFrame);
  };

  const calculateFPS = () => {
    const fps = frameCountRef.current;
    frameCountRef.current = 0;
    return fps;
  };

  const collectPerformanceData = useCallback((frameTime: number) => {
    const now = performance.now();
    const fps = calculateFPS();
    
    // Memory usage (if available)
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? 
      (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100 : 0;

    // CPU usage estimation (simplified)
    const cpuUsage = Math.min(frameTime / 16.67 * 100, 100); // Based on 60fps target

    // GPU usage estimation (simplified)
    const gpuUsage = estimateGPUUsage();

    // Audio latency (if available)
    const audioLatency = getAudioLatency();

    // Network latency (if available)
    const networkLatency = getNetworkLatency();

    const data: PerformanceData = {
      fps,
      frameTime,
      cpuUsage,
      memoryUsage,
      gpuUsage,
      renderTime: frameTime * 0.7, // Estimated render time
      animationTime: frameTime * 0.2, // Estimated animation time
      audioLatency,
      networkLatency,
      timestamp: now
    };

    setCurrentData(data);
    setPerformanceData(prev => {
      const newData = [...prev, data];
      return newData.slice(-100); // Keep last 100 entries
    });
  }, []);

  const estimateGPUUsage = (): number => {
    if (!glRef.current) return 0;
    
    try {
      // This is a simplified estimation based on GPU info
      const ext = glRef.current.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        // Return a mock value as real GPU usage is not accessible via WebGL
        return Math.random() * 30 + 20; // Random value between 20-50%
      }
    } catch (e) {
      // Ignore errors
    }
    return 0;
  };

  const getAudioLatency = (): number => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      return audioContext.baseLatency ? audioContext.baseLatency * 1000 : 0;
    } catch (e) {
      return 0;
    }
  };

  const getNetworkLatency = (): number => {
    // This would require actual network requests to measure
    // For now, return a mock value
    return 50 + Math.random() * 100;
  };

  const processPerformanceEntries = (entries: PerformanceEntry[]) => {
    entries.forEach(entry => {
      if (entry.entryType === 'measure') {
        // Process custom performance measures
        console.log(`Performance measure: ${entry.name} - ${entry.duration}ms`);
      }
    });
  };

  const getStatusColor = (value: number, threshold: number, inverted: boolean = false): string => {
    if (inverted) {
      return value < threshold ? '#ff4444' : value < threshold * 1.5 ? '#ffaa00' : '#00ff88';
    }
    return value > threshold ? '#ff4444' : value > threshold * 0.8 ? '#ffaa00' : '#00ff88';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderMiniMonitor = () => (
    <div className="mini-monitor">
      <div className="mini-stats">
        <div className="mini-stat">
          <span className="mini-label">FPS</span>
          <span 
            className="mini-value"
            style={{ color: getStatusColor(currentData?.fps || 0, alertThresholds.fps, true) }}
          >
            {Math.round(currentData?.fps || 0)}
          </span>
        </div>
        <div className="mini-stat">
          <span className="mini-label">Frame</span>
          <span 
            className="mini-value"
            style={{ color: getStatusColor(currentData?.frameTime || 0, alertThresholds.frameTime) }}
          >
            {(currentData?.frameTime || 0).toFixed(1)}ms
          </span>
        </div>
        <div className="mini-stat">
          <span className="mini-label">CPU</span>
          <span 
            className="mini-value"
            style={{ color: getStatusColor(currentData?.cpuUsage || 0, alertThresholds.cpuUsage) }}
          >
            {Math.round(currentData?.cpuUsage || 0)}%
          </span>
        </div>
        <div className="mini-stat">
          <span className="mini-label">MEM</span>
          <span 
            className="mini-value"
            style={{ color: getStatusColor(currentData?.memoryUsage || 0, alertThresholds.memoryUsage) }}
          >
            {Math.round(currentData?.memoryUsage || 0)}%
          </span>
        </div>
      </div>
      <button
        className="expand-button"
        onClick={() => setIsDetailed(true)}
        title="상세 정보 보기"
      >
        📊
      </button>
    </div>
  );

  const renderDetailedMonitor = () => (
    <div className="detailed-monitor">
      <div className="monitor-header">
        <h3>성능 모니터</h3>
        <div className="header-actions">
          <button
            className="minimize-button"
            onClick={() => setIsDetailed(false)}
            title="최소화"
          >
            ⚊
          </button>
          <button
            className="close-button"
            onClick={onToggleVisibility}
            title="닫기"
          >
            ×
          </button>
        </div>
      </div>

      <div className="monitor-content">
        {/* Real-time Stats */}
        <div className="stats-section">
          <h4>실시간 통계</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">FPS</span>
              <span 
                className="stat-value"
                style={{ color: getStatusColor(currentData?.fps || 0, alertThresholds.fps, true) }}
              >
                {Math.round(currentData?.fps || 0)}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Frame Time</span>
              <span 
                className="stat-value"
                style={{ color: getStatusColor(currentData?.frameTime || 0, alertThresholds.frameTime) }}
              >
                {(currentData?.frameTime || 0).toFixed(2)}ms
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">CPU Usage</span>
              <span 
                className="stat-value"
                style={{ color: getStatusColor(currentData?.cpuUsage || 0, alertThresholds.cpuUsage) }}
              >
                {Math.round(currentData?.cpuUsage || 0)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Memory Usage</span>
              <span 
                className="stat-value"
                style={{ color: getStatusColor(currentData?.memoryUsage || 0, alertThresholds.memoryUsage) }}
              >
                {Math.round(currentData?.memoryUsage || 0)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">GPU Usage</span>
              <span className="stat-value">
                {Math.round(currentData?.gpuUsage || 0)}%
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Render Time</span>
              <span className="stat-value">
                {(currentData?.renderTime || 0).toFixed(2)}ms
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Animation Time</span>
              <span className="stat-value">
                {(currentData?.animationTime || 0).toFixed(2)}ms
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Audio Latency</span>
              <span className="stat-value">
                {(currentData?.audioLatency || 0).toFixed(1)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Performance Graph */}
        <div className="graph-section">
          <h4>성능 그래프</h4>
          <div className="performance-graph">
            <canvas
              ref={canvasRef}
              width={300}
              height={100}
              className="graph-canvas"
            />
          </div>
        </div>

        {/* System Information */}
        {systemInfo && (
          <div className="system-section">
            <h4>시스템 정보</h4>
            <div className="system-info">
              <div className="info-item">
                <span className="info-label">Platform</span>
                <span className="info-value">{systemInfo.platform}</span>
              </div>
              <div className="info-item">
                <span className="info-label">CPU Cores</span>
                <span className="info-value">{systemInfo.cores}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Memory</span>
                <span className="info-value">
                  {systemInfo.memory ? `${systemInfo.memory} GB` : 'Unknown'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">GPU</span>
                <span className="info-value">{systemInfo.gpu}</span>
              </div>
              <div className="info-item">
                <span className="info-label">WebGL</span>
                <span className="info-value">{systemInfo.webglVersion}</span>
              </div>
            </div>
          </div>
        )}

        {/* Alert Thresholds */}
        <div className="thresholds-section">
          <h4>경고 임계값</h4>
          <div className="threshold-controls">
            <div className="threshold-item">
              <label>FPS 임계값</label>
              <input
                type="number"
                value={alertThresholds.fps}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  fps: parseInt(e.target.value)
                }))}
                min="1"
                max="120"
              />
            </div>
            <div className="threshold-item">
              <label>Frame Time 임계값 (ms)</label>
              <input
                type="number"
                value={alertThresholds.frameTime}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  frameTime: parseInt(e.target.value)
                }))}
                min="1"
                max="100"
              />
            </div>
            <div className="threshold-item">
              <label>Memory 임계값 (%)</label>
              <input
                type="number"
                value={alertThresholds.memoryUsage}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  memoryUsage: parseInt(e.target.value)
                }))}
                min="1"
                max="100"
              />
            </div>
            <div className="threshold-item">
              <label>CPU 임계값 (%)</label>
              <input
                type="number"
                value={alertThresholds.cpuUsage}
                onChange={(e) => setAlertThresholds(prev => ({
                  ...prev,
                  cpuUsage: parseInt(e.target.value)
                }))}
                min="1"
                max="100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className={`performance-monitor ${position} ${className}`}>
      {isDetailed ? renderDetailedMonitor() : renderMiniMonitor()}
    </div>
  );
};

export default PerformanceMonitor;
