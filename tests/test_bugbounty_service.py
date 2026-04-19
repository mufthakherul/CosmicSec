from fastapi.testclient import TestClient

from services.bugbounty_service.main import app

client = TestClient(app)


def test_bugbounty_program_and_submission_flow() -> None:
    platform_resp = client.get("/platforms")
    assert platform_resp.status_code == 200
    assert "hackerone" in platform_resp.json()["platforms"]

    program = client.post(
        "/programs",
        json={
            "platform": "hackerone",
            "program_name": "Acme Public Program",
            "scope": ["acme.com", "api.acme.com"],
            "reward_model": "bounty",
        },
    )
    assert program.status_code == 201
    program_id = program.json()["program_id"]

    recon = client.post("/recon/auto", json={"program_id": program_id, "target": "acme.com"})
    assert recon.status_code == 200
    assert recon.json()["summary"]["total_assets"] >= 1

    prio = client.post(
        "/findings/prioritize",
        json={"findings": [{"title": "XSS", "score": 70}, {"title": "RCE", "score": 95}]},
    )
    assert prio.status_code == 200
    assert prio.json()["ranked_findings"][0]["title"] == "RCE"

    submission = client.post(
        "/submissions",
        json={
            "program_id": program_id,
            "title": "Critical RCE",
            "description": "Remote command execution found in upload API",
            "severity": "critical",
        },
    )
    assert submission.status_code == 201
    submission_id = submission.json()["submission_id"]

    submit = client.post(f"/submissions/{submission_id}/submit")
    assert submit.status_code == 200
    assert submit.json()["status"] == "submitted"

    triage = client.patch(
        f"/submissions/{submission_id}/status",
        json={
            "status": "triaged",
            "actor": "qa-operator",
            "note": "Verified and moved to triage queue",
        },
    )
    assert triage.status_code == 200
    assert triage.json()["status"] == "triaged"

    earnings = client.get("/dashboard/earnings")
    assert earnings.status_code == 200
    assert earnings.json()["total_submissions"] >= 1

    share = client.post(
        "/collaboration/share",
        json={
            "program_id": program_id,
            "title": "Need validation",
            "message": "Please verify impact and bypass path.",
            "participants": ["alice", "bob"],
        },
    )
    assert share.status_code == 200

    threads = client.get("/collaboration/threads", params={"program_id": program_id})
    assert threads.status_code == 200
    assert threads.json()["total"] >= 1

    templates = client.get("/reports/templates")
    assert templates.status_code == 200
    assert templates.json()["total"] >= 1

    overview = client.get("/dashboard/overview")
    assert overview.status_code == 200
    overview_data = overview.json()
    assert overview_data["programs"] >= 1
    assert overview_data["submissions"] >= 1
    assert "recent_activities" in overview_data
