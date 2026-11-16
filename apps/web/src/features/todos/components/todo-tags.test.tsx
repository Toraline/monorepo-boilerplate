import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer, pageOf } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import type { Todo } from "../api/todos";
import { TodoList } from "./todo-list";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const home = { id: 2, name: "Home", color: "#2E7D32" };
const urgent = { id: 3, name: "Urgent", color: "#C62828" };
const work = { id: 1, name: "Work", color: "#1565C0" };
const allTags = [home, urgent, work];

function todo(values: Partial<Todo> & { id: number; title: string }): Todo {
  return {
    description: "",
    completed: false,
    tags: [],
    createdAt: "2026-11-15T17:40:00.123456Z",
    updatedAt: "2026-11-15T17:40:00.123456Z",
    ...values,
  };
}

const buyMilk = todo({ id: 7, title: "Buy milk", tags: [home, urgent] });
const sendReport = todo({
  id: 8,
  title: "Send the report",
  completed: true,
  tags: [work],
});
const readBook = todo({ id: 9, title: "Read a book" });

/** A small server with the tags and a list of todos that it filters as the real one. */
function tagServer(initialTodos: Todo[], tags = allTags) {
  let todos = [...initialTodos];
  const tagsOf = (body: unknown) =>
    (body as { tagIds: number[] }).tagIds.map(
      (tagId) => tags.find((tag) => tag.id === tagId) as (typeof tags)[number],
    );

  return mockServer({
    "GET /api/tags/": () => Response.json(pageOf(tags, { pageSize: 100 })),
    "GET /api/todos/": ({ searchParams }) => {
      const completed = searchParams.get("completed");
      const tagId = searchParams.get("tag");
      const rows = todos.filter(
        (candidate) =>
          (completed === null || String(candidate.completed) === completed) &&
          (tagId === null ||
            candidate.tags.some((tag) => String(tag.id) === tagId)),
      );
      return Response.json(pageOf(rows));
    },
    "POST /api/todos/": ({ body }) => {
      const created = todo({
        id: 99,
        ...(body as { title: string; description: string }),
        tags: tagsOf(body),
      });
      todos = [created, ...todos];
      return Response.json(created, { status: 201 });
    },
    "PATCH /api/todos/7/": ({ body }) => {
      const changed = { ...buyMilk, tags: tagsOf(body) };
      todos = todos.map((candidate) =>
        candidate.id === changed.id ? changed : candidate,
      );
      return Response.json(changed);
    },
  });
}

function row(title: string) {
  return screen.getByText(title).closest("li") as HTMLElement;
}

