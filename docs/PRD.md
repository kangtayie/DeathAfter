# PRD — DeathAfter

## 한 줄 정의

부모와 자식이 매일 하나의 질문에 답하며 서로의 삶을 기록하고,  
그 기록이 실물 책으로, 그리고 언젠가 한쪽이 세상을 떠난 뒤에는 남은 사람의 유산으로 남는 모바일 앱.

---

## 세계관

- **삶 = 여정(trip). 나 = 나그네(여행자).** "함께 길을 걷고 있는" 컨셉.
- 앱 어디에서도 죽음·사망이라는 단어를 직접 쓰지 않는다.
  대신 "여정", "길", "동행", "기록이 남는다"로 표현한다.
- 모든 UI 문구, 빈 화면 안내, 푸시 알림, 에러 메시지까지 이 세계관 안에서 작성한다.

### 용어 체계 (UI ↔ 코드 네이밍 대응)

| UI 표현 | 코드 네이밍 | 설명 |
|---|---|---|
| 나그네 | traveler | 앱 사용자 |
| 동행자 | companion | 연결된 부모 또는 자식 |
| 길 | path | 두 사람의 기록 타임라인 |
| 걸음 / 발자국 | step | 답변 하나 |
| 이정표 | milestone | 책 제작 등 특정 시점 |
| 페어 | pair | 부모-자식 1:1 연결 단위 |

---

## 타겟

- **시작자**: 30~40대 자식. 서비스를 알고 부모를 초대하는 쪽.
- **주 사용자**: 두 역할 모두. 부모(50~70대)와 자식(30~40대) **모두 주 기록자**다.
  둘 다 질문에 답하고, 서로의 기록을 읽고 반응하고, 서로에게 질문을 건넨다.
- 부모용 UX는 극단적으로 단순해야 한다: 초대 링크 → 설치 → 최소 가입 → 바로 첫 질문.

---

## 코어 기능

### 1. 질문 발행

- 하루 최대 1개의 질문이 각 사용자에게 발행된다.
- 질문 출처는 세 가지:
  1. **AI 발행**: 시스템이 질문 뱅크에서 선택하거나, 이전 답변 내용을 분석해 후속 질문 생성.
  2. **부모 → 자식 질문**: 부모가 직접 자식에게 질문을 작성해 보낸다.
  3. **자식 → 부모 질문**: 자식이 직접 부모에게 질문을 작성해 보낸다.
- 교차 질문: 한 사람의 답변에서 나온 소재를 AI가 감지해 상대에게 같은 주제의 질문을 보낸다.
  예: 부모가 싱가폴 여행을 이야기하면 → 자식에게 "어머니가 싱가폴 여행 이야기를 하셨어요. 당신에게 그 여행은 어떤 기억인가요?"

### 2. 답변 작성

- 형식: 타이핑(글) 또는 음성 녹음 중 하나 + 사진 여러 장 첨부 가능.
- 음성: 녹음 후 STT(Whisper API)로 텍스트화, 원본 오디오 보존.
- 부모 쪽 기본 UI: 큰 버튼 하나 "말씀해주세요" (음성 우선). 타이핑으로 전환 가능.
- 자식 쪽 기본 UI: 텍스트 입력 우선. 음성으로 전환 가능.
- 공개 설정(답변별): **지금 공유** / **나만 보기** / **나중에 전달**.

### 3. 길(path) 타임라인

- 홈 화면 = 길. 답변이 쌓일수록 길이 한 걸음씩 이어진다.
- 페어 뷰에서는 두 갈래 길: 부모의 길과 자식의 길이 나란히 흐른다.
- 교차 질문으로 연결된 답변 쌍이 있는 지점에서 두 길이 만나는 **교차점**이 생긴다.
- 걸음을 탭하면 답변 상세(텍스트 + 오디오 재생 + 사진) 진입.

### 4. 질문 뱅크

카테고리별 질문, 깊이 레벨 1~5:

| 카테고리 | 설명 |
|---|---|
| 유년 시절 | 어린 시절 기억, 가족 풍경 |
| 청년기 | 꿈, 첫 경험, 중요한 선택 |
| 결혼과 육아 | 가정을 꾸리던 시절 |
| 가치관 | 삶에서 중요하게 여기는 것 |
| 우리 둘의 추억 | 함께한 기억, 함께 떠난 여행 |
| 못 했던 말 | 전하지 못한 감사, 미안함, 사랑 |

