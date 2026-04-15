#!/usr/bin/env python3
"""Create the initial admin user with a random secure password.

Reads configuration from environment variables:
  COSMICSEC_ADMIN_EMAIL  – admin e-mail (default: admin@cosmicsec.local)
  DATABASE_URL           – PostgreSQL connection string

Idempotent: skips creation when the admin user already exists.
"""

import os
import secrets
import string
import sys

import bcrypt
import psycopg2


def generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> None:
    admin_email = os.environ.get("COSMICSEC_ADMIN_EMAIL", "admin@cosmicsec.local")
    database_url = os.environ.get("DATABASE_URL")

    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM cosmicsec.users WHERE email = %s",
                (admin_email,),
            )
            if cur.fetchone() is not None:
                print(f"Admin user '{admin_email}' already exists — skipping creation.")
                return

            password = generate_password()
            password_hash = bcrypt.hashpw(
                password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            cur.execute(
                """
                INSERT INTO cosmicsec.users (email, password_hash, full_name, role)
                VALUES (%s, %s, %s, %s)
                """,
                (admin_email, password_hash, "System Administrator", "admin"),
            )
            conn.commit()

            print(f"Admin user '{admin_email}' created.")
            print(f"Generated password: {password}")  # noqa: S101 — intentional one-time display
    finally:
        conn.close()


if __name__ == "__main__":
    main()
