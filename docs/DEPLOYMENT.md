# AI Character Engine Deployment Guide

## Quick Start

1. 환경 변수 설정: `.env` 파일을 복사해 실제 값으로 채우세요.
2. 의존성 설치: `npm install`
3. 개발 서버 실행: `npm run dev`
4. 프로덕션 빌드: `npm run build:production`
5. 서비스워커 등록 및 PWA 배포: `public/manifest.json` 및 `src/service-worker.ts` 포함

## 빌드 최적화
- 트리쉐이킹, 코드스플리팅, 이미지(WebP) 최적화, 압축(Brotli/Gzip)
- CDN 활용 권장

## 멀티플랫폼 빌드
- PWA: manifest.json, service-worker.ts
- Android: WebView + PWA, APK/AAB 빌드
- iOS: WebView + PWA, 향후 지원

## 운영/모니터링
- PerformanceMonitor로 실시간 성능 확인
- E2E 테스트: `/tests/e2e/character-interactions.spec.ts`
- 보안: API 키, 사용자 데이터, HTTPS 적용
- 로드테스트: 1000+ 동접 지원

## 문서
- Quick Start, Developer Guide, API Reference, Scaling, Monitoring 등 docs/ 폴더 참고
