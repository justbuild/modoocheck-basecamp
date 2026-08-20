<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 모두출첵 베이스캠프 개발 가이드

이 문서는 이 저장소에서 작업하는 모든 코딩 에이전트(Codex 등)가 반드시 따라야 하는 규칙입니다.
사용자는 대부분 개발 지식이 없는 학원 원장입니다. 설명은 쉬운 한국어로, 전문용어는 처음 나올 때
한 문장으로 풀어서 답하세요.

## 이 프로젝트가 무엇인가

모두출첵(학원 출결·원비 관리 서비스) 위에 학원장이 자기 학원만의 기능을 얹는 **자체 관리시스템
스타터**입니다. 공식 데이터(학생·출결·원비·공지)는 모두출첵 Core에 그대로 두고, Basecamp는
안전한 중간 창구(BFF)와 자체 데이터 저장소 역할만 합니다.

```text
원장 브라우저 ──→ Basecamp BFF(/api/*) ──┬→ 모두출첵 Core (원장 직접 조작, upstream.ts)
                                          └→ modoocheck5-agent-api (AI 위임 작업, agent-api.ts)
                        │
                        └──→ Basecamp SQLite (세션 / 자체 데이터 / 스냅샷 / 로컬 감사)
```

## 절대 경계 (어기면 안 되는 규칙)

1. **브라우저는 이 앱의 `/api/*`만 호출한다.** Client Component에서 Agent API나 모두출첵
   Core를 직접 호출하지 않는다.
2. **외부 호출 지점은 두 곳뿐이다.** 모두출첵 Core 직접 호출은 `src/lib/upstream.ts`,
   Agent API 호출은 `src/lib/agent-api.ts`. 두 곳 모두 응답을 Zod로 검증한다. 다른 파일에서
   `fetch`로 외부를 부르지 않는다.
3. **두 가지 데이터 접근 경로를 혼동하지 않는다.**
   - 원장이 Basecamp 화면에서 직접 누른 조회/변경 → 승인 절차 없이 원장 세션 토큰으로
     upstream을 바로 호출 (`src/lib/official.ts` → `upstream.ts`).
   - AI 위임 클라이언트(enrollment code로 등록된 외부 에이전트)의 작업 → Agent API의
     요청 생성 → 원장 승인 → 1회 실행 계약을 반드시 거친다.
4. **공식 데이터를 복제해 진실의 원천으로 만들지 않는다.** 학생·출결·원비·공지를 Basecamp DB에
   따로 저장해 관리하는 테이블을 만들지 않는다. `official_snapshots`는 표시용 캐시일 뿐이다.
5. **비밀값을 남기지 않는다.** 원장 비밀번호, 원장 토큰 원문, enrollment code, locator, CSRF,
   challenge, assertion, 위임 토큰을 클라이언트 상태·로그·설정·로컬 감사·URL에 절대 저장하지
   않는다. 원장 토큰은 AES-256-GCM으로 암호화해 SQLite에만 두고, 브라우저에는 의미 없는
   HttpOnly 세션 id만 준다.
6. **호환성 레이어를 만들지 않는다.** 낡은 코드는 별칭이나 폴백을 남기지 말고 근원에서 고친다.

## 코드 배치 지도

| 위치 | 역할 |
| --- | --- |
| `src/app/(workspace)/` | 로그인 후 화면 (대시보드 · 학생관리 · 승인 · 설정). 새 화면은 여기에 추가 |
| `src/app/api/` | BFF Route Handler. 브라우저가 부르는 유일한 서버 진입점 |
| `src/app/login/` | 원장 로그인 화면 |
| `src/components/` | shadcn/ui 기반 화면 컴포넌트 |
| `src/db/schema.ts` | Basecamp 자체 테이블 정의 (Drizzle) |
| `src/lib/official-catalog.ts` | 화면이 쓸 수 있는 공식 작업 허용 목록 + 입력/스냅샷 스키마 |
| `src/lib/official.ts` | 공식 작업 실행 파이프라인 (원장 직접 실행 + 조회 스냅샷 저장) |
| `src/lib/upstream.ts` | 모두출첵 Core 직접 호출 클라이언트 (원장 세션 토큰) |
| `src/lib/agent-api.ts` | Agent API typed client (AI 위임 작업 전용) |
| `src/lib/session.ts` | 원장 세션 생성/검증/폐기 + 로컬 감사(`audit`) |
| `src/lib/crypto.ts` | AES-256-GCM 암호화 |

## 자주 하는 확장 작업 레시피

### 1. 자체 데이터 기능 추가 (상담 기록, 태그, 메모 등)

1. `src/db/schema.ts`에 테이블을 추가한다.
2. `npm run db:generate`로 migration 파일을 만들고 **함께 커밋**한다.
3. `npm run db:migrate`로 적용한다.
4. 조회/저장은 세션 검증을 거친 Server Component 또는 `/api/*` Route Handler에서만 한다.
5. 공식 학생과 연결할 때는 학생 uuid만 참조로 저장한다. 이름·전화번호 등 공식 필드를 복제하지
   않는다.

### 2. 새 화면 추가

1. `src/app/(workspace)/<이름>/page.tsx`를 만든다. 기존 `students/page.tsx`를 본보기로 삼는다.
2. 왼쪽 메뉴는 기존 workspace 레이아웃/네비 컴포넌트에 항목을 추가한다.
3. 기존 shadcn/ui 컴포넌트와 Tailwind 토큰만 쓴다. 별도 디자인 시스템·새 CSS 체계를 들이지
   않는다.
4. 아이콘 전용 버튼은 lucide-react SVG를 쓰고 반드시 `aria-label`을 단다.

### 3. 새 공식 데이터 작업 추가 (조회·변경)

1. Agent API 문서(`GET {BASECAMP_AGENT_API_BASE}/v1/docs`)에서 endpoint를 확인한다. URL을
   하드코딩하지 않는다.
2. `src/lib/official-catalog.ts`의 `OFFICIAL_OPERATIONS`에 작업을 등록한다 (method, path,
   kind READ/WRITE, 입력 스키마, 조회면 snapshotKey).
3. 응답 파싱 스키마는 `.loose()`로 필요한 필드만 좁혀 통과시킨다. 알 수 없는 필드에 의존하지
   않는다.
4. 화면은 `/api/official/requests` 등 기존 BFF 경로를 통해 실행한다.
5. 조회 스냅샷은 캐시다. 오래됐으면 다시 동기화하면 되고, 알 수 없는 상태(`UNKNOWN`)를
   자동 재시도하지 않는다.

## 검증

- 작업을 끝냈다고 말하기 전에 반드시 `npm run ci`를 통과시킨다
  (ESLint + TypeScript + Vitest + production build).
- 새 로직에는 초점 있는 테스트를 추가한다 (`src/lib/*.test.ts` 패턴, Vitest).
- 서버 전용 모듈은 `import "server-only"`로 시작해 브라우저 번들에 새어 나가지 않게 한다.

## 사용자 응대 원칙

- 원장이 요청한 기능이 절대 경계(공식 데이터 복제, 비밀값 저장, 브라우저 직접 호출)를 어기면,
  왜 안 되는지 한 번 쉽게 설명하고 경계 안에서 되는 대안을 제시한다.
- 파괴적인 작업(테이블 삭제, migration 되돌리기, 데이터 삭제)은 실행 전에 반드시 확인을 받는다.
- 변경을 마치면 무엇이 어떻게 바뀌었는지 비전공자 눈높이로 요약해 준다.
