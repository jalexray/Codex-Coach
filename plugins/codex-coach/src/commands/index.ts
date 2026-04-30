import { Command } from "commander";
import { registerCoachCommands } from "./coach";
import { registerDeleteLocalHistoryCommands } from "./delete-local-history";
import { registerGetCapabilityMapCommands } from "./get-capability-map";
import { registerGetRecentWorkCommands } from "./get-recent-work";
import { registerGetRecommendationsCommands } from "./get-recommendations";
import { registerGetUpdatesCommands } from "./get-updates";
import { registerImportChangelogCommands } from "./import-changelog";
import { registerMarkRecommendationFeedbackCommands } from "./mark-recommendation-feedback";
import { registerMarkUpdatesSeenCommands } from "./mark-updates-seen";
import { registerRecordHookObservationCommands } from "./record-hook-observation";
import { registerResetDemoStateCommands } from "./reset-demo-state";
import { registerStatusCommands } from "./status";

export function registerCommands(program: Command): void {
  registerStatusCommands(program);
  registerGetUpdatesCommands(program);
  registerMarkUpdatesSeenCommands(program);
  registerGetCapabilityMapCommands(program);
  registerGetRecentWorkCommands(program);
  registerGetRecommendationsCommands(program);
  registerCoachCommands(program);
  registerMarkRecommendationFeedbackCommands(program);
  registerImportChangelogCommands(program);
  registerRecordHookObservationCommands(program);
  registerResetDemoStateCommands(program);
  registerDeleteLocalHistoryCommands(program);
}
