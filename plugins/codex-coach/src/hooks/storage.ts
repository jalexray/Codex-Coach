import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { CapabilityEvent, HookObservation } from "../types/entities";

export const HOOK_OBSERVATIONS_FILE = "hook-observations.jsonl";
export const CAPABILITY_EVENTS_FILE = "capability-events.jsonl";

export interface HookStoragePaths {
  hookObservations: string;
  capabilityEvents: string;
}

export function hookStoragePaths(dataDir: string): HookStoragePaths {
  return {
    hookObservations: path.join(dataDir, HOOK_OBSERVATIONS_FILE),
    capabilityEvents: path.join(dataDir, CAPABILITY_EVENTS_FILE)
  };
}

export async function appendHookObservationRecords(input: {
  dataDir: string;
  observation: HookObservation;
  capabilityEvents: CapabilityEvent[];
}): Promise<HookStoragePaths> {
  await mkdir(input.dataDir, { recursive: true });
  const paths = hookStoragePaths(input.dataDir);

  await appendJsonLine(paths.hookObservations, input.observation);
  if (input.capabilityEvents.length > 0) {
    await appendFile(
      paths.capabilityEvents,
      input.capabilityEvents.map((event) => `${JSON.stringify(event)}\n`).join(""),
      "utf8"
    );
  }

  return paths;
}

async function appendJsonLine(filePath: string, value: unknown): Promise<void> {
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}
