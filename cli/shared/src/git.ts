import { spawnSync } from "node:child_process";

import { CommandError } from "./errors";

export interface GitResult {
  status: number;
  stdout: string;
  stderr: string;
}

// git never opens a question for a user name or a password: a command that
// runs with no person (an agent, a test) would wait for ever.
const GIT_ENVIRONMENT = { GIT_TERMINAL_PROMPT: "0" };

/** Runs git and returns its exit code and its output. It never throws on a failed git command. */
export function runGit(gitArguments: string[], workingDirectory?: string): GitResult {
  const result = spawnSync("git", gitArguments, {
    cwd: workingDirectory,
    encoding: "utf8",
    env: { ...process.env, ...GIT_ENVIRONMENT },
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error) {
    throw new CommandError(
      `git could not be started (${result.error.message}).`,
      "Install git, then run the command again. Check it with: git --version",
    );
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

/** Runs git and returns what it printed. Throws a CommandError when git fails. */
export function gitOutput(
  gitArguments: string[],
  workingDirectory: string | undefined,
  whatToDo: string,
): string {
  const result = runGit(gitArguments, workingDirectory);
  if (result.status !== 0) {
    throw new CommandError(
      `"git ${gitArguments.join(" ")}" failed: ${lastLine(result.stderr) || `exit code ${result.status}`}`,
      whatToDo,
    );
  }
  return result.stdout;
}

/** The content of one file at one git reference, or null when the file does not exist there. */
export function fileAtReference(
  repositoryDirectory: string,
  reference: string,
  filePath: string,
): Buffer | null {
  const result = spawnSync("git", ["show", `${reference}:${filePath}`], {
    cwd: repositoryDirectory,
    env: { ...process.env, ...GIT_ENVIRONMENT },
    maxBuffer: 256 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : null;
}

/** The last line of a text that is not empty. git writes the cause of a failure there. */
export function lastLine(text: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  return lines.at(-1) ?? "";
}
