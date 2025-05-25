import React from 'react';

interface DemoCharacterCreationProps {
  log: (msg: string) => void;
  onCharacterGenerated?: () => void;
}

const DemoCharacterCreation: React.FC<DemoCharacterCreationProps> = ({ log, onCharacterGenerated }) => {
  // 실제 구현에서는 uploadCharacterImage, processCharacterImage, generateCharacterFromPrompt 등 실제 엔진 함수와 연결 필요
  const demoWithImage = async () => {
    log('=== DEMO: Character from Image ===');
    // 샘플 이미지 업로드 시연
    const sampleImageUrl = '/demo-assets/sample-character.png';
    log('Uploading image: ' + sampleImageUrl);
    // await uploadCharacterImage(sampleImageUrl);
    // await processCharacterImage(sampleImageUrl);
    log('Character extracted and animated!');
    onCharacterGenerated?.();
  };

  const demoWithPrompt = async () => {
    log('=== DEMO: Character from Prompt ===');
    const prompt = 'Cheerful anime girl with blue hair and cat ears';
    log('Generating character from prompt: ' + prompt);
    // await generateCharacterFromPrompt(prompt);
    log('Character generated and animated!');
    onCharacterGenerated?.();
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Character Generation Demo</h3>
      <button onClick={demoWithImage}>Demo: Image → Character</button>
      <button onClick={demoWithPrompt}>Demo: Prompt → Character</button>
    </div>
  );
};

export default DemoCharacterCreation;
