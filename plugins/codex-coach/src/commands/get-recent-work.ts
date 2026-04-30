import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import type { GetRecentWorkData } from "../types/command-data";
import { getRecentWorkResult } from "../work-items";

export function registerGetRecentWorkCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_recent_work").description("Return recent local work items."));

  command.action(async () => {
    await runCommand<GetRecentWorkData>("get_recent_work", command, getRecentWorkResult, {
      quietWhenNotJson: true
    });
  });
}
