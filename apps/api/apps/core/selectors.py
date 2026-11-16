"""Reads that more than one app uses."""

from django.db import DatabaseError, connection


def database_answers() -> bool:
    """True when the database runs one query. False when it cannot be reached."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return False
    return True
