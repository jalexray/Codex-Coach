import fs from "node:fs/promises";
import path from "node:path";
import { CoachError } from "../lib/errors";
import type { LocalProfile } from "../types/entities";

const PROFILE_FILE_NAME = "profile.json";
const DEFAULT_PROFILE_ID = "local-default";

export function profilePath(dataDir: string): string {
  return path.join(dataDir, PROFILE_FILE_NAME);
}

export async function getOrCreateProfile(dataDir: string, generatedAt: string): Promise<LocalProfile> {
  try {
    return validateProfile(JSON.parse(await fs.readFile(profilePath(dataDir), "utf8")), profilePath(dataDir));
  } catch (error) {
    if (!isNodeError(error, "ENOENT")) {
      throw error;
    }

    const profile = defaultProfile(generatedAt);
    await saveProfile(dataDir, profile);
    return profile;
  }
}

export async function saveProfile(dataDir: string, profile: LocalProfile): Promise<LocalProfile> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(profilePath(dataDir), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  return profile;
}

export function defaultProfile(generatedAt: string): LocalProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    display_name: null,
    last_seen_updates_at: null,
    created_at: generatedAt
  };
}

export function validateSeenAt(value: string): string {
  if (Number.isNaN(Date.parse(value))) {
    throw new CoachError("invalid_input", "seen-at must be an ISO-compatible timestamp.", {
      seen_at: value
    }, 2);
  }
  return new Date(value).toISOString();
}

function validateProfile(value: unknown, filePath: string): LocalProfile {
  if (!isRecord(value)) {
    throw new CoachError("profile_invalid", "Invalid local profile: expected an object.", { path: filePath });
  }

  const id = readRequiredString(value, "id", filePath);
  const createdAt = readRequiredString(value, "created_at", filePath);
  const displayName = value.display_name;
  const lastSeenUpdatesAt = value.last_seen_updates_at;

  if (displayName !== null && typeof displayName !== "string") {
    throw new CoachError("profile_invalid", "Invalid local profile: display_name must be null or a string.", {
      path: filePath
    });
  }

  if (lastSeenUpdatesAt !== null && typeof lastSeenUpdatesAt !== "string") {
    throw new CoachError("profile_invalid", "Invalid local profile: last_seen_updates_at must be null or a string.", {
      path: filePath
    });
  }

  if (lastSeenUpdatesAt !== null && Number.isNaN(Date.parse(lastSeenUpdatesAt))) {
    throw new CoachError("profile_invalid", "Invalid local profile: last_seen_updates_at must be an ISO timestamp.", {
      path: filePath,
      last_seen_updates_at: lastSeenUpdatesAt
    });
  }

  if (Number.isNaN(Date.parse(createdAt))) {
    throw new CoachError("profile_invalid", "Invalid local profile: created_at must be an ISO timestamp.", {
      path: filePath,
      created_at: createdAt
    });
  }

  return {
    id,
    display_name: displayName,
    last_seen_updates_at: lastSeenUpdatesAt,
    created_at: createdAt
  };
}

function readRequiredString(record: Record<string, unknown>, field: string, filePath: string): string {
  const value = record[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new CoachError("profile_invalid", `Invalid local profile: ${field} must be a non-empty string.`, {
      path: filePath
    });
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === code;
}
