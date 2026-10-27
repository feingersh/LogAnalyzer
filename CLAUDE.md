@AGENTS.md

# Log Analyzer

Next.js (App Router) + TypeScript app. The user picks a region, server and character, and the app lists that character's recent WarcraftLogs reports. Data comes from the WarcraftLogs v2 GraphQL API through `src/lib/wcl.ts`, which is server-only. Credentials live in `.env.local` (`WCL_CLIENT_ID`, `WCL_CLIENT_SECRET`); never commit them.

## Commands

- `npm run dev`: start the dev server
- `npm run typecheck`: TypeScript check (also covers test files)
- `npm test`: run all tests once
- `npm run test:watch`: re-run tests on change
- `npx jest src/lib/wcl.test.ts`: run one test file
- `npx jest -t "returns 404"`: run tests whose name matches

## Tests

- Jest + ts-jest, Node environment. Config is in `jest.config.js`.
- Test files sit next to the code they cover and are named `*.test.ts`.
- Tests never call the real WarcraftLogs API. Route tests mock `@/lib/wcl` with `jest.mock`; `src/lib/wcl.test.ts` mocks `global.fetch`.
- `server-only` is replaced by an empty stub (`test/server-only-stub.ts`) so server modules can be imported.
- React components are not tested yet (that would need jsdom and Testing Library).
- Run `npm test` and `npm run typecheck` after changing code.

## Session wrap-up

- When a session's work is done (the user signs off, or the last requested change is finished and verified), run the `/summary` skill before the final reply, so it is logged to `~/.cc-reflect/logs/manual-summaries.jsonl`.
