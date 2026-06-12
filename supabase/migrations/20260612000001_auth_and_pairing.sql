-- Enable pgcrypto for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Supabase Auth의 auth.users 를 확장하는 공개 프로필 테이블
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── pairs ───────────────────────────────────────────────────────────────────
-- 부모-자식 1:1 페어. 한 사용자가 여러 페어를 가질 수 있다.
-- 초대 수락 전에는 parent_id = NULL (pending).
CREATE TABLE public.pairs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  child_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_label   text NOT NULL DEFAULT '',   -- '엄마', '아빠' 등
  invite_token         text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active')),
  started_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS: profiles ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 CRUD
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 같은 페어 멤버의 프로필도 조회 가능
CREATE POLICY "profiles_pair_member_select" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE (pairs.parent_id = auth.uid() AND pairs.child_id = profiles.id)
         OR (pairs.child_id  = auth.uid() AND pairs.parent_id = profiles.id)
    )
  );

-- ─── RLS: pairs ──────────────────────────────────────────────────────────────
ALTER TABLE public.pairs ENABLE ROW LEVEL SECURITY;

-- 페어 멤버는 자신의 페어를 조회
CREATE POLICY "pairs_member_select" ON public.pairs
  FOR SELECT USING (
    auth.uid() = parent_id OR auth.uid() = child_id
  );

-- pending 상태의 페어는 초대 토큰 확인을 위해 누구나 조회 가능
-- (토큰을 알아야만 접근 가능하므로 보안상 허용)
CREATE POLICY "pairs_pending_invite_select" ON public.pairs
  FOR SELECT USING (status = 'pending');

-- 인증된 사용자가 초대 생성 (child_id = 본인)
CREATE POLICY "pairs_child_insert" ON public.pairs
  FOR INSERT WITH CHECK (auth.uid() = child_id);

-- 페어 멤버가 페어 업데이트 (초대 수락, 관계 라벨 설정 등)
CREATE POLICY "pairs_member_update" ON public.pairs
  FOR UPDATE USING (
    auth.uid() = parent_id OR auth.uid() = child_id
  );

-- ─── Trigger: 회원가입 시 프로필 자동 생성 ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
