export type PairStatus = 'pending' | 'active';

export type QuestionCategory =
  | '유년 시절'
  | '청년기'
  | '결혼과 육아'
  | '가치관'
  | '우리 둘의 추억'
  | '못 했던 말';

export type TargetAudience = '부모용' | '자식용' | '공용';

export interface QuestionBank {
  id: string;
  question_text: string;
  category: QuestionCategory;
  depth_level: number;
  target_audience: TargetAudience;
  created_at: string;
}

export interface DailyAssignment {
  id: string;
  user_id: string;
  question_id: string;
  assigned_date: string;
  answered_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Pair {
  id: string;
  parent_id: string | null;
  child_id: string;
  relationship_label: string;
  invite_token: string;
  status: PairStatus;
  started_at: string | null;
  created_at: string;
}

export interface PairWithProfiles extends Pair {
  parent: Profile | null;
  child: Profile;
}
