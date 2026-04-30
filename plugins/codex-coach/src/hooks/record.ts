import { SOURCE_LABELS } from "../types/sources";
import type { CommandContext, CommandResult } from "../types/commands";
import type { RecordHookObservationData } from "../types/command-data";
import { openStorage } from "../storage";
import { appendHookObservationRecords } from "./storage";
import { buildHookObservation } from "./observation";

export async function recordHookObservation(input: {
  ctx: CommandContext;
  stdin: string | null;
}): Promise<CommandResult<RecordHookObservationData>> {
  const built = buildHookObservation({
    stdin: input.stdin,
    observedAt: input.ctx.generated_at
  });

  if (!built.observation) {
    return {
      data: {
        observation_id: null,
        derived_capability_event_ids: []
      },
      warnings: built.warnings,
      sources: []
    };
  }

  const storage = await openStorage({
    dataDir: input.ctx.data_dir,
    generatedAt: input.ctx.generated_at
  });

  try {
    storage.upsertHookObservations([built.observation]);
    storage.upsertCapabilityEvents(built.capabilityEvents);
  } finally {
    await storage.close();
  }

  const paths = await appendHookObservationRecords({
    dataDir: input.ctx.data_dir,
    observation: built.observation,
    capabilityEvents: built.capabilityEvents
  });

  return {
    data: {
      observation_id: built.observation.id,
      derived_capability_event_ids: built.capabilityEvents.map((event) => event.id)
    },
    warnings: built.warnings,
    sources: [
      {
        label: SOURCE_LABELS.HOOK,
        description: "Local Codex hook observation records.",
        path: paths.hookObservations,
        record_count: 1
      },
      {
        label: SOURCE_LABELS.HOOK,
        description: "Capability events derived from local Codex hooks.",
        path: paths.capabilityEvents,
        record_count: built.capabilityEvents.length
      }
    ]
  };
}
