# 모두출첵 베이스캠프

모두출첵 Agent API를 기반으로 학원장과 AI가 함께 확장하는 자체 관리시스템의 출발점입니다.

## 기본 구조

```text
Owner browser → Basecamp BFF → modoocheck5-agent-api → modoocheck5-api → Core DB
                     └──────→ Basecamp SQLite (custom data/session/audit)
```

- 브라우저는 Basecamp의 `/api/*`만 호출합니다.
- Basecamp 서버만 Agent API를 호출합니다.
- 원장 토큰은 AES-256-GCM으로 암호화되어 SQLite에 저장되며 브라우저에는 opaque HttpOnly session id만 전달됩니다.
- 공식 학생·출결·원비·공지 변경은 Agent API의 승인 게이트를 거칩니다.
- Basecamp DB는 상담 기록, 커스텀 태그, 자동화 규칙 등 자체 데이터의 저장소입니다.

## 시작

```bash
cp .env.example .env.local
# BASECAMP_SESSION_KEY를 새 키로 교체
npm install
npm run db:migrate
npm run dev
```

- Basecamp: http://localhost:3100
- Agent API 기본 주소: http://localhost:4000
- Upstream은 Basecamp가 직접 호출하지 않습니다.

키 생성:

```bash
openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
```

## 포함 기능

- 원장 로그인 BFF 및 암호화 서버 세션
- 로그아웃 및 세션 폐기
- AI 에이전트 일회용 enrollment code 발급
- URL fragment 기반 승인 요청 검토
- owner assertion 발급과 APPROVE/REJECT를 하나의 BFF 요청으로 처리
- SQLite + Drizzle migration
- 로컬 감사 기록
- shadcn/ui 기반 반응형 백오피스
- Agent API 연결 상태 대시보드

## 확장 규칙

1. 자체 데이터는 `src/db/schema.ts`에 추가하고 `npm run db:generate`로 migration을 만듭니다.
2. 공식 모두출첵 데이터는 Basecamp DB에 복제해 진실의 원천으로 만들지 않습니다.
3. 브라우저 컴포넌트에서 Agent API나 upstream을 직접 호출하지 않습니다.
4. 외부 호출은 `src/lib/agent-api.ts`의 typed client를 통해 Server Component 또는 Route Handler에서 수행합니다.
5. 비밀값은 로그·클라이언트 상태·URL query에 남기지 않습니다. 승인 비밀값은 원장 통지의 URL fragment로만 전달합니다.

## 검증

```bash
npm run ci
```

CI는 ESLint, TypeScript, Vitest, production build를 모두 실행합니다.
