# CLAUDE.md — DeathAfter

PRD는 `docs/PRD.md`에 있다. 작업 전 반드시 읽어라.

---

## 기술 스택

| 영역 | 선택 |
|---|---|
| 앱 | Expo (React Native) + TypeScript + Expo Router |
| 백엔드 | Supabase (Auth, Postgres, Storage, RLS) |
| STT | OpenAI Whisper API — `src/lib/stt.ts`로 추상화, 교체 가능하게 |
| 적응형 질문 생성 | Claude API (`claude-sonnet-4-6`) — Supabase Edge Function에서만 호출 |
| 푸시 알림 | Expo Notifications |

API 키는 절대 클라이언트 코드에 두지 않는다. 환경 변수는 `.env`에, `.env.example`을 항상 함께 유지한다.

---

## 폴더 구조

```
/
├── app/                    # Expo Router 라우트
│   ├── (tabs)/
│   │   ├── today.tsx
│   │   ├── path.tsx
│   │   ├── companion.tsx
│   │   └── settings.tsx
│   ├── auth/
│   └── onboarding/
├── src/
│   ├── features/           # 기능별 모듈 (components + hooks + types)
│   │   ├── today/
│   │   ├── path/
│   │   ├── companion/
│   │   └── question/
│   ├── components/         # 공통 UI 컴포넌트
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── stt.ts          # STT 추상화
│   │   └── question-engine.ts  # Claude API 호출 추상화
│   └── theme/              # 디자인 토큰
├── supabase/
│   ├── migrations/         # DB 스키마 마이그레이션
│   └── functions/          # Edge Functions
├── docs/
│   └── PRD.md
└── scripts/                # 관리자용 스크립트 (export 등)
```

---

## 네이밍 규칙

PRD의 용어 체계를 코드 네이밍에도 그대로 사용한다.

| 개념 | 코드에서 |
|---|---|
| 사용자 | `traveler` |
| 연결된 부모/자식 | `companion` |
| 부모-자식 연결 단위 | `pair` |
| 타임라인 | `path` |
| 답변 하나 | `step` |
| 책 제작 시점 | `milestone` |

예: `useTravelerProfile`, `PairCard`, `StepItem`, `PathTimeline`, `CompanionInvite`

---

## 작업 규칙

### 세계관 언어
- 앱 UI에 노출되는 모든 문구(버튼, 안내문, 알림, 에러 메시지)에 죽음·사망·돌아가심 같은 직접 표현을 쓰지 않는다.
- "여정", "길", "걸음", "동행자", "기록이 남는다"로 표현한다.
- 코드 내부 변수명/주석은 예외 (명확성 우선).

### 양방향 대칭
- 부모와 자식은 동등한 주 기록자다. 한쪽만 질문을 받거나 답하는 비대칭 구조를 만들지 않는다.
- 질문 출처: AI 발행 / 부모→자식 직접 질문 / 자식→부모 직접 질문 세 가지를 모두 지원한다.

### UX 원칙
- 부모 세대(50~70대)가 쓴다. 기본 폰트 크기는 일반 앱보다 한 단계 크게, 터치 타겟 최소 48px.
- 재촉하는 알림 문구는 만들지 않는다. "아직 안 하셨어요" 류 금지.
- 음성 녹음 UI는 버튼 하나로 시작 가능해야 한다.

### 코드 품질
- 컴포넌트는 단일 책임. 화면 파일에 비즈니스 로직을 넣지 않는다.
- Supabase RLS를 항상 먼저 설계하고, 클라이언트 측 필터링에 의존하지 않는다.
- STT와 Claude API 호출은 각각 `src/lib/stt.ts`, `src/lib/question-engine.ts`를 통해서만.
- 마이그레이션 파일은 `supabase/migrations/`에, 되돌릴 수 없는 변경이면 주석으로 명시.
