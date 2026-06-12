export type PairStatus = 'pending' | 'active';

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
