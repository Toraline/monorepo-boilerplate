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

// The requests of the tags, which the tag filter and the form send. The tests
// of the tags are in todo-tags.test.tsx.
const tagRoutes = { "GET /api/tags/": () => Response.json(pageOf([])) };

const buyMilk = todo({ id: 7, title: "Buy milk", description: "Two litres" });
const callBank = todo({ id: 8, title: "Call the bank", completed: true });

/** A small server that keeps a list of todos and answers the todo requests. */
function todoServer(initialTodos: Todo[]) {
  let todos = [...initialTodos];
  const findTodo = (path: string) => {
    const todoId = Number(path.split("/")[3]);
    return todos.find((candidate) => candidate.id === todoId) as Todo;
  };
  const replaceTodo = (changed: Todo) => {
    todos = todos.map((candidate) =>
      candidate.id === changed.id ? changed : candidate,
    );
    return Response.json(changed);
  };

  return mockServer({
    ...tagRoutes,
    "GET /api/todos/": ({ searchParams }) => {
      const completed = searchParams.get("completed");
      const rows = todos.filter(
        (candidate) =>
          completed === null || String(candidate.completed) === completed,
      );
      return Response.json(pageOf(rows));
    },
    "POST /api/todos/": ({ body }) => {
      const created = todo({ id: 99, ...(body as { title: string }) });
      todos = [created, ...todos];
      return Response.json(created, { status: 201 });
    },
    "PATCH /api/todos/7/": ({ path, body }) =>
      replaceTodo({ ...findTodo(path), ...(body as Partial<Todo>) }),
    "POST /api/todos/7/complete/": ({ path }) =>
      replaceTodo({ ...findTodo(path), completed: true }),
    "POST /api/todos/8/reopen/": ({ path }) =>
      replaceTodo({ ...findTodo(path), completed: false }),
    "DELETE /api/todos/7/": ({ path }) => {
      const deleted = findTodo(path);
      todos = todos.filter((candidate) => candidate.id !== deleted.id);
      return new Response(null, { status: 204 });
    },
  });
}

/** A press of a button as a person does it: the button gets the focus first. */
function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
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

describe("TodoList: the three states", () => {
  it("says that the list is loading", () => {
    mockServer({
      ...tagRoutes,
      "GET /api/todos/": () => new Promise<Response>(() => {}),
    });

    renderWithProviders(<TodoList />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading your todos.");
  });

  it("says that the user has no todos", async () => {
    todoServer([]);

    renderWithProviders(<TodoList />);

    expect(await screen.findByText("You have no todos yet.")).toBeInTheDocument();
  });

  it("says that no todo matches when a filter is on", async () => {
    todoServer([buyMilk]);
    navigation.search = "completed=true";

    renderWithProviders(<TodoList />);

    expect(
      await screen.findByText("No todo matches this filter."),
    ).toBeInTheDocument();
  });

  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = mockServer({ ...tagRoutes, "GET /api/todos/": noAnswer });

    renderWithProviders(<TodoList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return your todos.",
    );

    server.use({ "GET /api/todos/": () => Response.json(pageOf([buyMilk])) });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  });
});

