import React, { useState } from 'react';
import { apiTester, APITestSuite, APITestResult } from '../utils/apiTesting';
import './APITestPanel.css';

interface APITestPanelProps {
  onClose: () => void;
}

export const APITestPanel: React.FC<APITestPanelProps> = ({ onClose }) => {
  const [testResults, setTestResults] = useState<APITestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setCurrentTest('Initializing...');
    
    try {
      // 각 테스트 실행 시 상태 업데이트
      setCurrentTest('Testing OpenAI Connection...');
      await apiTester.testOpenAIConnection();
      
      setCurrentTest('Testing Character Generation...');
      await apiTester.testCharacterGeneration();
      
      setCurrentTest('Testing Image Analysis...');
      await apiTester.testImageAnalysis();
      
      setCurrentTest('Testing Chat Response...');
      await apiTester.testChatResponse();
      
      setCurrentTest('Testing Voice Synthesis...');
      await apiTester.testVoiceSynthesis();
      
      setCurrentTest('Compiling Results...');
      const results = await apiTester.runAllTests();
      setTestResults(results);
      
      // 콘솔에 리포트 출력
      console.log(apiTester.generateReport());
      
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const renderTestResult = (result: APITestResult | null, testName: string) => {
    if (!result) {
      return (
        <div className="test-result pending">
          <div className="test-header">
            <span className="test-name">{testName}</span>
            <span className="test-status">⏳ Pending</span>
          </div>
        </div>
      );
    }

    return (
      <div className={`test-result ${result.success ? 'success' : 'failure'}`}>
        <div className="test-header">
          <span className="test-name">{result.test}</span>
          <span className="test-status">
            {result.success ? '✅ Pass' : '❌ Fail'}
          </span>
          <span className="test-time">{Math.round(result.executionTime)}ms</span>
        </div>
        <div className="test-message">{result.message}</div>
        {result.data && (
          <details className="test-data">
            <summary>Data Preview</summary>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  };

  const downloadReport = () => {
    if (!testResults) return;

    const report = apiTester.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-test-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="api-test-panel">
      <div className="panel-header">
        <h2>🔬 AI Engine API Testing</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        {!testResults && !isRunning && (
          <div className="test-intro">
            <p>이 도구는 실제 AI 엔진의 API 연결 상태를 검증합니다:</p>
            <ul>
              <li>🔗 OpenAI API 연결 테스트</li>
              <li>👤 캐릭터 생성 기능 테스트</li>
              <li>🖼️ 이미지 분석 기능 테스트</li>
              <li>💬 채팅 응답 기능 테스트</li>
              <li>🔊 음성 합성 기능 테스트</li>
            </ul>
            <button className="run-tests-button" onClick={runTests}>
              🚀 API 테스트 실행
            </button>
          </div>
        )}

        {isRunning && (
          <div className="test-progress">
            <div className="progress-spinner"></div>
            <p>Testing in progress...</p>
            <p className="current-test">{currentTest}</p>
          </div>
        )}

        {testResults && (
          <div className="test-results">
            <div className="results-summary">
              <h3>📊 Test Summary</h3>
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">Total Tests:</span>
                  <span className="stat-value">{testResults.overall.totalTests}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Passed:</span>
                  <span className="stat-value success">{testResults.overall.passedTests}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Failed:</span>
                  <span className="stat-value failure">{testResults.overall.failedTests}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Success Rate:</span>
                  <span className="stat-value">
                    {((testResults.overall.passedTests / testResults.overall.totalTests) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Avg Response:</span>
                  <span className="stat-value">{Math.round(testResults.overall.averageResponseTime)}ms</span>
                </div>
              </div>
            </div>

            <div className="detailed-results">
              <h3>📋 Detailed Results</h3>
              {renderTestResult(testResults.openAIConnection, 'OpenAI API Connection')}
              {renderTestResult(testResults.characterGeneration, 'Character Generation')}
              {renderTestResult(testResults.imageAnalysis, 'Image Analysis')}
              {renderTestResult(testResults.chatResponse, 'Chat Response')}
              {renderTestResult(testResults.voiceSynthesis, 'Voice Synthesis')}
            </div>

            <div className="results-actions">
              <button className="download-button" onClick={downloadReport}>
                📄 Download Report
              </button>
              <button className="rerun-button" onClick={runTests}>
                🔄 Run Tests Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
