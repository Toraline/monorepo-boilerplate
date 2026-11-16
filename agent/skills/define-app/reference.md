# define-app: shapes

Used by `SKILL.md` in this folder. Replace every `<placeholder>`. Write the texts in the profile's `output_language`.

## Definition ticket

Title: `Define the app: <App name>`. One definition ticket per app, inside the app's project.

The skill finds the questions by these fixed parts. Keep them exactly:

- the line `Ticket type: app-definition` (Linear may put the value inside backticks);
- the heading `## Questions`;
- one numbered item per question, and under it one line that starts with `Answer:` after its bullet. Linear may rewrite the bullet `-` as `*` and change the indent or the spacing of the numbers; that changes nothing;
- the text `Answer: Not answered` for a question that is still open;
- the headings `## Approved model` and `## Done when`.

```markdown
## Goal

Model and define <App name> before any code is written. This ticket is done when every question below has an answer, the approved model is written in this ticket, and the project has its milestones and its first plan tickets.

Ticket type: `app-definition`. Process it with the skill `/define-app`.

## What is already known

<Two or three lines, or a pointer to the project description. Name each source.>

## Questions

Each question has one answer line. "Not answered" means it is still open.

### Purpose and users

1. In one sentence, what problem does <App name> solve?
   - Answer: Not answered
2. Who uses version 1: only you, people you invite, or anyone?
   - Answer: Not answered
3. Is version 1 a personal tool, or a product to launch?
   - Answer: Not answered

### Scope of version 1

4. Which 3 to 5 things must a user be able to do in version 1?
   - Answer: Not answered
5. What is explicitly not in version 1?
   - Answer: Not answered
6. Is there existing code, a design or a document to reuse or replace?
   - Answer: Not answered

### Data

7. Which main things does the app store?
   - Answer: Not answered
8. Does it store sensitive data? Where may that data live?
   - Answer: Not answered

### Platform

9. Which apps does version 1 need: web, mobile, an internal app, an API?
   - Answer: Not answered
10. Where does the code live: inside an existing monorepo, or its own repository?
    - Answer: Not answered
11. Does version 1 need login? One user or several?
    - Answer: Not answered

### Integrations

12. Which outside services does version 1 connect to?
    - Answer: Not answered

### Delivery

13. Which milestones, in order?
    - Answer: Not answered
14. What must work for the first real use?
    - Answer: Not answered
15. What is its priority against the other projects?
    - Answer: Not answered

### Only for <App name>

16. <A question that only this app needs. Give the options when there are known ones.>
    - Answer: Not answered

## Approved model

Not written yet.

## Done when

- [ ] Every question has an answer.
- [ ] The approved model is written in this ticket and you said yes to it.
- [ ] The project has milestones.
- [ ] The first plan tickets exist in the project.
```

### Questions needed for the model

The model cannot be written while one of these is `Not answered` or `Open`: 1, 2, 4, 5, 7, 9, 10, 13. Every other question may stay `Open`; it is then listed in the model under "Open questions".

### Answer lines

| State | Text of the line |
|---|---|
| Not asked yet | `Answer: Not answered` |
| Answered | `Answer: <the person's answer> (<YYYY-MM-DD>)` |
| The person does not know yet | `Answer: Open - <what is missing>` |

## Approved model

Goes in the definition ticket under `## Approved model`. Before approval, the same shape is the proposal.

```markdown
## Approved model

Approved on <YYYY-MM-DD> by <who approved, as the person states it>.

### What the app is
Two or three sentences: the problem, who uses it, personal tool or product.

### Version 1
- A user can: <the 3 to 5 things, one per line>.
- Not in version 1: <list>.
- First real use: <what must work>.

### Users and access
| Who | Can do | Login |
|---|---|---|

### Main data
| Thing | What it is, in plain words | Sensitive | Where it lives |
|---|---|---|---|

### Platform
- Apps: <web / mobile / internal app / API>.
- Code lives in: <repository and folder>.
- Reused or replaced: <existing code, design, documents>.

### Integrations
| Service | What for | Version |
|---|---|---|

### Relation to other apps
| App or project | Relation |
|---|---|

### Milestones
1. <Name>: <what a user can do when it is delivered>.
2. ...

### Open questions
- <Number and question>: <what is missing>.

### Changes
- <YYYY-MM-DD>: <what changed in the model after approval, and why>
```

## Milestone

- Name: `M<n> <short name>`, in delivery order.
- Description: one sentence, what a user can do when it is delivered.
- No target date unless the person gives one.

## Plan ticket

Title: a short action, for example `Model the data of recipes and menus`. Created in the app's project, in its milestone.

```markdown
## Goal
<One or two sentences: what exists when this ticket is done.>

## From the approved model
<The lines of the model this ticket delivers. Link the definition ticket.>

## Acceptance criteria
- [ ] <One thing that can be checked.>

## Not in this ticket
- <What is left for another ticket.>
```

## Delivery plan

Goes in the definition ticket under `## Delivery plan`, after the plan tickets exist.

```markdown
## Delivery plan

| Order | Milestone | Ticket | What it delivers |
|---|---|---|---|
| 1 | M1 <name> | <PREFIX>-<n> | <one line> |
```
