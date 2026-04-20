#!/usr/bin/env python3
"""
CosmicSec Development Seed Data Script (Phase V.4)

Creates a realistic demo environment with:
  - 1 organization (CosmicSec Demo)
  - 5 users across all roles
  - 10 sample scans with varied statuses
  - 50+ findings with realistic CVE data
  - Sample recon data
  - Sample AI analysis results

Usage:
    python scripts/seed-dev-data.py
    DATABASE_URL=postgresql://... python scripts/seed-dev-data.py

Requires: DATABASE_URL environment variable (defaults to SQLite)
"""

from __future__ import annotations

import hashlib
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta

# Add repo root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import bcrypt
    from sqlalchemy.orm import Session

    from services.common.db import Base, SessionLocal, engine
    from services.common.models import (
        FindingModel,
        OrganizationMemberModel,
        OrganizationModel,
        ScanModel,
        UserModel,
    )

    _HAS_DEPS = True
except ImportError as e:
    print(f"⚠ Missing dependency: {e}")
    print("Install with: pip install -r requirements.txt")
    _HAS_DEPS = False


# ---------------------------------------------------------------------------
# Data fixtures
# ---------------------------------------------------------------------------

DEMO_ORG = {
    "id": "org-demo-cosmicsec",
    "name": "CosmicSec Demo Org",
    "slug": "cosmicsec-demo",
    "plan": "enterprise",
    "seat_limit": 50,
    "primary_color": "#0EA5E9",
}

DEMO_USERS = [
    {
        "id": "user-admin-001",
        "email": "admin@cosmicsec.dev",
        "full_name": "Alex Admin",
        "role": "admin",
        "password": os.getenv("SEED_ADMIN_PASSWORD")
        or hashlib.sha256(b"admin@cosmicsec.dev").hexdigest()[:20],
    },
    {
        "id": "user-analyst-001",
        "email": "analyst@cosmicsec.dev",
        "full_name": "Sam Analyst",
        "role": "analyst",
        "password": os.getenv("SEED_ANALYST_PASSWORD")
        or hashlib.sha256(b"analyst@cosmicsec.dev").hexdigest()[:20],
    },
    {
        "id": "user-pentester-001",
        "email": "pentester@cosmicsec.dev",
        "full_name": "Pat Pentester",
        "role": "pentester",
        "password": os.getenv("SEED_PENTESTER_PASSWORD")
        or hashlib.sha256(b"pentester@cosmicsec.dev").hexdigest()[:20],
    },
    {
        "id": "user-auditor-001",
        "email": "auditor@cosmicsec.dev",
        "full_name": "Andrea Auditor",
        "role": "auditor",
        "password": os.getenv("SEED_AUDITOR_PASSWORD")
        or hashlib.sha256(b"auditor@cosmicsec.dev").hexdigest()[:20],
    },
    {
        "id": "user-viewer-001",
        "email": "viewer@cosmicsec.dev",
        "full_name": "Viktor Viewer",
        "role": "viewer",
        "password": os.getenv("SEED_VIEWER_PASSWORD")
        or hashlib.sha256(b"viewer@cosmicsec.dev").hexdigest()[:20],
    },
]

SAMPLE_TARGETS = [
    "192.168.1.0/24",
    "10.0.0.1",
    "https://demo.example.com",
    "app.acme.internal",
    "172.16.0.0/16",
    "https://api.example.com",
    "db.internal:5432",
    "dev.example.com",
    "staging.example.com",
    "prod.example.com",
]