describe("TodoList: the list and its filter", () => {
  it("shows the todos of the user, and marks a completed todo with a text", async () => {
    todoServer([buyMilk, callBank]);

    renderWithProviders(<TodoList />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Your todos" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Two litres")).toBeInTheDocument();
    expect(within(row("Call the bank")).getByText("Completed")).toBeInTheDocument();
    expect(within(row("Buy milk")).queryByText("Completed")).not.toBeInTheDocument();
  });

  it("has the filter all, not completed and completed, and starts on all", async () => {
    todoServer([buyMilk]);

    renderWithProviders(<TodoList />);

    expect(screen.getByRole("tablist", { name: "Show" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Not completed" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Completed" })).toBeInTheDocument();
    await screen.findByText("Buy milk");
  });

  it("shows only the completed todos after a press of Completed, and keeps the filter in the address", async () => {
    const server = todoServer([buyMilk, callBank]);
    renderWithProviders(<TodoList />);
    await screen.findByText("Buy milk");

    fireEvent.click(screen.getByRole("tab", { name: "Completed" }));

    expect(navigation.search).toBe("completed=true");
    await waitFor(() =>
      expect(server.requestsTo("GET /api/todos/")).toHaveLength(2),
    );
    expect(await screen.findByText("Call the bank")).toBeInTheDocument();
    expect(screen.queryByText("Buy milk")).not.toBeInTheDocument();
    const lastRequest = server.requestsTo("GET /api/todos/").at(-1);
    expect(lastRequest?.searchParams.get("completed")).toBe("true");
  });

  it("shows only the todos that are not completed after a press of Not completed", async () => {
    const server = todoServer([buyMilk, callBank]);
    renderWithProviders(<TodoList />);
    await screen.findByText("Call the bank");

    fireEvent.click(screen.getByRole("tab", { name: "Not completed" }));

    expect(navigation.search).toBe("completed=false");
    await waitFor(() =>
      expect(server.requestsTo("GET /api/todos/")).toHaveLength(2),
    );
    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(screen.queryByText("Call the bank")).not.toBeInTheDocument();
  });

  it("reads the filter and the page from the address", async () => {
    const server = mockServer({
      ...tagRoutes,
      "GET /api/todos/": () =>
        Response.json(pageOf([callBank], { count: 21, page: 2, totalPages: 2 })),
    });
    navigation.search = "completed=true&page=2";

    renderWithProviders(<TodoList />);

    await screen.findByText("Call the bank");
    expect(screen.getByRole("tab", { name: "Completed" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    const { searchParams } = server.requestsTo("GET /api/todos/")[0];
    expect(searchParams.get("completed")).toBe("true");
    expect(searchParams.get("page")).toBe("2");
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
  });

  it("asks for the next page on a press of Next page", async () => {
    const server = mockServer({
      ...tagRoutes,
      "GET /api/todos/": ({ searchParams }) =>
        Response.json(
          pageOf([buyMilk], {
            count: 21,
            page: Number(searchParams.get("page") ?? 1),
            totalPages: 2,
          }),
        ),
    });
    renderWithProviders(<TodoList />);

    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(navigation.search).toBe("page=2");
    expect(
      server.requestsTo("GET /api/todos/").at(-1)?.searchParams.get("page"),
    ).toBe("2");
  });

  it("shows the first page when the page of the address no longer exists", async () => {
    mockServer({
      ...tagRoutes,
      "GET /api/todos/": ({ searchParams }) =>
        searchParams.get("page") === "2"
          ? Response.json({ detail: "Invalid page." }, { status: 404 })
          : Response.json(pageOf([buyMilk])),
    });
    navigation.search = "page=2";

    renderWithProviders(<TodoList />);

    expect(await screen.findByText("Buy milk")).toBeInTheDocument();
    expect(navigation.search).toBe("");
  });
});

describe("TodoList: create and edit", () => {
  it("creates a todo with a title and a description", async () => {
    const server = todoServer([]);
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    const dialog = screen.getByRole("dialog", { name: "New todo" });
    expect(within(dialog).getByLabelText("Title")).toHaveFocus();
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Water the plants" },
    });
    fireEvent.change(within(dialog).getByLabelText("Description (optional)"), {
      target: { value: "Every Monday" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Water the plants")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("POST /api/todos/")[0].body).toEqual({
      title: "Water the plants",
      description: "Every Monday",
      tagIds: [],
    });
  });

  it("shows a message on the title field for an empty title, and sends nothing", async () => {
    const server = todoServer([]);
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
      "Type a title.",
    );
    expect(screen.getByLabelText("Title")).toBeInvalid();
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(server.requestsTo("POST /api/todos/")).toHaveLength(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows a message on the title field when the server refuses the title", async () => {
    const server = todoServer([]);
    server.use({
      "POST /api/todos/": () =>
        Response.json(
          { title: ["This field may not be blank."] },
          { status: 400 },
        ),
    });
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Water the plants" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(
        "The server did not accept this title.",
      ),
    );
  });

  it("keeps the dialog open and says that the todo was not saved when the server fails", async () => {
    const server = todoServer([]);
    server.use({ "POST /api/todos/": noAnswer });
    renderWithProviders(<TodoList />);
    await screen.findByText("You have no todos yet.");

    fireEvent.click(screen.getByRole("button", { name: "New todo" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Water the plants" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The todo was not saved. Try again.",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Water the plants");
  });

  it("edits a todo: the form starts with its values and saves the new ones", async () => {
    const server = todoServer([buyMilk]);
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Edit: Buy milk" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Edit todo" });
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Buy milk");
    expect(within(dialog).getByLabelText("Description (optional)")).toHaveValue(
      "Two litres",
    );
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Buy bread" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Buy bread")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("PATCH /api/todos/7/")[0].body).toEqual({
      title: "Buy bread",
      description: "Two litres",
      tagIds: [],
    });
  });

  it("closes the form on Cancel and changes nothing", async () => {
    const server = todoServer([buyMilk]);
    renderWithProviders(<TodoList />);

    press(await screen.findByRole("button", { name: "Edit: Buy milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("PATCH /api/todos/7/")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Edit: Buy milk" })).toHaveFocus();
  });
});

