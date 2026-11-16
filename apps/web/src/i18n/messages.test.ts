import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  locales,
  messageKeyProblems,
  messageKeys,
  type MessageTree,
} from "@repo/shared/i18n";

const messagesFolder = path.join(__dirname, "messages");

async function loadMessages(locale: string): Promise<MessageTree> {
  return (await import(`./messages/${locale}.json`)).default;
}

describe("the messages files", () => {
  it("has one file for each language of the apps, and no other file", () => {
    const files = readdirSync(messagesFolder).sort();

    expect(files).toEqual(locales.map((locale) => `${locale}.json`).sort());
  });

  it("has the same keys in every language, each with a text", async () => {
    const messagesByLocale: Record<string, MessageTree> = {};
    for (const locale of locales) {
      messagesByLocale[locale] = await loadMessages(locale);
    }

    expect(messageKeyProblems(messagesByLocale)).toEqual([]);
    expect(messageKeys(messagesByLocale.en).length).toBeGreaterThan(0);
  });
});
