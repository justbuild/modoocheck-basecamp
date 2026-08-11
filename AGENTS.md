<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Modoocheck Basecamp extension rules

- The browser calls only this application's `/api/*` BFF routes. Never call modoocheck5-agent-api or upstream directly from a Client Component.
- Server-side Agent API calls belong in `src/lib/agent-api.ts` and must validate responses with Zod.
- Store academy-specific custom data in the Basecamp database through `src/db/schema.ts` and committed Drizzle migrations.
- Never duplicate official students, attendances, tuitions, or notices as a competing source of truth.
- Every official write goes through the Agent API request → owner approval → dispatch contract.
- Never persist owner credentials, raw owner tokens, enrollment codes, locator, CSRF, challenge, assertion, or delegated tokens in client state, logs, settings, or local audit.
- Use the existing shadcn/ui components and Tailwind tokens; do not introduce a parallel design system.
- Add focused tests and run `npm run ci` before declaring work complete.