describe("TodoList: complete, reopen and delete", () => {
  it("completes a todo with one press", async () => {
    const server = todoServer([buyMilk]);
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Complete: Buy milk" }),
    );

    expect(
      await screen.findByRole("button", { name: "Reopen: Buy milk" }),
    ).toBeInTheDocument();
    expect(within(row("Buy milk")).getByText("Completed")).toBeInTheDocument();
    expect(server.requestsTo("POST /api/todos/7/complete/")).toHaveLength(1);
  });

  it("reopens a completed todo with one press", async () => {
    const server = todoServer([callBank]);
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Reopen: Call the bank" }),
    );

    expect(
      await screen.findByRole("button", { name: "Complete: Call the bank" }),
    ).toBeInTheDocument();
    expect(server.requestsTo("POST /api/todos/8/reopen/")).toHaveLength(1);
  });

  it("says on the row that the change was not saved when the server fails", async () => {
    const server = todoServer([buyMilk]);
    server.use({ "POST /api/todos/7/complete/": noAnswer });
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Complete: Buy milk" }),
    );

    expect(await within(row("Buy milk")).findByRole("alert")).toHaveTextContent(
      "The change was not saved. Try again.",
    );
  });

  it("asks for a confirmation before it deletes, and deletes nothing on Cancel", async () => {
    const server = todoServer([buyMilk]);
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete: Buy milk" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Delete this todo?" });
    expect(dialog).toHaveTextContent(
      '"Buy milk" will be deleted. This cannot be undone.',
    );
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(server.requestsTo("DELETE /api/todos/7/")).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(server.requestsTo("DELETE /api/todos/7/")).toHaveLength(0);
  });

  it("deletes the todo after the confirmation, and moves the focus to the New todo button", async () => {
    const server = todoServer([buyMilk]);
    renderWithProviders(<TodoList />);

    press(await screen.findByRole("button", { name: "Delete: Buy milk" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    expect(await screen.findByText("You have no todos yet.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("DELETE /api/todos/7/")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "New todo" })).toHaveFocus();
  });

  it("keeps the dialog open and says that the todo was not deleted when the server fails", async () => {
    const server = todoServer([buyMilk]);
    server.use({ "DELETE /api/todos/7/": noAnswer });
    renderWithProviders(<TodoList />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete: Buy milk" }),
    );
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The todo was not deleted. Try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("TodoList: Portuguese", () => {
  it("shows the Portuguese texts on a Portuguese page", async () => {
    todoServer([callBank]);

    renderWithProviders(<TodoList />, "pt-BR");

    expect(
      screen.getByRole("heading", { level: 1, name: "Suas tarefas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Não concluídas" })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Reabrir: Call the bank" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nova tarefa" }));
    expect(screen.getByRole("dialog", { name: "Nova tarefa" })).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
  });
});
