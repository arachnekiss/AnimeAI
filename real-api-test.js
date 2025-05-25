// 실제 OpenAI API 테스트 스크립트
// 브라우저 개발자 도구에서 실행하세요

console.log('🔬 Starting Real AI Engine API Tests...');

// 환경 변수에서 API 키 가져오기
const API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // Replace with your actual OpenAI API key

// 테스트 결과를 저장할 객체
const testResults = {
  timestamp: new Date().toISOString(),
  tests: []
};

// 유틸리티 함수: 테스트 결과 기록
function recordTest(testName, success, details, duration) {
  const result = {
    name: testName,
    success,
    details,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  };
  testResults.tests.push(result);
  
  if (success) {
    console.log(`✅ ${testName}: ${details}`);
  } else {
    console.log(`❌ ${testName}: ${details}`);
  }
  
  return result;
}

// 테스트 1: OpenAI API 연결 확인
async function testAPIConnection() {
  const startTime = Date.now();
  
  try {
    console.log('🔑 Testing OpenAI API connection...');
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      const duration = Date.now() - startTime;
      return recordTest('API Connection', true, `Connected successfully. ${data.data.length} models available`, duration);
    } else {
      const duration = Date.now() - startTime;
      return recordTest('API Connection', false, `HTTP ${response.status}: ${response.statusText}`, duration);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return recordTest('API Connection', false, error.message, duration);
  }
}

// 테스트 2: GPT 모델을 사용한 캐릭터 생성
async function testCharacterGeneration() {
  const startTime = Date.now();
  
  try {
    console.log('🎭 Testing character generation with GPT...');
    
    const prompt = `Create a detailed anime character with the following JSON structure:
{
  "name": "character name",
  "style": "anime",
  "hairColor": "color",
  "eyeColor": "color", 
  "personality": ["trait1", "trait2", "trait3"],
  "backstory": "detailed background story",
  "specialAbilities": ["ability1", "ability2"],
  "metadata": {
    "generatedBy": "openai-gpt",
    "prompt": "user input here"
  }
}

Make it unique and interesting. The character should be a magical academy student.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a creative character designer. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      try {
        const characterData = JSON.parse(data.choices[0].message.content);
        console.log('Generated Character:', characterData);
        return recordTest('Character Generation', true, `Character "${characterData.name}" created successfully`, duration);
      } catch (parseError) {
        return recordTest('Character Generation', false, `JSON parse error: ${parseError.message}`, duration);
      }
    } else {
      const duration = Date.now() - startTime;
      return recordTest('Character Generation', false, `HTTP ${response.status}: ${response.statusText}`, duration);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return recordTest('Character Generation', false, error.message, duration);
  }
}

// 테스트 3: GPT Vision을 사용한 이미지 분석 (base64 테스트 이미지 사용)
async function testImageAnalysis() {
  const startTime = Date.now();
  
  try {
    console.log('👁️ Testing image analysis with GPT Vision...');
    
    // 간단한 테스트용 base64 이미지 (1x1 투명 픽셀)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
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
                text: 'Analyze this image and describe what you see. If it\'s a simple test image, just say "Test image detected".'
              },
              {
                type: 'image_url',
                image_url: {
                  url: testImageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 100
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const duration = Date.now() - startTime;
      const analysis = data.choices[0].message.content;
      return recordTest('Image Analysis', true, `Analysis: "${analysis}"`, duration);
    } else {
      const duration = Date.now() - startTime;
      return recordTest('Image Analysis', false, `HTTP ${response.status}: ${response.statusText}`, duration);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return recordTest('Image Analysis', false, error.message, duration);
  }
}

// 테스트 4: 채팅 응답 생성
async function testChatResponse() {
  const startTime = Date.now();
  
  try {
    console.log('💬 Testing chat response generation...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly anime character named Sakura. Respond in character with enthusiasm.'
          },
          {
            role: 'user',
            content: 'Hello! How are you today?'
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const duration = Date.now() - startTime;
      const chatResponse = data.choices[0].message.content;
      return recordTest('Chat Response', true, `Response: "${chatResponse}"`, duration);
    } else {
      const duration = Date.now() - startTime;
      return recordTest('Chat Response', false, `HTTP ${response.status}: ${response.statusText}`, duration);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return recordTest('Chat Response', false, error.message, duration);
  }
}

// 모든 테스트 실행
async function runAllTests() {
  console.log('🚀 Starting comprehensive AI engine tests...');
  console.log('⏱️ This may take a few minutes...');
  
  // 순차적으로 테스트 실행
  await testAPIConnection();
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
  
  await testCharacterGeneration();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testImageAnalysis();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testChatResponse();
  
  // 결과 요약
  console.log('\n📊 Test Results Summary:');
  console.log('=' * 50);
  
  const successCount = testResults.tests.filter(t => t.success).length;
  const totalCount = testResults.tests.length;
  
  console.log(`✅ Passed: ${successCount}/${totalCount}`);
  console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
  
  testResults.tests.forEach(test => {
    const status = test.success ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.details} (${test.duration})`);
  });
  
  // 로컬 스토리지에 결과 저장
  try {
    localStorage.setItem('ai_engine_test_results', JSON.stringify(testResults));
    console.log('\n💾 Test results saved to localStorage');
  } catch (e) {
    console.log('\n⚠️ Could not save results to localStorage');
  }
  
  // 다운로드 가능한 보고서 생성
  const reportContent = `AI Engine Test Report
Generated: ${testResults.timestamp}

Summary:
- Total Tests: ${totalCount}
- Passed: ${successCount}
- Failed: ${totalCount - successCount}
- Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%

Detailed Results:
${testResults.tests.map(test => `
${test.success ? 'PASS' : 'FAIL'} - ${test.name}
Duration: ${test.duration}
Details: ${test.details}
Timestamp: ${test.timestamp}
`).join('\n')}

Generated by AI Character Animation Engine
`;
  
  // Blob 생성하여 다운로드 링크 제공
  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  console.log('\n📥 Download test report:');
  console.log(`%cClick here to download report`, 'color: blue; text-decoration: underline; cursor: pointer;');
  
  // 임시 링크 생성
  const link = document.createElement('a');
  link.href = url;
  link.download = `ai-engine-test-report-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return testResults;
}

// 자동 실행
console.log('🎯 Starting tests in 3 seconds...');
setTimeout(() => {
  runAllTests().then(results => {
    console.log('🎉 All tests completed!');
    console.log('📈 Final results available in global variable: window.testResults');
    window.testResults = results;
  });
}, 3000);
