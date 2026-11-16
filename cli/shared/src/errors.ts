/**
 * An error that a command shows to the person: what went wrong, then what to
 * do next. The command prints both and ends with `exitCode`.
 */
export class CommandError extends Error {
  readonly whatToDo: string;
  readonly exitCode: number;

  constructor(message: string, whatToDo: string, exitCode = 1) {
    super(message);
    this.name = "CommandError";
    this.whatToDo = whatToDo;
    this.exitCode = exitCode;
  }
}

/** Prints an error in the fixed shape and returns the exit code of the command. */
export function reportError(
  error: unknown,
  printLine: (line: string) => void,
): number {
  if (error instanceof CommandError) {
    printLine(`Stopped: ${error.message}`);
    printLine(`What to do: ${error.whatToDo}`);
    return error.exitCode;
  }
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  printLine(`Stopped by an error that the command did not expect: ${text}`);
  printLine(
    "What to do: run the command again. If it fails again, report the lines above to the owner of the boilerplate.",
  );
  return 1;
}
