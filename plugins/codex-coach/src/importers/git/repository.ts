import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { CoachError } from "../../lib/errors";
import { runGit, runGitOptional } from "./git-command";
import type { GitBranchMetadata, GitRepositoryMetadata } from "./types";

export async function inspectGitRepository(repoPath: string): Promise<GitRepositoryMetadata> {
  const requestedPath = path.resolve(repoPath);

  await assertReadableDirectory(requestedPath);

  const rootPath = await resolveGitRoot(requestedPath);
  const insideWorkTree = await runGitOptional(rootPath, ["rev-parse", "--is-inside-work-tree"]);
  if (insideWorkTree !== "true") {
    throw invalidRepo("Repository path is not a git work tree.", { repo: requestedPath });
  }

  const currentBranch = await readCurrentBranch(rootPath);
  const headSha = await readHeadSha(rootPath);
  const recentBranches = await readRecentBranches(rootPath, currentBranch);

  return {
    requested_path: requestedPath,
    root_path: rootPath,
    current_branch: currentBranch,
    head_sha: headSha,
    recent_branches: recentBranches
  };
}

async function assertReadableDirectory(repoPath: string): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(repoPath);
    await fs.access(repoPath, fsConstants.R_OK);
  } catch {
    throw invalidRepo("Repository path does not exist or is not readable.", { repo: repoPath });
  }

  if (!stat.isDirectory()) {
    throw invalidRepo("Repository path must be a directory.", { repo: repoPath });
  }
}

async function resolveGitRoot(repoPath: string): Promise<string> {
  try {
    const rootPath = await runGit(repoPath, ["rev-parse", "--show-toplevel"]);
    if (rootPath.length === 0) {
      throw invalidRepo("Repository path is not a git work tree.", { repo: repoPath });
    }
    return path.resolve(rootPath);
  } catch (error) {
    if (error instanceof CoachError) {
      throw error;
    }
    throw invalidRepo("Repository path is not a git work tree.", { repo: repoPath });
  }
}

async function readCurrentBranch(rootPath: string): Promise<string | null> {
  const branch = await runGitOptional(rootPath, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  return branch && branch.length > 0 ? branch : null;
}

async function readHeadSha(rootPath: string): Promise<string | null> {
  const head = await runGitOptional(rootPath, ["rev-parse", "--verify", "HEAD"]);
  return head && head.length > 0 ? head : null;
}

async function readRecentBranches(rootPath: string, currentBranch: string | null): Promise<GitBranchMetadata[]> {
  const output = await runGitOptional(rootPath, [
    "for-each-ref",
    "--sort=-committerdate",
    "--format=%(refname:short)%09%(committerdate:iso-strict)",
    "refs/heads"
  ]);

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 12)
    .map((line) => {
      const [name, lastCommitAt] = line.split("\t");
      return {
        name,
        last_commit_at: lastCommitAt && lastCommitAt.length > 0 ? lastCommitAt : null,
        is_current: currentBranch === name
      };
    });
}

function invalidRepo(message: string, details: Record<string, unknown>): CoachError {
  return new CoachError("invalid_repo", message, details, 2);
}
