# cosmicsec-go-sdk

Official Go SDK for the [CosmicSec](https://cosmicsec.io) Universal Cybersecurity Intelligence Platform.

## Installation

```bash
go get github.com/mufthakherul/cosmicsec-go-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    cosmicsec "github.com/mufthakherul/cosmicsec-go-sdk"
)

func main() {
    client := cosmicsec.NewClient("https://api.cosmicsec.io")

    // Login
    res, err := client.Login("user@example.com", "password")
    if err != nil {
        panic(err)
    }
    fmt.Println("Logged in:", res["user"])

    // List scans
    scans, err := client.GetScans(nil)
    if err != nil {
        panic(err)
    }
    fmt.Printf("Found %d scans\n", len(scans))

    // Create a scan
    scan, err := client.CreateScan(map[string]any{
        "target":     "https://example.com",
        "scan_types": []string{"web"},
    })
    if err != nil {
        panic(err)
    }
    fmt.Println("Scan ID:", scan["id"])

    // Get findings
    findings, err := client.GetScanFindings(scan["id"].(string))
    if err != nil {
        panic(err)
    }
    fmt.Printf("Findings: %d\n", len(findings))
}
```

## Using an API Key

```go
client := cosmicsec.NewClient("https://api.cosmicsec.io")
client.SetAPIKey("your-api-key")
```

## Available Methods

| Method | Description |
|--------|-------------|
| `Health()` | Get platform health status |
| `Login(email, password)` | Authenticate and store token |
| `CreateScan(payload)` | Start a new scan |
| `GetScans(params)` | List scans with optional filters |
| `GetScan(id)` | Get a scan by ID |
| `GetScanFindings(scanId)` | Get findings for a scan |
| `GetFindings(params)` | List findings with optional filters |
| `AnalyzeFindings(target, findings)` | AI-powered findings analysis |
| `CorrelateFindings(findings)` | Correlate and score findings |
| `StartWorkflow(target)` | Start AI-driven workflow |
| `RegisterAgent(agentId, manifest)` | Register a CLI agent |
| `GetAgents()` | List registered agents |
| `GenerateAPIKey(name)` | Generate a named API key |

## License

MIT
