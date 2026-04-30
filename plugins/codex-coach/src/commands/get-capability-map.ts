import { Command } from "commander";
import { placeholderCapabilityMapData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { CapabilityMapData } from "../types/command-data";

export function registerGetCapabilityMapCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("get_capability_map").description("Return grouped Codex capability status.")
  );

  command.action(async () => {
    await runCommand<CapabilityMapData>("get_capability_map", command, () => ({
      data: placeholderCapabilityMapData(),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
