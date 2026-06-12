import { supabase } from './supabase';
import type { Pair, PairWithProfiles } from '../types/database';

export async function createInvite(childId: string): Promise<Pair> {
  const { data, error } = await supabase
    .from('pairs')
    .insert({ child_id: childId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPairByToken(token: string): Promise<Pair | null> {
  const { data, error } = await supabase
    .from('pairs')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .single();

  if (error) return null;
  return data;
}

export async function acceptInvite(
  token: string,
  parentId: string,
  relationshipLabel: string,
): Promise<Pair> {
  const pair = await getPairByToken(token);
  if (!pair) throw new Error('유효하지 않거나 이미 사용된 초대 링크입니다.');
  if (pair.child_id === parentId) throw new Error('본인이 만든 초대는 수락할 수 없습니다.');

  const { data, error } = await supabase
    .from('pairs')
    .update({
      parent_id: parentId,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .eq('id', pair.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMyPairs(userId: string): Promise<PairWithProfiles[]> {
  const { data, error } = await supabase
    .from('pairs')
    .select(`
      *,
      parent:profiles!pairs_parent_id_fkey(*),
      child:profiles!pairs_child_id_fkey(*)
    `)
    .or(`parent_id.eq.${userId},child_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PairWithProfiles[];
}
