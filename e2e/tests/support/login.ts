import { expect, type Page } from "@playwright/test";

import { seedAdmin } from "../../environment";
import { messages } from "./messages";

/**
 * Logs the user of the tests in, through the login page, the way a person
 * does. After it the page shows the todo list of the user.
 */
export async function logIn(page: Page): Promise<void> {
  // The start page needs a login: the app sends the browser to the login page.
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: messages.auth.login.title }),
  ).toBeVisible();

  await page.getByLabel(messages.auth.login.email).fill(seedAdmin.email);
  await page.getByLabel(messages.auth.login.password).fill(seedAdmin.password);
  await page
    .getByRole("button", { name: messages.auth.login.submit })
    .click();

  await expect(
    page.getByRole("heading", { name: messages.todos.title }),
  ).toBeVisible();
}
