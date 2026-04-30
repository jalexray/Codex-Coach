import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { markRecommendationFeedback, recommendationSources } from "../recommender/service";
import type { MarkRecommendationFeedbackData } from "../types/command-data";

interface FeedbackOptions {
  recommendationId?: string;
  rating?: string;
  note?: string;
}

export function registerMarkRecommendationFeedbackCommands(program: Command): void {
  const command = addGlobalOptions(
    program
      .command("mark_recommendation_feedback")
      .description("Store useful or not-useful feedback for a recommendation.")
  )
    .option("--recommendation-id <id>", "recommendation ID to update")
    .option("--rating <rating>", "feedback rating: useful or not-useful")
    .option("--note <note>", "optional feedback note");

  command.action(async () => {
    await runCommand<MarkRecommendationFeedbackData>("mark_recommendation_feedback", command, async (ctx) => {
      const options = command.opts<FeedbackOptions>();
      const data = await markRecommendationFeedback(ctx, {
        recommendationId: options.recommendationId,
        rating: options.rating,
        note: options.note
      });

      return {
        data,
        sources: recommendationSources(ctx)
      };
    });
  });
}
