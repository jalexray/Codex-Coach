import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CoachError } from "../lib/errors";

export const PLUGIN_DATA_DIR_NAME = "codex-coach";
export const DATABASE_FILENAME = "codex-coach.sqlite";

export function resolvePluginDataDir(dataDir?: string): string {
  if (dataDir && dataDir.length > 0) {
    return path.resolve(dataDir);
  }

  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome && xdgDataHome.length > 0) {
    return path.resolve(xdgDataHome, PLUGIN_DATA_DIR_NAME);
  }

  return path.join(os.homedir(), ".local", "share", PLUGIN_DATA_DIR_NAME);
}

export function resolveDatabasePath(dataDir: string): string {
  return path.join(path.resolve(dataDir), DATABASE_FILENAME);
}

export async function ensurePluginDataDir(dataDir: string): Promise<void> {
  await fs.mkdir(path.resolve(dataDir), { recursive: true });
}

export function isSameOrInsidePath(childPath: string, parentPath: string): boolean {
  const child = path.resolve(childPath);
  const parent = path.resolve(parentPath);
  const relative = path.relative(parent, child);

  return relative === "" || (relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeDeleteTarget(input: {
  dataDir: string;
  repo: string;
  explicitDataDir: boolean;
  defaultDataDir?: string;
}): void {
  const dataDir = path.resolve(input.dataDir);
  const defaultDataDir = path.resolve(input.defaultDataDir ?? resolvePluginDataDir());
  const repo = path.resolve(input.repo);
  const root = path.parse(dataDir).root;
  const home = path.resolve(os.homedir());

  if (!input.explicitDataDir && dataDir !== defaultDataDir) {
    throw new CoachError(
      "unsafe_data_dir",
      "delete_local_history can only delete the default Codex Coach data directory unless --data-dir is provided.",
      { data_dir: dataDir, default_data_dir: defaultDataDir },
      2
    );
  }

  if (dataDir === root || dataDir === home) {
    throw new CoachError(
      "unsafe_data_dir",
      "Refusing to delete local history from a broad filesystem directory.",
      { data_dir: dataDir },
      2
    );
  }

  if (isSameOrInsidePath(dataDir, repo)) {
    throw new CoachError(
      "unsafe_data_dir",
      "Refusing to delete local history from inside the inspected repository.",
      { data_dir: dataDir, repo },
      2
    );
  }
}

export async function deletePluginStorageFiles(dataDir: string): Promise<string[]> {
  const databasePath = resolveDatabasePath(dataDir);
  const candidates = [databasePath, `${databasePath}-journal`, `${databasePath}-shm`, `${databasePath}-wal`];
  const deleted: string[] = [];

  for (const candidate of candidates) {
    try {
      await fs.unlink(candidate);
      deleted.push(candidate);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  return deleted;
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
