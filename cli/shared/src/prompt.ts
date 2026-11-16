import { createInterface } from "node:readline/promises";

/** Asks one question and returns the answer; an empty answer gives the default. */
export interface Asker {
  ask(question: string, defaultValue: string): Promise<string>;
  close(): void;
}

/** Asks the questions in the terminal of the person, one at a time. */
export function createTerminalAsker(): Asker {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  return {
    async ask(question, defaultValue) {
      const answer = await terminal.question(`${question} [${defaultValue}]: `);
      return answer.trim() === "" ? defaultValue : answer.trim();
    },
    close() {
      terminal.close();
    },
  };
}

/** Reads a yes or a no. Returns null when the text is neither. */
export function yesOrNo(text: string): boolean | null {
  const answer = text.trim().toLowerCase();
  if (["y", "yes"].includes(answer)) {
    return true;
  }
  if (["n", "no"].includes(answer)) {
    return false;
  }
  return null;
}
