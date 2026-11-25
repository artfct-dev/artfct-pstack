# AGENTS.md — artfct-pstack contributor rules

Universal agent plugin (portable core) + OMP client extension. Product surface
(`/poteto-mode`, role names, skill names) is stable — never rename it in a
refactor. Locked decisions live in `DESIGN.md`; the host→port substitution
log in `PORT.md`.

## Spec conformance floor (Agent Plugins 1.0.0, non-negotiable)

`plugin.json` is a **closed manifest**: `$schema`, `name`, `version`,
`description`, `author`, `homepage`, `repository`, `license`, `keywords`,
`extensions` — nothing else. Client-specific data goes under
`extensions."dev.artfct.pstack"` (our owned namespace), never top-level.

- Fixed locations only: skills in `skills/<name>/SKILL.md` (one level, no
  nesting), MCP servers in root `mcp.json` if we ever add one. Never declare
  locations in the manifest; never inline component config into it.
- Every packaged path resolves inside the repo root. No symlinks escaping it.
- New top-level dirs are client-specific content by default (like `agents/`
  for OMP, `automations/` for Cursor) — document which client owns them in
  `DESIGN.md`; conformant clients ignore what they don't implement.
- Failure isolation when editing: one bad skill/MCP entry must never break
  siblings. Keep components independent — no cross-skill imports at load,
  relative links only (`../<name>/…`, never `skill://` in bodies).
- Skill bodies stay portable: host-conditional prose with skip-with-a-note
  fallbacks, `e.g.`-marked examples only, never hardcoded model slugs.
  OMP-only behavior lives in `src/` (runtime code may use `skill://`).

## Working in this repo

- Tests: `bun test skills/publish-evidence/tests/` (must be 9/9 before push).
- Types: `bun x --package typescript -- tsc --noEmit -p tsconfig.json` (strict,
  clean). `tsconfig.json` deliberately includes only `src` + `skills/publish-evidence`
  — upstream-vendored scripts (`poteto-mode/scripts/`) carry their own toolchain.
- Deps: `bun install` only for type packages. Never commit `node_modules/`
  (gitignored) or test output (`skills/publish-evidence/tests/fixtures/out/`).
- Commits: selective per-file via the eval `commit` flow (shared-worktree rule),
  never `git add -A`. Small, scoped messages; docs (`PORT.md`/`DESIGN.md`) move
  with the code they describe.
- After any skill/port change: update `PORT.md` status + translation table if
  a new Cursor→host pattern appeared; record locked decisions in `DESIGN.md`.
- Publishing proof: after verification work, run **publish-evidence** — the
  repo eats its own cooking. Team-shared, secrets redacted, `base_version`
  updates, never public unless asked.
