import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { getUpdates } from "../updates";
import type { GetUpdatesData } from "../types/command-data";

export function registerGetUpdatesCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_updates").description("Return Codex changelog updates."));

  command.action(async () => {
    await runCommand<GetUpdatesData>("get_updates", command, getUpdates);
  });
}