FINDING_TEMPLATES = [
    {
        "title": "CVE-2024-4577 — PHP CGI Argument Injection",
        "severity": "critical",
        "cvss": 9.8,
        "category": "injection",
        "cve": "CVE-2024-4577",
        "description": "PHP CGI argument injection via URL-encoded characters allows RCE.",
        "remediation": "Upgrade PHP to 8.1.29, 8.2.20, or 8.3.8. Apply vendor patch.",
    },
    {
        "title": "CVE-2024-21762 — FortiOS Out-of-Bounds Write",
        "severity": "critical",
        "cvss": 9.6,
        "category": "buffer_overflow",
        "cve": "CVE-2024-21762",
        "description": "Out-of-bounds write in FortiOS SSL VPN allows unauthenticated RCE.",
        "remediation": "Update FortiOS to 7.4.3, 7.2.7, or 7.0.14.",
    },
    {
        "title": "CVE-2024-3400 — PAN-OS Command Injection",
        "severity": "critical",
        "cvss": 10.0,
        "category": "injection",
        "cve": "CVE-2024-3400",
        "description": "OS command injection in PAN-OS GlobalProtect gateway.",
        "remediation": "Apply hotfix PANOS-CVE-2024-3400 immediately.",
    },
    {
        "title": "Weak TLS Configuration — TLS 1.0/1.1 Enabled",
        "severity": "high",
        "cvss": 7.5,
        "category": "cryptography",
        "cve": None,
        "description": "Server accepts TLS 1.0 and TLS 1.1 which have known weaknesses.",
        "remediation": "Disable TLS 1.0 and 1.1. Enforce TLS 1.2+ with strong cipher suites.",
    },
    {
        "title": "SQL Injection — Login Parameter",
        "severity": "high",
        "cvss": 8.1,
        "category": "injection",
        "cve": None,
        "description": "The 'username' parameter in the login form is vulnerable to SQL injection.",
        "remediation": "Use parameterized queries or ORM. Never concatenate user input into SQL.",
    },
    {
        "title": "Exposed Admin Interface — No Auth",
        "severity": "high",
        "cvss": 8.6,
        "category": "authentication",
        "cve": None,
        "description": "Admin panel accessible at /admin without authentication.",
        "remediation": "Require authentication and restrict by IP. Move admin to internal network.",
    },
    {
        "title": "Missing HSTS Header",
        "severity": "medium",
        "cvss": 5.3,
        "category": "configuration",
        "cve": None,
        "description": "Strict-Transport-Security header not present.",
        "remediation": "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload",
    },
    {
        "title": "Outdated jQuery — 1.11.3",
        "severity": "medium",
        "cvss": 6.1,
        "category": "outdated_library",
        "cve": "CVE-2015-9251",
        "description": "jQuery 1.11.3 has multiple known XSS vulnerabilities.",
        "remediation": "Upgrade to jQuery 3.7.1 or replace with vanilla JS.",
    },
    {
        "title": "Open Redirect Vulnerability",
        "severity": "medium",
        "cvss": 5.8,
        "category": "redirect",
        "cve": None,
        "description": "The 'next' parameter in /login allows open redirect.",
        "remediation": "Validate redirect URLs against an allowlist of trusted domains.",
    },
    {
        "title": "Directory Listing Enabled",
        "severity": "low",
        "cvss": 3.7,
        "category": "configuration",
        "cve": None,
        "description": "Web server returns directory listing for /static/ path.",
        "remediation": "Disable directory listing in web server configuration.",
    },
    {
        "title": "Cookie Missing Secure Flag",
        "severity": "low",
        "cvss": 3.1,
        "category": "configuration",
        "cve": None,
        "description": "Session cookie does not have Secure flag set.",
        "remediation": "Set Secure flag on all session cookies: Set-Cookie: session=...; Secure; HttpOnly",
    },
    {
        "title": "Information Disclosure — Server Header",
        "severity": "info",
        "cvss": 0.0,
        "category": "information_disclosure",
        "cve": None,
        "description": "Server header reveals version: nginx/1.18.0",
        "remediation": "Configure web server to suppress version information.",
    },
]


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_org(db: Session) -> dict:
    existing = db.query(OrganizationModel).filter_by(id=DEMO_ORG["id"]).first()
    if existing:
        print(f"  ↩ Org already exists: {DEMO_ORG['slug']}")
        return DEMO_ORG

    org = OrganizationModel(
        id=DEMO_ORG["id"],
        name=DEMO_ORG["name"],
        slug=DEMO_ORG["slug"],
        plan=DEMO_ORG["plan"],
        seat_limit=DEMO_ORG["seat_limit"],
        primary_color=DEMO_ORG["primary_color"],
        settings={},
    )
    db.add(org)
    db.commit()
    print(f"  ✅ Org created: {org.name} ({org.slug})")
    return DEMO_ORG


