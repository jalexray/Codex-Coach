import type { GitCommitMetadata } from "./types";

const MIN_RECENT_COMMITS = 8;
const MIN_ACTIONABLE_COMMITS = 4;
const MIN_CHANGED_FILES = 8;

export function detectSparseHistory(commits: GitCommitMetadata[]): boolean {
  if (commits.length === 0) {
    return true;
  }

  const actionableCommits = commits.filter((commit) => {
    return commit.stats.files_changed > 0 && !isAdministrativeGitSubject(commit.subject);
  });
  const changedFiles = commits.reduce((total, commit) => total + commit.stats.files_changed, 0);

  return (
    commits.length < MIN_RECENT_COMMITS ||
    actionableCommits.length < MIN_ACTIONABLE_COMMITS ||
    changedFiles < MIN_CHANGED_FILES
  );
}

export function isAdministrativeGitSubject(subject: string): boolean {
  const normalized = subject.trim().toLowerCase();
  return (
    normalized === "initial commit" ||
    normalized.startsWith("merge ") ||
    normalized.includes("checkpoint") ||
    normalized.includes("checkin") ||
    normalized.includes("checking in") ||
    normalized.includes("planning checkin")
  );
}
