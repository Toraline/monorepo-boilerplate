---
name: context-dump
description: Writes a quick map of one feature area with its files, data flow, patterns, feature flags and recent changes. Use when the user says "give me context on <feature>", "map this area", "how does <feature> work" or "/context-dump".
disable-model-invocation: true
metadata:
  pack: team
  stage: Team
---

# Context dump

Maps one feature area of the code so a person or an agent can start work in it. It leaves one report file. It is read-only: it changes no code.

## Input

A feature keyword or a path: `/context-dump <feature>`.

Optional: `--deep` adds every consumer of the area's code, the full history and the open questions.

## Reads

- Project profile in `AGENTS.md`: `packs`, `ticket_prefix`, `output_language`.
- `agent/rules/writing.md`, `agent/rules/ask-first.md`.
- `docs/workflow/sources-of-truth.md` for where notes are saved.
- The project's shared documentation in `docs/`, for the architecture and the folder layout.
- `local-docs/notes/<feature>/` when it exists: `overview.md` and the ticket folders.

## Steps

1. Run `scripts/profile.sh get packs`. If the value does not include `team`, say "The team pack is off for this project." and stop.
2. If the keyword matches more than one area, list the matches and ask which one. One question, then wait.
3. Learn the project's layout from `docs/` and the top-level folders. Do not assume folder names.
4. Find the files of the feature. Search file names and file contents for the keyword and its variants. Group what you find:
   - entry points a user reaches: pages, screens, routes, commands;
   - interface parts: components, state, data fetching;
   - server: API handlers, services, jobs;
   - data: tables, models, migrations;
   - shared code the feature uses from other areas;
   - tests;
   - documentation.
5. Trace the data flow of each entry point, from what the user does to where the data is stored, one line per layer with the file path.
6. List the patterns the area uses: how it fetches data, how it handles state, how it reports errors, which shared helpers it calls.
7. List each feature flag that changes the behaviour of the area: name, where it is read, what it turns on.
8. List recent activity:
   - last 20 commits: `git log --oneline -20 --format='%h %ad %an %s' --date=short -- <paths>`;
   - open pull requests: `gh pr list --search "<feature>" --state open --json number,title,author,url`;
   - tickets in Linear that mention the feature. Without Linear access, write "Linear not read".
9. With `--deep`, also:
   - list every file outside the area that imports or calls the area's code;
   - read the earlier notes for the feature in `local-docs/notes/`;
   - list what could not be decided from the code alone, under "Open questions".
10. Save the report (see Output). Print the file path and a summary of 5 lines at most.

## Output

The file `local-docs/notes/reports/context-dump-<feature>-<YYYY-MM-DD>.md`, in the profile's `output_language`, in the shape that `agent/rules/writing.md` requires for a saved document. The date uses the person's local time zone. Sections, in this order:

1. File map: one table per group from step 4, with type and path.
2. Data flow: one numbered list per entry point.
3. Patterns.
4. Feature flags.
5. Recent changes: commits with date and author.
6. Open pull requests.
7. Related tickets and related documents.
8. With `--deep`: consumers outside the area, earlier notes, open questions.

Then a fixed report in the chat:

- **Done:** the report path and the number of files mapped.
- **Not done:** what could not be read or traced, and why.
- **Next step:** `/refine-ticket <PREFIX>-<n>` when the map was made for a ticket. Otherwise `/start`.

## Do not

- Do not change code, switch branches or run tests.
- Do not post anything to GitHub, Linear or a chat. See `agent/rules/ask-first.md`.
- Do not describe a file you did not open. Write "not read" instead.
- Do not copy secrets or real user data from the code or the database into the report.
