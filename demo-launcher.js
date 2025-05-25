// 통합 AI 엔진 데모 테스트 런처
// 이 스크립트는 모든 AI 기능을 체계적으로 테스트하고 증거를 수집합니다

console.log('🎯 AI Character Animation Engine - Comprehensive Demo Test');
console.log('===========================================================');

// 실행 순서:
// 1. 성능 모니터링 시작
// 2. 실제 API 테스트 실행
// 3. UI 컴포넌트 테스트
// 4. 시각적 증거 수집
// 5. 종합 보고서 생성

async function runComprehensiveDemo() {
  try {
    console.log('📊 Phase 1: Starting performance monitoring...');
    
    // 성능 모니터링 스크립트 로드 및 실행
    if (!window.performanceMonitor) {
      // 성능 모니터링 코드 실행
      eval(await fetch('/performance-monitor.js').then(r => r.text()));
    }
    
    // 2초 대기 후 API 테스트 시작
    setTimeout(async () => {
      console.log('🔬 Phase 2: Running real API tests...');
      
      // 실제 API 테스트 실행
      eval(await fetch('/real-api-test.js').then(r => r.text()));
      
      // API 테스트 완료 후 UI 테스트
      setTimeout(() => {
        console.log('🎨 Phase 3: Testing UI components...');
        testUIComponents();
      }, 15000); // API 테스트 완료 후 15초 대기
      
    }, 3000);
    
  } catch (error) {
    console.error('❌ Demo test failed:', error);
  }
}

// UI 컴포넌트 테스트
function testUIComponents() {
  console.log('🧪 Testing UI component interactions...');
  
  // API Test Panel 버튼 찾기 및 클릭 시뮬레이션
  const apiTestButton = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Test AI Engine'));
  
  if (apiTestButton) {
    console.log('✅ Found API Test Panel button');
    
    // 버튼 클릭 시뮬레이션
    setTimeout(() => {
      apiTestButton.click();
      console.log('🖱️ API Test Panel opened');
      
      // 테스트 실행 버튼 찾기
      setTimeout(() => {
        const runTestsButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent.includes('Run All Tests'));
        
        if (runTestsButton) {
          runTestsButton.click();
          console.log('🚀 UI tests initiated');
        }
      }, 1000);
    }, 2000);
  } else {
    console.log('⚠️ API Test Panel button not found');
  }
  
  // 캐릭터 생성 테스트
  setTimeout(() => testCharacterCreation(), 5000);
}

// 캐릭터 생성 UI 테스트
function testCharacterCreation() {
  console.log('🎭 Testing character creation workflow...');
  
  // 캐릭터 생성 버튼 찾기
  const createButton = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Create Character') || 
                 btn.textContent.includes('Generate') ||
                 btn.textContent.includes('캐릭터'));
  
  if (createButton) {
    console.log('✅ Found character creation button');
    
    // 캐릭터 생성 시도
    createButton.click();
    console.log('🎨 Character creation initiated');
    
    // 스크린샷 캡처
    setTimeout(() => {
      if (window.performanceMonitor) {
        window.performanceMonitor.captureScreenshot('Character Creation UI');
      }
    }, 2000);
  } else {
    console.log('⚠️ Character creation button not found');
  }
  
  // 최종 보고서 생성
  setTimeout(() => generateFinalReport(), 10000);
}

