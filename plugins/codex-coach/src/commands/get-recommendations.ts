import { Command } from "commander";
import { placeholderRecommendationsData } from "./placeholders";
import { addGlobalOptions, PLACEHOLDER_WARNING, runCommand } from "./runner";
import type { GetRecommendationsData } from "../types/command-data";

export function registerGetRecommendationsCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("get_recommendations").description("Return recommendation records for recent work.")
  );

  command.action(async () => {
    await runCommand<GetRecommendationsData>("get_recommendations", command, () => ({
      data: placeholderRecommendationsData(),
      warnings: [PLACEHOLDER_WARNING],
      sources: []
    }));
  });
}
