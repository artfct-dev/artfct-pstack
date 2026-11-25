---
name: setup-pstack-omp
description: Configure which models artfct-pstack uses per role and at what reasoning budget. Detects the host harness (OMP, Cursor, Codex, …) and its models, then writes role routing in host-native form. Use for /setup-pstack-omp, "configure pstack models", "pstack budget", or changing pstack's model choices.
---

# Setup artfct-pstack

Write pstack role routing for the detected host harness. Never write a model ID you did not confirm in the live registry this session. `e.g.` values below are shape illustrations, never values to write.

## 0. Detect the harness

Parse the boundary first — everything downstream depends on it. Exactly one harness must hold. If two seem to (e.g. an OMP session inside a Cursor workspace), ask:

- OMP: a session model list (`ctx.models.list()` equivalent) or a `~/.omp/agent` config root is present.
- Cursor: `Task`-slug enumeration, `~/.cursor/rules/`, or a `.cursor-plugin/` host.
- Codex: the codex harness model catalog / CLI.
- Claude Code: the `/plugin` registry or a `~/.claude/` root.

Record the harness and use it for every step below. Pack resolution is always confined to the detected harness's registry: on a Codex harness only Codex-served models are candidates, even for the `big-labs` / `chinese-labs` packs. A pack whose families the harness doesn't serve stops those roles with ask instead of substituting cross-harness IDs. A model string valid on one harness is never written for another.

## 1. Detect available models

List models the harness-native way. Exclude non-chat kinds (`tiny`, `judge`, `image`) except where a role explicitly needs them. `inherit-parent` and `auto` are always valid — they run the role on the parent chat model.

## 2. Pick a pack and a budget

Ask which pack (prefer a select UI over free text). Suggest the harness-named pack first — `codex` on a Codex harness, the operator's provider on OMP — since it resolves fully. The pack list is open:

- `defaults` — upstream pstack families (Claude Opus/Fable, Gemini Neon seats). Any role with no detected match stops and asks instead of substituting.
- `<provider-id>` — any provider in the detected harness's registry (e.g. `anthropic`, `codex`, `openai` on OMP). Rank flagship → efficient within that provider.
- `big-labs` — one seat each from Anthropic, OpenAI, Google; panel seats must hold distinct `family()` tokens (cross-vendor review is the point). Families the harness doesn't serve stop with ask.
- `chinese-labs` — DeepSeek, Qwen, GLM, Moonshot/Kimi, Minimax; same distinct-family rule for panels. Same stop-with-ask rule off-harness.
- `free` — detected models with zero cost, largest context first; panels collapse to however many distinct families exist (1–3), stated explicitly.

Budget (prefer select UI): `large — xhigh reasoning`, `medium — high`, `small — medium`. Apply the budget as the harness-native effort marker on every written selector (on OMP the `:level` suffix: large keeps the resolved level, medium lowers one step, small two; floor at the model's lowest advertised level; never write a level the model doesn't support; no role runs above `xhigh`).

## 3. Resolve roles

Rank candidates by recency then capability within the pack predicate. Assign:

| Role key | Covers (upstream) | Resolution |
|---|---|---|
| `poteto-code` | feature, refactoring, bug-fix, perf-issue, hillclimb | pack flagship |
| `poteto-prose` | judgment and prose | flagship, or the pack's best judge-kind model where one exists |
| `poteto-swarm` | swarm workers (verification always runs here) | most efficient capable model |
| `poteto-arena` (list) | arena runners | one entry per panel seat; list length sets fan-out |
| `poteto-arena-judge` (list) | arena cross-judge pool | vendor-distinct from the parent seat, in order |
| `poteto-interrogate` (list) | interrogate reviewers | same shape as arena runners |

Panel lists keep upstream semantics: one subagent per entry, alias entries (`inherit-parent`/`auto`) included in the count.

## 4. Validate

Every written selector must be in the detected set at the written level or below, in harness-native syntax (OMP `provider/id:level`, Cursor `Task` slug, other harnesses the listing's native string). `inherit-parent`/`auto` always pass. A chosen value that is unavailable stops the write — ask again, never substitute silently.

## 5. Write the config

Write in host-native form. Never invent a destination path:

- OMP: update (do not overwrite) the agent `config.yml` — default `~/.omp/agent`, `~/.omp/profiles/<name>/agent` under `--profile <name>`: set the six `modelRoles` keys above and `task.agentModelOverrides: { poteto-agent: "@poteto-code", comment-sicko: "@poteto-swarm" }`. Preserve every other key. Re-runs are idempotent.
- Cursor: write `~/.cursor/rules/pstack-models.mdc`, an `alwaysApply` rule in the upstream shape (per-role lines, `# budget` line). Overwrite the whole file so re-runs stay idempotent.
- Any other harness: use its native equivalent when one exists; otherwise print the resolved role table with the harness-native selectors and say exactly where to put it, then stop. Do not guess a path.

## 6. Confirm

Report the harness, pack, budget, per-role resolution (noting every substitution and every collapsed panel), and that new sessions pick it up. Offer once: if the project has no scripted way to drive the real app, offer to generate a project-local verification skill.
