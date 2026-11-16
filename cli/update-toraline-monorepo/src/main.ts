import { reportError } from "../../shared/src/errors";
import type { Asker } from "../../shared/src/prompt";
import { HELP_TEXT, readOptions } from "./options";
import { runUpdate } from "./update";

/** Runs the command and returns its exit code. `version` is the version of the package. */
export async function main(
  commandArguments: string[],
  version: string,
  startDirectory: string,
  createAsker: () => Asker,
  printLine: (line: string) => void,
): Promise<number> {
  try {
    const parsed = readOptions(commandArguments);
    if (parsed.kind === "help") {
      printLine(HELP_TEXT);
      return 0;
    }
    if (parsed.kind === "version") {
      printLine(version);
      return 0;
    }
    return await runUpdate({
      options: parsed.options,
      startDirectory,
      commandVersion: version,
      createAsker,
      printLine,
    });
  } catch (error) {
    return reportError(error, printLine);
  }
}
