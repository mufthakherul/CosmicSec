import sys
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure ORM models are imported so metadata includes all tables.
from services.common import models  # noqa: F401
from services.common.db import Base, engine


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create all ORM tables for test runs and clean them up afterwards."""
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
        Base.metadata.drop_all(bind=engine)
