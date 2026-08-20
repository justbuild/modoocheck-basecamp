<p align="center">
  <img src="public/img/modoocheck-logo.svg" alt="모두출첵" width="212" />
</p>

<h1 align="center">모두출첵 베이스캠프</h1>

> 모두출첵 Agent API 위에서 학원장과 AI가 함께 확장해 나가는 **AI-native 자체 관리시스템 스타터**입니다.

공식 데이터(학생·출결·원비·공지)는 그대로 모두출첵 Core에 두고, Basecamp는 **안전한 연결 계층(BFF)** 과 **자체 데이터 저장소** 역할만 합니다. 여기에 상담 기록, 커스텀 태그, 자동화 규칙 같은 우리 학원만의 기능을 얹어 나갑니다.

---

## 아키텍처

```text
Owner browser ──→ Basecamp BFF ──→ modoocheck5-agent-api ──→ modoocheck5-api ──→ Core DB
                       │
                       └──────→ Basecamp SQLite (세션 / 자체 데이터 / 로컬 감사)
```

| 경계 | 규칙 |
| --- | --- |
| 브라우저 | Basecamp의 `/api/*`만 호출합니다. Agent API나 upstream을 직접 호출하지 않습니다. |
| Basecamp 서버 | 유일하게 Agent API를 호출하는 지점이며, 모든 응답을 Zod로 검증합니다. |
| 원장 토큰 | AES-256-GCM으로 암호화해 SQLite에만 저장하고, 브라우저에는 opaque HttpOnly session id만 전달합니다. |
| 공식 데이터 변경 | 반드시 Agent API 요청 → 원장 승인 → 디스패치 게이트를 거칩니다. |
| Basecamp DB | 상담 기록, 커스텀 태그, 자동화 규칙 등 자체 데이터의 저장소입니다. 공식 데이터를 복제하지 않습니다. |

## 포함 기능

- **원장 로그인 BFF** — 암호화된 서버 세션, 로그아웃 및 세션 폐기
- **AI 에이전트 등록** — 5분짜리 일회용 enrollment code 발급
- **승인 검토 화면** — URL fragment로 전달된 민감 작업을 원장이 직접 검토
- **원클릭 결정** — owner assertion 발급과 APPROVE/REJECT를 하나의 BFF 요청으로 처리
- **로컬 감사 기록** — 비밀값을 제외한 Basecamp 자체 활동 로그
- **연결 상태 대시보드** — Agent API / 로컬 DB / 보안 경계 상태
- **학생관리 / 그룹관리** — 공식 학생·그룹 목록을 승인 기반으로 동기화해 보여주고, 학생 등록·그룹 생성/이름 변경/삭제를 요청 → 원장 승인 → 1회 실행 계약 그대로 수행
- SQLite + Drizzle migration, shadcn/ui 기반 반응형 백오피스

## 시작하기

```bash
cp .env.example .env.local   # 아래 두 값을 채워야 서버가 시작됩니다
npm install
npm run db:migrate
npm run dev
```

- Basecamp: http://localhost (포트 80)
- Agent API 주소: `.env.local`의 `BASECAMP_AGENT_API_BASE` (Basecamp가 서버 측에서만 호출)

URL 값은 하드코딩하지 않습니다. 전달받은 Agent API 문서 `GET {docs 주소}/v1/docs`의 `services.env_bootstrap.values`에 현재 환경의 URL이 들어 있으므로, 그 값을 `.env.local`에 그대로 채웁니다. 문서를 내려받은 호스트가 곧 현재 환경이라 운영/개발 설정을 나눌 필요가 없습니다.

세션 키 생성:

```bash
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

## 환경 변수

| 변수 | 설명 | 기본값 |
| --- | --- | --- |
| `BASECAMP_AGENT_API_BASE` | Basecamp 서버가 호출할 modoocheck5-agent-api 주소. 전달받은 `/v1/docs`의 `services.env_bootstrap.values`에서 채움 (필수) | — |
| `BASECAMP_SESSION_KEY` | 세션 암호화용 32바이트 base64url 키 (필수 교체) | — |
| `DATABASE_FILENAME` | Basecamp 자체 SQLite 파일명 (Core DB와 분리) | `basecamp.db` |
| `NEXT_PUBLIC_BASECAMP_SUBSCRIPTION_URL` | 비구독 원장에게 보여줄 모두출첵 구독 페이지 주소 (브라우저 번들에 포함됨) | `https://modoocheck.com` |

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 (포트 80) |
| `npm run db:generate` | 스키마 변경 후 migration 생성 |
| `npm run db:migrate` | migration 적용 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 검사 |
| `npm test` | Vitest |
| `npm run ci` | lint + typecheck + test + production build |

