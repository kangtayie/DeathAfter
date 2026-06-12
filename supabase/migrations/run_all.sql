-- =====================================================================
-- DeathAfter — 전체 마이그레이션 (멱등성 보장 — 여러 번 실행해도 안전)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ─── pairs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pairs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  child_id             uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship_label   text NOT NULL DEFAULT '',
  invite_token         text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active')),
  started_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS: profiles ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own_select"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_pair_member_select" ON public.profiles;

CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_own_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_own_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

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

DROP POLICY IF EXISTS "pairs_member_select"         ON public.pairs;
DROP POLICY IF EXISTS "pairs_pending_invite_select" ON public.pairs;
DROP POLICY IF EXISTS "pairs_child_insert"          ON public.pairs;
DROP POLICY IF EXISTS "pairs_member_update"         ON public.pairs;

CREATE POLICY "pairs_member_select" ON public.pairs
  FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = child_id);

CREATE POLICY "pairs_pending_invite_select" ON public.pairs
  FOR SELECT USING (status = 'pending');

CREATE POLICY "pairs_child_insert" ON public.pairs
  FOR INSERT WITH CHECK (auth.uid() = child_id);

CREATE POLICY "pairs_member_update" ON public.pairs
  FOR UPDATE USING (auth.uid() = parent_id OR auth.uid() = child_id);

-- ─── Trigger: 회원가입 시 프로필 자동 생성 ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── question_bank ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_bank (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text   text NOT NULL,
  category        text NOT NULL CHECK (category IN (
    '유년 시절', '청년기', '결혼과 육아', '가치관', '우리 둘의 추억', '못 했던 말'
  )),
  depth_level     int  NOT NULL CHECK (depth_level BETWEEN 1 AND 5),
  target_audience text NOT NULL CHECK (target_audience IN ('부모용', '자식용', '공용')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_bank_auth_select" ON public.question_bank;
CREATE POLICY "question_bank_auth_select" ON public.question_bank
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─── daily_assignments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES public.question_bank(id),
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  answered_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, assigned_date)
);

ALTER TABLE public.daily_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_assignments_own_select"  ON public.daily_assignments;
DROP POLICY IF EXISTS "daily_assignments_pair_select" ON public.daily_assignments;
DROP POLICY IF EXISTS "daily_assignments_own_insert"  ON public.daily_assignments;
DROP POLICY IF EXISTS "daily_assignments_own_update"  ON public.daily_assignments;

CREATE POLICY "daily_assignments_own_select" ON public.daily_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_assignments_pair_select" ON public.daily_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pairs
      WHERE status = 'active'
        AND (
          (pairs.parent_id = auth.uid() AND pairs.child_id = daily_assignments.user_id)
          OR (pairs.child_id = auth.uid() AND pairs.parent_id = daily_assignments.user_id)
        )
    )
  );

