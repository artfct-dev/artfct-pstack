import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// Pinned poteto-mode sessions. Module state is shared across child sessions
// (factories rebind per session), so this MUST stay keyed per session —
// a bare boolean would leak pin state into subagents.
const pinned = new Set<string>();

function sessionKey(ctx: { cwd: string }): string {
	// TODO(port): ExtensionContext carries no session id; confirm a stable
	// key via sessionManager (active session path). cwd collides for
	// same-directory siblings and shifts on /move.
	return `cwd:${ctx.cwd}`;
}

// Scaffold-grade setup gate: true when the operator config carries poteto
// role routing (written by /setup-pstack-omp).
// TODO(port): replace with a settings-registry lookup handle once role key
// names are finalized; must also honor PI_CODING_AGENT_DIR and named
// profiles (~/.omp/profiles/<name>/agent) instead of a fixed homedir path.
const SETUP_MARKERS = ["poteto", "pstack"];
function isSetupConfigured(): boolean {
	const candidates = [
		join(homedir(), ".omp", "agent", "config.yml"),
		join(homedir(), ".omp", "agent", "config.yaml"),
	];
	for (const path of candidates) {
		if (!existsSync(path)) continue;
		const text = readFileSync(path, "utf8").toLowerCase();
		if (SETUP_MARKERS.some(marker => text.includes(marker))) return true;
	}
	return false;
}

const SETUP_DIRECTIVE =
	"pstack models aren't configured. Run /setup-pstack-omp first " +
	"(detects your models, ~60s). No work was started.";

export default function (pi: ExtensionAPI) {
	pi.setLabel("artfct-pstack");

	pi.registerCommand("poteto-mode", {
		description:
			"Rigorous engineering workflow (pstack port). Bare: enter pinned mode; off|exit: leave; <task>: one-shot run.",
		handler: async (args, ctx) => {
			const rest = args.trim();
			const key = sessionKey(ctx);

			if (rest === "") {
				// Enter-only (locked): bare never exits, never runs.
				if (!isSetupConfigured()) {
					ctx.ui.notify(SETUP_DIRECTIVE, "warning");
					return;
				}
				pinned.add(key);
				ctx.ui.notify("poteto-mode pinned for this session. /poteto-mode off to leave.", "info");
				pi.sendMessage(
					{
						attribution: "agent",
						content:
							"poteto-mode pinned. Every turn follows skill://poteto-mode " +
							"(playbook router + principles index). Unpin with /poteto-mode off.",
						customType: "poteto-mode-pinned",
						display: true,
					},
					{ triggerTurn: false },
				);
				return;
			}

			if (rest === "off" || rest === "exit") {
				pinned.delete(key);
				ctx.ui.notify("poteto-mode unpinned.", "info");
				return;
			}

			// One-shot: hard setup gate, nothing spawned on refusal.
			if (!isSetupConfigured()) {
				ctx.ui.notify(SETUP_DIRECTIVE, "warning");
				return;
			}
			pi.sendUserMessage(`skill://poteto-mode\n\n${rest}`);
		},
	});

	pi.registerCommand("setup-pstack-omp", {
		description:
			"Detect your models and configure pstack role routing. Packs: any provider id (open) + big-labs | chinese-labs | free | defaults.",
		handler: async (args, ctx) => {
			const pack = args.trim() || "(ask me which pack)";
			pi.sendUserMessage(`skill://setup-pstack-omp\n\nPack: ${pack}`);
		},
	});

	// Pinned-mode enforcement + stay-pinned-on-config-loss (both locked).
	// before_agent_start runs per ordinary prompt (reason "prompt") and its
	// `message` result is appended once after the original batch — the
	// documented way to inject a turn-scoped directive without rewriting
	// history. Normal (unpinned) chat never reaches this branch.
	pi.on("before_agent_start", async (_event, ctx) => {
		const key = sessionKey(ctx);
		if (!pinned.has(key)) return;
		if (isSetupConfigured()) return;
		return {
			message: {
				attribution: "agent",
				content: `poteto-mode is pinned but configuration was removed. ${SETUP_DIRECTIVE}`,
				customType: "poteto-mode-setup-missing",
				display: true,
			},
		};
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		pinned.delete(sessionKey(ctx));
	});
}