## 프로젝트 구조

```text
src/
├── app/
│   ├── (workspace)/        # 로그인 후 화면 (대시보드 · 학생관리 · 승인 · 설정)
│   ├── api/                # BFF 라우트 (세션, enrollment code, 승인 결정, 헬스)
│   └── login/              # 원장 로그인
├── components/             # shadcn/ui 기반 화면 컴포넌트
├── db/                     # Drizzle 스키마, 연결, migration 실행기
└── lib/
    ├── agent-api.ts        # Agent API typed client (Zod 검증) — AI 위임 작업 전용
    ├── upstream.ts         # 모두출첵 Core 직접 호출 클라이언트 (원장 세션 토큰, Zod 검증)
    ├── official-catalog.ts # 화면이 쓸 수 있는 공식 작업 허용 목록 + 입력/스냅샷 스키마
    ├── official.ts         # 공식 작업 실행 파이프라인(원장 직접 실행 → 조회 스냅샷 저장)
    ├── session.ts          # 원장 세션 생성/검증/폐기 + 로컬 감사
    └── crypto.ts           # AES-256-GCM 암호화
```

## 학생관리 · 그룹관리 동작 방식

공식 데이터 접근 경로는 누가 조작하느냐에 따라 둘로 나뉩니다.

- **원장이 화면에서 직접 조작** — 원장 본인의 행동이므로 승인 절차가 없습니다. Basecamp가
  원장 세션 토큰으로 모두출첵 Core를 바로 호출합니다 (`src/lib/official.ts` → `upstream.ts`).
  조회 결과는 표시용 스냅샷으로 저장됩니다.
- **AI 위임 클라이언트(enrollment code로 등록된 외부 에이전트)의 작업** — Agent API의
  요청 생성 → 원장 승인(<AI 작업 승인>, `/approvals`) → 1회 실행 계약을 반드시 거칩니다.

스냅샷은 캐시일 뿐이며 진실의 원천은 항상 모두출첵 Core입니다. 오래됐으면 화면에서 다시
동기화하면 됩니다.

## 확장 규칙

1. 자체 데이터는 `src/db/schema.ts`에 추가하고 `npm run db:generate`로 migration을 만듭니다.
2. 공식 모두출첵 데이터를 Basecamp DB에 복제해 진실의 원천으로 만들지 않습니다.
3. 브라우저 컴포넌트에서 Agent API나 upstream을 직접 호출하지 않습니다.
4. 외부 호출은 `src/lib/upstream.ts`(원장 직접 조작)와 `src/lib/agent-api.ts`(AI 위임 작업) 두 typed client를 통해서만, Server Component 또는 Route Handler에서 수행합니다.
5. 비밀값은 로그·클라이언트 상태·URL에 남기지 않습니다. 승인 검토 데이터는 세션 인증된 Route Handler(`/api/approvals`)를 통해서만 조회합니다.

## 검증

```bash
npm run ci
```

CI는 ESLint, TypeScript, Vitest, production build를 모두 실행합니다.

## Codex 같은 AI 코딩 도구로 개발하기

이 프로젝트는 원장님이 AI 코딩 도구(Codex, Claude Code 등)와 함께 기능을 얹어 나가는 것을
전제로 만들어졌습니다. 저장소 최상위의 `AGENTS.md`에 AI가 지켜야 할 아키텍처 경계, 보안 규칙,
확장 레시피가 들어 있고, Codex는 이 파일을 자동으로 읽습니다.

시작 순서:

```bash
git clone <이 저장소 주소>
cd modoocheck-basecamp
cp .env.example .env.local   # 위 "환경 변수" 표대로 값 채우기
npm install
npm run db:migrate
codex                        # 프로젝트 폴더 안에서 실행
```

요청은 "무엇을 하고 싶은지"를 일상 언어로 말하면 됩니다. 기술 용어를 몰라도 괜찮습니다.

> - "학생마다 상담 기록을 남기고 싶어. 날짜, 상담 내용, 후속 조치를 적을 수 있게 해줘."
> - "학생 목록에서 한 달 넘게 출석이 없는 학생만 골라 보는 필터를 만들어줘."
> - "대시보드에 이번 주 출석률 그래프를 넣어줘."

주의할 점:

- AI가 "공식 데이터를 Basecamp DB에 복사해 두겠다"고 하면 거절하세요. 학생·출결·원비·공지의
  진실의 원천은 항상 모두출첵 Core입니다.
- 작업이 끝나면 AI에게 `npm run ci`를 통과했는지 확인하세요. 통과 전에는 완료가 아닙니다.
- 기능이 하나 완성될 때마다 커밋해 두면 언제든 되돌릴 수 있습니다.
