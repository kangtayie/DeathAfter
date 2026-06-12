// STT 추상화 레이어 — 현재 구현체: OpenAI Whisper API
// 교체 시 이 파일만 수정한다.

export type SttResult = {
  text: string;
};

export async function transcribeAudio(audioUri: string): Promise<SttResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_OPENAI_API_KEY not set');

  const filename = audioUri.split('/').pop() ?? 'recording.m4a';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeType = ext === 'mp4' || ext === 'm4a' || ext === 'x-m4a' ? 'audio/m4a' : 'audio/mpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: mimeType,
    name: filename,
  } as unknown as Blob);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ko');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper API ${response.status}: ${body}`);
  }

  const json = (await response.json()) as { text: string };
  return { text: json.text.trim() };
}
