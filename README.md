# Log Analyzer

A web app for analyzing World of Warcraft combat logs. Pick a region, server and character, and it lists that character's recent [WarcraftLogs](https://www.warcraftlogs.com) reports, each with its zone icon, name and date.

## Setup

1. Install dependencies:

   ```
   npm install
   ```

2. Create a WarcraftLogs API client at <https://www.warcraftlogs.com/api/clients>.
3. Copy `.env.example` to `.env.local` and fill in your credentials:

   ```
   WCL_CLIENT_ID=...
   WCL_CLIENT_SECRET=...
   ```

## Running

```
npm run dev
```

Then open <http://localhost:3000>.

## Testing

Tests use [Jest](https://jestjs.io) with ts-jest. They run offline: the WarcraftLogs API is mocked, so no credentials are needed.

```
npm test                          # run everything once
npm run test:watch                # re-run on change
npx jest src/lib/wcl.test.ts      # run one file
npx jest -t "returns 404"         # run tests matching a name
```

What is covered:

- `src/lib/types.test.ts`: the region list and WarcraftLogs region ids.
- `src/lib/wcl.test.ts`: token fetching and reuse, and HTTP and GraphQL error handling.
- `src/app/api/servers/route.test.ts`: server list paging, sorting and region handling.
- `src/app/api/reports/route.test.ts`: input validation, character-not-found, and mapping of report data.

Also run `npm run typecheck` to check types, including the test files.
