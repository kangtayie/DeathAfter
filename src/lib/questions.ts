import { supabase } from './supabase';
import type { QuestionCategory, TargetAudience } from '../types/database';

export type TodayAssignment = {
  assignmentId: string;
  question: {
    id: string;
    text: string;
    category: QuestionCategory;
    depthLevel: number;
    targetAudience: TargetAudience;
  };
  isAnswered: boolean;
  partnerDisplayName: string | null;
  partnerAnswered: boolean | null;
};

type RpcRow = {
  assignment_id: string;
  question_id: string;
  question_text: string;
  category: string;
  depth_level: number;
  target_audience: string;
  is_answered: boolean;
};

export async function getTodayAssignment(userId: string): Promise<TodayAssignment | null> {
  const { data, error } = await supabase.rpc('get_or_create_daily_assignment', {
    p_user_id: userId,
  });
  if (error || !data || (data as RpcRow[]).length === 0) return null;

  const row = (data as RpcRow[])[0];
  const today = new Date().toISOString().split('T')[0];

  // 페어 파트너 조회
  const { data: pair } = await supabase
    .from('pairs')
    .select(
      'parent_id, child_id, parent:profiles!pairs_parent_id_fkey(id, display_name), child:profiles!pairs_child_id_fkey(id, display_name)',
    )
    .or(`parent_id.eq.${userId},child_id.eq.${userId}`)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (!pair) {
    return buildResult(row, null, null);
  }

  const partnerId = pair.parent_id === userId ? pair.child_id : pair.parent_id;
  const partnerProfile = (pair.parent_id === userId ? pair.child : pair.parent) as
    | { id: string; display_name: string }
    | null;

  // 파트너가 오늘 답변했는지 확인
  const { data: partnerAssignment } = await supabase
    .from('daily_assignments')
    .select('answered_at')
    .eq('user_id', partnerId)
    .eq('assigned_date', today)
    .maybeSingle();

  const partnerAnswered = partnerAssignment
    ? partnerAssignment.answered_at !== null
    : false;

  return buildResult(row, partnerProfile?.display_name ?? null, partnerAnswered);
}

export async function markAnswered(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from('daily_assignments')
    .update({ answered_at: new Date().toISOString() })
    .eq('id', assignmentId);
  if (error) throw error;
}

function buildResult(
  row: RpcRow,
  partnerDisplayName: string | null,
  partnerAnswered: boolean | null,
): TodayAssignment {
  return {
    assignmentId: row.assignment_id,
    question: {
      id: row.question_id,
      text: row.question_text,
      category: row.category as QuestionCategory,
      depthLevel: row.depth_level,
      targetAudience: row.target_audience as TargetAudience,
    },
    isAnswered: row.is_answered,
    partnerDisplayName,
    partnerAnswered,
  };
}
