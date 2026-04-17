# Multi-Channel Notification Runbook

## Purpose
Configure and operate CosmicSec notifications across Telegram, Discord, webhook, Redis pub/sub, email, Slack, and SSH command channels.

## Service Endpoints
- Health: `GET /health`
- Metrics: `GET /metrics`
- Channel catalog: `GET /notify/channels`
- Create config: `POST /notify/config`
- List configs: `GET /notify/configs`
- Delete config: `DELETE /notify/configs/{config_id}`
- Send event: `POST /notify/send`
- Test config: `POST /notify/test`

## Event Payload Contract
```json
{
  "event_type": "finding.created",
  "severity": "high",
  "subject": "Critical SQL Injection",
  "payload": {
    "scan_id": "scan-123",
    "target": "api.example.com",
    "finding": "Blind SQL injection detected"
  },
  "channels": ["discord", "telegram"],
  "tags": ["prod", "critical"]
}
```

## Channel Config Examples

### Telegram
```json
{
  "channel": "telegram",
  "name": "SOC Telegram",
  "enabled": true,
  "tags": ["prod", "critical"],
  "config": {
    "bot_token": "123456:ABCDEF",
    "chat_id": "-1001234567890",
    "parse_mode": "Markdown"
  }
}
```

### Discord
```json
{
  "channel": "discord",
  "name": "Blue Team Discord",
  "enabled": true,
  "tags": ["prod"],
  "config": {
    "webhook_url": "https://discord.com/api/webhooks/..."
  }
}
```

### Generic Webhook
```json
{
  "channel": "webhook",
  "name": "SOAR Ingest",
  "enabled": true,
  "config": {
    "url": "https://soar.example.com/hooks/cosmicsec",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer REDACTED"
    }
  }
}
```

### Redis Pub/Sub
```json
{
  "channel": "redis_pubsub",
  "name": "Event Bus",
  "enabled": true,
  "tags": ["internal"],
  "config": {
    "redis_url": "redis://localhost:6379/0",
    "channel": "cosmicsec.events"
  }
}
```

### SSH Command
```json
{
  "channel": "ssh_command",
  "name": "SOC Bastion Action",
  "enabled": false,
  "config": {
    "host": "10.10.10.20",
    "port": 22,
    "username": "soc-bot",
    "ignore_host_key": false,
    "known_hosts": "/home/soc-bot/.ssh/known_hosts",
    "command": "echo '{severity} {event_type}' >> /var/log/cosmicsec-events.log"
  }
}
```

## Basic Operations

### Create a config
```bash
curl -X POST http://localhost:8010/notify/config \
  -H "Content-Type: application/json" \
  -d @config.json
```

### Send an event
```bash
curl -X POST http://localhost:8010/notify/send \
  -H "Content-Type: application/json" \
  -d @event.json
```

### Test a specific config
```bash
curl -X POST http://localhost:8010/notify/test \
  -H "Content-Type: application/json" \
  -d '{"config_id": "CONFIG-ID", "message": "test from runbook"}'
```

## Operational Guidance
- Use tags to scope channels by environment (`prod`, `staging`, `internal`).
- Prefer webhook endpoints over direct channel API tokens when possible.
- Keep SSH channel disabled by default and enable only for controlled automations.
- Do not include plaintext secrets in exported config files.
- Monitor `notification_errors_total` and set alert thresholds per environment.

## Failure Triage Checklist
- Verify config is `enabled: true`.
- Verify event channel filter includes the channel or leave `channels` empty.
- Confirm outbound URL passes SSRF/HTTPS validation.
- Validate provider credentials (Telegram bot token, Discord webhook URL, SMTP auth).
- Check network egress controls and DNS reachability from notification service runtime.
