import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mockServer, noAnswer, pageOf } from "@repo/shared/testing";

import { renderWithProviders } from "@/test/render";

import type { TagWithCount } from "../api/tags";
import { TagManager } from "./tag-manager";

const home: TagWithCount = { id: 2, name: "Home", color: "#2E7D32", todoCount: 3 };
const urgent: TagWithCount = {
  id: 3,
  name: "Urgent",
  color: "#C62828",
  todoCount: 1,
};
const work: TagWithCount = { id: 1, name: "Work", color: "#1565C0", todoCount: 0 };

/** A small server that keeps the tags and refuses a name that exists, as the real one. */
function tagServer(initialTags: TagWithCount[]) {
  let tags = [...initialTags];
  const nameExists = (name: string, ownId?: number) =>
    tags.some(
      (candidate) =>
        candidate.id !== ownId &&
        candidate.name.toLowerCase() === name.trim().toLowerCase(),
    );
  const refused = () =>
    Response.json(
      { name: ["A tag with this name already exists."] },
      { status: 400 },
    );

  return mockServer({
    "GET /api/tags/": () => Response.json(pageOf(tags, { pageSize: 100 })),
    "POST /api/tags/": ({ body }) => {
      const input = body as { name: string; color: string };
      if (nameExists(input.name)) {
        return refused();
      }
      const created = { id: 99, ...input };
      tags = [...tags, { ...created, todoCount: 0 }];
      return Response.json(created, { status: 201 });
    },
    "PATCH /api/tags/2/": ({ body }) => {
      const input = body as { name: string; color: string };
      if (nameExists(input.name, 2)) {
        return refused();
      }
      tags = tags.map((candidate) =>
        candidate.id === 2 ? { ...candidate, ...input } : candidate,
      );
      return Response.json({ id: 2, ...input });
    },
    "DELETE /api/tags/2/": () => {
      tags = tags.filter((candidate) => candidate.id !== 2);
      return new Response(null, { status: 204 });
    },
  });
}

/** A press of a button as a person does it: the button gets the focus first. */
function press(button: HTMLElement) {
  button.focus();
  fireEvent.click(button);
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function rowOf(name: string) {
  return screen.getByRole("rowheader", { name }).closest("tr") as HTMLElement;
}

const COLOR_LABEL = "Color, in the form #RRGGBB";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TagManager: the list and its states", () => {
  it("lists the tags, each with its name, its color and the number of todos that use it", async () => {
    tagServer([home, urgent, work]);

    renderWithProviders(<TagManager />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Tags" }),
    ).toBeInTheDocument();
    await screen.findByRole("table");
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual(["Name", "Color", "Todos that use it", "Actions"]);
    const cells = within(rowOf("Home")).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("#2E7D32");
    expect(cells[0].querySelector('[data-slot="tag-color"]')).toHaveStyle({
      backgroundColor: "#2E7D32",
    });
    expect(cells[1]).toHaveTextContent("3");
    expect(within(rowOf("Work")).getAllByRole("cell")[1]).toHaveTextContent("0");
    expect(screen.getAllByRole("rowheader")).toHaveLength(3);
  });

  it("says that the list is loading", () => {
    mockServer({ "GET /api/tags/": () => new Promise<Response>(() => {}) });

    renderWithProviders(<TagManager />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading the tags.");
  });

  it("says that there are no tags", async () => {
    tagServer([]);

    renderWithProviders(<TagManager />);

    expect(await screen.findByText("There are no tags yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says that the server failed, and asks again on a press of the button", async () => {
    const server = mockServer({ "GET /api/tags/": noAnswer });

    renderWithProviders(<TagManager />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the tags.",
    );

    server.use({ "GET /api/tags/": () => Response.json(pageOf([home])) });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("rowheader", { name: "Home" })).toBeInTheDocument();
  });

  it("says that the server failed when the user may not see the list (status 403)", async () => {
    mockServer({
      "GET /api/tags/": () =>
        Response.json({ detail: "No permission." }, { status: 403 }),
    });

    renderWithProviders(<TagManager />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server did not return the tags.",
    );
  });
});

describe("TagManager: create", () => {
  it("creates a tag with a name and a color", async () => {
    const server = tagServer([home]);
    renderWithProviders(<TagManager />);
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "New tag" }));
    const dialog = screen.getByRole("dialog", { name: "New tag" });
    expect(within(dialog).getByLabelText("Name")).toHaveFocus();
    type("Name", " Garden ");
    type(COLOR_LABEL, "#00897b");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("rowheader", { name: "Garden" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("POST /api/tags/")[0].body).toEqual({
      name: "Garden",
      color: "#00897B",
    });
  });

  it("fills the color field from the color control", async () => {
    const server = tagServer([]);
    renderWithProviders(<TagManager />);
    await screen.findByText("There are no tags yet.");

    fireEvent.click(screen.getByRole("button", { name: "New tag" }));
    type("Name", "Garden");
    fireEvent.change(screen.getByLabelText("Choose the color"), {
      target: { value: "#00897b" },
    });
    expect(screen.getByLabelText(COLOR_LABEL)).toHaveValue("#00897B");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("rowheader", { name: "Garden" });
    expect(server.requestsTo("POST /api/tags/")[0].body).toEqual({
      name: "Garden",
      color: "#00897B",
    });
  });

  it("shows a message on the name field for a name that already exists", async () => {
    const server = tagServer([home]);
    renderWithProviders(<TagManager />);
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "New tag" }));
    type("Name", "home");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
        "A tag with this name already exists.",
      ),
    );
    expect(screen.getByLabelText("Name")).toBeInvalid();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(server.requestsTo("POST /api/tags/")).toHaveLength(1);
    expect(screen.getAllByRole("rowheader")).toHaveLength(1);
  });

  it("shows a message on each wrong field and sends nothing", async () => {
    const server = tagServer([]);
    renderWithProviders(<TagManager />);
    await screen.findByText("There are no tags yet.");

    fireEvent.click(screen.getByRole("button", { name: "New tag" }));
    type(COLOR_LABEL, "blue");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
      "Type a name.",
    );
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(screen.getByLabelText(COLOR_LABEL)).toHaveAccessibleDescription(
      "The color must have the form #RRGGBB, for example #1A2B3C.",
    );
    expect(server.requestsTo("POST /api/tags/")).toHaveLength(0);
  });

  it("keeps the dialog open and says that the tag was not saved when the server fails", async () => {
    const server = tagServer([]);
    server.use({ "POST /api/tags/": noAnswer });
    renderWithProviders(<TagManager />);
    await screen.findByText("There are no tags yet.");

    fireEvent.click(screen.getByRole("button", { name: "New tag" }));
    type("Name", "Garden");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The tag was not saved. Try again.",
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Garden");
  });
});

