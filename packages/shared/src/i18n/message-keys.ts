/** The texts of one language: names that hold a text or a group of more names. */
export type MessageTree = { [name: string]: string | MessageTree };

/**
 * Every key of a messages file, with the groups joined by a dot.
 * Example: {"home": {"title": "Todo list"}} gives ["home.title"].
 */
export function messageKeys(messages: MessageTree, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([name, value]) => {
    const key = prefix === "" ? name : `${prefix}.${name}`;
    return typeof value === "string" ? [key] : messageKeys(value, key);
  });
}

function emptyMessageKeys(messages: MessageTree, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([name, value]) => {
    const key = prefix === "" ? name : `${prefix}.${name}`;
    if (typeof value === "string") {
      return value.trim() === "" ? [key] : [];
    }
    return emptyMessageKeys(value, key);
  });
}

/**
 * Compares the messages files of all languages. Returns one line per problem:
 * a key that one language has and another has not, and a key with an empty
 * text. An empty list means that every language has the same keys.
 */
export function messageKeyProblems(
  messagesByLocale: Record<string, MessageTree>,
): string[] {
  const keysByLocale = Object.entries(messagesByLocale).map(
    ([locale, messages]) => ({ locale, keys: new Set(messageKeys(messages)) }),
  );
  const allKeys = [
    ...new Set(keysByLocale.flatMap(({ keys }) => [...keys])),
  ].sort();

  const missing = allKeys.flatMap((key) =>
    keysByLocale
      .filter(({ keys }) => !keys.has(key))
      .map(({ locale }) => `"${key}" is missing in ${locale}`),
  );
  const empty = Object.entries(messagesByLocale).flatMap(([locale, messages]) =>
    emptyMessageKeys(messages).map(
      (key) => `"${key}" has an empty text in ${locale}`,
    ),
  );
  return [...missing, ...empty];
}
