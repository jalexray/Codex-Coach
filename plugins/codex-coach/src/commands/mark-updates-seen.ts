import { Command } from "commander";
import { placeholderProfile } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { LocalProfile } from "../types/entities";

interface MarkUpdatesSeenOptions {
  seenAt?: string;
}

export function registerMarkUpdatesSeenCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("mark_updates_seen").description("Update the local last-seen timestamp for Codex updates.")
  ).option("--seen-at <timestamp>", "timestamp to store; defaults to command execution time");

  command.action(async () => {
    await runCommand<LocalProfile>("mark_updates_seen", command, (ctx) => ({
      data: {
        ...placeholderProfile(ctx),
        last_seen_updates_at: command.opts<MarkUpdatesSeenOptions>().seenAt ?? ctx.generated_at
      },
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
