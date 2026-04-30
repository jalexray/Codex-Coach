import { Command } from "commander";
import { placeholderStatusData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { StatusData } from "../types/command-data";

export function registerStatusCommands(program: Command): void {
  const command = addGlobalOptions(program.command("status").description("Show Codex Coach local status."));

  command.action(async () => {
    await runCommand<StatusData>("status", command, (ctx) => ({
      data: placeholderStatusData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
