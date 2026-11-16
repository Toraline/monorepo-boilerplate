import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer, pageOf } from "@repo/shared/testing";

import { navigation, resetNavigation } from "@/test/navigation";
import { renderWithProviders } from "@/test/render";

import type { HistoryEntry } from "../api/history";
import { HistoryList } from "./history-list";

vi.mock("next/navigation", async () =>
  (await import("@/test/navigation")).navigationMock(),
);

const ana = { id: 4, name: "Ana Lima", email: "ana.lima@example.com" };
const bruno = { id: 5, name: "Bruno Reis", email: "bruno.reis@example.com" };

function entry(
  values: Partial<HistoryEntry> & { id: number; kind: HistoryEntry["kind"] },
): HistoryEntry {
  return {
    createdAt: "2026-11-15T17:40:00.123456Z",
    todoId: 7,
    todoTitle: "Buy milk",
    todoOwner: ana,
    user: ana,
    ...values,
  };
}

// Newest first, as the server returns them.
const deleted = entry({
  id: 31,
  kind: "deleted",
  createdAt: "2026-11-15T18:05:00.000000Z",
});
const completed = entry({
  id: 20,
  kind: "completed",
  createdAt: "2026-11-15T17:50:00.000000Z",
  todoId: 8,
  todoTitle: "Send the report",
  todoOwner: bruno,
  user: bruno,
});
const created = entry({
  id: 12,
  kind: "created",
  createdAt: "2026-11-14T09:00:00.000000Z",
});
const allEntries = [deleted, completed, created];

/** A small server that filters the entries as the real one does. */
function historyServer(entries: HistoryEntry[]) {
  return mockServer({
    "GET /api/admin/users/": () =>
      Response.json(pageOf([ana, bruno], { pageSize: 100 })),
    "GET /api/admin/history/": ({ searchParams }) => {
      const user = searchParams.get("user");
      const kind = searchParams.get("kind");
      const rows = entries.filter(
        (candidate) =>
          (user === null || String(candidate.user.id) === user) &&
          (kind === null || candidate.kind === kind),
      );
      return Response.json(pageOf(rows));
    },
  });
}

function lastHistoryRequest(server: ReturnType<typeof mockServer>) {
  return server.requestsTo("GET /api/admin/history/").at(-1)?.searchParams;
}

/** The cells of each row of the table, as texts. */
function rows() {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );
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
  navigation.pathname = "/history";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HistoryList: the list", () => {
  it("lists the entries, newest first, with the date, the user, the kind of change and the title of the todo", async () => {
    historyServer(allEntries);

    renderWithProviders(<HistoryList />);

    expect(
      screen.getByRole("heading", { level: 1, name: "History of changes" }),
    ).toBeInTheDocument();
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Date", "User", "Change", "Todo"]);
    expect(rows()).toEqual([
      [
        "Nov 15, 2026, 6:05 PM",
        "Ana Limaana.lima@example.com",
        "Deleted",
        "Buy milk",
      ],
      [
        "Nov 15, 2026, 5:50 PM",
        "Bruno Reisbruno.reis@example.com",
        "Completed",
        "Send the report",
      ],
      [
        "Nov 14, 2026, 9:00 AM",
        "Ana Limaana.lima@example.com",
        "Created",
        "Buy milk",
      ],
    ]);
    expect(screen.getByText("3 changes")).toBeInTheDocument();
  });

  it("still shows the title of a todo that was deleted", async () => {
    historyServer([deleted]);

    renderWithProviders(<HistoryList />);

    await screen.findByRole("table");
    const [dateCell, , kindCell, todoCell] = rows()[0];
    expect(kindCell).toBe("Deleted");
    expect(todoCell).toBe("Buy milk");
    expect(dateCell).toBe("Nov 15, 2026, 6:05 PM");
  });

  it("has a name for each of the 5 kinds of change", async () => {
    historyServer([
      entry({ id: 1, kind: "created" }),
      entry({ id: 2, kind: "edited" }),
      entry({ id: 3, kind: "completed" }),
      entry({ id: 4, kind: "reopened" }),
      entry({ id: 5, kind: "deleted" }),
    ]);

    renderWithProviders(<HistoryList />);

    await screen.findByRole("table");
    expect(rows().map((cells) => cells[2])).toEqual([
      "Created",
      "Edited",
      "Completed",
      "Reopened",
      "Deleted",
    ]);
  });

  it("is read-only: the table has no button, link or field, and only GET requests are sent", async () => {
    const server = historyServer(allEntries);

    renderWithProviders(<HistoryList />);

    const table = await screen.findByRole("table");
    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
    expect(within(table).queryByRole("link")).not.toBeInTheDocument();
    expect(within(table).queryByRole("textbox")).not.toBeInTheDocument();
    expect(server.requests.every((request) => request.method === "GET")).toBe(
      true,
    );
  });
});

