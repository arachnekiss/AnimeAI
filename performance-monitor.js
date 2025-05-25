// 실시간 성능 모니터링 및 시각적 증거 수집 도구
// 브라우저에서 실행하여 API 성능을 실시간으로 모니터링합니다

console.log('📊 Starting Performance Monitoring & Evidence Capture...');

// 성능 데이터 수집기
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      apiCalls: [],
      errors: [],
      performance: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        startTime: Date.now()
      }
    };
    
    this.isRecording = false;
    this.recordingData = [];
  }
  
  // API 호출 모니터링 시작
  startMonitoring() {
    console.log('🔍 Performance monitoring started...');
    
    // Fetch API 래핑하여 자동 모니터링
    const originalFetch = window.fetch;
    const monitor = this;
    
    window.fetch = async function(...args) {
      const startTime = performance.now();
      const url = args[0];
      
      monitor.metrics.performance.totalRequests++;
      
      try {
        const response = await originalFetch.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const callData = {
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: Math.round(duration),
          timestamp: new Date().toISOString(),
          success: response.ok
        };
        
        monitor.metrics.apiCalls.push(callData);
        
        if (response.ok) {
          monitor.metrics.performance.successfulRequests++;
        } else {
          monitor.metrics.performance.failedRequests++;
          monitor.metrics.errors.push({
            url,
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
        
        // 평균 응답 시간 업데이트
        const totalDuration = monitor.metrics.apiCalls.reduce((sum, call) => sum + call.duration, 0);
        monitor.metrics.performance.averageResponseTime = Math.round(totalDuration / monitor.metrics.apiCalls.length);
        
        // 실시간 로그
        if (response.ok) {
          console.log(`✅ ${callData.method} ${url} - ${duration.toFixed(0)}ms`);
        } else {
          console.log(`❌ ${callData.method} ${url} - ${response.status} ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        monitor.metrics.performance.failedRequests++;
        monitor.metrics.errors.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        console.log(`❌ ${url} - Error: ${error.message}`);
        throw error;
      }
    };
  }
  
  // 스크린샷 캡처 (시각적 증거)
  async captureScreenshot(description = '') {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.log('⚠️ Screen capture not supported in this browser');
        return null;
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      });
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          // 스트림 정리
          stream.getTracks().forEach(track => track.stop());
          
          const screenshot = {
            dataUrl: canvas.toDataURL('image/png'),
            timestamp: new Date().toISOString(),
            description: description,
            dimensions: {
              width: canvas.width,
              height: canvas.height
            }
          };
          
          console.log(`📸 Screenshot captured: ${description}`);
          resolve(screenshot);
        });
      });
    } catch (error) {
      console.log('❌ Screenshot capture failed:', error.message);
      return null;
    }
  }
  
  // 화면 녹화 시작
  async startRecording(description = 'AI Engine Demo') {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.log('⚠️ Screen recording not supported in this browser');
        return false;
      }
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.recordingData = [];
      this.isRecording = true;
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordingData.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordingData, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // 자동 다운로드
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-engine-demo-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('🎬 Recording saved!');
        this.isRecording = false;
      };
      
      this.mediaRecorder.start();
      console.log('🔴 Recording started...');
      return true;
      
    } catch (error) {
      console.log('❌ Recording failed:', error.message);
      return false;
    }
  }
  
  // 녹화 중지
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      console.log('⏹️ Recording stopped');
    }
  }
  
  // 실시간 성능 대시보드 표시
  showDashboard() {
    const dashboard = document.createElement('div');
    dashboard.id = 'performance-dashboard';
    dashboard.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      overflow-y: auto;
      border: 2px solid #00ff00;
    `;
    
    const updateDashboard = () => {
      const metrics = this.metrics.performance;
      const uptime = ((Date.now() - metrics.startTime) / 1000).toFixed(0);
      const successRate = metrics.totalRequests > 0 ? 
        ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1) : 0;
      
      dashboard.innerHTML = `
        <div style="color: #00ff00; font-weight: bold; margin-bottom: 10px;">
          📊 AI Engine Performance
        </div>
        <div>⏱️ Uptime: ${uptime}s</div>
        <div>📈 Total Requests: ${metrics.totalRequests}</div>
        <div>✅ Successful: ${metrics.successfulRequests}</div>
        <div>❌ Failed: ${metrics.failedRequests}</div>
        <div>🎯 Success Rate: ${successRate}%</div>
        <div>⚡ Avg Response: ${metrics.averageResponseTime}ms</div>
        <div style="margin-top: 10px;">
          🔴 Recording: ${this.isRecording ? 'ON' : 'OFF'}
        </div>
        <div style="margin-top: 10px; font-size: 10px;">
          Recent API Calls:
        </div>
        <div style="max-height: 150px; overflow-y: auto; margin-top: 5px;">
          ${this.metrics.apiCalls.slice(-5).map(call => `
            <div style="margin: 2px 0; color: ${call.success ? '#00ff00' : '#ff0000'};">
              ${call.method} ${call.duration}ms
            </div>
          `).join('')}
        </div>
        <div style="margin-top: 10px;">
          <button onclick="performanceMonitor.captureScreenshot('Manual capture')" 
                  style="padding: 5px; margin: 2px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer;">
            📸 Screenshot
          </button>
          <button onclick="performanceMonitor.isRecording ? performanceMonitor.stopRecording() : performanceMonitor.startRecording()" 
                  style="padding: 5px; margin: 2px; background: #333; color: white; border: 1px solid #666; border-radius: 3px; cursor: pointer;">
            ${this.isRecording ? '⏹️ Stop' : '🔴 Record'}
          </button>
        </div>
      `;
    };
    
    document.body.appendChild(dashboard);
    
    // 1초마다 업데이트
    this.dashboardInterval = setInterval(updateDashboard, 1000);
    updateDashboard();
    
    console.log('📊 Performance dashboard activated');
  }
  
  // 대시보드 숨기기
  hideDashboard() {
    const dashboard = document.getElementById('performance-dashboard');
    if (dashboard) {
      dashboard.remove();
    }
    if (this.dashboardInterval) {
      clearInterval(this.dashboardInterval);
    }
  }
  
  // 성능 보고서 생성
  generateReport() {
    const metrics = this.metrics.performance;
    const runtime = ((Date.now() - metrics.startTime) / 1000).toFixed(0);
    const successRate = metrics.totalRequests > 0 ? 
      ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1) : 0;
    
    const report = {
      summary: {
        runtime: `${runtime}s`,
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        successRate: `${successRate}%`,
        averageResponseTime: `${metrics.averageResponseTime}ms`
      },
      apiCalls: this.metrics.apiCalls,
      errors: this.metrics.errors,
      generatedAt: new Date().toISOString()
    };
    
    // 로컬 스토리지에 저장
    localStorage.setItem('ai_engine_performance_report', JSON.stringify(report));
    
    // 다운로드 가능한 형태로 생성
    const reportText = `AI Engine Performance Report
Generated: ${report.generatedAt}

Summary:
- Runtime: ${report.summary.runtime}
- Total Requests: ${report.summary.totalRequests}
- Success Rate: ${report.summary.successRate}
- Average Response Time: ${report.summary.averageResponseTime}

API Calls Details:
${report.apiCalls.map(call => 
  `${call.timestamp} | ${call.method} ${call.url} | ${call.duration}ms | ${call.success ? 'SUCCESS' : 'FAILED'}`
).join('\n')}

Errors:
${report.errors.map(error => 
  `${error.timestamp} | ${error.url} | ${error.status || error.error}`
).join('\n')}
`;
    
    // 다운로드
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-engine-performance-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('📊 Performance report generated and downloaded');
    return report;
  }
}

// 글로벌 인스턴스 생성
window.performanceMonitor = new PerformanceMonitor();

// 자동 시작
console.log('🚀 Starting performance monitoring in 2 seconds...');
setTimeout(() => {
  window.performanceMonitor.startMonitoring();
  window.performanceMonitor.showDashboard();
  console.log('📊 Performance monitoring is now active!');
  console.log('💡 Use performanceMonitor.startRecording() to start screen recording');
  console.log('💡 Use performanceMonitor.captureScreenshot() to take screenshots');
  console.log('💡 Use performanceMonitor.generateReport() to download performance report');
}, 2000);
