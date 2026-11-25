# artfct-pstack — design decisions (locked)

Full native OMP port of [cursor/plugins `pstack`](https://github.com/cursor/plugins/tree/main/pstack)
(upstream `plugin.json` snapshotted at `UPSTREAM.plugin.json`; live mirror in `../plugins`,
fork `rubybear-lgtm/plugins`, upstream `cursor/plugins`).

## Locked

1. **Name**: `/poteto-mode`, `/setup-pstack-omp`. Raw `/skill:poteto-mode` is reachable;
   the command is the front door. No rename.
2. **Pinned mode**: extension-owned `Set<sessionKey>` in `src/pstack.ts` — built-in
   `sessionModes` has no custom slot (only plan/vibe/goal/loop). Bare `/poteto-mode`
   enters only; `/poteto-mode off|exit` leaves; never toggles. Status notify on
   enter/exit + re-announce content on entry. Refuses to engage while plan/loop
   owns the turn. Subagents get style via brief (`worker.md` + skill path), not
   pin inheritance. Pin state cleaned on `session_shutdown`.
3. **Setup gate**: hard require. No config → refuse with directive to
   `/setup-pstack-omp`, nothing spawned. Enforced in the command AND in the
   `before_agent_start` hook (marker-scoped to pinned sessions via the returned
   `message`; normal chat untouched). Config deleted mid-session → stay pinned,
   refuse-with-directive next turn. Current gate is file-based (scaffold);
   final form is a settings-registry lookup handle honoring `PI_CODING_AGENT_DIR`
   and named profiles.
4. **Full port, no overlay**: every `SKILL.md` gets translated per `PORT.md`.
   No verbatim+adapter layer. Upstream sync = manual merge per release, kept
   mechanical by the `PORT.md` substitution log.
5. **All skills + tools usable**: every skill invokable directly, both agents
   ported, `benny/` (3 skills) in scope. `poteto-mode` is the router, not the
   gatekeeper.
6. **Packs are search directives, not tables** (open + four metas):
   `defaults | big-labs | chinese-labs | free`, plus any provider id as a pack
   name (`anthropic`, `codex`, …). The setup skill contains a resolver procedure
   over `ctx.models.list()` — predicates + ranking + budget ladder — and writes
   only detected IDs. Examples in the skill are `e.g.`-marked, never written.
7. **Repo shape**: standalone `artfct-pstack` repo; `skills/` + `agents/` vendored
   from the fork for porting (fork stays a clean mirror for three-way diffs).

## Deferred / explicit non-goals

- `cursor-team-kit` deps (`/deslop`, `control-ui/cli`), bugbot, Cursor `/autopilot`:
  skip-with-note, same fallback the skill uses for Claude Code.
- Transcript presenters, `session_stop` continuations (autonomous-run
  keep-alive): v2.
- Marketplace catalog: personal `omp plugin link` first, catalog when stable.

## Known limitation: benny runtime

benny's skill content is ported, but its runtime (Cursor Automations:
scheduling, `/automate`, editor, Slack actions) has no OMP counterpart.
The OMP equivalent would be extension-owned scheduling plus event hooks —
that is a new framework decision, not a translation. Until then benny is
manual procedure, not live automation. Details in `PORT.md`.

## Amendment: universal plugin + harness-aware models

Layout follows the Agent Plugins package shape: root `plugin.json`
(portable 1.0.0 identity: `skills/`, `agents/`) is the portable core;
`package.json` (`omp.extensions`) + `src/` + OMP-tuned agent frontmatter
is the OMP client extension. Hybrid by design — either loader ignores the
other's manifest.

Portability rules: cross-skill links stay relative (`../<name>/…`,
`references/…`) — they resolve on every harness; `skill://` is OMP-only
and stays out of skill bodies (OMP runtime code in `src/` may use it).
Frontmatter keeps spec-legal keys (`name`, `description`,
`disable-model-invocation`, `icon`, `color`); host-only keys stay out.

Model selection is harness-aware per Boundary Discipline: `setup-pstack-omp`
step 0 detects the harness (asked when ambiguous), and resolution never
leaves that harness's registry — Codex resolves Codex models only. Writes
are host-native (OMP `config.yml`, Cursor `.mdc`, print-and-apply
elsewhere). Packs name intent (provider, lab grouping, free), never IDs.
