import { Command } from "commander";
import { addGlobalOptions, readStdinIfAvailable, runCommand } from "./runner";
import { recordHookObservation } from "../hooks/record";
import type { RecordHookObservationData } from "../types/command-data";

export function registerRecordHookObservationCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("record_hook_observation").description("Record a Codex hook observation from stdin.")
  );

  command.action(async () => {
    const stdin = await readStdinIfAvailable();
    await runCommand<RecordHookObservationData>(
      "record_hook_observation",
      command,
      (ctx) => recordHookObservation({ ctx, stdin }),
      { quietWhenNotJson: true }
    );
  });
}