describe("HistoryList: the dates", () => {
  it("writes the dates in the English format on an English page", async () => {
    historyServer([created]);

    renderWithProviders(<HistoryList />);

    await screen.findByRole("table");
    expect(rows()[0][0]).toBe("Nov 14, 2026, 9:00 AM");
    expect(screen.getByText("Nov 14, 2026, 9:00 AM")).toHaveAttribute(
      "datetime",
      "2026-11-14T09:00:00.000000Z",
    );
  });

  it("writes the dates in the Portuguese format on a Portuguese page", async () => {
    historyServer([deleted, created]);

    renderWithProviders(<HistoryList />, "pt-BR");

    await screen.findByRole("table");
    expect(rows().map((cells) => cells[0])).toEqual([
      "15 de nov. de 2026, 18:05",
      "14 de nov. de 2026, 09:00",
    ]);
  });
});

describe("HistoryList: the three states", () => {
  it("says that the history is loading", () => {
    const server = historyServer([]);
    server.use({
      "GET /api/admin/history/": () => new Promise<Response>(() => {}),
    });

    renderWithProviders(<HistoryList />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the history.");
  });

  it("says that there are no changes", async () => {
    historyServer([]);

    renderWithProviders(<HistoryList />);

    expect(await screen.findByText("There are no changes yet.")).toBeInTheDocument();
  });

  it("says that no change matches when a filter is on", async () => {
    historyServer([created]);
    navigation.search = "kind=reopened";

    renderWithProviders(<HistoryList />);

    expect(
      await screen.findByText("No change matches these filters."),
    ).toBeInTheDocument();
  });

  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = historyServer([created]);
    server.use({ "GET /api/admin/history/": noAnswer });

    renderWithProviders(<HistoryList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the history.",
    );

    server.use({
      "GET /api/admin/history/": () => Response.json(pageOf([created])),
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });

  it("says that the server failed when the user is not an admin (status 403)", async () => {
    const server = historyServer([created]);
    const refused = () =>
      Response.json({ detail: "No permission." }, { status: 403 });
    server.use({
      "GET /api/admin/history/": refused,
      "GET /api/admin/users/": refused,
    });

    renderWithProviders(<HistoryList />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the history.",
    );
  });
});

describe("HistoryList: the filters", () => {
  it("has a filter by user and by kind of change, each with its choices", async () => {
    historyServer(allEntries);

    renderWithProviders(<HistoryList />);
    await screen.findByRole("table");

    const filters = screen.getByRole("search", { name: "Filters of the history" });
    const optionsOf = (name: string) =>
      within(within(filters).getByRole("combobox", { name }))
        .getAllByRole("option")
        .map((option) => option.textContent);
    await waitFor(() =>
      expect(optionsOf("User")).toEqual([
        "All users",
        "Ana Lima (ana.lima@example.com)",
        "Bruno Reis (bruno.reis@example.com)",
      ]),
    );
    expect(optionsOf("Kind of change")).toEqual([
      "All kinds",
      "Created",
      "Edited",
      "Completed",
      "Reopened",
      "Deleted",
    ]);
  });

  it("filters by user, and keeps the user in the address", async () => {
    const server = historyServer(allEntries);
    renderWithProviders(<HistoryList />);
    await screen.findByRole("table");

    await choose("User", "Bruno Reis (bruno.reis@example.com)");

    expect(navigation.search).toBe("user=5");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0][3]).toBe("Send the report");
    expect(lastHistoryRequest(server)?.get("user")).toBe("5");
    expect(screen.getByText("1 change")).toBeInTheDocument();
  });

  it("filters by kind of change, and keeps the kind in the address", async () => {
    const server = historyServer(allEntries);
    renderWithProviders(<HistoryList />);
    await screen.findByRole("table");

    await choose("Kind of change", "Deleted");

    expect(navigation.search).toBe("kind=deleted");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0][2]).toBe("Deleted");
    expect(lastHistoryRequest(server)?.get("kind")).toBe("deleted");
  });

  it("uses both filters together, and removes one with its first choice", async () => {
    const server = historyServer(allEntries);
    renderWithProviders(<HistoryList />);
    await screen.findByRole("table");

    await choose("User", "Ana Lima (ana.lima@example.com)");
    await choose("Kind of change", "Created");

    expect(navigation.search).toBe("user=4&kind=created");
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(lastHistoryRequest(server)?.get("user")).toBe("4");
    expect(lastHistoryRequest(server)?.get("kind")).toBe("created");

    await choose("Kind of change", "All kinds");

    expect(navigation.search).toBe("user=4");
    await waitFor(() => expect(rows()).toHaveLength(2));
  });

  it("reads the filters from the address, and ignores a kind that does not exist", async () => {
    const server = historyServer(allEntries);
    navigation.search = "user=4&kind=archived";

    renderWithProviders(<HistoryList />);

    await waitFor(() => expect(rows()).toHaveLength(2));
    const searchParams = server.requestsTo("GET /api/admin/history/")[0]
      .searchParams;
    expect(searchParams.get("user")).toBe("4");
    expect(searchParams.get("kind")).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "User" })).toHaveValue("4"),
    );
    expect(screen.getByRole("combobox", { name: "Kind of change" })).toHaveValue(
      "",
    );
  });
});

