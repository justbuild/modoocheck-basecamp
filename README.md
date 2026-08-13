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
│   ├── (workspace)/        # 로그인 후 화면 (대시보드 · 로그인 연결 · 승인 · 설정)
│   ├── api/                # BFF 라우트 (세션, enrollment code, 승인 결정, 헬스)
│   └── login/              # 원장 로그인
├── components/             # shadcn/ui 기반 화면 컴포넌트
├── db/                     # Drizzle 스키마, 연결, migration 실행기
└── lib/
    ├── agent-api.ts        # Agent API typed client (Zod 검증) — 유일한 외부 호출 지점
    ├── session.ts          # 원장 세션 생성/검증/폐기
    └── crypto.ts           # AES-256-GCM 암호화
```

## 확장 규칙

1. 자체 데이터는 `src/db/schema.ts`에 추가하고 `npm run db:generate`로 migration을 만듭니다.
2. 공식 모두출첵 데이터를 Basecamp DB에 복제해 진실의 원천으로 만들지 않습니다.
3. 브라우저 컴포넌트에서 Agent API나 upstream을 직접 호출하지 않습니다.
4. 외부 호출은 `src/lib/agent-api.ts`의 typed client를 통해 Server Component 또는 Route Handler에서 수행합니다.
5. 비밀값은 로그·클라이언트 상태·URL query에 남기지 않습니다. 승인 비밀값은 원장 통지의 URL fragment로만 전달합니다.

## 검증

```bash
npm run ci
```

CI는 ESLint, TypeScript, Vitest, production build를 모두 실행합니다.
