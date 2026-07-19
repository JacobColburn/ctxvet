# Releasing ctxvet

Releases publish to npm automatically via GitHub Actions using **npm trusted publishing** (OIDC) — no npm token is stored anywhere, and each release gets a verified provenance badge on npm.

## One-time setup (already done once per package)

On npmjs.com, configure the trusted publisher for the `ctxvet` package:

1. npmjs.com → the **ctxvet** package → **Settings** → **Trusted Publisher**.
2. Choose **GitHub Actions** and enter:
   - **Organization or user:** `JacobColburn`
   - **Repository:** `ctxvet`
   - **Workflow filename:** `publish.yml`
   - **Environment:** *(leave blank)*
3. Save.

After this, you can delete any long-lived npm publish tokens — they're no longer needed.

## Cutting a release

1. Bump the version in `package.json` (e.g. `0.1.0` → `0.1.1`). Follow semver: patch for fixes, minor for features, major for breaking changes.
2. Commit: `git commit -am "release: v0.1.1"` and push to `main`. Wait for CI to go green.
3. Tag and create a GitHub Release whose tag is **`v<version>`** (must match `package.json`):
   - GitHub UI: **Releases → Draft a new release → tag `v0.1.1` → Publish**, or
   - CLI: `git tag v0.1.1 && git push --tags`, then draft the release from that tag.
4. Publishing the release triggers `.github/workflows/publish.yml`, which verifies the tag matches `package.json`, runs the full test suite (via `prepublishOnly`), and publishes to npm with provenance.

That's it — no `npm login`, no OTP, no token.

## If a release fails to publish

Check the **Publish to npm** workflow run in the Actions tab:
- *Tag/version mismatch* → the tag `vX.Y.Z` didn't match `package.json`. Fix `package.json`, or delete and recreate the tag/release.
- *Version already exists* → npm forbids republishing a version. Bump to the next patch and release again.
- *OIDC / auth error* → confirm the trusted publisher settings on npm exactly match the org, repo, and workflow filename above.
