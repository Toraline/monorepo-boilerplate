import { createTerminalAsker } from "../../shared/src/prompt";
import { main } from "./main";

// esbuild writes the version of package.json here when it builds the command.
declare const PACKAGE_VERSION: string;

process.exitCode = await main(process.argv.slice(2), PACKAGE_VERSION, process.cwd(), createTerminalAsker, (line) =>
  console.log(line),
);
