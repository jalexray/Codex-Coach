import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { CoachError, toCoachError } from "../lib/errors";
import { jsonFailure, jsonSuccess, printJson } from "../lib/json";
import { nowIso } from "../lib/time";
import type { CommandContext, CommandResult } from "../types/commands";

export const PLACEHOLDER_WARNING =
  "placeholder_implementation: this command exposes the stable WS0 contract only.";

interface GlobalOptionValues {
  repo?: string;
  json?: boolean;
  dataDir?: string;
  demo?: boolean;
}

interface RunOptions {
  quietWhenNotJson?: boolean;
}

export function addGlobalOptions(command: Command): Command {
  return command
    .option("--repo <path>", "repository to inspect; defaults to the current working directory")
    .option("--json", "emit machine-readable JSON")
    .option("--data-dir <path>", "override the local Codex Coach data directory")
    .option("--demo", "allow seeded demo fallback data where implemented");
}

export function buildContext(commandName: string, command: Command): CommandContext {
  const opts = command.optsWithGlobals() as GlobalOptionValues;
  const generatedAt = nowIso();

  return {
    command: commandName,
    generated_at: generatedAt,
    repo: path.resolve(opts.repo ?? process.cwd()),
    json: Boolean(opts.json),
    data_dir: resolveDataDir(opts.dataDir),
    demo: Boolean(opts.demo)
  };
}

export async function runCommand<T>(
  commandName: string,
  command: Command,
  runner: (ctx: CommandContext) => Promise<CommandResult<T>> | CommandResult<T>,
  options: RunOptions = {}
): Promise<void> {
  const ctx = buildContext(commandName, command);

  try {
    const result = await runner(ctx);
    if (ctx.json) {
      printJson(
        jsonSuccess({
          command: ctx.command,
          generated_at: ctx.generated_at,
          data: result.data,
          warnings: result.warnings,
          sources: result.sources
        })
      );
      return;
    }

    if (!options.quietWhenNotJson) {
      process.stdout.write(`${commandName}: placeholder contract ready. Re-run with --json for schema output.\n`);
    }
  } catch (error) {
    emitError(ctx, error);
  }
}

export function emitError(ctx: Pick<CommandContext, "command" | "generated_at" | "json">, error: unknown): void {
  const coachError = toCoachError(error);

  if (ctx.json) {
    printJson(
      jsonFailure({
        command: ctx.command,
        generated_at: ctx.generated_at,
        code: coachError.code,
        message: coachError.message,
        details: coachError.details
      })
    );
  } else {
    process.stderr.write(`${coachError.message}\n`);
  }

  process.exitCode = coachError.exitCode;
}

export function readStringOption(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function resolveDataDir(dataDir?: string): string {
  if (dataDir && dataDir.length > 0) {
    return path.resolve(dataDir);
  }

  const xdgDataHome = process.env.XDG_DATA_HOME;
  if (xdgDataHome && xdgDataHome.length > 0) {
    return path.join(xdgDataHome, "codex-coach");
  }

  return path.join(os.homedir(), ".local", "share", "codex-coach");
}

export function invalidInput(message: string, details: Record<string, unknown> = {}): CoachError {
  return new CoachError("invalid_input", message, details, 2);
}

export async function readStdinIfAvailable(): Promise<string | null> {
  if (process.stdin.isTTY) {
    return null;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  const input = Buffer.concat(chunks).toString("utf8").trim();
  return input.length > 0 ? input : null;
}
