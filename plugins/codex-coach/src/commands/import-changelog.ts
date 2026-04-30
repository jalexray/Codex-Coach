import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { importChangelog } from "../updates";
import type { ImportChangelogData } from "../types/command-data";

interface ImportChangelogOptions {
  refresh?: boolean;
}

export function registerImportChangelogCommands(program: Command): void {
  const command = addGlobalOptions(program.command("import_changelog").description("Import bundled Codex changelog data."))
    .option("--refresh", "refresh from official remote sources where implemented");

  command.action(async () => {
    await runCommand<ImportChangelogData>("import_changelog", command, (ctx) =>
      importChangelog(ctx, command.opts<ImportChangelogOptions>())
    );
  });
}