describe("TagManager: edit", () => {
  it("renames a tag and changes its color: the form starts with the values of the tag", async () => {
    const server = tagServer([home, work]);
    renderWithProviders(<TagManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit: Home" }));
    const dialog = screen.getByRole("dialog", { name: "Edit tag" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Home");
    expect(within(dialog).getByLabelText(COLOR_LABEL)).toHaveValue("#2E7D32");
    type("Name", "House");
    type(COLOR_LABEL, "#6A1B9A");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("rowheader", { name: "House" }),
    ).toBeInTheDocument();
    expect(within(rowOf("House")).getAllByRole("cell")[0]).toHaveTextContent(
      "#6A1B9A",
    );
    expect(server.requestsTo("PATCH /api/tags/2/")[0].body).toEqual({
      name: "House",
      color: "#6A1B9A",
    });
  });

  it("shows a message on the name field when the new name is the name of another tag", async () => {
    tagServer([home, work]);
    renderWithProviders(<TagManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Edit: Home" }));
    type("Name", "Work");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Name")).toHaveAccessibleDescription(
        "A tag with this name already exists.",
      ),
    );
  });

  it("closes the form on Cancel, changes nothing, and returns the focus to the Edit button", async () => {
    const server = tagServer([home]);
    renderWithProviders(<TagManager />);

    press(await screen.findByRole("button", { name: "Edit: Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("PATCH /api/tags/2/")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Edit: Home" })).toHaveFocus();
  });
});

describe("TagManager: delete", () => {
  it("asks for a confirmation that says how many todos use the tag", async () => {
    const server = tagServer([home, urgent, work]);
    renderWithProviders(<TagManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete: Home" }));

    const dialog = screen.getByRole("dialog", { name: 'Delete the tag "Home"?' });
    expect(dialog).toHaveTextContent("3 todos use this tag.");
    expect(dialog).toHaveTextContent(
      "The todos stay, without the tag. This cannot be undone.",
    );
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(server.requestsTo("DELETE /api/tags/2/")).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("rowheader", { name: "Home" })).toBeInTheDocument();
    expect(server.requestsTo("DELETE /api/tags/2/")).toHaveLength(0);
  });

  it("says 1 todo for one todo and no todo for none", async () => {
    tagServer([urgent, work]);
    renderWithProviders(<TagManager />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Delete: Urgent" }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("1 todo uses this tag.");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Delete: Work" }));
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "No todo uses this tag.",
    );
  });

  it("deletes the tag after the confirmation, and moves the focus to the New tag button", async () => {
    const server = tagServer([home, work]);
    renderWithProviders(<TagManager />);

    press(await screen.findByRole("button", { name: "Delete: Home" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("rowheader", { name: "Home" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(server.requestsTo("DELETE /api/tags/2/")).toHaveLength(1);
    expect(screen.getByRole("rowheader", { name: "Work" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New tag" })).toHaveFocus();
  });

  it("keeps the dialog open and says that the tag was not deleted when the server fails", async () => {
    const server = tagServer([home]);
    server.use({ "DELETE /api/tags/2/": noAnswer });
    renderWithProviders(<TagManager />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete: Home" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The tag was not deleted. Try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("TagManager: Portuguese", () => {
  it("shows the Portuguese texts on a Portuguese page", async () => {
    tagServer([home]);

    renderWithProviders(<TagManager />, "pt-BR");

    expect(
      screen.getByRole("heading", { level: 1, name: "Etiquetas" }),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir: Home" }));
    const dialog = screen.getByRole("dialog", {
      name: 'Excluir a etiqueta "Home"?',
    });
    expect(dialog).toHaveTextContent("3 tarefas usam esta etiqueta.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    fireEvent.click(screen.getByRole("button", { name: "Nova etiqueta" }));
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
  });
});
