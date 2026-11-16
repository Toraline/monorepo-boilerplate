import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer, pageOf } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import type { AdminTodo } from "../api/todos";
import { TodoTable } from "./todo-table";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const ana = { id: 4, name: "Ana Lima", email: "ana.lima@example.com" };
const bruno = { id: 5, name: "Bruno Reis", email: "bruno.reis@example.com" };
const home = { id: 2, name: "Home", color: "#2E7D32", todoCount: 1 };
const work = { id: 1, name: "Work", color: "#1565C0", todoCount: 1 };

function todo(
  values: Partial<AdminTodo> & { id: number; title: string },
): AdminTodo {
  return {
    description: "",
    completed: false,
    tags: [],
    createdAt: "2026-11-14T09:00:00.000000Z",
    updatedAt: "2026-11-15T17:40:00.123456Z",
    owner: ana,
    ...values,
  };
}

const buyMilk = todo({ id: 7, title: "Buy milk", tags: [home] });
const sendReport = todo({
  id: 8,
  title: "Send the report",
  owner: bruno,
  completed: true,
  tags: [work],
  updatedAt: "2026-11-13T08:05:00.000000Z",
});
const readBook = todo({ id: 9, title: "Read a book", owner: bruno });

/** A small server that filters the todos as the real one does. */
function adminServer(todos: AdminTodo[]) {
  return mockServer({
    "GET /api/admin/users/": () =>
      Response.json(pageOf([ana, bruno], { pageSize: 100 })),
    "GET /api/tags/": () => Response.json(pageOf([home, work], { pageSize: 100 })),
    "GET /api/admin/todos/": ({ searchParams }) => {
      const owner = searchParams.get("owner");
      const tag = searchParams.get("tag");
      const completed = searchParams.get("completed");
      const rows = todos.filter(
        (candidate) =>
          (owner === null || String(candidate.owner.id) === owner) &&
          (tag === null ||
            candidate.tags.some((candidateTag) => String(candidateTag.id) === tag)) &&
          (completed === null || String(candidate.completed) === completed),
      );
      return Response.json(pageOf(rows));
    },
  });
}

function lastTodoRequest(server: ReturnType<typeof mockServer>) {
  return server.requestsTo("GET /api/admin/todos/").at(-1)?.searchParams;
}

function rowOf(title: string) {
  return screen.getByRole("rowheader", { name: title }).closest("tr") as HTMLElement;
}

function rowTitles() {
  return screen.getAllByRole("rowheader").map((header) => header.textContent);
}

async function choose(filter: string, optionName: string) {
  const select = screen.getByRole("combobox", { name: filter });
  const option = await within(select).findByRole("option", { name: optionName });
  fireEvent.change(select, {
    target: { value: (option as HTMLOptionElement).value },
  });
}

