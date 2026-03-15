import httpx


class CosmicSecClient:
    def __init__(self, base_url: str = "http://localhost:8000") -> None:
        self.base_url = base_url.rstrip("/")
        self._client = httpx.Client(base_url=self.base_url, timeout=15)

    def health(self) -> dict:
        return self._client.get("/health").json()

    def create_scan(self, payload: dict) -> dict:
        return self._client.post("/api/scans", json=payload).json()

    def get_scan(self, scan_id: str) -> dict:
        return self._client.get(f"/api/scans/{scan_id}").json()

    def analyze(self, payload: dict) -> dict:
        return self._client.post("/api/ai/analyze", json=payload).json()

    def runtime_mode(self) -> dict:
        return self._client.get("/api/runtime/mode").json()

    def runtime_metrics(self) -> dict:
        return self._client.get("/api/runtime/metrics").json()

    def runtime_contracts(self) -> dict:
        return self._client.get("/api/runtime/contracts").json()

    def runtime_traces(self, limit: int = 50) -> dict:
        return self._client.get("/api/runtime/traces", params={"limit": limit}).json()
