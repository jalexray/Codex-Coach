import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { getUpdates } from "../updates";
import type { CodexUpdate } from "../types/entities";
import type { GetUpdatesData } from "../types/command-data";
import type { CommandContext } from "../types/commands";

export function registerGetUpdatesCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_updates").description("Return Codex changelog updates."));

  command.action(async () => {
    await runCommand<GetUpdatesData>("get_updates", command, getUpdates, {
      renderText: ({ ctx, data }) => renderUpdatesText(ctx, data)
    });
  });
}

function renderUpdatesText(ctx: CommandContext, data: GetUpdatesData): string {
  const updates = data.updates.length > 0 ? data.updates : data.recent_highlights;
  const modeLabel = data.updates.length > 0 ? "updates since your last demo reset" : "recent Codex highlights";

  if (updates.length === 0) {
    return [
      "Codex Coach startup updates",
      "No new Codex updates were returned for this local state.",
      "Run @Codex Coach show what's new and review my recent work for the full readout."
    ].join("\n");
  }

  return [
    "Codex Coach startup updates",
    `${updates.length} ${modeLabel}:`,
    ...updates.map(formatUpdate),
    `Data dir: ${ctx.data_dir}`,
    "Run @Codex Coach show what's new and review my recent work for the full readout."
  ].join("\n");
}

function formatUpdate(update: CodexUpdate): string {
  return `- ${update.published_at}: ${update.title}\n  ${update.when_to_use}\n  ${update.source_url}`;
}