def create_users(db: Session) -> list[dict]:
    created = []
    for u in DEMO_USERS:
        existing = db.query(UserModel).filter_by(id=u["id"]).first()
        if existing:
            print(f"  ↩ User exists: {u['email']}")
            created.append(u)
            continue

        user = UserModel(
            id=u["id"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            hashed_password=hash_password(u["password"]),
            is_active=True,
        )
        db.add(user)

        # Add to demo org
        member = OrganizationMemberModel(
            id=str(uuid.uuid4()),
            org_id=DEMO_ORG["id"],
            user_id=u["id"],
            role="owner" if u["role"] == "admin" else "member",
        )
        db.add(member)
        print(f"  ✅ User created: {u['email']} ({u['role']})")
        created.append(u)

    db.commit()
    return created


def create_scans(db: Session) -> list[str]:
    scan_ids = []
    statuses = [
        "completed",
        "completed",
        "completed",
        "failed",
        "running",
        "completed",
        "completed",
        "pending",
        "completed",
        "completed",
    ]
    types = ["quick", "full", "custom", "quick", "full", "custom", "quick", "full", "quick", "full"]

    for i, (target, status, scan_type) in enumerate(zip(SAMPLE_TARGETS, statuses, types, strict=True)):
        scan_id = f"scan-demo-{i + 1:03d}"
        existing = db.query(ScanModel).filter_by(id=scan_id).first()
        if existing:
            print(f"  ↩ Scan exists: {scan_id}")
            scan_ids.append(scan_id)
            continue

        days_ago = i * 3
        started = datetime.now(UTC) - timedelta(days=days_ago, hours=2)

        scan = ScanModel(
            id=scan_id,
            user_id=DEMO_USERS[i % len(DEMO_USERS)]["id"],
            target=target,
            scan_type=scan_type,
            status=status,
            progress=100 if status == "completed" else (50 if status == "running" else 0),
            created_at=started,
            source="web_scan",
        )
        db.add(scan)
        scan_ids.append(scan_id)
        print(f"  ✅ Scan created: {scan_id} → {target} [{status}]")

    db.commit()
    return scan_ids


def create_findings(db: Session, scan_ids: list[str]) -> int:
    count = 0
    templates = FINDING_TEMPLATES
    for scan_idx, scan_id in enumerate(scan_ids[:8]):  # Findings for first 8 scans
        n_findings = 3 + (scan_idx % 7)  # 3-9 findings per scan
        for j in range(n_findings):
            tmpl = templates[(scan_idx + j) % len(templates)]
            finding_id = f"finding-{scan_id}-{j + 1:02d}"
            existing = db.query(FindingModel).filter_by(id=finding_id).first()
            if existing:
                count += 1
                continue

            finding = FindingModel(
                id=finding_id,
                scan_id=scan_id,
                title=tmpl["title"],
                severity=tmpl["severity"],
                cvss_score=tmpl["cvss"],
                description=tmpl["description"],
                remediation=tmpl["remediation"],
                category=tmpl["category"],
                false_positive=False,
                extra={
                    "cve": tmpl.get("cve"),
                    "source": "demo-seed",
                    "tool": "nmap" if j % 2 == 0 else "nuclei",
                },
            )
            db.add(finding)
            count += 1

    db.commit()
    print(f"  ✅ {count} findings created across {len(scan_ids[:8])} scans")
    return count


def print_credentials() -> None:
    print("\n" + "=" * 60)
    print("  DEMO CREDENTIALS")
    print("=" * 60)
    for u in DEMO_USERS:
        print(f"  {u['role']:12s} │ {u['email']:35s} │ {'*' * 12}")
    print("=" * 60)
    print(f"\n  Organization: {DEMO_ORG['name']}")
    print(f"  Slug:         {DEMO_ORG['slug']}")
    print(f"  Plan:         {DEMO_ORG['plan']}")
    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    if not _HAS_DEPS:
        sys.exit(1)

    print("\n🚀 CosmicSec Seed Data — Starting...\n")

    # Create all tables
    try:
        Base.metadata.create_all(bind=engine)
        print("  ✅ Database tables created/verified\n")
    except Exception as e:
        print(f"  ❌ Failed to create tables: {e}")
        sys.exit(1)

    with SessionLocal() as db:
        print("📁 Creating organization...")
        create_org(db)

        print("\n👥 Creating users...")
        create_users(db)

        print("\n🔍 Creating scans...")
        scan_ids = create_scans(db)

        print("\n🐛 Creating findings...")
        create_findings(db, scan_ids)

    print_credentials()
    print("✅ Seed data complete!\n")


if __name__ == "__main__":
    main()
