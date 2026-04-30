import crypto from "node:crypto";
import { isAdministrativeGitSubject } from "../importers/git";
import { SOURCE_LABELS } from "../types/sources";
import { fileExtensions, inferWorkSignals, topLevelDirectories } from "./signals";
import type { GitCommitMetadata, GitRecentWorkImport, GitRepositoryMetadata } from "../importers/git";
import type { WorkItem } from "../types/entities";

const DEFAULT_LOCAL_USER_ID = "local-default";
const MAX_WORK_ITEMS = 6;
const MAX_SIGNAL_FILES = 50;

export function createGitWorkItems(importResult: GitRecentWorkImport): WorkItem[] {
  return importResult.commits
    .filter((commit) => commit.stats.files_changed > 0 && !isAdministrativeGitSubject(commit.subject))
    .slice(0, MAX_WORK_ITEMS)
    .map((commit) => createGitCommitWorkItem(importResult.repository, commit, importResult.sparse_history));
}

function createGitCommitWorkItem(
  repository: GitRepositoryMetadata,
  commit: GitCommitMetadata,
  sparseHistory: boolean
): WorkItem {
  const filePaths = commit.files.map((file) => file.path);
  const branchNames = recentBranchNames(repository);
  const directories = topLevelDirectories(filePaths);
  const extensions = fileExtensions(filePaths);
  const inference = inferWorkSignals({
    title: commit.subject,
    branch_names: repository.current_branch ? [repository.current_branch] : [],
    file_paths: filePaths,
    files_changed: commit.stats.files_changed,
    insertions: commit.stats.insertions,
    deletions: commit.stats.deletions
  });

  return {
    id: `git:${repoFingerprint(repository.root_path)}:${commit.sha}`,
    user_id: DEFAULT_LOCAL_USER_ID,
    source: SOURCE_LABELS.GIT,
    title: normalizeTitle(commit.subject, commit.short_sha),
    summary: summarizeCommit(repository, commit, directories),
    completed_at: commit.committer_date,
    signals: {
      source_kind: "git-commit",
      commit_sha: commit.sha,
      commit_short_sha: commit.short_sha,
      commit_subject: commit.subject,
      commit_author_date: commit.author_date,
      commit_committer_date: commit.committer_date,
      current_branch: repository.current_branch,
      branch_names: branchNames,
      recent_branches: repository.recent_branches,
      changed_files: filePaths.slice(0, MAX_SIGNAL_FILES),
      changed_file_count: commit.stats.files_changed,
      insertions: commit.stats.insertions,
      deletions: commit.stats.deletions,
      binary_files: commit.stats.binary_files,
      total_line_changes: commit.stats.insertions + commit.stats.deletions,
      top_level_directories: directories,
      file_extensions: extensions,
      inferred_capabilities: inference.inferred_capabilities,
      inference_reasons: inference.inference_reasons,
      keywords: inference.keywords,
      sparse_history: sparseHistory
    },
    artifact_url: null,
    repo_path: repository.root_path
  };
}

function summarizeCommit(
  repository: GitRepositoryMetadata,
  commit: GitCommitMetadata,
  directories: string[]
): string {
  const branch = repository.current_branch ? ` on ${repository.current_branch}` : "";
  const areas = directories.length > 0 ? ` touched ${directories.slice(0, 4).join(", ")}` : " touched repository files";
  const moreAreas = directories.length > 4 ? ", and more" : "";
  return `Git commit ${commit.short_sha}${branch} changed ${commit.stats.files_changed} file${plural(
    commit.stats.files_changed
  )} (+${commit.stats.insertions}/-${commit.stats.deletions}) and${areas}${moreAreas}.`;
}

function recentBranchNames(repository: GitRepositoryMetadata): string[] {
  const names = repository.recent_branches.map((branch) => branch.name);
  if (repository.current_branch && !names.includes(repository.current_branch)) {
    names.unshift(repository.current_branch);
  }
  return names.slice(0, 12);
}

function normalizeTitle(subject: string, shortSha: string): string {
  const trimmed = subject.trim();
  return trimmed.length > 0 ? trimmed : `Git commit ${shortSha}`;
}

function plural(count: number): string {
  return count === 1 ? "" : "s";
}

function repoFingerprint(repoPath: string): string {
  return crypto.createHash("sha256").update(repoPath).digest("hex").slice(0, 12);
}
