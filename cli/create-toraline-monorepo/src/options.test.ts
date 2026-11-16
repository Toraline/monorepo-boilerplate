import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CommandError } from "../../shared/src/errors";
import type { Asker } from "../../shared/src/prompt";
import { main } from "./main";
import { defaultDatabaseNameOf, defaultNameOf, HELP_TEXT, readOptions } from "./options";

/** An asker that gives the answers of a list, in order, and records each question. */
function askerWith(answers: string[]) {
  const questions: string[] = [];
  const asker: Asker = {
    async ask(question, defaultValue) {
      questions.push(question);
      const answer = answers.shift() ?? "";
      return answer === "" ? defaultValue : answer;
    },
    close() {},
  };
  return { asker, questions };
}

function neverAsk(): Asker {
  throw new Error("The command asked a question, and the test expected none.");
}

const ignoreLine = () => {};

describe("the options of create-toraline-monorepo", () => {
  it("asks no question with --yes, and gives every missing value its default", async () => {
    const parsed = await readOptions(["My Project", "--yes"], neverAsk, ignoreLine);

    expect(parsed).toEqual({
      kind: "create",
      defaultedTicketPrefix: true,
      options: {
        directory: resolve("My Project"),
        name: "my-project",
        ticketPrefix: "ABC",
        databaseName: "my_project",
        keepSample: true,
        owner: "my-owner",
        databasePort: undefined,
        source: undefined,
        reference: undefined,
      },
    });
  });

  it("takes every answer from a flag", async () => {
    const parsed = await readOptions(
      [
        "--dir", "folder", "--name", "shop", "--ticket-prefix", "SHP", "--database-name", "shop_db",
        "--remove-sample", "--owner", "sample-owner", "--database-port", "5544", "--source", "/tmp/template",
        "--ref", "v0.1.0",
      ],
      neverAsk,
      ignoreLine,
    );

    expect(parsed.kind === "create" && parsed.options).toEqual({
      directory: resolve("folder"),
      name: "shop",
      ticketPrefix: "SHP",
      databaseName: "shop_db",
      keepSample: false,
      owner: "sample-owner",
      databasePort: "5544",
      source: "/tmp/template",
      reference: "v0.1.0",
    });
  });

  it("asks the 5 questions one at a time, each with a default, and asks again after a wrong answer", async () => {
    const { asker, questions } = askerWith(["shop-folder", "Wrong Name", "shop", "", "", "no"]);
    const lines: string[] = [];

    const parsed = await readOptions([], () => asker, (line) => lines.push(line));

    expect(questions.map((question) => question.slice(0, 6))).toEqual([
      "1 of 5", "2 of 5", "2 of 5", "3 of 5", "4 of 5", "5 of 5",
    ]);
    expect(lines.join("\n")).toContain('The name "Wrong Name" is not valid');
    expect(parsed.kind === "create" && parsed.options).toMatchObject({
      directory: resolve("shop-folder"),
      name: "shop",
      ticketPrefix: "ABC",
      databaseName: "shop",
      keepSample: false,
    });
  });

  it("asks only the questions that have no flag", async () => {
    const { asker, questions } = askerWith([""]);

    await readOptions(["folder", "--name", "shop", "--database-name", "shop", "--keep-sample"], () => asker, ignoreLine);

    expect(questions).toHaveLength(1);
    expect(questions[0]).toContain("3 of 5");
  });

  it.each([
    [["--yes"], "--yes was given with no folder"],
    [["folder", "--yes", "--name", "Wrong Name"], 'The name "Wrong Name" is not valid'],
    [["folder", "--yes", "--ticket-prefix", "abc"], 'The ticket prefix "abc" is not valid'],
    [["folder", "--yes", "--database-name", "my-db"], 'The database name "my-db" is not valid'],
    [["folder", "--yes", "--database-port", "70000"], 'The database port "70000" is not valid'],
    [["folder", "--yes", "--keep-sample", "--remove-sample"], "were both given"],
    [["folder", "other", "--yes"], "takes one folder"],
    [["folder", "--unknown-flag"], "Unknown option"],
  ])("refuses %j", async (commandArguments, message) => {
    const failure = await readOptions(commandArguments, neverAsk, ignoreLine).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(CommandError);
    expect((failure as CommandError).message).toContain(message);
    expect((failure as CommandError).whatToDo).not.toBe("");
  });

  it("gives a folder name a valid project name and database name", () => {
    expect(defaultNameOf("/work/My Shop_2")).toBe("my-shop-2");
    expect(defaultDatabaseNameOf("my-shop-2")).toBe("my_shop_2");
    expect(defaultDatabaseNameOf("2-shops")).toBe("db_2_shops");
  });
});

describe("create-toraline-monorepo --help and --version", () => {
  it("prints every flag, and exits with 0", async () => {
    const lines: string[] = [];

    const exitCode = await main(["--help"], "0.1.0", neverAsk, (line) => lines.push(line));

    expect(exitCode).toBe(0);
    for (const flag of [
      "--dir", "--name", "--ticket-prefix", "--database-name", "--keep-sample", "--remove-sample", "--yes",
      "--owner", "--database-port", "--source", "--ref", "--version", "--help",
    ]) {
      expect(lines.join("\n"), flag).toContain(flag);
    }
    expect(HELP_TEXT).toContain("never creates a repository on GitHub");
  });

  it("prints the version of the package", async () => {
    const lines: string[] = [];

    expect(await main(["--version"], "0.1.0", neverAsk, (line) => lines.push(line))).toBe(0);
    expect(lines).toEqual(["0.1.0"]);
  });

  it("prints what went wrong and what to do, and exits with 1", async () => {
    const lines: string[] = [];

    const exitCode = await main(["--yes"], "0.1.0", neverAsk, (line) => lines.push(line));

    expect(exitCode).toBe(1);
    expect(lines[0]).toMatch(/^Stopped: /);
    expect(lines[1]).toMatch(/^What to do: /);
  });
});
