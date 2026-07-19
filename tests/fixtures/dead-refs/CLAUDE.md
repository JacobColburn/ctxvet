# Stale guide

The entry point is `src/main.ts` and helpers live in `src/utils/legacy.ts`.

Run `npm run typecheck` before pushing. See [the old docs](docs/setup.md).

Examples like `path/to/file.ts` and `<your-module>.ts` must not be flagged.

Glob scope: `src/**/*.ts` is real, `lib/**/*.rs` is not.
