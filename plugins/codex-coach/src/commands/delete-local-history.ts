import { Command } from "commander";
import { placeholderDeleteLocalHistoryData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { DeleteLocalHistoryData } from "../types/command-data";

export function registerDeleteLocalHistoryCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("delete_local_history").description("Delete plugin-owned local Codex Coach history.")
  );

  command.action(async () => {
    await runCommand<DeleteLocalHistoryData>("delete_local_history", command, (ctx) => ({
      data: placeholderDeleteLocalHistoryData(ctx),
      warnings: [PLACEHOLDER_WARNING, "no_files_deleted_by_ws0_placeholder"],
      sources: []
    }));
  });
}
