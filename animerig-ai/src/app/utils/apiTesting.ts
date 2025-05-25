// API 연결 및 기능 테스트 유틸리티
export interface APITestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  executionTime: number;
}

export interface APITestSuite {
  openAIConnection: APITestResult | null;
  characterGeneration: APITestResult | null;
  imageAnalysis: APITestResult | null;
  chatResponse: APITestResult | null;
  voiceSynthesis: APITestResult | null;
  overall: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
  };
}

class APITester {
  private results: APITestSuite = {
    openAIConnection: null,
    characterGeneration: null,
    imageAnalysis: null,
    chatResponse: null,
    voiceSynthesis: null,
    overall: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageResponseTime: 0
    }
  };

  // OpenAI 연결 테스트
  async testOpenAIConnection(): Promise<APITestResult> {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = performance.now() - startTime;

      this.results.openAIConnection = {
        test: 'OpenAI API Connection',
        success: true,
        message: `Connected successfully. Found ${data.data?.length || 0} available models.`,
        data: data.data?.slice(0, 3), // 처음 3개 모델만 반환
        executionTime
      };

      return this.results.openAIConnection;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.results.openAIConnection = {
        test: 'OpenAI API Connection',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime
      };

      return this.results.openAIConnection;
    }
  }

  // 캐릭터 생성 테스트
  async testCharacterGeneration(): Promise<APITestResult> {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured');
      }

      const testPrompt = "Create a friendly anime character with blue hair and green eyes";

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
              content: 'You are a character designer. Create detailed anime character descriptions in JSON format with name, appearance, personality, and backstory.'
            },
            {
              role: 'user',
              content: testPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`Character generation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = performance.now() - startTime;

      this.results.characterGeneration = {
        test: 'Character Generation',
        success: true,
        message: `Character generated successfully in ${Math.round(executionTime)}ms`,
        data: {
          prompt: testPrompt,
          response: data.choices[0]?.message?.content?.substring(0, 200) + '...'
        },
        executionTime
      };

      return this.results.characterGeneration;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.results.characterGeneration = {
        test: 'Character Generation',
        success: false,
        message: error instanceof Error ? error.message : 'Character generation failed',
        executionTime
      };

      return this.results.characterGeneration;
    }
  }

  // 이미지 분석 테스트
  async testImageAnalysis(): Promise<APITestResult> {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured');
      }

      // 테스트용 간단한 이미지 데이터 URL (1x1 투명 픽셀)
      const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

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
                  text: 'Analyze this image for character creation. Describe any visible features.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: testImageData
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`Image analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = performance.now() - startTime;

      this.results.imageAnalysis = {
        test: 'Image Analysis',
        success: true,
        message: `Image analyzed successfully in ${Math.round(executionTime)}ms`,
        data: {
          analysis: data.choices[0]?.message?.content?.substring(0, 150) + '...'
        },
        executionTime
      };

      return this.results.imageAnalysis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.results.imageAnalysis = {
        test: 'Image Analysis',
        success: false,
        message: error instanceof Error ? error.message : 'Image analysis failed',
        executionTime
      };

      return this.results.imageAnalysis;
    }
  }

  // 채팅 응답 테스트
  async testChatResponse(): Promise<APITestResult> {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured');
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
              content: 'You are a friendly anime character. Respond in character with enthusiasm.'
            },
            {
              role: 'user',
              content: 'Hello! How are you doing today?'
            }
          ],
          max_tokens: 100,
          temperature: 0.8
        })
      });

      if (!response.ok) {
        throw new Error(`Chat response failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const executionTime = performance.now() - startTime;

      this.results.chatResponse = {
        test: 'Chat Response',
        success: true,
        message: `Chat response generated in ${Math.round(executionTime)}ms`,
        data: {
          response: data.choices[0]?.message?.content
        },
        executionTime
      };

      return this.results.chatResponse;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.results.chatResponse = {
        test: 'Chat Response',
        success: false,
        message: error instanceof Error ? error.message : 'Chat response failed',
        executionTime
      };

      return this.results.chatResponse;
    }
  }

  // 음성 합성 테스트 (TTS API 확인)
  async testVoiceSynthesis(): Promise<APITestResult> {
    const startTime = performance.now();
    
    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: 'Hello! This is a test of the voice synthesis system.',
          voice: 'alloy',
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        throw new Error(`Voice synthesis failed: ${response.status} ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      const executionTime = performance.now() - startTime;

      this.results.voiceSynthesis = {
        test: 'Voice Synthesis',
        success: true,
        message: `Voice synthesized successfully in ${Math.round(executionTime)}ms`,
        data: {
          audioSize: audioData.byteLength,
          format: 'mp3'
        },
        executionTime
      };

      return this.results.voiceSynthesis;

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      this.results.voiceSynthesis = {
        test: 'Voice Synthesis',
        success: false,
        message: error instanceof Error ? error.message : 'Voice synthesis failed',
        executionTime
      };

      return this.results.voiceSynthesis;
    }
  }

  // 전체 테스트 실행
  async runAllTests(): Promise<APITestSuite> {
    console.log('🚀 Starting comprehensive API testing...');

    // 모든 테스트 실행
    await this.testOpenAIConnection();
    await this.testCharacterGeneration();
    await this.testImageAnalysis();
    await this.testChatResponse();
    await this.testVoiceSynthesis();

    // 전체 결과 계산
    const allResults = [
      this.results.openAIConnection,
      this.results.characterGeneration,
      this.results.imageAnalysis,
      this.results.chatResponse,
      this.results.voiceSynthesis
    ].filter(Boolean) as APITestResult[];

    this.results.overall = {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.success).length,
      failedTests: allResults.filter(r => !r.success).length,
      averageResponseTime: allResults.reduce((sum, r) => sum + r.executionTime, 0) / allResults.length
    };

    return this.results;
  }

  // 결과 리포트 생성
  generateReport(): string {
    const { overall } = this.results;
    const successRate = (overall.passedTests / overall.totalTests * 100).toFixed(1);

    let report = `
🔍 AI Engine API Test Report
=============================

📊 Overall Results:
   • Total Tests: ${overall.totalTests}
   • Passed: ${overall.passedTests} ✅
   • Failed: ${overall.failedTests} ❌
   • Success Rate: ${successRate}%
   • Average Response Time: ${Math.round(overall.averageResponseTime)}ms

📋 Detailed Results:
`;

    const allResults = [
      this.results.openAIConnection,
      this.results.characterGeneration,
      this.results.imageAnalysis,
      this.results.chatResponse,
      this.results.voiceSynthesis
    ].filter(Boolean) as APITestResult[];

    allResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      report += `
   ${status} ${result.test}
      Message: ${result.message}
      Response Time: ${Math.round(result.executionTime)}ms
`;
      if (result.data) {
        report += `      Data Preview: ${JSON.stringify(result.data, null, 2).substring(0, 100)}...\n`;
      }
    });

    return report;
  }
}

export const apiTester = new APITester();
