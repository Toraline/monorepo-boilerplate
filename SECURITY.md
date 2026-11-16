# Security

How to report a vulnerability in this repository, and what happens after a report.

## Context you need before reading

- **Vulnerability**: a mistake in the code that lets a person read, change or break something that they must not.
- **This repository**: `Toraline/monorepo-boilerplate`. It holds a template (a server, two web apps, scripts, workflows) and the two npm commands `create-toraline-monorepo` and `update-toraline-monorepo`.
- **Private vulnerability reporting**: a form of GitHub. Only the maintainers of the repository can read what you write in it.

## Report a vulnerability

Do not open a public issue or a public pull request for a vulnerability. Everyone can read them.

1. Open https://github.com/Toraline/monorepo-boilerplate/security/advisories/new. The same form is on the page of the repository: the tab **Security**, then the button **Report a vulnerability**.
2. Write what you found:
   - the file and the line, or the command and its arguments;
   - the steps that show the problem;
   - what an attacker could do with it;
   - the version: the content of the file `boilerplate/VERSION`, or the output of `npx create-toraline-monorepo --version`.
3. Press **Submit report**.

Never put a real key, a real password or real personal data into a report. An invented value is enough to show a problem.

## What happens next

- One person maintains this repository in their free time. There is no promised answer time.
- The maintainer answers in the report on GitHub, and asks there when something is not clear.
- A fix is released as a new version of the boilerplate. The release has an update of the kind `security` in the folder `boilerplate/updates/`. A project that was created from the boilerplate gets the fix with `npx update-toraline-monorepo` ([docs/update-a-monorepo.md](docs/update-a-monorepo.md)).
- The report is made public after the fix is released, with your name when you want that.

## Which versions get a fix

Only the newest release. The two commands always use the newest release of the boilerplate.

## What is not in scope

- **A project that was created from the boilerplate.** Report a problem of such a project to its owner. Report it here only when the same problem is in the files of this repository.
- **A package that this repository uses**, for example Django or Next.js. Report it to the maintainers of that package. You can still tell us, so that the version here is raised.
- **The sample values.** The passwords and the key in `.env.example` start with `sample-`. They are invented, they work only on a local machine, and the server refuses them when `DJANGO_DEBUG` is not `True`.
