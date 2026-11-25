# PORT.md — host → OMP substitution log

Applied uniformly to every ported `SKILL.md`. Keep this table current: it is
what makes upstream merges mechanical. Scoped to the OMP client extension —
see `DESIGN.md` "Universal plugin" for what stays portable.

| pstack (Cursor) | OMP port |
|---|---|
| `Task(subagent_type, run_in_background, model)` | `task(agent:, …)` async; agent names from `agents/`; model via role alias, never a hardcoded slug |
| `subagent_type: "poteto-agent"` | `agent: "poteto-agent"` (+ fresh-subagent default; resume only for checkout/branch/process state) |
| `generalPurpose` | `task` (default agent) |
| `/loop` | `sessionModes` loop or queued follow-ups |
| option+enter custom mode | pinned `/poteto-mode` (extension-owned, see `DESIGN.md`) |
| `~/.cursor/rules/pstack-models.mdc` | `~/.omp/agent/config.yml` `modelRoles` + `task.agentModelOverrides` (OMP harness; other harnesses write host-native form per `setup-pstack-omp` step 5) |
| Model slugs (`claude-opus-5-5-xhigh-fast`, `gemini-4-neon-xhigh`, …) | harness-aware pack resolution (`setup-pstack-omp` step 0–4): host registry only — a Codex harness resolves Codex models only; `e.g.`-marked examples only |
| `/deslop`, `control-ui`/`control-cli`, bugbot, Cursor `/autopilot` | skip with one-line note |
| `create-skill` (Cursor built-in) | the **authoring a skill** playbook (no OMP counterpart) |
| `AskQuestion` (Cursor UI) | `ctx.ui.select` (single-choice) / `confirm` / `input`, `askDialog` for multi-question |
| `Read/Edit/Grep/Glob/Task/TodoWrite/WebFetch` | `read/edit/grep/glob/task/todo/web_search` (lowercase OMP built-ins) |
| Skill-relative paths (`../<name>/…`) | portable relative paths (resolve on every harness; OMP also accepts `skill://<name>/…`) |
| `/setup-pstack` | `/setup-pstack-omp` (harness-aware superset; writes host-native config) |
| `~/.cursor/projects/*/` transcript globs | host-agnostic "active workspace's transcript dir (system prompt names the path)" — no invented paths |
| `.cursor/skills`, `~/.cursor/skills`, `~/.cursor/projects` | `.omp/skills`, `~/.omp/agent/skills`, no invented transcript-cache path |

## Port status — complete

- [x] `plugin.json` — portable Agent Plugins 1.0.0 manifest (closed schema: no `skills`/`agents` fields, discovery is by fixed location); `package.json` (`omp.extensions`) + `src/` + OMP-tuned `agents/` stay as the OMP client extension — outside the v1 portable contract, like benny's Cursor automation pack
- [x] `setup-pstack-omp` — rewritten: harness detection (step 0) + pack resolver confined to the host registry + host-native write (OMP config.yml / Cursor .mdc / print-and-apply elsewhere)
- [x] `agents/poteto-agent.md`, `agents/comment-sicko.md` — frontmatter ported (OMP client extension)
- [x] `skills/poteto-mode/SKILL.md` — entry contract (command door, gate, pin) ported
- [x] `worker.md` — verbatim (bar, PR shape, kickoff rule are host-agnostic)
- [x] `swarm`, `arena`, `interrogate` + task-call skills (16-file slice A: 8 changed, 8 verbatim)
- [x] Standalone skills (16-file slice B: 10 changed incl. `poteto-help` heaviest, 6 verbatim) + `automate-me` accuracy fixes (`create-skill`→playbook, single-choice `select`, `~/.omp/agent/skills/`)
- [x] 24 principles (1 changed, 23 verbatim host-agnostic)
- [x] 22 playbooks (14 changed, 8 verbatim; step names intact) + `poteto-mode/scripts/` vendored
- [x] `benny/` content (3 skills, references, templates, README, FOR_AGENTS: 3 neutralized, 9 verbatim)
- [x] `setup-pstack` (upstream original) — superseded, not ported; kept for diff
- [x] `src/pstack.ts` — `tsc --strict --noEmit` clean against installed `@oh-my-pi/pi-coding-agent` types

## Known limitations (not silently papered over)

1. **benny runtime mechanics.** benny's content is ported, but its runtime is
   Cursor Automations: `.cursor/automations/benny/` install destination,
   `.cursor/settings.json` plugin enablement, built-in `/automate` +
   Automations editor + protocol deep links, configured Slack actions /
   `prefer_cursor_actions`. OMP has no automations framework; the OMP
   equivalent would be extension-owned scheduling (`ctx.setInterval`) +
   event hooks. Needs an automations-framework decision before going further —
   until then benny reads as manual procedure, not live automation.
2. **Transcript-store paths** (`recall`, `show-me-your-work`, `eval`,
   `session-pickup`): host-agnostic wording ("the system prompt names the
   exact path"). Name a concrete OMP path if one should be pinned.
3. **Worktree/cache host paths** (`worktree-cleanup`): Cursor paths kept as
   labeled examples with "substitute your host's equivalents". Substitute if
   OMP defines canonical ones.
4. **`make-bot-ui`**: Grok Bot webhook/Automations mechanics have no OMP
   counterpart (noted in-skill); the skill stays for its UI-building content.
