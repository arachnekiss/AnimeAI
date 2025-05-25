import { useEffect } from 'react';

interface InteractionDemoProps {
  log: (msg: string) => void;
}

const InteractionDemo: React.FC<InteractionDemoProps> = ({ log }) => {
  useEffect(() => {
    // 자동 데모 시나리오 (실제 엔진 함수와 연결 필요)
    const runDemo = async () => {
      log('--- Click on character head ---');
      // await simulateClick(...)
      await wait(1000);
      log('--- Hover over character ---');
      // await simulateMouseMove(...)
      await wait(1000);
      log('--- Type message ---');
      // await simulateTyping(...)
      await wait(1000);
      log('--- Speak to character ---');
      // await simulateVoiceInput(...)
      await wait(1000);
      log('--- Enable camera mirroring ---');
      // await enableCameraMirroring(); await simulateFacialExpression(...)
      await wait(1000);
      log('--- Emotion changes ---');
      const emotions = ['happy', 'sad', 'surprised', 'thinking'];
      for (const emotion of emotions) {
        // await setCharacterEmotion(emotion);
        log('Set emotion: ' + emotion);
        await wait(800);
      }
    };
    // runDemo(); // 자동 실행 원할 때 주석 해제
  }, [log]);
  return null;
};

function wait(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

export default InteractionDemo;
