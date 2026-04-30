export interface GitRepositoryMetadata {
  requested_path: string;
  root_path: string;
  current_branch: string | null;
  head_sha: string | null;
  recent_branches: GitBranchMetadata[];
}

export interface GitBranchMetadata {
  name: string;
  last_commit_at: string | null;
  is_current: boolean;
}

export interface GitCommitMetadata {
  sha: string;
  short_sha: string;
  author_date: string;
  committer_date: string;
  subject: string;
  files: GitChangedFile[];
  stats: GitDiffStats;
}

export interface GitChangedFile {
  path: string;
  additions: number;
  deletions: number;
  binary: boolean;
}

export interface GitDiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
  binary_files: number;
}

export interface GitRecentWorkImport {
  repository: GitRepositoryMetadata;
  commits: GitCommitMetadata[];
  sparse_history: boolean;
  warnings: string[];
}
