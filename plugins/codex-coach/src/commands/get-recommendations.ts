import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { getRecommendations, recommendationSources } from "../recommender/service";
import type { GetRecommendationsData } from "../types/command-data";

export function registerGetRecommendationsCommands(program: Command): void {
  const command = addGlobalOptions(
    program.command("get_recommendations").description("Return recommendation records for recent work.")
  );

  command.action(async () => {
    await runCommand<GetRecommendationsData>("get_recommendations", command, async (ctx) => {
      const data = await getRecommendations(ctx);
      return {
        data,
        sources: recommendationSources(ctx, data)
      };
    });
  });
}
