export class CosmicSecClient {
  constructor(baseUrl = "http://localhost:8000") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async health() {
    const r = await fetch(`${this.baseUrl}/health`);
    return r.json();
  }

  async createScan(payload) {
    const r = await fetch(`${this.baseUrl}/api/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.json();
  }

  async getScan(scanId) {
    const r = await fetch(`${this.baseUrl}/api/scans/${scanId}`);
    return r.json();
  }
}
