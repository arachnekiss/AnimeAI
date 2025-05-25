@echo off
REM AnimeRig AI GUI 실행 배치 파일

echo "🚀 AnimeRig AI GUI 시작..."
cd /d "C:\ANIMEAI\animerig-ai"

REM PYTHONPATH 설정
set PYTHONPATH=c:\ANIMEAI\animerig-ai

REM GUI 실행
echo "GUI 실행 중..."
python frontend/desktop/main.py

echo "GUI 종료됨"
pause
