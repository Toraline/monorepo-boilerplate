import { reportError } from "../../shared/src/errors";
import type { Asker } from "../../shared/src/prompt";
import { createMonorepo, nextSteps } from "./create";
import { HELP_TEXT, readOptions } from "./options";

/** Runs the command and returns its exit code. `version` is the version of the package. */
export async function main(
  commandArguments: string[],
  version: string,
  createAsker: () => Asker,
  printLine: (line: string) => void,
): Promise<number> {
  try {
    const parsed = await readOptions(commandArguments, createAsker, printLine);
    if (parsed.kind === "help") {
      printLine(HELP_TEXT);
      return 0;
    }
    if (parsed.kind === "version") {
      printLine(version);
      return 0;
    }
    const result = createMonorepo(parsed.options, printLine);
    printLine("");
    printLine("Next steps (the command did not do them):");
    for (const step of nextSteps(parsed.options, result, parsed.defaultedTicketPrefix)) {
      printLine(step);
    }
    return 0;
  } catch (error) {
    return reportError(error, printLine);
  }
}
