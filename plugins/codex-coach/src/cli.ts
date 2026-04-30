#!/usr/bin/env node
import { Command } from "commander";
import { registerCommands } from "./commands";
import { emitError, resolveDataDir } from "./commands/runner";
import { nowIso } from "./lib/time";

async function main(argv: string[]): Promise<void> {
  const program = new Command();

  program
    .name("codex-coach")
    .description("Local-first Codex Coach command layer.")
    .version("0.1.0")
    .option("--repo <path>", "repository to inspect; defaults to the current working directory", process.cwd())
    .option("--json", "emit machine-readable JSON")
    .option("--data-dir <path>", "override the local Codex Coach data directory", resolveDataDir())
    .option("--demo", "allow seeded demo fallback data where implemented")
    .showHelpAfterError()
    .showSuggestionAfterError();

  registerCommands(program);

  program.exitOverride();

  try {
    if (argv.length <= 2) {
      program.outputHelp();
      return;
    }

    await program.parseAsync(argv);
  } catch (error) {
    emitError(
      {
        command: detectCommandName(argv),
        generated_at: nowIso(),
        json: argv.includes("--json")
      },
      error
    );
  }
}

function detectCommandName(argv: string[]): string {
  const commandNames = new Set([
    "status",
    "get_updates",
    "mark_updates_seen",
    "get_capability_map",
    "get_recent_work",
    "get_recommendations",
    "coach",
    "mark_recommendation_feedback",
    "import_changelog",
    "record_hook_observation",
    "reset_demo_state",
    "delete_local_history"
  ]);

  return argv.find((arg, index) => index > 1 && commandNames.has(arg)) ?? "unknown";
}

void main(process.argv);