beforeEach(() => {
  resetNavigation();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TodoList: the tags on the list", () => {
  it("shows the tags of each todo, each with its name and its color", async () => {
    tagServer([buyMilk, sendReport, readBook]);

    renderWithProviders(<TodoList />);

    await screen.findByText("Buy milk");
    const tagList = within(row("Buy milk")).getByRole("list", {
      name: "Tags of Buy milk",
    });
    const tags = within(tagList).getAllByRole("listitem");
    expect(tags.map((tag) => tag.textContent)).toEqual(["Home", "Urgent"]);
    expect(tags[0].querySelector('[data-slot="tag-color"]')).toHaveStyle({
      backgroundColor: "#2E7D32",
    });
    expect(tags[1].querySelector('[data-slot="tag-color"]')).toHaveStyle({
      backgroundColor: "#C62828",
    });
    expect(within(row("Send the report")).getByText("Work")).toBeInTheDocument();
    expect(within(row("Read a book")).queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("TodoList: the filter by tag", () => {
  it("has a tag filter with every tag, and starts on all tags", async () => {
    tagServer([buyMilk]);

    renderWithProviders(<TodoList />);

    const filter = screen.getByRole("combobox", { name: "Tag" });
    await waitFor(() =>
      expect(
        within(filter)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["All tags", "Home", "Urgent", "Work"]),
    );
    expect(filter).toHaveValue("");
  });

  it("shows only the todos with the chosen tag, and keeps the tag in the address", async () => {
    const server = tagServer([buyMilk, sendReport, readBook]);
    renderWithProviders(<TodoList />);
    await screen.findByText("Send the report");

    fireEvent.change(screen.getByRole("combobox", { name: "Tag" }), {
      target: { value: "2" },
    });

    expect(navigation.search).toBe("tag=2");
    await waitFor(() =>
      expect(screen.queryByText("Send the report")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("Read a book")).not.toBeInTheDocument();
    expect(
      server.requestsTo("GET /api/todos/").at(-1)?.searchParams.get("tag"),
    ).toBe("2");
  });

  it("filters by tag together with the completed filter", async () => {
    const server = tagServer([buyMilk, sendReport, readBook]);
    navigation.search = "completed=true";
    renderWithProviders(<TodoList />);
    await screen.findByText("Send the report");

    fireEvent.change(screen.getByRole("combobox", { name: "Tag" }), {
      target: { value: "1" },
    });

    expect(navigation.search).toBe("completed=true&tag=1");
    await waitFor(() =>
      expect(server.requestsTo("GET /api/todos/")).toHaveLength(2),
    );
    const { searchParams } = server.requestsTo("GET /api/todos/")[1];
    expect(searchParams.get("completed")).toBe("true");
    expect(searchParams.get("tag")).toBe("1");
    expect(await screen.findByText("Send the report")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Not completed" }));

    expect(navigation.search).toBe("completed=false&tag=1");
    expect(
      await screen.findByText("No todo matches this filter."),
    ).toBeInTheDocument();
  });

  it("goes back to the first page when the tag changes", async () => {
    tagServer([buyMilk]);
    navigation.search = "page=3";
    renderWithProviders(<TodoList />);
    await screen.findByRole("option", { name: "Home" });

    fireEvent.change(screen.getByRole("combobox", { name: "Tag" }), {
      target: { value: "2" },
    });

    expect(navigation.search).toBe("tag=2");
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  });

  it("reads the tag from the address, and shows all todos again on All tags", async () => {
    tagServer([buyMilk, readBook]);
    navigation.search = "tag=2";
    renderWithProviders(<TodoList />);

    await screen.findByText("Buy milk");
    expect(screen.queryByText("Read a book")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Tag" })).toHaveValue("2"),
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Tag" }), {
      target: { value: "" },
    });

    expect(navigation.search).toBe("");
    expect(await screen.findByText("Read a book")).toBeInTheDocument();
  });
});

describe("TodoList: the tags in the form", () => {
  it("creates a todo with the chosen tags", async () => {
    const server = tagServer([]);
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    const dialog = screen.getByRole("dialog");
    const tagGroup = within(dialog).getByRole("group", {
      name: "Tags (optional)",
    });
    expect(
      (await within(tagGroup).findAllByRole("checkbox")).map(
        (checkbox) => (checkbox as HTMLInputElement).checked,
      ),
    ).toEqual([false, false, false]);
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Pay the rent" },
    });
    fireEvent.click(within(tagGroup).getByRole("checkbox", { name: "Home" }));
    fireEvent.click(within(tagGroup).getByRole("checkbox", { name: "Work" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await screen.findByText("Pay the rent");
    expect(server.requestsTo("POST /api/todos/")[0].body).toEqual({
      title: "Pay the rent",
      description: "",
      tagIds: [2, 1],
    });
    expect(within(row("Pay the rent")).getByText("Home")).toBeInTheDocument();
    expect(within(row("Pay the rent")).getByText("Work")).toBeInTheDocument();
  });

  it("creates a todo with no tag when none is chosen", async () => {
    const server = tagServer([]);
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Pay the rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Pay the rent");
    expect(server.requestsTo("POST /api/todos/")[0].body).toMatchObject({
      tagIds: [],
    });
  });

  it("starts the edit form with the tags of the todo, and saves the new choice", async () => {
    const server = tagServer([buyMilk]);
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit: Buy milk" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      await within(dialog).findByRole("checkbox", { name: "Home" }),
    ).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Urgent" })).toBeChecked();
    expect(
      within(dialog).getByRole("checkbox", { name: "Work" }),
    ).not.toBeChecked();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Urgent" }));
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Work" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(server.requestsTo("PATCH /api/todos/7/")[0].body).toMatchObject({
      tagIds: [2, 1],
    });
    expect(within(row("Buy milk")).queryByText("Urgent")).not.toBeInTheDocument();
    expect(within(row("Buy milk")).getByText("Work")).toBeInTheDocument();
  });

  it("says that there are no tags yet when the list of tags is empty", async () => {
    tagServer([], []);
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));

    expect(
      await screen.findByText("There are no tags yet. An admin creates them."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("says that the tags did not load when the server fails, and the todo can still be saved", async () => {
    const server = tagServer([]);
    server.use({ "GET /api/tags/": noAnswer });
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));

    expect(
      await screen.findByText("The server did not return the tags."),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Pay the rent" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Pay the rent")).toBeInTheDocument();
  });
});

describe("TodoList: a user cannot change a tag", () => {
  it("has no control that creates, renames or deletes a tag, and sends no request that changes one", async () => {
    const server = tagServer([buyMilk]);
    renderWithProviders(<TodoList />);
    await screen.findByText("Buy milk");
    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    await screen.findAllByRole("checkbox");

    const controlNames = [
      ...screen.getAllByRole("button"),
      ...screen.queryAllByRole("link"),
      ...screen.getAllByRole("textbox"),
    ].map((control) => control.getAttribute("aria-label") ?? control.textContent);
    expect(controlNames.filter((name) => /tag/i.test(name ?? ""))).toEqual([]);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(
      server.requests.filter(
        (request) =>
          request.path.startsWith("/api/tags/") && request.method !== "GET",
      ),
    ).toEqual([]);
  });
});

describe("TodoList: the tags in Portuguese", () => {
  it("shows the Portuguese texts of the tag filter and of the form", async () => {
    tagServer([buyMilk]);

    renderWithProviders(<TodoList />, "pt-BR");

    const filter = screen.getByRole("combobox", { name: "Etiqueta" });
    await waitFor(() =>
      expect(within(filter).getAllByRole("option")[0]).toHaveTextContent(
        "Todas as etiquetas",
      ),
    );
    expect(
      await screen.findByRole("list", { name: "Etiquetas de Buy milk" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nova tarefa" }));
    expect(
      screen.getByRole("group", { name: "Etiquetas (opcional)" }),
    ).toBeInTheDocument();
  });
});
