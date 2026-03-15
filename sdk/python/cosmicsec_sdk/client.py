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
