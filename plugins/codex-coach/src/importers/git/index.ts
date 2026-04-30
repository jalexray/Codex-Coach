import { readRecentCommits } from "./commits";
import { inspectGitRepository } from "./repository";
import { detectSparseHistory } from "./sparse-history";
import type { GitRecentWorkImport } from "./types";

export async function importGitRecentWork(repoPath: string): Promise<GitRecentWorkImport> {
  const repository = await inspectGitRepository(repoPath);
  const commits = await readRecentCommits(repository);
  const sparseHistory = detectSparseHistory(commits);
  const warnings: string[] = [];

  if (!repository.head_sha) {
    warnings.push("git_history_empty");
  } else if (sparseHistory) {
    warnings.push("sparse_git_history");
  }

  return {
    repository,
    commits,
    sparse_history: sparseHistory,
    warnings
  };
}

export type {
  GitBranchMetadata,
  GitChangedFile,
  GitCommitMetadata,
  GitDiffStats,
  GitRecentWorkImport,
  GitRepositoryMetadata
} from "./types";

export { detectSparseHistory } from "./sparse-history";
export { isAdministrativeGitSubject } from "./sparse-history";
export { parseGitLogNumstat } from "./commits";
