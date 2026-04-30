import { Command } from "commander";
import { getCapabilityMapResult } from "../capabilities";
import { addGlobalOptions, runCommand } from "./runner";
import type { CapabilityMapData } from "../types/command-data";

export function registerGetCapabilityMapCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("get_capability_map").description("Return grouped Codex capability status.")
  );

  command.action(async () => {
    await runCommand<CapabilityMapData>("get_capability_map", command, getCapabilityMapResult);
  });
}