CREATE POLICY "daily_assignments_own_insert" ON public.daily_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_assignments_own_update" ON public.daily_assignments
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── RPC: 오늘의 질문 배정 ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_daily_assignment(p_user_id uuid)
RETURNS TABLE(
  assignment_id   uuid,
  question_id     uuid,
  question_text   text,
  category        text,
  depth_level     int,
  target_audience text,
  is_answered     boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
  v_question_id   uuid;
  v_days_joined   int;
  v_max_level     int;
  v_is_parent     boolean;
  v_is_child      boolean;
BEGIN
  SELECT da.id INTO v_assignment_id
  FROM public.daily_assignments da
  WHERE da.user_id = p_user_id AND da.assigned_date = CURRENT_DATE;

  IF v_assignment_id IS NOT NULL THEN
    RETURN QUERY
      SELECT da.id, qb.id, qb.question_text, qb.category,
             qb.depth_level, qb.target_audience, (da.answered_at IS NOT NULL)
      FROM public.daily_assignments da
      JOIN public.question_bank qb ON qb.id = da.question_id
      WHERE da.id = v_assignment_id;
    RETURN;
  END IF;

  SELECT GREATEST(0, (CURRENT_DATE - p.created_at::date))::int
  INTO v_days_joined
  FROM public.profiles p WHERE p.id = p_user_id;

  v_max_level := CASE
    WHEN v_days_joined < 14 THEN 2
    WHEN v_days_joined < 30 THEN 3
    WHEN v_days_joined < 60 THEN 4
    ELSE 5
  END;

  SELECT EXISTS(SELECT 1 FROM public.pairs WHERE parent_id = p_user_id AND status = 'active') INTO v_is_parent;
  SELECT EXISTS(SELECT 1 FROM public.pairs WHERE child_id  = p_user_id AND status = 'active') INTO v_is_child;

  SELECT qb.id INTO v_question_id
  FROM public.question_bank qb
  WHERE qb.depth_level <= v_max_level
    AND qb.target_audience IN (
      '공용',
      CASE WHEN v_is_parent THEN '부모용' ELSE NULL END,
      CASE WHEN v_is_child  THEN '자식용' ELSE NULL END
    )
    AND qb.id NOT IN (
      SELECT da.question_id FROM public.daily_assignments da WHERE da.user_id = p_user_id
    )
  ORDER BY RANDOM() LIMIT 1;

  IF v_question_id IS NULL THEN
    SELECT qb.id INTO v_question_id
    FROM public.question_bank qb
    WHERE qb.id NOT IN (
      SELECT da.question_id FROM public.daily_assignments da WHERE da.user_id = p_user_id
    )
    ORDER BY RANDOM() LIMIT 1;
  END IF;

  IF v_question_id IS NULL THEN
    SELECT id INTO v_question_id FROM public.question_bank ORDER BY RANDOM() LIMIT 1;
  END IF;

  INSERT INTO public.daily_assignments (user_id, question_id, assigned_date)
  VALUES (p_user_id, v_question_id, CURRENT_DATE)
  ON CONFLICT (user_id, assigned_date) DO NOTHING;

  RETURN QUERY
    SELECT da.id, qb.id, qb.question_text, qb.category,
           qb.depth_level, qb.target_audience, (da.answered_at IS NOT NULL)
    FROM public.daily_assignments da
    JOIN public.question_bank qb ON qb.id = da.question_id
    WHERE da.user_id = p_user_id AND da.assigned_date = CURRENT_DATE;
END;
$$;

-- ─── 시드 데이터: 질문 60개 (이미 있으면 건너뜀) ─────────────────────────────
INSERT INTO public.question_bank (question_text, category, depth_level, target_audience)
SELECT * FROM (VALUES
  ('어린 시절 가장 좋아했던 음식이 무엇이었나요?',               '유년 시절', 1, '공용'),
  ('어릴 때 별명이 있었나요? 어떻게 생긴 별명인가요?',           '유년 시절', 1, '공용'),
  ('초등학교 때 제일 좋아했던 과목이 무엇이었나요?',             '유년 시절', 1, '공용'),
  ('어릴 때 부모님과 함께한 일과 중 가장 따뜻하게 기억되는 것이 있나요?', '유년 시절', 1, '자식용'),
  ('어린 시절 가장 자주 가던 동네 장소가 어디였나요?',           '유년 시절', 2, '공용'),
  ('처음으로 용돈을 받았을 때 무엇을 샀는지 기억하시나요?',      '유년 시절', 2, '공용'),
  ('어릴 때 친구들과 자주 하던 놀이가 무엇이었나요?',            '유년 시절', 2, '공용'),
  ('어릴 때 가장 혼났던 기억이 있으신가요? 어떤 일이었나요?',   '유년 시절', 3, '공용'),
  ('학교 다닐 때 가장 힘들었던 시기는 언제였나요?',              '유년 시절', 3, '공용'),
  ('어린 시절 가정 형편이 어떠했는지, 그때 어떤 마음으로 지내셨나요?', '유년 시절', 4, '부모용'),
  ('어린 시절로 돌아간다면 가장 달리 하고 싶은 것이 무엇인가요?', '유년 시절', 5, '공용'),
  ('젊었을 때 가장 좋아했던 노래나 가수가 있었나요?',            '청년기', 1, '공용'),
  ('첫 직장 또는 첫 아르바이트는 어떤 곳이었나요?',              '청년기', 1, '공용'),
  ('20대 때 꿈이 무엇이었나요? 이루셨나요?',                     '청년기', 2, '공용'),
  ('젊을 때 가장 자주 가던 장소가 어디였나요?',                  '청년기', 2, '공용'),
  ('청년 시절에 가장 용감한 결정을 내렸던 때가 언제인가요?',     '청년기', 3, '공용'),
  ('처음으로 큰 실패를 경험한 것이 언제인가요? 어떻게 이겨내셨나요?', '청년기', 3, '공용'),
  ('젊은 날 포기한 꿈이 있다면 무엇인가요?',                     '청년기', 4, '공용'),
  ('그 시절 가장 외롭고 힘들었던 순간은 언제였나요?',            '청년기', 4, '공용'),
  ('지금의 나를 만든 청년 시절의 경험이 있다면 무엇인가요?',     '청년기', 5, '공용'),
  ('배우자를 처음 만났을 때 첫인상이 어떠셨나요?',               '결혼과 육아', 1, '부모용'),
  ('결혼식 날 가장 기억에 남는 장면이 무엇인가요?',              '결혼과 육아', 1, '부모용'),
  ('아이를 처음 품에 안았을 때 어떤 느낌이었나요?',              '결혼과 육아', 2, '부모용'),
  ('육아 중 가장 웃겼던 에피소드가 있으신가요?',                 '결혼과 육아', 2, '부모용'),
  ('자녀를 키우면서 가장 뿌듯했던 순간은 언제인가요?',           '결혼과 육아', 2, '부모용'),
  ('부부 사이에 가장 힘들었던 시기는 언제였나요? 어떻게 극복하셨나요?', '결혼과 육아', 3, '부모용'),
  ('아이를 키우면서 예상과 가장 달랐던 점이 무엇인가요?',        '결혼과 육아', 3, '부모용'),
  ('배우자에게 가장 미안했던 순간이 있으신가요?',                '결혼과 육아', 4, '부모용'),
  ('부모로서 스스로 부족하다고 느꼈던 순간이 있으신가요?',       '결혼과 육아', 4, '부모용'),
  ('부모로서 가장 후회하시는 것이 있다면 무엇인가요?',           '결혼과 육아', 5, '부모용'),
  ('살면서 가장 소중하게 생각하시는 것이 무엇인가요?',           '가치관', 1, '공용'),
  ('나에게 행복이란 무엇인지 한 마디로 표현한다면 어떻게 말씀하시겠어요?', '가치관', 1, '공용'),
  ('삶에서 돈과 관계 중 어느 것이 더 중요하다고 생각하시나요?', '가치관', 2, '공용'),
  ('인생에서 가장 중요한 덕목이 무엇이라고 생각하시나요?',       '가치관', 2, '공용'),
  ('힘들 때 가장 의지가 되는 것이 무엇인가요?',                  '가치관', 2, '공용'),
  ('지금까지 살면서 가장 옳은 선택을 했다고 생각하시는 것은 무엇인가요?', '가치관', 3, '공용'),
  ('살면서 가장 큰 깨달음을 얻으신 순간이 언제였나요?',          '가치관', 3, '공용'),
  ('나이가 들면서 삶을 바라보는 시각이 어떻게 달라지셨나요?',    '가치관', 4, '부모용'),
  ('지금 가장 두렵거나 걱정되는 것이 무엇인가요?',               '가치관', 4, '공용'),
  ('이 세상을 떠날 때 어떤 사람으로 기억되고 싶으신가요?',       '가치관', 5, '공용'),
  ('저와 함께한 기억 중 가장 재미있었던 순간이 무엇인가요?',     '우리 둘의 추억', 1, '공용'),
  ('제가 어릴 때 어떤 아이였다고 기억하시나요?',                 '우리 둘의 추억', 1, '부모용'),
  ('저와 함께 먹었던 음식 중 가장 생각나는 것은 무엇인가요?',    '우리 둘의 추억', 1, '공용'),
  ('우리가 함께했던 여행이나 나들이 중 가장 기억에 남는 것이 있나요?', '우리 둘의 추억', 2, '공용'),
  ('제가 어른이 되어가는 걸 느끼셨던 순간이 있으신가요?',        '우리 둘의 추억', 2, '부모용'),
  ('저에 대해 오해했다가 나중에 이해하게 된 것이 있으신가요?',   '우리 둘의 추억', 3, '공용'),
  ('제가 힘들어할 때 어떤 마음이었는지 이야기해주실 수 있나요?', '우리 둘의 추억', 3, '부모용'),
  ('저와의 관계에서 더 잘하지 못했다고 아쉬운 점이 있으신가요?', '우리 둘의 추억', 4, '공용'),
  ('저에게 꼭 전하고 싶었는데 기회가 없어 못 했던 말이 있으신가요?', '우리 둘의 추억', 4, '공용'),
  ('제가 가장 자랑스러웠던 순간은 언제인가요?',                  '우리 둘의 추억', 5, '부모용'),
  ('요즘 일상에서 가장 즐거운 것이 무엇인가요?',                 '못 했던 말', 1, '공용'),
  ('요즘 가장 힘든 것이 있다면 무엇인가요?',                     '못 했던 말', 1, '공용'),
  ('나이가 들면서 가장 크게 달라진 것이 무엇이라고 느끼시나요?', '못 했던 말', 2, '부모용'),
  ('평소에 잘 표현하지 못하는 감정이 있으신가요?',               '못 했던 말', 2, '공용'),
  ('가족에게 자주 말하지 못하는 것이 있다면 무엇인가요?',        '못 했던 말', 2, '공용'),
  ('지금 가족에게 가장 미안한 것이 있다면 무엇인가요?',          '못 했던 말', 3, '공용'),
  ('부모님께 오랫동안 하지 못했던 말이 있다면 무엇인가요?',      '못 했던 말', 3, '자식용'),
  ('가족 중에 더 잘 대해드렸어야 했다고 후회하는 분이 계신가요?', '못 했던 말', 4, '공용'),
  ('저에게 꼭 사과하고 싶은 것이 있으신가요?',                   '못 했던 말', 4, '공용'),
  ('자식에게 꼭 남기고 싶은 말이 있다면 무엇인가요?',            '못 했던 말', 5, '부모용')
) AS v(question_text, category, depth_level, target_audience)
WHERE NOT EXISTS (SELECT 1 FROM public.question_bank);
