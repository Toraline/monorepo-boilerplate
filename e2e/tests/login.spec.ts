import { expect, test } from "@playwright/test";

import { seedAdmin } from "../environment";
import { logIn } from "./support/login";
import { messages } from "./support/messages";

test("a user logs in and sees their todo list", async ({ page }) => {
  await logIn(page);

  // The address is the start page, not the login page any more.
  await expect(page).toHaveURL("/");
  // The menu names the user who is logged in.
  await expect(
    page.getByText(
      messages.auth.userMenu.loggedInAs.replace("{name}", seedAdmin.name),
    ),
  ).toBeVisible();
  // The todo list is there, with the button that creates a todo.
  await expect(
    page.getByRole("heading", { name: messages.todos.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: messages.todos.new }),
  ).toBeVisible();
});
