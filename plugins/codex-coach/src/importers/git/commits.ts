import { runGitOptional } from "./git-command";
import type { GitChangedFile, GitCommitMetadata, GitDiffStats, GitRepositoryMetadata } from "./types";

const COMMIT_SEPARATOR = "\x1e";
const FIELD_SEPARATOR = "\x1f";

export async function readRecentCommits(
  repository: GitRepositoryMetadata,
  input: { max_count?: number } = {}
): Promise<GitCommitMetadata[]> {
  if (!repository.head_sha) {
    return [];
  }

  const maxCount = String(input.max_count ?? 12);
  const output = await runGitOptional(repository.root_path, [
    "log",
    `--max-count=${maxCount}`,
    "--no-merges",
    `--pretty=format:${COMMIT_SEPARATOR}%H${FIELD_SEPARATOR}%h${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%cI${FIELD_SEPARATOR}%s`,
    "--numstat"
  ]);

  return output ? parseGitLogNumstat(output) : [];
}

export function parseGitLogNumstat(output: string): GitCommitMetadata[] {
  return output
    .split(COMMIT_SEPARATOR)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map(parseCommitRecord)
    .filter((commit): commit is GitCommitMetadata => commit !== null);
}

function parseCommitRecord(record: string): GitCommitMetadata | null {
  const lines = record.split(/\r?\n/).filter((line) => line.length > 0);
  const header = lines.shift();
  if (!header) {
    return null;
  }

  const [sha, shortSha, authorDate, committerDate, ...subjectParts] = header.split(FIELD_SEPARATOR);
  if (!sha || !shortSha || !authorDate || !committerDate) {
    return null;
  }

  const files = lines.map(parseNumstatLine).filter((file): file is GitChangedFile => file !== null);

  return {
    sha,
    short_sha: shortSha,
    author_date: authorDate,
    committer_date: committerDate,
    subject: subjectParts.join(FIELD_SEPARATOR).trim() || `Commit ${shortSha}`,
    files,
    stats: summarizeFiles(files)
  };
}

function parseNumstatLine(line: string): GitChangedFile | null {
  const fields = line.split("\t");
  if (fields.length < 3) {
    return null;
  }

  const [additionsRaw, deletionsRaw, ...pathParts] = fields;
  const filePath = pathParts.join("\t").trim();
  if (filePath.length === 0) {
    return null;
  }

  const binary = additionsRaw === "-" || deletionsRaw === "-";
  return {
    path: filePath,
    additions: binary ? 0 : toNonNegativeInt(additionsRaw),
    deletions: binary ? 0 : toNonNegativeInt(deletionsRaw),
    binary
  };
}

function summarizeFiles(files: GitChangedFile[]): GitDiffStats {
  return files.reduce<GitDiffStats>(
    (stats, file) => ({
      files_changed: stats.files_changed + 1,
      insertions: stats.insertions + file.additions,
      deletions: stats.deletions + file.deletions,
      binary_files: stats.binary_files + (file.binary ? 1 : 0)
    }),
    {
      files_changed: 0,
      insertions: 0,
      deletions: 0,
      binary_files: 0
    }
  );
}

function toNonNegativeInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
