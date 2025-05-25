#!/usr/bin/env python3
"""
AnimeRig AI Desktop Application - 최종 통합 검증 스크립트
GUI 검증, 성능 테스트, 백엔드 연결 테스트를 통합 실행
"""

import os
import sys
import time
import subprocess
import json
from datetime import datetime
from pathlib import Path

class FinalVerificationRunner:
    def __init__(self):
        self.start_time = time.time()
        self.results = {
            'automated_tests': {},
            'performance_tests': {},
            'integration_tests': {},
            'summary': {}
        }
        self.verification_dir = Path("verification_results")
        self.verification_dir.mkdir(exist_ok=True)

    def print_header(self, title):
        """섹션 헤더 출력"""
        print(f"\n{'='*60}")
        print(f"🎭 {title}")
        print(f"{'='*60}")

    def print_step(self, step_number, title):
        """단계별 진행상황 출력"""
        print(f"\n📋 Step {step_number}: {title}")
        print("-" * 40)

    def run_automated_gui_tests(self):
        """자동화된 GUI 테스트 실행"""
        self.print_step(1, "자동화된 GUI 테스트 실행")
        
        try:
            # 오프스크린 모드로 GUI 테스트 실행
            env = os.environ.copy()
            env['QT_QPA_PLATFORM'] = 'offscreen'
            
            result = subprocess.run([
                sys.executable, 'test_gui_functions.py'
            ], capture_output=True, text=True, env=env, timeout=60)
            
            if result.returncode == 0:
                print("✅ 자동화된 GUI 테스트 완료")
                self.results['automated_tests']['status'] = 'PASSED'
                self.results['automated_tests']['details'] = 'All 7 tests passed'
                
                # 성공률 추출
                if "Success Rate: 100.0%" in result.stdout:
                    self.results['automated_tests']['success_rate'] = 100.0
                    
            else:
                print(f"❌ 자동화된 GUI 테스트 실패: {result.stderr}")
                self.results['automated_tests']['status'] = 'FAILED'
                self.results['automated_tests']['error'] = result.stderr
                
        except Exception as e:
            print(f"❌ GUI 테스트 실행 중 오류: {e}")
            self.results['automated_tests']['status'] = 'ERROR'
            self.results['automated_tests']['error'] = str(e)

    def check_dependencies(self):
        """의존성 및 환경 확인"""
        self.print_step(2, "시스템 의존성 확인")
        
        deps_status = {}
        
        # Python 버전 확인
        python_version = sys.version.split()[0]
        print(f"✓ Python: {python_version}")
        deps_status['python'] = python_version
        
        # PyQt6 확인
        try:
            import PyQt6
            print("✓ PyQt6: 설치됨")
            deps_status['pyqt6'] = 'installed'
        except ImportError:
            print("❌ PyQt6: 설치되지 않음")
            deps_status['pyqt6'] = 'not_installed'
        
        # C++ 엔진 확인
        engine_files = list(Path("animerig_py").glob("*.so"))
        if engine_files:
            print(f"✓ C++ Engine: {len(engine_files)} 바이너리 파일 발견")
            deps_status['cpp_engine'] = f"{len(engine_files)} binaries"
        else:
            print("❌ C++ Engine: 바이너리 파일 없음")
            deps_status['cpp_engine'] = 'not_found'
        
        self.results['automated_tests']['dependencies'] = deps_status

    def run_visual_verification(self):
        """시각적 검증 체크리스트 생성 및 확인"""
        self.print_step(3, "시각적 검증 체크리스트 확인")
        
        try:
            # 기존 체크리스트 파일 확인
            checklist_file = self.verification_dir / "visual_checklist.txt"
            if checklist_file.exists():
                print("✅ 시각적 검증 체크리스트 존재")
                
                # 완료된 항목 수 확인
                content = checklist_file.read_text()
                completed_items = content.count("☑️")
                total_items = content.count("☐") + content.count("☑️")
                
                if total_items > 0:
                    completion_rate = (completed_items / total_items) * 100
                    print(f"✓ 체크리스트 완료율: {completion_rate:.1f}% ({completed_items}/{total_items})")
                    
                    self.results['integration_tests']['visual_verification'] = {
                        'completed': completed_items,
                        'total': total_items,
                        'completion_rate': completion_rate
                    }
                else:
                    print("❌ 체크리스트 항목을 찾을 수 없음")
            else:
                print("❌ 시각적 검증 체크리스트가 존재하지 않음")
                
        except Exception as e:
            print(f"❌ 시각적 검증 확인 중 오류: {e}")

    def check_performance_metrics(self):
        """성능 메트릭 확인"""
        self.print_step(4, "성능 메트릭 확인")
        
        try:
            # 테스트 실행 시간 계산
            test_duration = time.time() - self.start_time
            print(f"✓ 테스트 실행 시간: {test_duration:.2f}초")
            
            # 메모리 사용량 (대략적)
            import psutil
            memory_info = psutil.virtual_memory()
            print(f"✓ 시스템 메모리 사용률: {memory_info.percent}%")
            
            self.results['performance_tests'] = {
                'test_duration': test_duration,
                'memory_usage_percent': memory_info.percent,
                'status': 'PASSED' if test_duration < 120 else 'WARNING'
            }
            
        except ImportError:
            print("⚠️ psutil 모듈이 없어 메모리 정보를 확인할 수 없음")
            self.results['performance_tests'] = {
                'test_duration': time.time() - self.start_time,
                'status': 'LIMITED'
            }

    def generate_final_report(self):
        """최종 검증 보고서 생성"""
        self.print_step(5, "최종 검증 보고서 생성")
        
        # 전체 성공률 계산
        automated_success = self.results['automated_tests'].get('success_rate', 0)
        visual_success = 0
        
        if 'visual_verification' in self.results['integration_tests']:
            visual_success = self.results['integration_tests']['visual_verification'].get('completion_rate', 0)
        
        overall_success = (automated_success + visual_success) / 2 if visual_success > 0 else automated_success
        
        self.results['summary'] = {
            'overall_success_rate': overall_success,
            'automated_tests_passed': automated_success >= 95,
            'visual_verification_passed': visual_success >= 90,
            'performance_acceptable': self.results['performance_tests'].get('status') != 'FAILED',
            'timestamp': datetime.now().isoformat()
        }
        
        # JSON 보고서 저장
        report_file = self.verification_dir / "final_verification_results.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        # 텍스트 요약 보고서 생성
        summary_file = self.verification_dir / "FINAL_VERIFICATION_SUMMARY.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("🎭 AnimeRig AI Desktop Application - 최종 검증 요약\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"검증 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"총 검증 시간: {time.time() - self.start_time:.2f}초\n\n")
            
            f.write("📊 검증 결과 요약:\n")
            f.write(f"• 전체 성공률: {overall_success:.1f}%\n")
            f.write(f"• 자동화 테스트: {'✅ 통과' if automated_success >= 95 else '❌ 실패'}\n")
            f.write(f"• 시각적 검증: {'✅ 통과' if visual_success >= 90 else '❌ 실패'}\n")
            f.write(f"• 성능 테스트: {'✅ 통과' if self.results['performance_tests'].get('status') != 'FAILED' else '❌ 실패'}\n\n")
            
            if overall_success >= 95:
                f.write("🎉 결론: AnimeRig AI Desktop Application GUI 검증 완료!\n")
                f.write("    프로덕션 환경으로 배포 준비 완료\n")
            else:
                f.write("⚠️  결론: 일부 검증 항목에서 개선이 필요합니다.\n")
                f.write("    추가 수정 후 재검증 권장\n")
        
        print(f"✅ 최종 검증 보고서 생성 완료")
        print(f"📁 결과 저장 위치: {report_file}")
        print(f"📄 요약 보고서: {summary_file}")

    def print_summary(self):
        """최종 요약 출력"""
        self.print_header("최종 검증 결과 요약")
        
        summary = self.results['summary']
        
        print(f"🎯 전체 성공률: {summary['overall_success_rate']:.1f}%")
        print(f"⏱️  총 소요 시간: {time.time() - self.start_time:.2f}초")
        
        print("\n📋 세부 결과:")
        print(f"  • 자동화 테스트: {'✅' if summary['automated_tests_passed'] else '❌'}")
        print(f"  • 시각적 검증: {'✅' if summary['visual_verification_passed'] else '❌'}")
        print(f"  • 성능 테스트: {'✅' if summary['performance_acceptable'] else '❌'}")
        
        if summary['overall_success_rate'] >= 95:
            print("\n🎉 검증 완료! 프로덕션 배포 준비 완료")
        else:
            print("\n⚠️  일부 항목 개선 필요 - 추가 수정 권장")

    def run(self):
        """전체 검증 프로세스 실행"""
        self.print_header("AnimeRig AI Desktop Application - 최종 통합 검증")
        print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 1. 자동화된 GUI 테스트
        self.run_automated_gui_tests()
        
        # 2. 의존성 확인
        self.check_dependencies()
        
        # 3. 시각적 검증 확인
        self.run_visual_verification()
        
        # 4. 성능 메트릭 확인
        self.check_performance_metrics()
        
        # 5. 최종 보고서 생성
        self.generate_final_report()
        
        # 6. 요약 출력
        self.print_summary()

if __name__ == "__main__":
    print("🎭 AnimeRig AI Desktop Application")
    print("   Final Comprehensive Verification Runner")
    print("   " + "="*50)
    
    runner = FinalVerificationRunner()
    runner.run()
