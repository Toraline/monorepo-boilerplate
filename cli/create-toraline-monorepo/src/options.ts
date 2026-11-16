import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";

import { CommandError } from "../../shared/src/errors";
import { type Asker, yesOrNo } from "../../shared/src/prompt";
import { SOURCE_ENVIRONMENT_VARIABLE } from "../../shared/src/source";

export interface CreateOptions {
  /** The full path of the folder of the new monorepo. */
  directory: string;
  name: string;
  ticketPrefix: string;
  databaseName: string;
  keepSample: boolean;
  /** The owner on GitHub, written into the two "git clone" lines of the documents. */
  owner: string;
  /** The port of the database on this machine, written into .env only. Undefined keeps the sample port. */
  databasePort: string | undefined;
  source: string | undefined;
  reference: string | undefined;
}

export const HELP_TEXT = `create-toraline-monorepo: creates a new monorepo from the Toraline monorepo boilerplate.

Usage:
  npx create-toraline-monorepo [folder] [flags]

With no flag, the command asks 5 questions, one at a time. Each has a default.
For a run with no question (an agent, a script): --yes, the folder, and the flags you need.

Flags, one per question:
  --dir <folder>           The folder of the new monorepo. The same as the first word after the command.
                           It must not exist, or be empty. Default: my-project
  --name <name>            The name of the project: small letters, digits and dashes.
                           Default: the name of the folder
  --ticket-prefix <KEY>    The key of your Linear team: capital letters and digits. Default: ABC
  --database-name <name>   The name of the database: small letters, digits and underscores.
                           Default: the project name, with "_" for each "-"
  --keep-sample            Keep the sample todo product. This is the default.
  --remove-sample          Remove the sample todo product.

Other flags:
  --yes, -y                Ask no question. Every value with no flag gets its default. Needs the folder.
  --owner <name>           Your user or organization on GitHub, for the "git clone" lines of the documents.
                           Default: my-owner
  --database-port <port>   The port of the database on this machine, written into .env. Default: 5432
  --source <where>         Where to get the boilerplate from: a folder of this machine or a git address.
                           Default: Toraline/monorepo-boilerplate on GitHub, with your git login.
                           The environment variable ${SOURCE_ENVIRONMENT_VARIABLE} does the same.
  --ref <tag or branch>    The tag or branch of the boilerplate to use. Default: the newest release tag (vX.Y.Z).
  --version, -v            Print the version of this command.
  --help, -h               Print this text.

The command never creates a repository on GitHub, a project in Linear or an account.
It writes only inside the new folder. At the end it prints the next steps.

Example for an agent:
  npx create-toraline-monorepo my-project --yes --ticket-prefix ABC --remove-sample
`;

const NAME_RULE = /^[a-z0-9][a-z0-9-]*$/;
const DATABASE_NAME_RULE = /^[a-z][a-z0-9_]*$/;
const TICKET_PREFIX_RULE = /^[A-Z][A-Z0-9]*$/;
const OWNER_RULE = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

/** The rule of each value as a sentence, or "" when the value is valid. */
export const problemOf = {
  name: (value: string) =>
    NAME_RULE.test(value) ? "" : `The name "${value}" is not valid. Use small letters, digits and dashes, for example my-project.`,
  ticketPrefix: (value: string) =>
    TICKET_PREFIX_RULE.test(value)
      ? ""
      : `The ticket prefix "${value}" is not valid. Use capital letters and digits, for example ABC.`,
  databaseName: (value: string) =>
    DATABASE_NAME_RULE.test(value)
      ? ""
      : `The database name "${value}" is not valid. Use small letters, digits and underscores, and start with a letter, for example my_project.`,
  owner: (value: string) =>
    OWNER_RULE.test(value) ? "" : `The owner "${value}" is not valid. Use letters, digits and dashes.`,
  databasePort: (value: string) => {
    const port = Number(value);
    const isPort = /^\d+$/.test(value) && port >= 1 && port <= 65535;
    return isPort ? "" : `The database port "${value}" is not valid. Use a number from 1 to 65535.`;
  },
};

/** The default name of a project: the name of its folder in small letters, with a dash for every other character. */
export function defaultNameOf(directory: string): string {
  const name = basename(resolve(directory))
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name === "" ? "my-project" : name;
}

/** The default name of the database: the project name with "_" for each "-". */
export function defaultDatabaseNameOf(name: string): string {
  const databaseName = name.replaceAll("-", "_");
  return /^[a-z]/.test(databaseName) ? databaseName : `db_${databaseName}`;
}

export type ParsedArguments =
  | { kind: "help" }
  | { kind: "version" }
  | { kind: "create"; options: CreateOptions; defaultedTicketPrefix: boolean };

const USAGE_HELP = 'Run "npx create-toraline-monorepo --help" to see every flag.';

