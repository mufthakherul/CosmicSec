# CosmicSec Project Algorithm

> Supplemental algorithm-oriented summary.
> Canonical implementation status remains in `report.md`, `ROADMAP.md`, and `gap_analysis.md`.

## Overview
CosmicSec operates on a Hybrid Execution Engine algorithm, capable of seamlessly switching between STATIC, DYNAMIC, and LOCAL execution modes. The core algorithm revolves around processing user input (often natural language), determining intent, planning security tasks using AI, executing tools, and aggregating results.

## Core Execution Algorithm

### 1. Request Ingestion & Intent Parsing
1. **Input**: User submits a command or natural language request via CLI or WebApp Chat.
2. **Gateway**: The API Gateway routes the request to the AI Service or specific Microservice.
3. **Intent Parsing**: The Natural Language Intent Parser analyzes the prompt.
   - *Is it a direct tool command?* (e.g., `nmap -sV target`)
   - *Is it a high-level goal?* (e.g., "Scan this IP for vulnerabilities")
4. **Classification**: The request is classified into an execution class (e.g., `scan_create`, `recon_lookup`, `nmap_scan`, `nikto_scan`).

### 2. AI Planning & Resolution
1. **Model Selection**: The system defaults to `phi3:mini` (in dev) or Cisco AI (in prod) to generate an execution plan.
2. **Tool Registry Check**: The Dynamic Tool Resolver checks the Tool Registry to ensure the required tools (e.g., nmap, sqlmap) are available locally or via the Scan Service.
3. **Safety & Policy Check**: Validates the planned actions against RBAC policies, plugin trust signatures, and authorized targets.

### 3. Execution & Orchestration
1. **Task Dispatch**: 
   - **Local Mode (CLI)**: Sent to the local Shell Command Executor.
   - **Dynamic Mode (WebApp)**: Sent via WebSocket (`Agent Relay`) to a connected CLI agent or executed server-side by the `Scan Service`.
2. **Progressive Streaming**: Execution output is streamed back via NDJSON progressive events to the frontend or local console.
3. **Tool Parsing**: Output parsers extract structured findings from raw tool outputs.

### 4. Aggregation & Reporting
1. **Persistence**: Extracted findings are persisted to PostgreSQL via the Scan Service.
2. **Analysis**: AI Service performs anomaly detection and maps findings to the MITRE ATT&CK framework.
3. **Collaboration & UI**: Results are aggregated in the WebApp dashboard, updating live telemetry, timeline event cards, and risk snapshots.

---

## Scope Note

This file explains execution algorithm behavior.
Roadmap status, remaining gaps, and delivery checkpoints are maintained in `ROADMAP.md`, `report.md`, and `gap_analysis.md`.
