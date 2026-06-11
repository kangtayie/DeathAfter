// 적응형 질문 생성 추상화 — Supabase Edge Function을 통해 Claude API 호출
// 클라이언트에서 직접 호출 금지. 반드시 이 파일을 통해서만.

import { supabase } from './supabase';

export type GeneratedQuestion = {
  text: string;
  type: 'followup' | 'cross';
  sourcePairId: string;
};

export async function generateFollowupQuestion(
  _stepId: string,
): Promise<GeneratedQuestion> {
  // TODO: Supabase Edge Function 'generate-question' 호출
  const { data, error } = await supabase.functions.invoke('generate-question', {
    body: { stepId: _stepId },
  });
  if (error) throw error;
  return data as GeneratedQuestion;
}
