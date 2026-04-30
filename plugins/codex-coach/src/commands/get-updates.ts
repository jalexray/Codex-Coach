import { Command } from "commander";
import { addGlobalOptions, runCommand } from "./runner";
import { getUpdates } from "../updates";
import type { CodexUpdate } from "../types/entities";
import type { GetUpdatesData } from "../types/command-data";
import type { CommandContext } from "../types/commands";

interface GetUpdatesOptions {
  startupJson?: boolean;
}

const FULL_READOUT_COMMAND = "@Codex Coach show what's new and review my recent work";
const STARTUP_UPDATE_LIMIT = 4;
const WRAP_WIDTH = 96;

export function registerGetUpdatesCommands(program: Command): void {
  const command = addGlobalOptions(program.command("get_updates").description("Return Codex changelog updates."))
    .option("--startup-json", "emit Codex SessionStart hook JSON with a startup system message");

  command.action(async () => {
    const opts = command.optsWithGlobals() as GetUpdatesOptions;
    await runCommand<GetUpdatesData>("get_updates", command, getUpdates, {
      renderText: ({ ctx, data }) => renderUpdatesOutput(ctx, data, Boolean(opts.startupJson))
    });
  });
}

function renderUpdatesOutput(ctx: CommandContext, data: GetUpdatesData, startupJson: boolean): string {
  const text = startupJson ? renderStartupUpdatesText(ctx, data) : renderUpdatesText(ctx, data);
  return startupJson ? JSON.stringify({ systemMessage: text }) : text;
}

export function renderUpdatesText(ctx: CommandContext, data: GetUpdatesData): string {
  const updates = data.updates.length > 0 ? data.updates : data.recent_highlights;
  const modeLabel = data.updates.length > 0 ? "updates since your last demo reset" : "recent Codex highlights";

  if (updates.length === 0) {
    return [
      "Codex Coach startup updates",
      "",
      "No new Codex updates were returned for this local state.",
      `Next: ${FULL_READOUT_COMMAND}`
    ].join("\n");
  }

  return [
    "Codex Coach startup updates",
    "",
    `${updates.length} ${modeLabel}`,
    "",
    ...updates.flatMap((update, index) => formatDetailedUpdate(update, index)),
    `Data dir: ${ctx.data_dir}`,
    `Next: ${FULL_READOUT_COMMAND}`
  ].join("\n");
}

export function renderStartupUpdatesText(ctx: CommandContext, data: GetUpdatesData): string {
  const updates = data.updates.length > 0 ? data.updates : data.recent_highlights;
  const modeLabel = data.updates.length > 0 ? "updates since your last demo reset" : "recent Codex highlights";

  if (updates.length === 0) {
    return [
      "Codex Coach startup updates",
      "No new Codex updates for this local state.",
      `Next: ${FULL_READOUT_COMMAND}`
    ].join(" | ");
  }

  const visibleUpdates = updates.slice(0, STARTUP_UPDATE_LIMIT);
  const hiddenCount = updates.length - visibleUpdates.length;
  const updateSummary = visibleUpdates.map((update) => `[${update.published_at}] ${update.title}`);
  if (hiddenCount > 0) {
    updateSummary.push(`+${hiddenCount} more`);
  }

  return [
    "Codex Coach startup updates",
    `${updates.length} ${modeLabel}`,
    ...updateSummary,
    `Data: ${ctx.data_dir}`,
    `Next: ${FULL_READOUT_COMMAND}`
  ].join(" | ");
}

function formatDetailedUpdate(update: CodexUpdate, index: number): string[] {
  return [
    `${index + 1}. ${update.published_at} - ${update.title}`,
    ...wrapLabeledLine("Use when", update.when_to_use),
    `   Source: ${update.source_url}`,
    ""
  ];
}

function wrapLabeledLine(label: string, text: string): string[] {
  const firstPrefix = `   ${label}: `;
  const nextPrefix = " ".repeat(firstPrefix.length);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = firstPrefix;

  for (const word of words) {
    const separator = current.trim().length === 0 || current.endsWith(" ") ? "" : " ";
    const next = `${current}${separator}${word}`;

    if (next.length > WRAP_WIDTH && current !== firstPrefix) {
      lines.push(current);
      current = `${nextPrefix}${word}`;
      continue;
    }

    current = next;
  }

  if (current.length > firstPrefix.length) {
    lines.push(current);
  }

  return lines;
}
