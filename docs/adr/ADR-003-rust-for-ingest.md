# ADR-003: Why Rust for the Ingest Engine (vs Go, C++)

**Status**: Accepted  
**Date**: 2026-02-01  
**Authors**: CosmicSec Platform Team

## Context

Security tool output (Nmap XML, Nuclei JSONL, ZAP reports) can be extremely verbose. A single Nmap scan of a /16 subnet produces 50 MB+ of XML. We need a parser that can process 50,000+ findings/second with predictable memory usage.

## Decision

We built the ingest engine in **Rust** (`ingest/` directory).

## Rationale

| Criterion | Rust | Go | C++ |
|-----------|------|----|-----|
| **Memory safety** | ✅ Guaranteed by compiler | ⚠️ GC pauses | ❌ Manual (CVE risk) |
| **Performance** | ✅ Zero-cost abstractions | ✅ Very fast | ✅ Fastest possible |
| **Parsing libs** | ✅ quick-xml (SAX), serde_json | ✅ encoding/xml | ⚠️ fragmented |
| **Async I/O** | ✅ Tokio | ✅ Native goroutines | ⚠️ Boost.Asio |
| **gRPC** | ✅ tonic | ✅ google/grpc-go | ✅ grpc++ |
| **Security** | ✅ No buffer overflows | ✅ Memory-safe | ❌ Risky |
| **Binary size** | ✅ Small static binary | ✅ Small static binary | ⚠️ Library deps |

## Architecture

The Rust ingest engine exposes:
- **gRPC `IngestService`**: For batch finding ingestion from Python gateway
- **Redis Streams consumer**: Direct high-volume pipeline bypass
- **HTTP health/metrics**: Prometheus + readiness endpoints
- **Multi-stage Docker**: rust:1.85 → debian:bookworm-slim (final ~15 MB)

## Consequences

- **Positive**: Parse 50,000+ findings/second vs ~5,000/second in Python
- **Positive**: Predictable memory: ~50 MB for any input size (streaming parser)
- **Positive**: Zero GC pauses — critical for consistent latency
- **Negative**: Rust expertise required for maintenance; mitigated by Python fallback
- **Fallback**: `COSMICSEC_USE_RUST_INGEST=false` routes all ingestion through Python parser
