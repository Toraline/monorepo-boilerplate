"""Deletes the end-to-end database and creates it again, empty.

Run by Playwright before the server of the end-to-end run starts
(e2e/playwright.config.ts), with the Python of apps/api/.venv. It reads the
database settings from the environment: POSTGRES_USER, POSTGRES_PASSWORD,
POSTGRES_HOST, POSTGRES_PORT, and POSTGRES_DB, the name of the database to
delete and create.

It refuses every name that does not end with "_e2e", so it can never delete
the development database.
"""

import os
import sys

import psycopg
from psycopg import sql

E2E_SUFFIX = "_e2e"


def main() -> int:
    database_name = os.environ.get("POSTGRES_DB", "")
    if not database_name.endswith(E2E_SUFFIX):
        print(
            f'Refused: the database name "{database_name}" does not end with "{E2E_SUFFIX}". '
            "Nothing was deleted. This script only resets the end-to-end database.",
            file=sys.stderr,
        )
        return 1

    host = os.environ["POSTGRES_HOST"]
    port = os.environ["POSTGRES_PORT"]
    try:
        # "postgres" is the database that every PostgreSQL server has. A
        # database cannot be deleted through a connection to itself.
        connection = psycopg.connect(
            dbname="postgres",
            user=os.environ["POSTGRES_USER"],
            password=os.environ["POSTGRES_PASSWORD"],
            host=host,
            port=port,
            connect_timeout=5,
            autocommit=True,
        )
    except psycopg.OperationalError:
        print(
            f"The database does not answer on {host}:{port}. "
            "Fix: start it with 'make db-up', then run 'make e2e' again.",
            file=sys.stderr,
        )
        return 1

    with connection:
        name = sql.Identifier(database_name)
        # FORCE closes the connections that a stopped run left open.
        connection.execute(sql.SQL("DROP DATABASE IF EXISTS {} WITH (FORCE)").format(name))
        connection.execute(sql.SQL("CREATE DATABASE {}").format(name))
    print(f'The end-to-end database "{database_name}" is empty and ready.')
    return 0


if __name__ == "__main__":
    sys.exit(main())
