# artfct-pstack
> Add-on that works alongside [pstack](https://github.com/cursor/plugins/tree/main/pstack)
> (MIT, copyright Lauren Tan, handle poteto). Not a rebrand; no endorsement
> by Cursor or SpaceXAI is stated or implied. See `LICENSE`.

Poteto-mode rigorous engineering workflows in the artfct ecosystem — a
portable agent plugin (`plugin.json`) with a native OMP client extension.
Full-port policy and locked decisions live in [`DESIGN.md`](DESIGN.md); the
host→OMP substitution log in [`PORT.md`](PORT.md).

## Install

```bash
omp plugin link /Users/ruby/Documents/dev/artfct-pstack
# then in a live session:
/reload-plugins
```

(TUI plugin mutations need `/reload-plugins`; a restart is required if hooks
or tools change.)

## Setup (required — `/poteto-mode` refuses without it)

```
/setup-pstack-omp
```

Picks a pack (`defaults | big-labs | chinese-labs | free | <any provider id>`),
detects the host harness and its models, chooses a budget
(`large/medium/small`), writes role routing in host-native form. Re-run
anytime to switch packs.

## Use

```
/poteto-mode fix the scroll drift, repro first then verify   # one-shot
/poteto-mode            # enter pinned mode (enter-only)
/poteto-mode off        # leave pinned mode
/poteto-help            # which skill for this task?
```

One-shot matches a playbook, opens its todos, routes to skills; pinned mode
does the same every turn until you leave. Long runs: watch Agent Hub (`Alt+A`),
catch up with `/ketchup` on return.

## Scope notes

- `benny/` (issue triage automation) is ported as content, but its live
  runtime needs Cursor Automations — no OMP equivalent yet. See `PORT.md`.
- `/setup-pstack-omp` is required before `/poteto-mode` runs anything.
- Poteto-mode evidence outputs (verification reports, bakeoff comparisons,
  decision trails) publish as Artfct artifacts when the artfct MCP is
  available — see `DESIGN.md`.
