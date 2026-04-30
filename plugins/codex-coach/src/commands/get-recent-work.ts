import { Command } from "commander";
import { placeholderRecentWorkData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { GetRecentWorkData } from "../types/command-data";

export function registerGetRecentWorkCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_recent_work").description("Return recent local work items."));

  command.action(async () => {
    await runCommand<GetRecentWorkData>("get_recent_work", command, (ctx) => ({
      data: placeholderRecentWorkData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
