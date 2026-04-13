# CosmicSec CLI Agent

The CosmicSec local agent discovers and runs security tools on your machine, streams findings to the CosmicSec cloud platform, and supports full offline operation with automatic sync on reconnect.

## Installation

```bash
cd cli/agent
pip install -e .
```

## Quick Start

### Discover installed security tools
```bash
cosmicsec-agent discover
```

### Run a scan
```bash
# Single tool
cosmicsec-agent scan --target 192.168.1.1 --tool nmap

# With custom flags
cosmicsec-agent scan --target 192.168.1.1 --tool nmap --flags "-sV -O" --output-format xml

# Run all available tools
cosmicsec-agent scan --target 192.168.1.1 --all
```

### Connect to CosmicSec cloud
```bash
cosmicsec-agent connect --server wss://app.cosmicsec.io --api-key <your-api-key>
```

### Export offline findings
```bash
cosmicsec-agent offline export --format json --output-file findings.json
cosmicsec-agent offline export --format csv --output-file findings.csv
```

### Show status
```bash
cosmicsec-agent status
```

## Supported Tools

| Tool       | Capabilities                         |
|------------|--------------------------------------|
| nmap       | port_scan, service_detect, os_detect |
| nikto      | web_scan, vuln_detect                |
| sqlmap     | sqli, db_enum                        |
| gobuster   | dir_enum, dns_enum                   |
| ffuf       | fuzzing, dir_enum                    |
| masscan    | fast_port_scan                       |
| wpscan     | wordpress_scan                       |
| nuclei     | template_scan, vuln_detect           |
| hydra      | brute_force, password_attack         |
| john       | password_crack                       |
| hashcat    | password_crack, hash_crack           |
| metasploit | exploitation, post_exploit           |
| zaproxy    | web_scan, proxy                      |
| burpsuite  | web_proxy, web_scan                  |

## Configuration

Config is stored at `~/.cosmicsec/config.json`. Offline findings are stored in `~/.cosmicsec/offline.db`.
