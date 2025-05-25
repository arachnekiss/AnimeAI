# 🔑 Environment Variables Setup Guide

## 🎯 Overview
AI Character Animation Engine을 실제 프로덕션 환경에서 사용하기 위한 환경 변수 설정 가이드입니다.

## 📋 Required Environment Variables

### 🤖 OpenAI API Configuration
```bash
# 필수: OpenAI API 키
REACT_APP_OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# 선택: 사용할 모델 지정 (기본값이 설정되어 있음)
REACT_APP_GPT_MODEL=gpt-3.5-turbo
REACT_APP_IMAGE_MODEL=gpt-4o-mini
REACT_APP_VOICE_MODEL=tts-1
REACT_APP_OPENAI_BASE_URL=https://api.openai.com/v1
```

### 🌐 Application Configuration
```bash
# 환경 설정
NODE_ENV=production
REACT_APP_ENVIRONMENT=production

# 애플리케이션 URL (배포 후 업데이트)
REACT_APP_APP_URL=https://your-app-domain.com

# API 타임아웃 (밀리초)
REACT_APP_API_TIMEOUT=15000
```

### 🎮 Feature Flags
```bash
# 기능 활성화/비활성화
REACT_APP_ENABLE_REAL_API=true
REACT_APP_ENABLE_VIDEO_RECORDING=true
REACT_APP_ENABLE_VOICE_SYNTHESIS=true
REACT_APP_ENABLE_IMAGE_ANALYSIS=true
```

### 📊 Analytics & Monitoring
```bash
# 성능 모니터링
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_MAX_LOG_ENTRIES=100

# 오류 리포팅 (선택사항)
REACT_APP_SENTRY_DSN=your-sentry-dsn-here
```

## 🚀 Platform-Specific Setup

### 📱 Replit Setup
1. Replit에서 프로젝트 열기
2. "Secrets" 탭에서 환경 변수 추가:
   ```
   REACT_APP_OPENAI_API_KEY = your-api-key
   REACT_APP_ENVIRONMENT = production
   ```

### ⚡ Vercel Setup
1. Vercel 대시보드에서 프로젝트 설정
2. Environment Variables 섹션에서 추가:
   ```
   REACT_APP_OPENAI_API_KEY = your-api-key
   REACT_APP_ENVIRONMENT = production
   REACT_APP_APP_URL = https://your-app.vercel.app
   ```

### 🌊 Netlify Setup
1. Netlify 사이트 설정
2. Environment variables에서 추가:
   ```
   REACT_APP_OPENAI_API_KEY = your-api-key
   REACT_APP_ENVIRONMENT = production
   REACT_APP_APP_URL = https://your-app.netlify.app
   ```

### 📈 Surge.sh Setup
```bash
# 로컬 .env 파일에 설정
echo "REACT_APP_OPENAI_API_KEY=your-api-key" > .env
echo "REACT_APP_ENVIRONMENT=production" >> .env

# 빌드 후 배포
npm run build
surge dist/
```

## 🔧 Development Setup

### 로컬 개발 환경
```bash
# .env 파일 생성
cp .env.example .env

# 필수 변수 설정
nano .env
```

### .env 파일 예시
```bash
# .env
REACT_APP_OPENAI_API_KEY=sk-proj-your-dev-api-key
REACT_APP_ENVIRONMENT=development
REACT_APP_APP_URL=http://localhost:3005
REACT_APP_ENABLE_REAL_API=true
REACT_APP_API_TIMEOUT=10000
```

## 🧪 Testing Configuration

### API Key 없이 테스트
```bash
# 데모 모드 (API 키 불필요)
REACT_APP_ENABLE_REAL_API=false
REACT_APP_DEMO_MODE=true
```

### 브라우저에서 임시 설정 (개발/테스트용)
```javascript
// 개발자 도구 콘솔에서 실행
localStorage.setItem('REACT_APP_OPENAI_API_KEY', 'your-test-key');
localStorage.setItem('REACT_APP_ENVIRONMENT', 'testing');

// 페이지 새로고침 후 적용됨
location.reload();
```

