# TamFam — Claude Code notes

## Git

- Work directly on `main` — no feature branches. Commit and push to `main` as work completes.
- Include the full version (e.g. `v0.1.2`) in commit messages.

## Versioning

`package.json` `"version"` follows `MAJOR.MINOR.PATCH` (same convention as the Dodo project):

- Bump `package.json` `"version"` in the same commit as the change.
- **Patch releases:** iterate on every push. The patch number is the count of pushes since the last minor release (e.g. if the last minor release was `0.2`, patch releases are `0.2.1`, `0.2.2`, etc.).
- **Minor releases:** created when new features are added. Requires user confirmation/approval before proceeding.
- **Major releases:** at the user's discretion or our suggestion.
