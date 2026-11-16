# The targets of the two npm commands of the boilerplate: create-toraline-monorepo
# and update-toraline-monorepo (cli/). The Makefile of the repository root
# includes this file. The folder cli/ has its own package.json and its own lock
# file: it is not a member of the npm workspace of the root.

.PHONY: install-cli lint-cli test-cli build-cli

# A file that npm writes into cli/node_modules after an install.
CLI_INSTALLED := cli/node_modules/.package-lock.json

$(CLI_INSTALLED): cli/package.json cli/package-lock.json $(wildcard cli/*/package.json)
	cd cli && npm install --no-audit --no-fund
	@touch $(CLI_INSTALLED)

install-cli: ## Install the dependencies of the two npm commands (cli/)
	cd cli && npm install --no-audit --no-fund
	@touch $(CLI_INSTALLED)

lint-cli: $(CLI_INSTALLED) ## Check the code style and the types of the two npm commands (cli/)
	@cd cli && npm run lint

test-cli: $(CLI_INSTALLED) ## Run the tests of the two npm commands (cli/); they use no network
	@cd cli && npm run test

build-cli: $(CLI_INSTALLED) ## Build the two npm commands (cli/*/dist), and check the files that each packed package would hold
	@cd cli && npm run build && npm run pack-check

# "make install", "make lint", "make test" and "make build" (and so "make check") cover the commands.
install: install-cli
lint: lint-cli
test: test-cli
build: build-cli
