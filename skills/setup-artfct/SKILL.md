---
name: setup-artfct
description: Verify the Artfct plugin is installed and connected (MCP + skills), or install it for the detected harness. Use for /setup-artfct, "set up Artfct", Artfct sign-in problems, or before anything that publishes to Artfct.
---

# Setup Artfct

Artfct is the shared library: proof published there survives the session. This skill makes sure the plugin is installed *and* the connection works, on whatever harness runs it. Source of truth for the package: `artfct-dev/artfct-plugin`, directory `plugins/artfct` (Agent Plugins 1.0, 14 skills, Streamable HTTP MCP at `https://artfct.dev/mcp`).

## 1. Detect what is already there

- Are Artfct MCP tools callable (e.g. `get_connection`)? If yes, skip to step 3.
- Are Artfct skills (`artfct`, `artfct-publish`, `artfct-search`, …) discoverable? MCP without skills still publishes, but the publish/search guidance is missing — install the skills side too.

## 2. Install for the detected harness

Ask which harness when ambiguous. Never invent a path; use the harness's own mechanism:

- **OMP**: add the server to the user MCP file (`~/.omp/agent/mcp.json`, profiles under `~/.omp/profiles/<name>/agent/mcp.json`) in OMP-native shape — `{"artfct": {"type": "http", "url": "https://artfct.dev/mcp"}}` — then `/mcp reload`. Skills: point `skills.customDirectories` at the cloned package's `plugins/artfct/skills/` directory. Approve the Artfct sign-in when it opens.
- **Claude Code / Claude app / Cowork / Grok Build**: `/plugin marketplace add artfct-dev/artfct-plugin`, then `/plugin install artfct@artfct`. Approve the sign-in page.
- **Other Agent Plugins clients**: clone `artfct-dev/artfct-plugin` and use `plugins/artfct` as the 1.0 package directory, per its README and the client's install docs.
- **OpenClaw** (verified 2026-11-25): `openclaw plugins install --force --accept-capabilities <path-to-plugins/artfct>` (local path needs both flags; use `--profile <name>` to isolate). Confirm: `plugins list` shows `artfct 1.3.0 enabled`, `skills list` shows all 14 artfct skills ready, `plugins doctor` passes. OAuth sign-in stays a user step.
- **Hermes** (verified 2026-11-25): the Git installer does NOT handle the marketplace monorepo layout (repo root has no `plugin.json`, so the clone registers nothing). `hermes plugins validate <pkgdir>` and `plugins doctor <pkgdir>` pass on the package itself. Install skills individually by raw URL instead: `hermes skills install --yes https://raw.githubusercontent.com/artfct-dev/artfct-plugin/main/plugins/artfct/skills/<name>/SKILL.md`. Full-plugin install needs a standalone package repo or Hermes subdir support — not this skill's to fix.

**Version.** Marketplace installs resolve through the catalog (which reads `main`); clones MUST check out an explicit ref — newest `release-*` tag by default, or a user-pinned tag. Either way, read back the installed `plugins/artfct/plugin.json` `version` and report it; that version is the answer to "which version is installed". Re-run this skill to upgrade or switch pins.

## 3. Verify the connection

Call `get_connection`: expect `authenticated: true`. Confirm the organization — prefer `artfct-dev`; on a mismatch, say which org is active and offer the OAuth reconnect, don't switch silently. Read the `save_to_artfct` preference (`always`/`ask`/`never`) and report it, since it decides whether later steps may publish unasked. Finish with one cheap `search_artifacts` round-trip to prove search works end to end.

## 4. Hand off

Publish-ready means: tools callable, authenticated, org confirmed, preference known. Then point at `/setup-pstack-omp` for model routing when the user runs poteto-mode — Artfct access and model routing are independent setups, in that order.
