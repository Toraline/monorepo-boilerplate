import { expect, test } from "@playwright/test";

import { logIn } from "./support/login";
import { messages } from "./support/messages";

test("a logged-in user creates a todo and sees it in the list", async ({
  page,
}) => {
  // A title that no other run has used, so the test does not depend on the
  // rows that are already in the database.
  const title = `Invented todo ${Date.now()}`;

  await logIn(page);

  await page.getByRole("button", { name: messages.todos.new }).click();
  const dialog = page.getByRole("dialog", {
    name: messages.todos.form.createTitle,
  });
  await dialog.getByLabel(messages.todos.form.titleLabel).fill(title);
  await dialog.getByRole("button", { name: messages.todos.form.save }).click();

  // The dialog closes, and the list has one row with the new title.
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(1);

  // The todo is saved on the server: it is still in the list after a reload.
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: title })).toHaveCount(1);
});