- 깊이 곡선: 가입 첫 2주는 레벨 1~2(가볍고 즐거운 질문) → 이후 점진적으로 깊은 레벨 추가.
- 이미 답한 질문은 재발행 금지.

### 5. 책 제작 (MVP 후순위)

- 1년 주기 또는 어버이날 등 이벤트 시점에 기록을 묶어 실물 책 제작·배송.
- MVP에서는 자동화하지 않는다. 기록 전체를 export하는 기능(JSON + 미디어)까지만 구현.
- 오디오는 책에 QR코드로 수록 예정 → 각 오디오 파일의 재생 URL 구조 설계 필요.

---

## 화면 목록

```
(탭 구조)
├── 오늘 탭 (today)
│   ├── 오늘의 질문 + 답변 작성 화면
│   └── 답변 완료 화면
├── 길 탭 (path)
│   ├── 페어 선택 (페어가 여러 개일 때)
│   └── 두 갈래 길 타임라인 + 답변 상세
├── 동행자 탭 (companion)
│   ├── 내 페어 목록
│   ├── 페어 상세 (동행자 프로필 + 질문 보내기)
│   └── 부모 초대 화면 (초대 링크 생성)
└── 설정 탭 (settings)
    ├── 프로필
    ├── 알림 시간 설정
    └── 기록 export (관리자용)

(온보딩 — 인증 플로우)
├── 시작 화면 (세계관 한 문장)
├── 가입 / 로그인
├── 초대 링크 수신 → 자동 페어링 확인
└── 첫 질문 안내
```

---

## 데이터 모델 초안

### users (Supabase Auth 연동)
```
id              uuid PK
email           text
display_name    text
avatar_url      text
role_hint       enum('parent', 'child') -- 페어 생성 시 결정, 한 사람이 두 역할 가능
created_at      timestamptz
```

### pairs
```
id              uuid PK
parent_id       uuid FK → users.id
child_id        uuid FK → users.id
relationship_label  text  -- '엄마', '아빠', '아들', '딸' 등 자유 입력
invite_token    text UNIQUE  -- 초대 링크용
status          enum('pending', 'active')
started_at      timestamptz
```

### question_bank
```
id              uuid PK
text            text
category        enum('childhood', 'youth', 'family', 'values', 'shared_memory', 'unsaid')
depth_level     int  -- 1(가벼움) ~ 5(깊음)
target          enum('parent', 'child', 'both')
is_active       bool
```

### questions (발행된 질문 인스턴스)
```
id              uuid PK
pair_id         uuid FK → pairs.id
recipient_id    uuid FK → users.id  -- 이 질문을 받은 사람
bank_id         uuid FK → question_bank.id NULLABLE  -- 뱅크 기반일 때
generated_from_step_id  uuid FK → steps.id NULLABLE  -- AI 생성일 때 원본 답변
sender_id       uuid FK → users.id NULLABLE  -- 사람이 보낸 질문일 때
type            enum('scheduled', 'followup', 'cross', 'user_sent')
text            text  -- AI 생성 또는 사용자 직접 입력
scheduled_date  date
is_answered     bool
created_at      timestamptz
```

### steps (답변 = 걸음)
```
id              uuid PK
question_id     uuid FK → questions.id
pair_id         uuid FK → pairs.id
author_id       uuid FK → users.id
text_content    text NULLABLE  -- 타이핑 또는 STT 결과
audio_url       text NULLABLE  -- Supabase Storage 경로
visibility      enum('shared', 'private', 'deferred')
created_at      timestamptz
```

### media
```
id              uuid PK
step_id         uuid FK → steps.id
storage_path    text
mime_type       text
order_index     int
created_at      timestamptz
```

### RLS 원칙
- 자신이 속한 pair의 데이터만 접근 가능.
- visibility = 'private' 또는 'deferred'인 step은 author 본인만 조회 가능.
- invite_token은 미인증 상태에서도 pair 상태 조회 가능 (초대 수락용).

---

## MVP 구현 순서

1. 프로젝트 스캐폴딩 + 디자인 토큰
2. 인증 + 부모 초대/페어링
3. 질문 뱅크 + 데일리 질문 발행
4. 답변 작성 (글/음성/사진, STT)
5. 길 타임라인 홈 화면
6. 적응형/교차 질문 + 사용자 간 직접 질문 (Claude API)
7. 푸시 알림 + 공개 설정
8. 기록 export (책 제작용)
