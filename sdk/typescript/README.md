# @cosmicsec/sdk — TypeScript SDK

Official TypeScript/JavaScript SDK for the [CosmicSec](https://cosmicsec.io) Universal Cybersecurity Intelligence Platform.

## Installation

```bash
npm install @cosmicsec/sdk
```

## Quick Start

```typescript
import CosmicSecClient from '@cosmicsec/sdk';

const client = new CosmicSecClient({
  baseUrl: 'https://api.cosmicsec.io',
});

// Login and get a token (token is stored automatically)
const auth = await client.login('user@example.com', 'password');
console.log('Logged in as', auth.user.email);

// List scans
const scans = await client.getScans({ limit: 10 });
console.log(`Found ${scans.length} scans`);

// Create a scan
const scan = await client.createScan({
  target: 'https://example.com',
  scan_types: ['web'],
  depth: 3,
});
console.log('Scan started:', scan.id);

// Get findings for a scan
const findings = await client.getScanFindings(scan.id);
console.log('Findings:', findings.length);
```

## Using an API Key

```typescript
const client = new CosmicSecClient({
  baseUrl: 'https://api.cosmicsec.io',
  apiKey: 'your-api-key',
});
```

## Runtime Mode Awareness

```typescript
const client = new CosmicSecClient({
  baseUrl: 'https://api.cosmicsec.io',
  onModeChange: (mode) => {
    console.log('Platform mode changed to:', mode);
  },
});
```

## Agent WebSocket Client

```typescript
import { AgentWebSocketClient } from '@cosmicsec/sdk';

const agent = new AgentWebSocketClient(
  'wss://api.cosmicsec.io/ws/agent',
  'my-agent-id',
  'my-api-key',
);

agent.on('connect', () => console.log('Agent connected'));
agent.onMessage((msg) => console.log('Message:', msg));
agent.connect();

// Send a finding
agent.sendFinding({
  scan_id: 'scan-001',
  payload: { title: 'Open Port', severity: 'medium' },
});
```

## TypeScript Types

Key types exported from `@cosmicsec/sdk`:

| Type | Description |
|------|-------------|
| `RuntimeMode` | Platform mode: `static`, `dynamic`, `hybrid`, `demo`, `emergency` |
| `Severity` | Finding severity: `critical`, `high`, `medium`, `low`, `info` |
| `Scan` | Scan object with status, progress, target |
| `Finding` | Security finding with CVE, CVSS, MITRE fields |
| `AuthResponse` | Login response with `access_token` and `User` |
| `CorrelationReport` | AI correlation report with risk score and grouped findings |
| `AgentStreamMessage` | WebSocket message from an agent |

## License

MIT
