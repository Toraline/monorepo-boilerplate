import { describe, expect, it } from "vitest";

import { messageKeyProblems, messageKeys } from "./message-keys";

describe("messageKeys", () => {
  it("joins the groups and the names with a dot", () => {
    expect(
      messageKeys({
        home: { title: "Todo list", status: { ok: "The server answers." } },
        language: "Language",
      }),
    ).toEqual(["home.title", "home.status.ok", "language"]);
  });
});

describe("messageKeyProblems", () => {
  it("finds no problem when every language has the same keys", () => {
    expect(
      messageKeyProblems({
        en: { home: { title: "Todo list" } },
        "pt-BR": { home: { title: "Lista de tarefas" } },
      }),
    ).toEqual([]);
  });

  it("names a key that is missing in one language", () => {
    expect(
      messageKeyProblems({
        en: { home: { title: "Todo list", intro: "Welcome" } },
        "pt-BR": { home: { title: "Lista de tarefas" } },
      }),
    ).toEqual(['"home.intro" is missing in pt-BR']);
  });

  it("names a key that exists in only one language, for each other language", () => {
    expect(
      messageKeyProblems({
        en: { home: { title: "Todo list" } },
        "pt-BR": { home: { title: "Lista de tarefas", extra: "Extra" } },
        es: { home: { title: "Lista de tareas" } },
      }),
    ).toEqual([
      '"home.extra" is missing in en',
      '"home.extra" is missing in es',
    ]);
  });

  it("names a key that is a text in one language and a group in another", () => {
    expect(
      messageKeyProblems({
        en: { home: "Home" },
        "pt-BR": { home: { title: "Início" } },
      }),
    ).toEqual([
      '"home" is missing in pt-BR',
      '"home.title" is missing in en',
    ]);
  });

  it("names a key with an empty text", () => {
    expect(
      messageKeyProblems({
        en: { home: { title: "Todo list" } },
        "pt-BR": { home: { title: "  " } },
      }),
    ).toEqual(['"home.title" has an empty text in pt-BR']);
  });
});