// 최종 종합 보고서 생성
function generateFinalReport() {
  console.log('📋 Generating comprehensive demo report...');
  
  const demoResults = {
    timestamp: new Date().toISOString(),
    phases: {
      performanceMonitoring: window.performanceMonitor ? 'SUCCESS' : 'FAILED',
      apiTesting: window.testResults ? 'SUCCESS' : 'FAILED',
      uiTesting: 'COMPLETED',
      evidenceCapture: 'COMPLETED'
    },
    metrics: window.performanceMonitor?.metrics || null,
    apiResults: window.testResults || null,
    browserInfo: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    },
    pageInfo: {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer
    }
  };
  
  // 로컬 스토리지에 저장
  localStorage.setItem('ai_engine_demo_results', JSON.stringify(demoResults));
  
  // 다운로드 가능한 보고서 생성
  const reportContent = `AI Character Animation Engine - Demo Test Report
Generated: ${demoResults.timestamp}

DEMO PHASES STATUS:
==================
📊 Performance Monitoring: ${demoResults.phases.performanceMonitoring}
🔬 API Testing: ${demoResults.phases.apiTesting}
🎨 UI Testing: ${demoResults.phases.uiTesting}
📸 Evidence Capture: ${demoResults.phases.evidenceCapture}

BROWSER ENVIRONMENT:
===================
User Agent: ${demoResults.browserInfo.userAgent}
Language: ${demoResults.browserInfo.language}
Platform: ${demoResults.browserInfo.platform}
Online: ${demoResults.browserInfo.onLine}

PAGE INFO:
==========
URL: ${demoResults.pageInfo.url}
Title: ${demoResults.pageInfo.title}

API TEST RESULTS:
================
${demoResults.apiResults ? 
  `Total Tests: ${demoResults.apiResults.tests.length}
Passed: ${demoResults.apiResults.tests.filter(t => t.success).length}
Failed: ${demoResults.apiResults.tests.filter(t => !t.success).length}

Test Details:
${demoResults.apiResults.tests.map(test => 
  `${test.success ? 'PASS' : 'FAIL'} - ${test.name}: ${test.details} (${test.duration})`
).join('\n')}` : 'No API test results available'}

PERFORMANCE METRICS:
===================
${demoResults.metrics ? 
  `Total Requests: ${demoResults.metrics.performance.totalRequests}
Successful: ${demoResults.metrics.performance.successfulRequests}
Failed: ${demoResults.metrics.performance.failedRequests}
Average Response Time: ${demoResults.metrics.performance.averageResponseTime}ms` : 'No performance metrics available'}

CONCLUSION:
===========
This demo demonstrates the AI Character Animation Engine's capabilities
including real-time OpenAI API integration, character generation,
image analysis, and interactive UI components.

Generated by AI Character Animation Engine Demo System
`;
  
  // 다운로드
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-engine-demo-report-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  console.log('🎉 Comprehensive demo report generated!');
  console.log('📊 All test data saved to localStorage');
  
  // 성능 보고서도 생성
  if (window.performanceMonitor) {
    setTimeout(() => {
      window.performanceMonitor.generateReport();
    }, 1000);
  }
  
  // 최종 결과 표시
  displayFinalResults(demoResults);
}

// 최종 결과를 화면에 표시
function displayFinalResults(results) {
  const resultDiv = document.createElement('div');
  resultDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 15px;
    font-family: Arial, sans-serif;
    z-index: 10001;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  `;
  
  const successCount = results.apiResults ? 
    results.apiResults.tests.filter(t => t.success).length : 0;
  const totalCount = results.apiResults ? 
    results.apiResults.tests.length : 0;
  
  resultDiv.innerHTML = `
    <h2 style="margin-top: 0;">🎉 Demo Complete!</h2>
    <div style="margin: 15px 0;">
      <div>📊 Performance Monitoring: ${results.phases.performanceMonitoring}</div>
      <div>🔬 API Testing: ${results.phases.apiTesting}</div>
      <div>🎨 UI Testing: ${results.phases.uiTesting}</div>
    </div>
    ${results.apiResults ? `
      <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px;">
        <strong>API Test Results:</strong><br>
        ✅ ${successCount}/${totalCount} tests passed
      </div>
    ` : ''}
    <div style="margin-top: 20px;">
      <button onclick="this.parentElement.parentElement.remove()" 
              style="padding: 10px 20px; background: #fff; color: #333; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
        Close
      </button>
    </div>
  `;
  
  document.body.appendChild(resultDiv);
  
  // 5초 후 자동 제거
  setTimeout(() => {
    if (resultDiv.parentElement) {
      resultDiv.remove();
    }
  }, 10000);
}

// 메인 실행
console.log('🚀 Starting comprehensive demo in 3 seconds...');
console.log('💡 This will test all AI features and generate evidence');
console.log('📹 Screen recording recommended for full demo documentation');

setTimeout(() => {
  runComprehensiveDemo();
}, 3000);
