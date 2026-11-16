# Working pattern

The flow of one piece of work, in order. Each step is one skill. Each skill ends by naming the next one.

| # | Step | Skill | What exists after it |
|---|---|---|---|
| 1 | Decide what to do now | `/start` | You know which skill to run |
| 2 | Plan the week | `/plan-cycle`, then `/cycle-mode` each day | A cycle plan with estimates |
| 3 | Understand the ticket | `/refine-ticket` | A discovery file: what exists, what is new, what is unclear |
| 4 | Write the instruction | `/create-spec` | The spec, in the Linear ticket and in the local tracking file |
| 5 | Build | `/execute-spec` | A worktree, a branch, the change, the checks passing |
| 6 | Check your own change | `/review-diff` | A list of problems, or none |
| 7 | Save | `/commit` | One commit in the profile's format |
| 8 | Publish | `/open-pr` | A pull request, reviewed against the ticket |
| 9 | Handle review | `/validate-comments`, then `/fix-pr` | Every comment checked, the confirmed ones fixed |
| 10 | Ship | `/release` | A release ticket and pull request text |

Stopped in the middle: `/continue <ticket>` reads the ticket's folder and says what is left.

## Fixed rules

1. Always in a worktree: `make worktree TICKET=<n> SLUG=<short-slug>`. All related work (a parent ticket, or several parent tickets that build one thing) has one worktree, one branch and one pull request; each sub-ticket is one commit on it. No stacked branches unless the person asks. When the branch is merged, the agent removes the worktree.
2. Inside a parent ticket, the agent goes from one sub-ticket to the next without asking. It decides open technical choices, writes them in `docs/decisions.md` and lists them in the pull request.
3. The person reviews the feature branch at the end, in the pull request. The agent never merges it.
4. Linear is the source of truth for a ticket. The local files in `local-docs/notes/` track the data and the linked tickets.
5. A new module needs an approved model before any code (`/new-module`). It copies the structure of the model module. When the file `docs/workflow/module-model.md` exists, it names the model module. In this repository the model is the todo product: [module-model.md](module-model.md).
6. A new app needs an approved definition before its first tickets (`/define-app`). The definition lives in one ticket titled `Define the app: <name>`. The skeleton of a new app copies an existing app (`/new-app`).
7. The rules in `agent/rules/` apply to every step.
8. When the agent's work on a ticket is finished, the ticket moves to the profile's `finished_status` (default `Needs QA`). An agent never moves a ticket to done by itself.
9. Before a commit, the profile's `check_command` must pass. In this repository it is `make check`: `make lint`, then `make test`, then `make build`. The same command runs on GitHub on each pull request to `main`, followed by the end-to-end tests (`make e2e`).
10. Each worktree has its own database. Start it with `make db-up` inside the worktree. Before `make worktree-remove`, run `make db-destroy CONFIRM=yes` inside the worktree.

## Words

| Word | Meaning |
|---|---|
| ticket | One unit of work in Linear |
| parent ticket | A ticket that groups sub-tickets |
| feature | A named area of work that can hold several tickets |
| spec | The instruction an agent executes for one ticket |
| cycle | One week of planned work |
| log | Append-only record of what happened, newest first |
| decisions | Dated list of decisions |
| open questions | Things not decided yet |