## 🔒 Security Best Practices

### API 키 보안
1. **절대 소스코드에 하드코딩하지 마세요**
2. **환경 변수만 사용하세요**
3. **API 키를 GitHub에 커밋하지 마세요**
4. **정기적으로 API 키를 교체하세요**

### 환경별 키 분리
```bash
# 개발 환경
REACT_APP_OPENAI_API_KEY=sk-proj-dev-key-here

# 스테이징 환경  
REACT_APP_OPENAI_API_KEY=sk-proj-staging-key-here

# 프로덕션 환경
REACT_APP_OPENAI_API_KEY=sk-proj-prod-key-here
```

## 🚨 Troubleshooting

### 일반적인 문제들

#### 1. API 키가 인식되지 않음
```bash
# 확인사항:
# - 환경 변수명이 정확한지 (REACT_APP_ 접두사 필수)
# - 빌드 후 다시 배포했는지
# - 브라우저 캐시 삭제했는지
```

#### 2. CORS 오류
```bash
# 해결방법:
# - REACT_APP_OPENAI_BASE_URL 확인
# - 브라우저에서 직접 API 호출 (서버 없이)
# - 프록시 설정 확인
```

#### 3. 배포 후 환경 변수 미적용
```bash
# 확인사항:
# - 빌드 시점에 환경 변수가 설정되어 있었는지
# - 플랫폼별 환경 변수 설정이 올바른지
# - 캐시 무효화가 되었는지
```

## ✅ Validation Checklist

### 배포 전 체크리스트
- [ ] 모든 필수 환경 변수 설정됨
- [ ] API 키가 유효하고 크레딧이 충분함
- [ ] 테스트 환경에서 모든 기능 동작 확인
- [ ] 프로덕션 빌드 성공
- [ ] HTTPS 설정 (필수)

### 배포 후 체크리스트
- [ ] API 테스트 패널에서 모든 테스트 통과
- [ ] 캐릭터 생성 기능 동작
- [ ] 이미지 분석 기능 동작
- [ ] 음성 합성 기능 동작 (선택)
- [ ] 성능 모니터링 정상 작동

## 🔄 Environment Variable Updates

### 런타임 업데이트 (일부 플랫폼)
```bash
# Vercel
vercel env add REACT_APP_OPENAI_API_KEY

# Netlify
netlify env:set REACT_APP_OPENAI_API_KEY your-new-key

# 재배포 필요
```

### Replit에서 업데이트
1. Secrets 탭 열기
2. 기존 키 수정 또는 새 키 추가
3. 애플리케이션 재시작

## 📞 Support

### 문제 해결이 안 될 때
1. [API Testing Guide](./API_TESTING_GUIDE.md) 참조
2. 브라우저 개발자 도구에서 콘솔 오류 확인
3. 네트워크 탭에서 API 요청/응답 확인

### 유용한 디버깅 명령어
```javascript
// 브라우저 콘솔에서 실행
console.log('Environment:', process.env.NODE_ENV);
console.log('API Key set:', !!process.env.REACT_APP_OPENAI_API_KEY);
console.log('App URL:', process.env.REACT_APP_APP_URL);
```

---

## 🎯 Quick Setup Commands

### 새 프로젝트 설정
```bash
# 1. 환경 변수 파일 생성
cp .env.example .env

# 2. API 키 설정 (실제 키로 교체)
echo "REACT_APP_OPENAI_API_KEY=your-api-key-here" >> .env

# 3. 개발 서버 시작
npm run dev

# 4. API 테스트 실행
# 브라우저에서 localhost:3005 접속 후 "🔬 Test AI Engine" 클릭
```

### 프로덕션 배포
```bash
# 1. 환경 변수 확인
npm run env:check

# 2. 프로덕션 빌드
npm run build

# 3. 배포 (플랫폼별)
npm run deploy:vercel
# 또는
npm run deploy:netlify
# 또는
npm run deploy:surge
```

이 가이드를 따라하면 AI Character Animation Engine을 실제 프로덕션 환경에서 안전하고 효과적으로 운영할 수 있습니다!
