# artfct-pstack

> Add-on that works alongside [pstack](https://github.com/cursor/plugins/tree/main/pstack)
> (MIT, copyright Lauren Tan, handle poteto). Not a rebrand; no endorsement
> by Cursor or SpaceXAI is stated or implied. See `LICENSE`.

Poteto-mode rigorous engineering workflows as a **universal agent plugin**
(portable `plugin.json`), **artfct-first**: wherever you run it, proof ends as
an Artfct artifact. Decision trails, feature maps, benchmark tables, and
bakeoff comparisons publish team-shared via the Artfct MCP when it's
available — on any harness. Full-port policy and locked decisions live in
[`DESIGN.md`](DESIGN.md); the host→port substitution log in [`PORT.md`](PORT.md).

## Install

Full per-client matrix (15 harnesses): [`skills/setup-artfct/references/supported-clients.md`](skills/setup-artfct/references/supported-clients.md).

| Harness | How | State |
|---|---|---|
| OMP | `omp plugin link /path/to/artfct-pstack`, then `/reload-plugins` | ✅ verified live |
| OpenClaw | install prompt in any OpenClaw channel; local installs need `--force --accept-capabilities` | ✅ verified live |
| Hermes | flatten to one dir, `hermes plugins validate` + `doctor`, `hermes plugins add`, OAuth per skill | ✅ verified live |
| Cursor | `cursor agent --plugin-dir <dir>`, marketplace one-click, or skill-folder copy (benny needs its merge step) | ✅ verified live |
| Claude Code | `/plugin marketplace add <repo-dir>`, `/plugin install artfct-pstack@artfct-pstack` | ✅ verified live |
| Codex | marketplace wrapper + `codex plugin add` (see matrix) | ✅ verified live |
| Copilot | `copilot plugin marketplace add <dir>`, `copilot plugin install` (no auth needed) | ✅ verified live |
| Remaining (Devin, Kiro, ChatGPT, …) | plugin install or copy `skills/` into the harness skills dir; host-agnostic cores apply | 🟡 live pass blocked on account/GUI where noted in matrix |

## Setup (required before `/poteto-mode` runs anything)

```
/setup-artfct       # first: connect the Artfct plugin so proof can publish
/setup-pstack-omp   # then: detect host, pick pack + budget, write routing
```

Detects the host harness first and never leaves its registry — Codex resolves
Codex models only. Picks a pack (`defaults | big-labs | chinese-labs | free |
<any provider id>`), a budget (`large/medium/small`), and writes role routing
in host-native form. Re-run anytime to switch packs.

## Use

```
/poteto-mode fix the scroll drift, repro first then verify   # one-shot
/poteto-mode            # enter pinned mode — OMP extension (enter-only)
/poteto-mode off        # leave pinned mode
/poteto-help            # which skill for this task?
/publish-evidence       # publish the trail + maps + evidence to Artfct
```

One-shot matches a playbook, opens its todos, routes to skills. On OMP, pinned
mode does the same every turn until you leave; on other harnesses, invoke the
`poteto-mode` skill per task. Long runs: watch the subagent roster, catch up
with `/ketchup` on return.

Every verification or show-me-your-work run closes by publishing proof to
Artfct when the MCP is available — team-shared, updating in place on re-runs,
never public unless asked, secrets redacted first.

## Scope notes

- `benny/` (issue triage automation) is ported as content, but its live
  runtime needs Cursor Automations — no equivalent elsewhere yet. See `PORT.md`.
- Host-only steps (pinned mode, `sessionModes` loop, `ctx.ui.*` dialogs) are OMP
  extension features; elsewhere they skip with a one-line note per the skill text.
- `AGENTS.md` and `CLAUDE.md` are never published: the `publish-evidence`
  denylist skips them alongside secrets.

Working in this repo? Read [`AGENTS.md`](AGENTS.md) first — spec conformance
floor, commands, and commit rules.
