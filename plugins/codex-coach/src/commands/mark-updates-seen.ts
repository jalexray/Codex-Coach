import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { markUpdatesSeen } from "../updates";
import type { LocalProfile } from "../types/entities";

interface MarkUpdatesSeenOptions {
  seenAt?: string;
}

export function registerMarkUpdatesSeenCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("mark_updates_seen").description("Update the local last-seen timestamp for Codex updates.")
  ).option("--seen-at <timestamp>", "timestamp to store; defaults to command execution time");

  command.action(async () => {
    await runCommand<LocalProfile>("mark_updates_seen", command, (ctx) =>
      markUpdatesSeen(ctx, command.opts<MarkUpdatesSeenOptions>().seenAt)
    );
  });
}