describe("HistoryList: the pages", () => {
  function pagedServer() {
    const server = historyServer([]);
    server.use({
      "GET /api/admin/history/": ({ searchParams }) => {
        const page = Number(searchParams.get("page") ?? 1);
        if (page > 2) {
          return Response.json({ detail: "Invalid page." }, { status: 404 });
        }
        return Response.json(
          pageOf(
            [entry({ id: page, kind: "edited", todoTitle: `Todo of page ${page}` })],
            { count: 25, page, totalPages: 2 },
          ),
        );
      },
    });
    return server;
  }

  it("shows the number of the page, and moves to the next page and back", async () => {
    const server = pagedServer();
    renderWithProviders(<HistoryList />);

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("25 changes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(await screen.findByText("Todo of page 2")).toBeInTheDocument();
    expect(navigation.search).toBe("page=2");
    expect(lastHistoryRequest(server)?.get("page")).toBe("2");
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));

    expect(await screen.findByText("Todo of page 1")).toBeInTheDocument();
  });

  it("goes back to the first page when a filter changes", async () => {
    const server = pagedServer();
    navigation.search = "page=2";
    renderWithProviders(<HistoryList />);
    await screen.findByText("Page 2 of 2");

    await choose("Kind of change", "Edited");

    expect(navigation.search).toBe("kind=edited");
    await waitFor(() => expect(lastHistoryRequest(server)?.get("page")).toBe("1"));
  });

  it("shows the first page when the page of the address does not exist", async () => {
    pagedServer();
    navigation.search = "page=9";

    renderWithProviders(<HistoryList />);

    expect(await screen.findByText("Todo of page 1")).toBeInTheDocument();
    expect(navigation.search).toBe("");
  });
});

describe("HistoryList: Portuguese", () => {
  it("shows the Portuguese texts on a Portuguese page", async () => {
    historyServer(allEntries);

    renderWithProviders(<HistoryList />, "pt-BR");

    expect(
      screen.getByRole("heading", { level: 1, name: "Histórico de alterações" }),
    ).toBeInTheDocument();
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Data", "Usuário", "Alteração", "Tarefa"]);
    expect(rows().map((cells) => cells[2])).toEqual([
      "Excluída",
      "Concluída",
      "Criada",
    ]);
    expect(screen.getByText("3 alterações")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Tipo de alteração" }),
    ).toBeInTheDocument();
  });
});
