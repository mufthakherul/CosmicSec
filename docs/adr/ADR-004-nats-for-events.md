# ADR-004: Why NATS JetStream (vs Kafka, RabbitMQ)

**Status**: Accepted  
**Date**: 2026-02-15  
**Authors**: CosmicSec Platform Team

## Context

CosmicSec needs an event bus for asynchronous communication between 12+ microservices. Events include: scan lifecycle, finding notifications, agent connections, user actions, and AI pipeline triggers.

## Decision

We chose **NATS JetStream 2.10** as the event broker.

## Rationale

| Criterion | NATS JetStream | Apache Kafka | RabbitMQ |
|-----------|---------------|-------------|---------|
| **Operational complexity** | ✅ Single binary | ❌ Zookeeper/KRaft | ⚠️ Plugins, clustering |
| **Throughput** | ✅ 40M+ msg/s | ✅ 100M+ msg/s | ⚠️ ~50K msg/s |
| **Latency** | ✅ <1ms typical | ⚠️ 5-10ms | ✅ <5ms |
| **At-least-once delivery** | ✅ JetStream | ✅ | ✅ |
| **Docker image size** | ✅ 10MB (nats:alpine) | ❌ 800MB+ | ⚠️ 180MB |
| **Go client** | ✅ Official nats.go | ✅ confluent-kafka-go | ✅ amqp091-go |
| **Python client** | ✅ nats-py async | ✅ confluent-kafka | ✅ pika |
| **WebSocket pub/sub** | ✅ Native | ❌ | ⚠️ STOMP |

## Scale Fit

At current scale (startup → 10K users), NATS JetStream's operational simplicity and sub-millisecond latency outweigh Kafka's higher throughput ceiling. If we reach 100M+ events/day, migration to Kafka can be done behind the `services/common/events.py` abstraction layer.

## Consequences

- **Positive**: Single `nats:2.10-alpine` container, no ZooKeeper, no cluster setup
- **Positive**: Go broker (Phase T) integrates natively with `nats.go` v2
- **Positive**: Python services use `nats-py` with transparent HTTP fallback
- **Negative**: Less ecosystem tooling than Kafka; acceptable at current scale
