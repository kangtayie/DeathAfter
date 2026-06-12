import { supabase } from './supabase';
import { transcribeAudio } from './stt';
import { markAnswered } from './questions';

export type Visibility = 'shared' | 'private' | 'later';

export interface Answer {
  id: string;
  assignment_id: string;
  user_id: string;
  text_content: string | null;
  audio_url: string | null;
  audio_transcript: string | null;
  photo_urls: string[];
  visibility: Visibility;
  created_at: string;
}

export interface AnswerHistoryEntry {
  answer: Answer;
  question_text: string;
  category: string;
  assigned_date: string;
}

export interface SubmitAnswerParams {
  assignmentId: string;
  userId: string;
  textContent?: string;
  audioUri?: string;
  photoUris?: string[];
  visibility: Visibility;
}

export async function submitAnswer(params: SubmitAnswerParams): Promise<Answer> {
  const { assignmentId, userId, textContent, audioUri, photoUris = [], visibility } = params;

  let audioStoragePath: string | null = null;
  let transcript: string | null = null;

  if (audioUri) {
    const path = `${userId}/${assignmentId}.m4a`;
    const ab = await uriToArrayBuffer(audioUri);
    const { error } = await supabase.storage
      .from('answer-audio')
      .upload(path, ab, { contentType: 'audio/m4a', upsert: true });
    if (error) throw error;
    audioStoragePath = path;

    // STT 실패는 비치명적 — transcript만 null로 남김
    try {
      const res = await transcribeAudio(audioUri);
      transcript = res.text || null;
    } catch (e) {
      console.warn('[STT] failed, continuing without transcript:', e);
    }
  }

  const photoStoragePaths: string[] = [];
  for (let i = 0; i < photoUris.length; i++) {
    const uri = photoUris[i];
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';
    const path = `${userId}/${assignmentId}_${i}.${ext}`;
    const ab = await uriToArrayBuffer(uri);
    const { error } = await supabase.storage
      .from('answer-photos')
      .upload(path, ab, { contentType: mime, upsert: true });
    if (error) throw error;
    photoStoragePaths.push(path);
  }

  const { data, error: dbErr } = await supabase
    .from('answers')
    .upsert(
      {
        assignment_id: assignmentId,
        user_id: userId,
        text_content: textContent ?? null,
        audio_url: audioStoragePath,
        audio_transcript: transcript,
        photo_urls: photoStoragePaths,
        visibility,
      },
      { onConflict: 'assignment_id,user_id' },
    )
    .select()
    .single();

  if (dbErr) throw dbErr;

  await markAnswered(assignmentId);

  return normalizeAnswer(data);
}

export async function getMyAnswer(assignmentId: string): Promise<Answer | null> {
  const { data } = await supabase
    .from('answers')
    .select('*')
    .eq('assignment_id', assignmentId)
    .maybeSingle();
  return data ? normalizeAnswer(data) : null;
}

export async function getAnswerById(answerId: string): Promise<Answer | null> {
  const { data } = await supabase
    .from('answers')
    .select('*')
    .eq('id', answerId)
    .maybeSingle();
  return data ? normalizeAnswer(data) : null;
}

export async function getMyAnswerHistory(userId: string): Promise<AnswerHistoryEntry[]> {
  const { data } = await supabase
    .from('answers')
    .select(`
      *,
      daily_assignments!inner(
        assigned_date,
        question_bank!inner(question_text, category)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    answer: normalizeAnswer(row),
    question_text: row.daily_assignments.question_bank.question_text,
    category: row.daily_assignments.question_bank.category,
    assigned_date: row.daily_assignments.assigned_date,
  }));
}

/** Storage 경로 → 1시간 유효 signed URL */
export async function getSignedUrl(bucket: 'answer-audio' | 'answer-photos', path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAnswer(row: any): Answer {
  return {
    id: row.id,
    assignment_id: row.assignment_id,
    user_id: row.user_id,
    text_content: row.text_content ?? null,
    audio_url: row.audio_url ?? null,
    audio_transcript: row.audio_transcript ?? null,
    photo_urls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
    visibility: row.visibility as Visibility,
    created_at: row.created_at,
  };
}

async function uriToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  const res = await fetch(uri);
  return res.arrayBuffer();
}
