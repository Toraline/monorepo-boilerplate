import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/test/render";

import { LanguageSwitch } from "./language-switch";

vi.mock("@repo/shared/i18n/actions", () => ({
  setLocale: vi.fn(),
}));

describe("LanguageSwitch", () => {
  it("has one button per language, each with the name of the language in that language", () => {
    renderWithMessages(<LanguageSwitch />);

    const english = screen.getByRole("button", { name: "English" });
    const portuguese = screen.getByRole("button", {
      name: "Português (Brasil)",
    });
    expect(english).toHaveAttribute("name", "locale");
    expect(english).toHaveAttribute("value", "en");
    expect(english).toHaveAttribute("type", "submit");
    expect(portuguese).toHaveAttribute("value", "pt-BR");
    expect(portuguese).toHaveAttribute("lang", "pt-BR");
  });

  it("marks English as the chosen language on an English page", () => {
    renderWithMessages(<LanguageSwitch />, "en");

    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Português (Brasil)" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("marks Portuguese as the chosen language on a Portuguese page", () => {
    renderWithMessages(<LanguageSwitch />, "pt-BR");

    expect(screen.getByRole("group", { name: "Idioma" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Português (Brasil)" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
