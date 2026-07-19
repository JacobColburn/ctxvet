# Traversal guard

References that escape the repo root must be skipped, not probed on disk:
`../secret.ts`, `../../etc/config.ts`, `../../../root-thing.ts`.

A normal in-repo path is still checked: `src/gone.ts`.
