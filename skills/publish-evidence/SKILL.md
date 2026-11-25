---
name: publish-evidence
description: Publish poteto-mode verification evidence to Artfct as a team-shared bundle (decision logs, feature maps, screenshots/traces). Updates in place on re-runs, never publishes secrets. Use after show-me-your-work or verification runs, or for /publish-evidence.
---

# Publish evidence

After a verification or show-me-your-work run, publish the proof so teammates (and other agents) can see it over MCP. Team-shared by default; never public unless the user asks.

## 1. Discover

Run the helper from the work dir (it prints a manifest as JSON):

```bash
bun ./skills/publish-evidence/scripts/discover.ts --root <workdir>
```

It finds, across Cursor (`.cursor/skills/`), Claude Code (`.claude/skills/`), and OMP (`.omp/skills/`) layouts:

- decision logs: `decisions.tsv` in the work dir, `.audit/<task-slug>.tsv` for shared dirs;
- feature maps: `verify-*/` skill dirs (`SKILL.md`, `features/**`, index READMEs);
- evidence files: file paths named in the log's evidence column (commit SHAs and PR numbers are recorded as text, not files).

Follow the artfct publish rules (`artfct-publish` skill when present; if no Artfct MCP tools exist at all, run **setup-artfct** first and return here). Then:

## 2. Redact

Drop anything secret before it leaves the machine:

- filename denylist (see `scripts/redact.ts`): `.env*`, `*secret*`, `*credential*`, `*.pem`, `*.key`, `*token*` basenames, `cookies`;
- content scan of text evidence for token patterns (`AKIA…`, `ghp_`/`github_pat_`, `xox…`, `PRIVATE KEY` blocks, `Bearer …`): replace with `***REDACTED***` and count hits.

List every skipped file and every redaction in your reply. Binaries (screenshots, video, traces) ship as-is after the denylist — a terminal screenshot can leak a token, so say so when one is included. When in doubt, ask before publishing.

## 3. Assemble the bundle

`scripts/bundle.ts` takes the manifest plus `{ slug, title, description }` and writes a bundle dir: `index.html` entrypoint (decision table + feature-map index + evidence links, HTML-escaped), the log copy, the feature-map copy, and the evidence files. Title shape: `[pstack] <task-slug> evidence`. One sentence description so search finds it.

## 4. Publish or update

Follow the artfct publish rules (`artfct-publish` skill when present). Then:

- `search_artifacts` for an existing bundle for this slug/collection first;
- existing → `deploy_artifact` with `base_version` (update in place, no duplicates);
- new → `deploy_artifact` the bundle, team-shared;
- attach to the feature/spec collection (reuse an existing collection, create only when none fits).

## 5. Report

Reply with the `view_url`, what went in (log rows, features, evidence files), what was redacted/skipped, and whether it was a new publish or a `base_version` update.
