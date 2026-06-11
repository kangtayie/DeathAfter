// STT 추상화 레이어 — 현재 구현체: OpenAI Whisper API
// 교체 시 이 파일만 수정한다.

export type SttResult = {
  text: string;
  audioUrl: string;
};

export async function transcribeAudio(_audioUri: string): Promise<SttResult> {
  // TODO: Whisper API 연동
  throw new Error('STT not implemented yet');
}
