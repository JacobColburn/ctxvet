# Project rules

Always run the full integration test suite against the staging database before merging any pull request that touches the payments module, because the mock layer does not cover the reconciliation edge cases and silent failures have shipped twice this quarter.

Use feature flags for anything user-visible.
