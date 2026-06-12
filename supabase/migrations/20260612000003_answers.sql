-- ─── answers ─────────────────────────────────────────────────────────────────
CREATE TABLE public.answers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id    uuid        NOT NULL REFERENCES public.daily_assignments(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_content     text,
  audio_url        text,                   -- storage path: "userId/assignmentId.m4a"
  audio_transcript text,
  photo_urls       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  visibility       text        NOT NULL DEFAULT 'shared'
                               CHECK (visibility IN ('shared', 'private', 'later')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, user_id)
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- 본인 답변은 항상 조회 가능
CREATE POLICY "answers_own_select" ON public.answers
  FOR SELECT USING (auth.uid() = user_id);

-- 페어 파트너의 'shared' 답변만 조회 가능
CREATE POLICY "answers_partner_shared_select" ON public.answers
  FOR SELECT USING (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.pairs p
      WHERE p.status = 'active'
        AND (
          (p.parent_id = auth.uid() AND p.child_id = answers.user_id)
          OR (p.child_id  = auth.uid() AND p.parent_id = answers.user_id)
        )
    )
  );

-- 본인 답변 삽입/수정
CREATE POLICY "answers_own_insert" ON public.answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "answers_own_update" ON public.answers
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Storage: answer-audio ────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'answer-audio', 'answer-audio', false,
  52428800,
  ARRAY['audio/m4a', 'audio/mpeg', 'audio/aac', 'audio/mp4', 'audio/x-m4a']
);

-- 본인 폴더 전체 권한 (경로: userId/...)
CREATE POLICY "audio_owner_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'answer-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'answer-audio'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 파트너가 shared 답변의 오디오 파일 조회 가능
CREATE POLICY "audio_partner_shared_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'answer-audio'
    AND EXISTS (
      SELECT 1 FROM public.answers a
      JOIN public.pairs p ON (
        p.status = 'active'
        AND (
          (p.parent_id = auth.uid() AND p.child_id = a.user_id)
          OR (p.child_id  = auth.uid() AND p.parent_id = a.user_id)
        )
      )
      WHERE a.audio_url = name
        AND a.visibility = 'shared'
    )
  );

-- ─── Storage: answer-photos ───────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'answer-photos', 'answer-photos', false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
);

CREATE POLICY "photos_owner_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'answer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'answer-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 파트너가 shared 답변의 사진 조회 가능
CREATE POLICY "photos_partner_shared_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'answer-photos'
    AND EXISTS (
      SELECT 1 FROM public.answers a
      CROSS JOIN jsonb_array_elements_text(a.photo_urls) AS photo_path
      JOIN public.pairs p ON (
        p.status = 'active'
        AND (
          (p.parent_id = auth.uid() AND p.child_id = a.user_id)
          OR (p.child_id  = auth.uid() AND p.parent_id = a.user_id)
        )
      )
      WHERE photo_path = name
        AND a.visibility = 'shared'
    )
  );
