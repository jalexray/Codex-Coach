import { Command } from "commander";
import { placeholderRecordHookObservationData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, readStdinIfAvailable, runCommand } from "./runner";
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
      () => ({
        data: placeholderRecordHookObservationData(),
        warnings: [
          PLACEHOLDER_WARNING,
          stdin ? "hook_payload_ignored_by_placeholder" : "no_hook_payload_received"
        ],
        sources: []
      }),
      { quietWhenNotJson: true }
    );
  });
}
