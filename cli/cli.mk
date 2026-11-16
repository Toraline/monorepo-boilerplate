# The targets that only the boilerplate has. A monorepo that was created from
# the boilerplate does not get this file.
# 1. The two npm commands: create-toraline-monorepo and update-toraline-monorepo (cli/).
# 2. The public copy of a release (boilerplate/public/, docs/releasing.md).
# The Makefile of the repository root includes this file. The folder cli/ has its own package.json and its own lock
# file: it is not a member of the npm workspace of the root.

.PHONY: install-cli lint-cli test-cli build-cli lint-public-copy public-copy

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

lint-public-copy: ## Check the syntax of the scripts that make the public copy of a release (boilerplate/public/)
	@bash -n boilerplate/public/*.sh && node --check boilerplate/public/release-text.mjs && echo "Scripts of the public copy: syntax OK"

# The tests of these scripts are part of "make test-cli" (cli/shared/src/public-copy.test.ts).
public-copy: ## Write the public copy of a commit into a new folder outside the repository (OUT=folder [REF=commit]); it is checked for secrets and private names
	@[ -n "$(OUT)" ] || { echo "Name the folder: make public-copy OUT=/path/to/a/new/folder [REF=HEAD]"; exit 1; }
	@bash boilerplate/public/make-public-copy.sh "$(OUT)" $(if $(REF),"$(REF)")

# "make install", "make lint", "make test" and "make build" (and so "make check") cover the commands.
install: install-cli
lint: lint-cli lint-public-copy
test: test-cli
build: build-cli
