# monorepo-boilerplate: run every command from the repository root.
.DEFAULT_GOAL := help

# The core targets (doctor-core, worktree, worktree-attach, worktree-remove,
# worktree-list, sync-skills, skills-catalog, hooks, local-docs).
# This project has its own doctor target below; it runs the core checks first.
CORE_SKIP_DOCTOR := 1
-include agent/core.mk

# The two npm commands of the boilerplate (cli/): their targets are in
# cli/cli.mk, and "make check" runs them. A monorepo that was created from the
# boilerplate has no cli/ folder; this line then includes nothing.
-include cli/cli.mk

.PHONY: help setup env install doctor run lint test build check e2e protect-main \
        db-up db-wait db-down db-ps db-logs db-destroy db-reset \
        install-js install-api run-api run-web run-internal run-ui-catalog \
        api web internal catalog migrate seed seed-sample format-api \
        lint-shell lint-api lint-web lint-internal lint-ui-catalog lint-shared lint-ui lint-e2e \
        test-api test-web test-internal test-ui-catalog test-shared test-ui \
        build-web build-internal build-ui-catalog

# Next.js sends anonymous usage data to its maker unless this variable is set.
# No command of this repository sends it.
export NEXT_TELEMETRY_DISABLED := 1

help: ## List the commands
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; !seen[$$1]++ {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ---- The machine ------------------------------------------------------------

setup: hooks local-docs env doctor install db-up migrate seed ## First time on this machine: hooks, local-docs, .env, doctor, install, database, migrations, first admin
	@echo ""
	@echo "Setup finished. The database is running. Stop it with: make db-down"
	@echo "Start the server and the web apps with: make run"

env: ## Create .env from .env.example when .env does not exist
	@if [ -f .env ]; then echo ".env: already exists"; else cp .env.example .env && echo ".env: created from .env.example"; fi
	@bash scripts/worktree-setup.local.sh

doctor: ## Check the machine and the project; each failure prints its fix
	@status=0; \
	bash scripts/doctor.sh || status=1; \
	echo ""; \
	bash scripts/doctor.local.sh || status=1; \
	exit $$status

install: install-js install-api ## Install the dependencies of every app and package that exists

# ---- GitHub -----------------------------------------------------------------

# Run it once, right after the repository is on GitHub. It changes a setting of
# the repository on GitHub, so it prints the rule and asks first.
protect-main: ## Protect the branch main on GitHub: pull request and check required, no force push, no deletion (asks first; YES=1 asks nothing)
	@bash scripts/protect-main.sh $(if $(YES),--yes)

# ---- The database (PostgreSQL in Docker, docker-compose.yml) ----------------

db-up: ## Start the database and wait until it accepts connections
	@bash scripts/db.local.sh up

db-wait: ## Wait until the database accepts connections
	@bash scripts/db.local.sh wait

db-down: ## Stop the database; its data stays
	@bash scripts/db.local.sh down

db-ps: ## Show the state of the database container
	@bash scripts/db.local.sh ps

db-logs: ## Show the log of the database; Ctrl+C stops it
	@bash scripts/db.local.sh logs

db-destroy: ## Stop the database and DELETE its data (CONFIRM=yes)
	@CONFIRM="$(CONFIRM)" bash scripts/db.local.sh destroy

db-reset: ## DELETE the data and start an empty database (CONFIRM=yes)
	@CONFIRM="$(CONFIRM)" bash scripts/db.local.sh reset

# ---- Apps -------------------------------------------------------------------
# Each app and package has its own targets: install-, run-, lint-, test-.
# The targets "install", "run", "lint", "test" and "build" call them, so
# "make check" covers a new app with no other change.
#
# apps/api exists (Django, Python). Its targets are written below.
# apps/web, apps/internal (Next.js), apps/ui-catalog (Storybook),
# packages/shared and packages/ui exist. Their targets run the npm script of
# the same name: "dev", "lint", "test", "build". A script that a package.json
# does not have is skipped: apps/ui-catalog has no "test".

# $(call npm_run,<folder>,<npm script>): run one npm script of one member of the
# npm workspace, when the folder exists and its package.json has that script.
define npm_run
@if [ -f $(1)/package.json ]; then npm run $(2) --workspace $(1) --if-present; \
else echo "$(1): not created yet, nothing to $(2)."; fi
endef

# A file that npm writes into node_modules after an install. Every target that
# runs an npm script needs it, so missing or outdated JavaScript packages are
# installed first.
JS_INSTALLED := node_modules/.package-lock.json

$(JS_INSTALLED): package.json package-lock.json $(wildcard apps/*/package.json packages/*/package.json)
	npm install --no-audit --no-fund
	@touch $(JS_INSTALLED)

# The server (apps/api). Its packages live in its own virtual environment.
API_DIR := apps/api
API_PYTHON := .venv/bin/python
# The port of the server on this machine. Another port: make run-api API_PORT=8001
API_PORT ?= 8000
# A file that scripts/api-install.local.sh writes after a successful install.
# Every apps/api target needs it, so a missing or outdated virtual environment
# is installed first.
API_INSTALLED := $(API_DIR)/.venv/.installed

$(API_INSTALLED): $(API_DIR)/requirements.txt $(API_DIR)/requirements-dev.txt
	@bash scripts/api-install.local.sh

install-js: ## Install the JavaScript dependencies of the npm workspace
	npm install --no-audit --no-fund
	@touch $(JS_INSTALLED)

install-api: ## Install the Python dependencies of apps/api into apps/api/.venv
	@bash scripts/api-install.local.sh

migrate: $(API_INSTALLED) ## Apply the database migrations of apps/api; the database must be running
	@cd $(API_DIR) && $(API_PYTHON) manage.py check_database && $(API_PYTHON) manage.py migrate

seed: migrate ## Create the first admin of the server (SEED_ADMIN_* in .env); safe to run again
	@cd $(API_DIR) && $(API_PYTHON) manage.py seed_admin

# Not part of "make setup": a person runs it when they want rows to look at.
seed-sample: migrate ## Optional: create 2 invented sample users with tags, todos and history (SEED_SAMPLE_PASSWORD in .env); safe to run again
	@cd $(API_DIR) && $(API_PYTHON) manage.py seed_sample

# The catalog (apps/ui-catalog) is not started here: it needs no server and no
# database, and it opens its own browser window. Start it with: make catalog
run: db-up ## Start the database and every app that exists (server 8000, web 3000, internal 3001); Ctrl+C stops the apps
	@targets=""; \
	[ ! -d apps/api ] || targets="$$targets run-api"; \
	[ ! -f apps/web/package.json ] || targets="$$targets run-web"; \
	[ ! -f apps/internal/package.json ] || targets="$$targets run-internal"; \
	if [ -z "$$targets" ]; then echo "No app exists yet: nothing to run. The database is running."; \
	else $(MAKE) --no-print-directory -j $$targets; fi

# PYTHONUNBUFFERED: the lines of the server appear at once, also when the output
# goes to a file or to another program and not to a terminal.
run-api: $(API_INSTALLED) ## Start the server (apps/api) on http://localhost:8000; Ctrl+C stops it
	@cd $(API_DIR) && $(API_PYTHON) manage.py check_database \
		&& PYTHONUNBUFFERED=1 $(API_PYTHON) manage.py runserver 127.0.0.1:$(API_PORT)

api: run-api ## The same as run-api

run-web: $(JS_INSTALLED) ## Start the public web app (apps/web) on http://localhost:3000; Ctrl+C stops it
	$(call npm_run,apps/web,dev)

web: run-web ## The same as run-web

run-internal: $(JS_INSTALLED) ## Start the internal app (apps/internal) on http://localhost:3001; Ctrl+C stops it
	$(call npm_run,apps/internal,dev)

internal: run-internal ## The same as run-internal

run-ui-catalog: $(JS_INSTALLED) ## Start the catalog of the components (apps/ui-catalog, Storybook) on http://localhost:6006; Ctrl+C stops it
	$(call npm_run,apps/ui-catalog,dev)

catalog: run-ui-catalog ## The same as run-ui-catalog

lint: lint-shell lint-api lint-web lint-internal lint-ui-catalog lint-shared lint-ui lint-e2e ## Check the code style of everything that exists; for the JavaScript code also the types

lint-shell: ## Check the syntax of the shell scripts
	@bash -n scripts/*.sh .githooks/pre-commit && echo "Shell scripts: syntax OK"

lint-api: $(API_INSTALLED) ## Check the code style of apps/api (ruff)
	@cd $(API_DIR) && .venv/bin/ruff check . && .venv/bin/ruff format --check .

format-api: $(API_INSTALLED) ## Rewrite the files of apps/api in the code style that lint-api checks
	@cd $(API_DIR) && .venv/bin/ruff check --fix . && .venv/bin/ruff format .

lint-web: $(JS_INSTALLED) ## Check the code style and the types of apps/web (ESLint, TypeScript)
	$(call npm_run,apps/web,lint)

lint-internal: $(JS_INSTALLED) ## Check the code style and the types of apps/internal (ESLint, TypeScript)
	$(call npm_run,apps/internal,lint)

lint-ui-catalog: $(JS_INSTALLED) ## Check the code style and the types of apps/ui-catalog (ESLint, TypeScript)
	$(call npm_run,apps/ui-catalog,lint)

lint-shared: $(JS_INSTALLED) ## Check the code style and the types of packages/shared (ESLint, TypeScript)
	$(call npm_run,packages/shared,lint)

lint-ui: $(JS_INSTALLED) ## Check the code style and the types of packages/ui (ESLint, TypeScript)
	$(call npm_run,packages/ui,lint)

lint-e2e: $(JS_INSTALLED) ## Check the code style and the types of the end-to-end tests (e2e/)
	$(call npm_run,e2e,lint)

test: test-api test-web test-internal test-ui-catalog test-shared test-ui ## Run the tests of everything that exists

test-api: $(API_INSTALLED) ## Run the tests of apps/api; the database must be running
	@cd $(API_DIR) && $(API_PYTHON) manage.py check_database \
		&& $(API_PYTHON) manage.py makemigrations --check --dry-run \
		&& $(API_PYTHON) manage.py test --noinput

test-web: $(JS_INSTALLED) ## Run the tests of apps/web
	$(call npm_run,apps/web,test)

test-internal: $(JS_INSTALLED) ## Run the tests of apps/internal
	$(call npm_run,apps/internal,test)

test-ui-catalog: $(JS_INSTALLED) ## Run the tests of apps/ui-catalog (it has none: "make build-ui-catalog" is its check)
	$(call npm_run,apps/ui-catalog,test)

test-shared: $(JS_INSTALLED) ## Run the tests of packages/shared
	$(call npm_run,packages/shared,test)

test-ui: $(JS_INSTALLED) ## Run the tests of packages/ui
	$(call npm_run,packages/ui,test)

build: build-web build-internal build-ui-catalog ## Build the web apps the way a real server runs them (next build), and the catalog (storybook build)

build-web: $(JS_INSTALLED) ## Build apps/web for production
	$(call npm_run,apps/web,build)

build-internal: $(JS_INSTALLED) ## Build apps/internal for production
	$(call npm_run,apps/internal,build)

build-ui-catalog: $(JS_INSTALLED) ## Build the catalog into apps/ui-catalog/storybook-static; fails when a story cannot be built
	$(call npm_run,apps/ui-catalog,build)

check: lint test build ## What must pass before a commit (the profile's check_command): lint, then test, then build
	@echo "Check passed."

# The end-to-end tests are not part of "make check": they need a browser and
# take longer. The automatic check on GitHub runs "make check", then "make e2e".
e2e: $(API_INSTALLED) $(JS_INSTALLED) ## Run the end-to-end tests in a real browser (e2e/): starts the database, the server (port 8100) and apps/web (port 3100) with a database of their own, and stops what it started
	@bash scripts/e2e.local.sh
