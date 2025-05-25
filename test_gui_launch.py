#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GUI 실행 테스트 스크립트
"""

import os
import sys
import subprocess
import time
import psutil

def check_gui_process():
    """실행 중인 GUI 프로세스 확인"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if 'python' in proc.info['name'].lower():
                cmdline = ' '.join(proc.info['cmdline'])
                if 'main.py' in cmdline and 'desktop' in cmdline:
                    return proc.info['pid']
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None

def launch_gui():
    """GUI 실행"""
    print("🚀 GUI 실행 중...")
    
    # 프로젝트 디렉토리로 이동
    os.chdir(r'C:\ANIMEAI\animerig-ai')
    
    # PYTHONPATH 설정
    env = os.environ.copy()
    env['PYTHONPATH'] = r'c:\ANIMEAI\animerig-ai'
    
    # GUI 실행
    cmd = [sys.executable, 'frontend/desktop/main.py']
    
    try:
        # 백그라운드에서 실행
        process = subprocess.Popen(
            cmd, 
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=r'C:\ANIMEAI\animerig-ai'
        )
        
        print(f"✅ GUI 프로세스 시작됨 (PID: {process.pid})")
        
        # 잠깐 대기해서 초기화 완료되도록
        time.sleep(3)
        
        # 출력 확인
        stdout, stderr = process.communicate(timeout=5)
        
        if stderr:
            print(f"⚠️ 에러 출력:")
            print(stderr.decode('utf-8', errors='ignore'))
        
        if stdout:
            print(f"📝 표준 출력:")
            print(stdout.decode('utf-8', errors='ignore'))
            
        return process.pid
        
    except subprocess.TimeoutExpired:
        print("✅ GUI가 계속 실행 중입니다 (정상)")
        return process.pid
    except Exception as e:
        print(f"❌ GUI 실행 오류: {e}")
        return None

def main():
    """메인 함수"""
    print("🔍 AnimeRig AI GUI 실행 테스트")
    print("=" * 40)
    
    # 기존 프로세스 확인
    existing_pid = check_gui_process()
    if existing_pid:
        print(f"✅ GUI가 이미 실행 중입니다 (PID: {existing_pid})")
        return True
    
    # GUI 실행
    pid = launch_gui()
    
    if pid:
        print(f"\n✅ GUI 실행 성공!")
        print(f"PID: {pid}")
        print("\n이제 GUI에서 다음을 확인하세요:")
        print("1. 갈색 블록 대신 캐릭터 실루엣이 표시되는지")
        print("2. 기본 캐릭터가 자동으로 로드되는지")
        print("3. 에러 없이 실행되는지")
        return True
    else:
        print(f"\n❌ GUI 실행 실패")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
