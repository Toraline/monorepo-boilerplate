# e2e-test: file layouts

The layouts that `SKILL.md` points to. Both files follow `agent/rules/writing.md` and use the profile's `output_language`. Dates use the person's local time zone.

## e2e-investigation.md

Saved in the ticket's notes folder at the end of phase 1.

1. **Context you need before reading:** each term the file uses, one line each.
2. **Header:** ticket link, feature area, date, where the end-to-end tests live, the command that runs one test.
3. **Flows:** one table per flow. Columns: step, route, action, expected result. The first flow is the normal path.
4. **Preconditions:** feature flags and their values, the role each flow needs, the data that must exist.
5. **Test data:** a table. Columns: role or kind of data, name in the seed or fixture files, file path, exists or must be added. No passwords.
6. **Existing tests and helpers:** tests of the same area, and helpers that can be reused.
7. **Elements:** a table. Columns: element, visible text or label, how the test finds it.
8. **Environments:** only when the project runs the tests against more than one. One row per environment: what it must contain, what is missing, how to create it.
9. **Notes:** things that make the flow hard to test, for example a flag, a slow step or a flow with several screens.
10. **Status:** Done / Not done / What you must do.

## e2e-pr.md

The text of the pull request, saved in the ticket's notes folder in phase 3. If the repository has a pull request template, fill that template and add the sections below that it lacks.

1. **Ticket:** the ticket id with its link.
2. **Summary:** the test files, configuration files and helpers added or changed.
3. **Test cases:** a table. Columns: number, test, what it verifies.
4. **Test data:** the fixtures the test uses, by name. No passwords.
5. **Preconditions:** feature flags and data that must exist where the test runs.
6. **What the test changes:** what it creates or modifies, and how it removes it afterwards.
7. **How to run:** the project's command for this test.