/** One answer: the flag when it was given, else the default (with --yes) or a question. */
async function answerFor(
  flagValue: string | undefined,
  question: string,
  defaultValue: string,
  problemOfValue: (value: string) => string,
  asker: Asker | null,
  printLine: (line: string) => void,
): Promise<string> {
  if (flagValue !== undefined) {
    const problem = problemOfValue(flagValue);
    if (problem !== "") {
      throw new CommandError(problem, USAGE_HELP);
    }
    return flagValue;
  }
  if (asker === null) {
    return defaultValue;
  }
  for (;;) {
    const answer = await asker.ask(question, defaultValue);
    const problem = problemOfValue(answer);
    if (problem === "") {
      return answer;
    }
    printLine(problem);
  }
}

/**
 * Reads the flags and asks the questions that have no flag.
 * `createAsker` is called only when a question is needed; with --yes it is never called.
 */
export async function readOptions(
  commandArguments: string[],
  createAsker: () => Asker,
  printLine: (line: string) => void,
): Promise<ParsedArguments> {
  let parsed;
  try {
    parsed = parseArgs({
      args: commandArguments,
      allowPositionals: true,
      options: {
        dir: { type: "string" },
        name: { type: "string" },
        "ticket-prefix": { type: "string" },
        "database-name": { type: "string" },
        "keep-sample": { type: "boolean" },
        "remove-sample": { type: "boolean" },
        yes: { type: "boolean", short: "y" },
        owner: { type: "string" },
        "database-port": { type: "string" },
        source: { type: "string" },
        ref: { type: "string" },
        version: { type: "boolean", short: "v" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    throw new CommandError(error instanceof Error ? error.message : String(error), USAGE_HELP);
  }
  const flags = parsed.values;
  if (flags.help) {
    return { kind: "help" };
  }
  if (flags.version) {
    return { kind: "version" };
  }
  if (parsed.positionals.length > 1) {
    throw new CommandError(
      `The command takes one folder, and got ${parsed.positionals.length}: ${parsed.positionals.join(", ")}.`,
      USAGE_HELP,
    );
  }
  if (flags["keep-sample"] && flags["remove-sample"]) {
    throw new CommandError("--keep-sample and --remove-sample were both given.", "Give only one of the two.");
  }
  const directoryFlag = flags.dir ?? parsed.positionals[0];
  if (flags.yes && directoryFlag === undefined) {
    throw new CommandError(
      "--yes was given with no folder.",
      "Name the folder of the new monorepo: npx create-toraline-monorepo my-project --yes",
    );
  }
  for (const [flagName, problemOfValue] of [
    ["owner", problemOf.owner],
    ["database-port", problemOf.databasePort],
  ] as const) {
    const value = flags[flagName];
    const problem = value === undefined ? "" : problemOfValue(value);
    if (problem !== "") {
      throw new CommandError(problem, USAGE_HELP);
    }
  }

  const needsQuestions =
    !flags.yes &&
    [
      directoryFlag,
      flags.name,
      flags["ticket-prefix"],
      flags["database-name"],
      flags["keep-sample"] || flags["remove-sample"] || undefined,
    ].includes(undefined);
  const asker = needsQuestions ? createAsker() : null;
  try {
    const noProblem = () => "";
    const directory = await answerFor(
      directoryFlag,
      "1 of 5. The folder of the new monorepo",
      "my-project",
      noProblem,
      asker,
      printLine,
    );
    const name = await answerFor(
      flags.name,
      "2 of 5. The name of the project (small letters, digits, dashes)",
      defaultNameOf(directory),
      problemOf.name,
      asker,
      printLine,
    );
    const ticketPrefix = await answerFor(
      flags["ticket-prefix"],
      "3 of 5. The ticket prefix: the key of your Linear team (capital letters)",
      "ABC",
      problemOf.ticketPrefix,
      asker,
      printLine,
    );
    const databaseName = await answerFor(
      flags["database-name"],
      "4 of 5. The name of the database (small letters, digits, underscores)",
      defaultDatabaseNameOf(name),
      problemOf.databaseName,
      asker,
      printLine,
    );
    const sampleFlag = flags["remove-sample"] ? "no" : undefined;
    const keepAnswer = await answerFor(
      flags["keep-sample"] ? "yes" : sampleFlag,
      "5 of 5. Keep the sample todo product? (yes or no)",
      "yes",
      (value) => (yesOrNo(value) === null ? 'Answer "yes" or "no".' : ""),
      asker,
      printLine,
    );
    return {
      kind: "create",
      defaultedTicketPrefix: flags["ticket-prefix"] === undefined && asker === null,
      options: {
        directory: resolve(directory),
        name,
        ticketPrefix,
        databaseName,
        keepSample: yesOrNo(keepAnswer) === true,
        owner: flags.owner ?? "my-owner",
        databasePort: flags["database-port"],
        source: flags.source,
        reference: flags.ref,
      },
    };
  } finally {
    asker?.close();
  }
}
