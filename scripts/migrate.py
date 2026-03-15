"""Simple migration runner placeholder for Alembic bootstrap."""

from pathlib import Path


def main() -> None:
    alembic_ini = Path(__file__).resolve().parents[1] / "alembic.ini"
    if not alembic_ini.exists():
        raise SystemExit("alembic.ini not found")

    print("Migration bootstrap available. Run `alembic upgrade head` in CI/CD or local env.")


if __name__ == "__main__":
    main()
