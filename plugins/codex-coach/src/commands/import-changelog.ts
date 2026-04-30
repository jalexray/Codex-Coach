import { Command } from "commander";
import { placeholderImportChangelogData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { ImportChangelogData } from "../types/command-data";

export function registerImportChangelogCommands(program: Command): void {
  const command = addGlobalOptions(program.command("import_changelog").description("Import bundled Codex changelog data."))
    .option("--refresh", "refresh from official remote sources where implemented");

  command.action(async () => {
    await runCommand<ImportChangelogData>("import_changelog", command, (ctx) => ({
      data: placeholderImportChangelogData(ctx),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