beforeEach(() => {
  resetNavigation();
  navigation.pathname = "/todos";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TodoTable: the table", () => {
  it("lists the todos of all users with the title, the owner, the tags, completed or not, and the date of the last change", async () => {
    adminServer([buyMilk, sendReport, readBook]);

    renderWithProviders(<TodoTable />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Todos of all users" }),
    ).toBeInTheDocument();
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Title", "Owner", "Tags", "Completed", "Last change"]);
    expect(rowTitles()).toEqual(["Buy milk", "Send the report", "Read a book"]);
    expect(screen.getByText("3 todos")).toBeInTheDocument();

    const milkCells = within(rowOf("Buy milk")).getAllByRole("cell");
    expect(milkCells[0]).toHaveTextContent("Ana Lima");
    expect(milkCells[0]).toHaveTextContent("ana.lima@example.com");
    expect(milkCells[1]).toHaveTextContent("Home");
    expect(milkCells[1].querySelector('[data-slot="tag-color"]')).toHaveStyle({
      backgroundColor: "#2E7D32",
    });
    expect(milkCells[2]).toHaveTextContent("Not completed");
    expect(milkCells[3]).toHaveTextContent("Nov 15, 2026, 5:40 PM");

    const reportCells = within(rowOf("Send the report")).getAllByRole("cell");
    expect(reportCells[0]).toHaveTextContent("Bruno Reis");
    expect(reportCells[2]).toHaveTextContent("Completed");
    expect(reportCells[3]).toHaveTextContent("Nov 13, 2026, 8:05 AM");
    expect(within(rowOf("Read a book")).getAllByRole("cell")[1]).toHaveTextContent(
      "No tags",
    );
  });

  it("is read-only: no row has a button, a link or a field, and only GET requests are sent", async () => {
    const server = adminServer([buyMilk, sendReport]);

    renderWithProviders(<TodoTable />);

    const table = await screen.findByRole("table");
    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
    expect(within(table).queryByRole("link")).not.toBeInTheDocument();
    expect(within(table).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(table).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(server.requests.every((request) => request.method === "GET")).toBe(
      true,
    );
  });
});

describe("TodoTable: the three states", () => {
  it("says that the table is loading", () => {
    const server = adminServer([]);
    server.use({
      "GET /api/admin/todos/": () => new Promise<Response>(() => {}),
    });

    renderWithProviders(<TodoTable />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the todos.");
  });

  it("says that there are no todos", async () => {
    adminServer([]);

    renderWithProviders(<TodoTable />);

    expect(await screen.findByText("There are no todos yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says that no todo matches when a filter is on", async () => {
    adminServer([buyMilk]);
    navigation.search = "completed=true";

    renderWithProviders(<TodoTable />);

    expect(
      await screen.findByText("No todo matches these filters."),
    ).toBeInTheDocument();
  });

  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = adminServer([buyMilk]);
    server.use({ "GET /api/admin/todos/": noAnswer });

    renderWithProviders(<TodoTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the todos.",
    );

    server.use({
      "GET /api/admin/todos/": () => Response.json(pageOf([buyMilk])),
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("rowheader", { name: "Buy milk" }),
    ).toBeInTheDocument();
  });

  it("says that the server failed when the user is not an admin (status 403)", async () => {
    const server = adminServer([buyMilk]);
    const refused = () =>
      Response.json({ detail: "No permission." }, { status: 403 });
    server.use({
      "GET /api/admin/todos/": refused,
      "GET /api/admin/users/": refused,
    });

    renderWithProviders(<TodoTable />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the todos.",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("TodoTable: the filters", () => {
  it("has a filter by owner, by tag and by completed, each with its choices", async () => {
    adminServer([buyMilk]);

    renderWithProviders(<TodoTable />);
    await screen.findByRole("table");

    const filters = screen.getByRole("search", { name: "Filters of the todos" });
    const optionsOf = (name: string) =>
      within(within(filters).getByRole("combobox", { name }))
        .getAllByRole("option")
        .map((option) => option.textContent);
    await waitFor(() =>
      expect(optionsOf("Owner")).toEqual([
        "All owners",
        "Ana Lima (ana.lima@example.com)",
        "Bruno Reis (bruno.reis@example.com)",
      ]),
    );
    await waitFor(() =>
      expect(optionsOf("Tag")).toEqual(["All tags", "Home", "Work"]),
    );
    expect(optionsOf("Completed or not")).toEqual([
      "Completed and not completed",
      "Not completed",
      "Completed",
    ]);
  });

  it("filters by owner, and keeps the owner in the address", async () => {
    const server = adminServer([buyMilk, sendReport, readBook]);
    renderWithProviders(<TodoTable />);
    await screen.findByRole("table");

    await choose("Owner", "Bruno Reis (bruno.reis@example.com)");

    expect(navigation.search).toBe("owner=5");
    await waitFor(() =>
      expect(rowTitles()).toEqual(["Send the report", "Read a book"]),
    );
    expect(lastTodoRequest(server)?.get("owner")).toBe("5");
    expect(screen.getByText("2 todos")).toBeInTheDocument();
  });

  it("filters by tag, and keeps the tag in the address", async () => {
    const server = adminServer([buyMilk, sendReport, readBook]);
    renderWithProviders(<TodoTable />);
    await screen.findByRole("table");

    await choose("Tag", "Home");

    expect(navigation.search).toBe("tag=2");
    await waitFor(() => expect(rowTitles()).toEqual(["Buy milk"]));
    expect(lastTodoRequest(server)?.get("tag")).toBe("2");
    expect(screen.getByText("1 todo")).toBeInTheDocument();
  });

  it("filters by completed and by not completed, and keeps the choice in the address", async () => {
    const server = adminServer([buyMilk, sendReport, readBook]);
    renderWithProviders(<TodoTable />);
    await screen.findByRole("table");

    await choose("Completed or not", "Completed");

    expect(navigation.search).toBe("completed=true");
    await waitFor(() => expect(rowTitles()).toEqual(["Send the report"]));
    expect(lastTodoRequest(server)?.get("completed")).toBe("true");

    await choose("Completed or not", "Not completed");

    expect(navigation.search).toBe("completed=false");
    await waitFor(() => expect(rowTitles()).toEqual(["Buy milk", "Read a book"]));
  });

  it("uses several filters together, and removes one with its first choice", async () => {
    const server = adminServer([buyMilk, sendReport, readBook]);
    renderWithProviders(<TodoTable />);
    await screen.findByRole("table");

    await choose("Owner", "Bruno Reis (bruno.reis@example.com)");
    await choose("Completed or not", "Not completed");

    expect(navigation.search).toBe("owner=5&completed=false");
    await waitFor(() => expect(rowTitles()).toEqual(["Read a book"]));
    expect(lastTodoRequest(server)?.get("owner")).toBe("5");
    expect(lastTodoRequest(server)?.get("completed")).toBe("false");

    await choose("Owner", "All owners");

    expect(navigation.search).toBe("completed=false");
    await waitFor(() => expect(rowTitles()).toEqual(["Buy milk", "Read a book"]));
  });

  it("reads the filters from the address: the request and the three fields have them", async () => {
    const server = adminServer([buyMilk, sendReport, readBook]);
    navigation.search = "owner=5&tag=1&completed=true";

    renderWithProviders(<TodoTable />);

    await waitFor(() => expect(rowTitles()).toEqual(["Send the report"]));
    const searchParams = server.requestsTo("GET /api/admin/todos/")[0].searchParams;
    expect(searchParams.get("owner")).toBe("5");
    expect(searchParams.get("tag")).toBe("1");
    expect(searchParams.get("completed")).toBe("true");
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Owner" })).toHaveValue("5"),
    );
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Tag" })).toHaveValue("1"),
    );
    expect(screen.getByRole("combobox", { name: "Completed or not" })).toHaveValue(
      "true",
    );
  });

  it("ignores a filter value in the address that is not valid", async () => {
    const server = adminServer([buyMilk]);
    navigation.search = "owner=abc&completed=maybe&page=-2";

    renderWithProviders(<TodoTable />);

    await screen.findByRole("table");
    const searchParams = server.requestsTo("GET /api/admin/todos/")[0].searchParams;
    expect(searchParams.get("owner")).toBeNull();
    expect(searchParams.get("completed")).toBeNull();
    expect(searchParams.get("page")).toBe("1");
  });
});

describe("TodoTable: the pages", () => {
  function pagedServer() {
    const server = adminServer([]);
    server.use({
      "GET /api/admin/todos/": ({ searchParams }) => {
        const page = Number(searchParams.get("page") ?? 1);
        if (page > 3) {
          return Response.json({ detail: "Invalid page." }, { status: 404 });
        }
        return Response.json(
          pageOf([todo({ id: page, title: `Todo of page ${page}` })], {
            count: 45,
            page,
            totalPages: 3,
          }),
        );
      },
    });
    return server;
  }

  it("shows the number of the page, and moves to the next page and back", async () => {
    const server = pagedServer();
    renderWithProviders(<TodoTable />);

    expect(await screen.findByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("45 todos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(
      await screen.findByRole("rowheader", { name: "Todo of page 2" }),
    ).toBeInTheDocument();
    expect(navigation.search).toBe("page=2");
    expect(lastTodoRequest(server)?.get("page")).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(
      await screen.findByRole("rowheader", { name: "Todo of page 1" }),
    ).toBeInTheDocument();
    expect(navigation.search).toBe("page=1");
  });

  it("reads the page from the address, and turns Next page off on the last page", async () => {
    pagedServer();
    navigation.search = "page=3";

    renderWithProviders(<TodoTable />);

    expect(await screen.findByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("goes back to the first page when a filter changes", async () => {
    const server = pagedServer();
    navigation.search = "page=2";
    renderWithProviders(<TodoTable />);
    await screen.findByText("Page 2 of 3");

    await choose("Completed or not", "Completed");

    expect(navigation.search).toBe("completed=true");
    await waitFor(() => expect(lastTodoRequest(server)?.get("page")).toBe("1"));
  });

  it("shows the first page when the page of the address does not exist", async () => {
    pagedServer();
    navigation.search = "page=9";

    renderWithProviders(<TodoTable />);

    expect(
      await screen.findByRole("rowheader", { name: "Todo of page 1" }),
    ).toBeInTheDocument();
    expect(navigation.search).toBe("");
  });

  it("has no page buttons when the list has one page", async () => {
    adminServer([buyMilk]);

    renderWithProviders(<TodoTable />);

    await screen.findByRole("table");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("TodoTable: Portuguese", () => {
  it("shows the Portuguese texts and the date in the Portuguese format", async () => {
    adminServer([buyMilk]);

    renderWithProviders(<TodoTable />, "pt-BR");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tarefas de todos os usuários",
      }),
    ).toBeInTheDocument();
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Título", "Dono", "Etiquetas", "Concluída", "Última alteração"]);
    const cells = within(rowOf("Buy milk")).getAllByRole("cell");
    expect(cells[2]).toHaveTextContent("Não concluída");
    expect(cells[3]).toHaveTextContent("15 de nov. de 2026, 17:40");
    expect(screen.getByText("1 tarefa")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Dono" })).toBeInTheDocument();
  });
});
