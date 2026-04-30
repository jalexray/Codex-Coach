import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GitCommandError extends Error {
  readonly stderr: string;
  readonly exit_code: number | null;

  constructor(message: string, input: { stderr?: string; exit_code?: number | null } = {}) {
    super(message);
    this.name = "GitCommandError";
    this.stderr = input.stderr ?? "";
    this.exit_code = input.exit_code ?? null;
  }
}

export async function runGit(cwd: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
    return result.stdout.trimEnd();
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stderr?: string;
      code?: number | string;
    };
    const exitCode = typeof execError.code === "number" ? execError.code : null;
    throw new GitCommandError(execError.message, {
      stderr: execError.stderr,
      exit_code: exitCode
    });
  }
}

export async function runGitOptional(cwd: string, args: string[]): Promise<string | null> {
  try {
    return await runGit(cwd, args);
  } catch (error) {
    if (error instanceof GitCommandError) {
      return null;
    }
    throw error;
  }
}
