# Project guide

Run `npm run build` before committing. Source lives in [src/app.ts](src/app.ts).

- Config is loaded from `src/config.ts`.
- Copy `.env.example` to `.env` for local secrets (never committed).
- Every module directory contains a `config.ts` alongside its code.
- Tests: `npm run test`.
