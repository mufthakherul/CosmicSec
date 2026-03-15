# 📊 SOC Analyst's Guide to CosmicSec

## Introduction

CosmicSec provides a comprehensive Security Operations Center (SOC) platform with real-time alert management, incident response, threat hunting, and SOAR capabilities through the **GuardAxisSphere** interface. Powered by **Helix AI** for intelligent alert correlation and automated threat analysis, this guide will help you maximize your SOC efficiency and reduce MTTD (Mean Time To Detect) and MTTR (Mean Time To Respond).

---

## 🎯 Key Features for SOC Analysts

### 1. Real-Time Alert Dashboard

**Multi-Source Alert Aggregation**:
```bash
# Start the SOC dashboard
cosmicsec soc dashboard

# Configure alert sources
cosmicsec soc add-source \
  --type splunk \
  --endpoint https://splunk.company.com \
  --token $SPLUNK_TOKEN

cosmicsec soc add-source \
  --type sentinel \
  --workspace-id $AZURE_WORKSPACE_ID \
  --api-key $AZURE_API_KEY

cosmicsec soc add-source \
  --type crowdstrike \
  --client-id $CS_CLIENT_ID \
  --client-secret $CS_SECRET
```

**Alert Prioritization**:
```bash
# Configure ML-powered prioritization
cosmicsec soc configure-ml \
  --model alert-priority \
  --features severity,asset-criticality,threat-intel,historical-fp \
  --auto-retrain weekly

# View prioritized alerts
cosmicsec soc alerts \
  --filter priority:critical,high \
  --sort-by ml-score \
  --limit 50
```

### 2. Incident Management

**Create Investigation**:
```bash
# Create new incident
cosmicsec soc incident create \
  --title "Suspicious PowerShell Execution on DC01" \
  --severity critical \
  --type malware \
  --assign analyst@company.com \
  --playbook ransomware-response

# Add alerts to incident
cosmicsec soc incident add-alerts \
  --incident-id INC-2024-001 \
  --alert-ids ALERT-123,ALERT-456,ALERT-789
```

**Evidence Collection**:
```bash
# Collect evidence
cosmicsec soc evidence collect \
  --incident-id INC-2024-001 \
  --type process-dump,memory-dump,network-pcap \
  --host DC01 \
  --preserve-chain-of-custody

# Timeline reconstruction
cosmicsec soc timeline \
  --incident-id INC-2024-001 \
  --sources logs,netflow,edr \
  --time-range "2024-01-15 14:00" "2024-01-15 16:00" \
  --output timeline.html
```

**Case Management**:
```bash
# Update incident status
cosmicsec soc incident update \
  --incident-id INC-2024-001 \
  --status investigating \
  --add-note "Initial triage complete. Malware confirmed. Initiating containment."

# Escalate incident
cosmicsec soc incident escalate \
  --incident-id INC-2024-001 \
  --to incident-response-team \
  --reason "Ransomware detected on critical server" \
  --notify-stakeholders
```

### 3. Threat Hunting

**Hypothesis-Driven Hunting**:
```bash
# Create hunting hypothesis
cosmicsec soc hunt create \
  --hypothesis "Adversaries are using LOLBins for lateral movement" \
  --scope domain-controllers,file-servers \
  --techniques T1021,T1570 \
  --data-sources windows-events,sysmon,edr

# Execute hunt
cosmicsec soc hunt execute \
  --hunt-id HUNT-001 \
  --query-language KQL \
  --query @queries/lolbins-lateral-movement.kql \
  --time-range 7d
```

**IOC Search**:
```bash
# Search for Indicators of Compromise
cosmicsec soc hunt ioc \
  --ioc-type ip,domain,hash \
  --ioc-file iocs/apt28.txt \
  --sources splunk,sentinel,qradar \
  --time-range 30d \
  --output-format json

# Retroactive hunting
cosmicsec soc hunt retroactive \
  --new-ioc-feed threat-intel/latest.stix \
  --search-historical 90d \
  --alert-on-match \
  --auto-create-incident
```

**Behavioral Analytics**:
```bash
# Detect anomalous behavior
cosmicsec soc hunt behavioral \
  --entity-type user,device,application \
  --baseline-period 30d \
  --detection-algorithms \
    isolation-forest \
    lstm-autoencoder \
    statistical-outlier \
  --sensitivity medium \
  --alert-threshold 0.85
```

### 4. SOAR (Security Orchestration, Automation, and Response)

**Automated Response Playbooks**:
```yaml
# playbook: phishing-response.yaml
name: "Phishing Email Response"
trigger:
  type: alert
  condition: "alert.type == 'phishing' && alert.severity >= 'medium'"

steps:
  - name: enrich_email
    action: email.analyze
    params:
      extract_urls: true
      extract_attachments: true
      sandbox_attachments: true

  - name: check_virustotal
    action: virustotal.check_url
    params:
      urls: ${enrich_email.urls}

  - name: block_sender
    condition: ${check_virustotal.malicious_count} > 0
    action: email_gateway.block_sender
    params:
      sender: ${alert.sender}
      reason: "Phishing attempt detected"

  - name: quarantine_emails
    action: email.quarantine
    params:
      query: "from:${alert.sender} received:last_24h"

  - name: notify_users
    action: notification.send
    params:
      recipients: ${email.affected_users}
      message: "Potential phishing email quarantined"

  - name: create_ticket
    action: jira.create_issue
    params:
      project: SOC
      type: Security Incident
      summary: "Phishing email from ${alert.sender}"
      priority: ${alert.severity}
```

**Execute Playbook**:
```bash
# Run playbook
cosmicsec soc playbook run \
  --playbook phishing-response \
  --alert-id ALERT-789 \
  --auto-approve-low-risk \
  --notify-on-completion

# Create custom playbook
cosmicsec soc playbook create \
  --name ransomware-containment \
  --steps isolate-host,disable-user,block-iocs,notify-team \
  --approval-required true
```

**Containment Actions**:
```bash
# Automated containment
cosmicsec soc contain \
  --type network-isolation \
  --targets HOST-123,HOST-456 \
  --reason "Malware infection" \
  --duration 24h \
  --approval-required

# Block IOCs at firewall
cosmicsec soc contain \
  --type firewall-block \
  --iocs badactor.com,192.168.1.100 \
  --firewall palo-alto \
  --log-action true
```

### 5. Alert Correlation

**Multi-Event Correlation**:
```bash
# Configure correlation rules
cosmicsec soc correlation create \
  --rule-name "brute-force-then-lateral-movement" \
  --events \
    "failed_login[count>10,window:5m]" \
    "successful_login[same_user]" \
    "lateral_movement[within:30m]" \
  --severity high \
  --create-incident true

# View correlated alerts
cosmicsec soc correlation view \
  --time-range 24h \
  --min-events 3 \
  --output correlation-graph.html
```

### 6. Shift Management

**Handoff Notes**:
```bash
# Create shift handoff
cosmicsec soc shift handoff \
  --summary "3 critical incidents, 12 high-priority alerts" \
  --open-incidents INC-2024-001,INC-2024-003 \
  --pending-tasks TASK-45,TASK-67 \
  --notes "INC-2024-001 requires manager approval for containment" \
  --next-shift night-team

# View current shift status
cosmicsec soc shift status

# Schedule rotation
cosmicsec soc shift schedule \
  --team-members alice,bob,charlie,david \
  --rotation weekly \
  --hours 24x7 \
  --on-call-escalation +1-555-0100
```

### 7. Metrics & KPIs

**SOC Performance Dashboard**:
```bash
# View SOC metrics
cosmicsec soc metrics \
  --period last-30-days \
  --include \
    mttd \
    mttr \
    alert-volume \
    false-positive-rate \
    incident-closure-rate \
    analyst-efficiency

# Generate management report
cosmicsec soc report \
  --type executive \
  --period monthly \
  --include-trends \
  --export-pdf soc-monthly-report.pdf
```

**Real-Time Statistics**:
```
┌─────────────────── SOC Dashboard ────────────────────┐
│                                                       │
│  Critical Alerts: 3        MTTD: 4.2 min            │
│  High Alerts: 12          MTTR: 18.5 min            │
│  Medium Alerts: 45        False Positive: 8.3%      │
│  Open Incidents: 5        Analysts Online: 4/6      │
│                                                       │
│  Top Alert Sources:                                  │
│  ███████████ Endpoint (45%)                         │
│  ████████ Firewall (32%)                            │
│  ████ Email Gateway (15%)                           │
│  ██ Web Proxy (8%)                                  │
│                                                       │
│  Recent Incidents:                                   │
│  🔴 INC-001: Ransomware on DC01 [Investigating]    │
│  🟠 INC-003: Brute Force on VPN [Contained]        │
│  🟡 INC-005: Phishing Campaign [Analyzing]         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 🚀 Advanced SOC Workflows

### 1. Automated Triage Pipeline

```bash
# Configure auto-triage
cosmicsec soc auto-triage configure \
  --ml-model alert-classifier \
  --actions \
    true-positive:create-incident \
    false-positive:close-with-note \
    unknown:assign-to-analyst \
  --confidence-threshold 0.85

# Monitor triage performance
cosmicsec soc auto-triage metrics \
  --show-accuracy \
  --show-time-saved \
  --export metrics.csv
```

### 2. Threat Intelligence Integration

**Feed Management**:
```bash
# Add threat intel feeds
cosmicsec soc threat-intel add-feed \
  --name "AlienVault OTX" \
  --type stix \
  --url https://otx.alienvault.com/api/v1/pulses/subscribed \
  --api-key $OTX_API_KEY \
  --update-interval 1h

# Cross-reference with logs
cosmicsec soc threat-intel correlate \
  --feeds all \
  --data-sources splunk,sentinel \
  --time-range 7d \
  --auto-alert true
```

**IOC Management**:
```bash
# Import IOCs
cosmicsec soc ioc import \
  --format stix \
  --file threat-intel/apt29.json \
  --tags apt29,russia,advanced-threat \
  --expiry 90d

# Export IOCs for blocklist
cosmicsec soc ioc export \
  --type ip,domain \
  --format csv \
  --confidence high,medium \
  --output blocklist.csv
```

### 3. User Entity Behavior Analytics (UEBA)

```bash
# Enable UEBA
cosmicsec soc ueba enable \
  --entities users,devices,applications \
  --baseline-period 30d \
  --risk-scoring true

# Investigate risky users
cosmicsec soc ueba investigate \
  --entity user:john.doe \
  --show-anomalies \
  --risk-timeline \
  --peer-comparison

# Create behavioral rules
cosmicsec soc ueba create-rule \
  --name "unusual-country-login" \
  --condition "login.country != user.baseline.countries" \
  --risk-score +30 \
  --alert-severity medium
```

### 4. Log Analysis & Forensics

**Advanced Log Queries**:
```bash
# Search logs with natural language
cosmicsec soc query \
  --nl "show me all failed SSH attempts from external IPs in the last hour"

# Complex query
cosmicsec soc query \
  --source windows-security \
  --filter "EventID=4625 AND LogonType=3" \
  --aggregate-by SourceIP \
  --having "count > 10" \
  --time-range 1h
```

**Log Enrichment**:
```bash
# Enrich logs with context
cosmicsec soc enrich \
  --log-source firewall \
  --enrich-fields src_ip,dst_ip,domain \
  --providers \
    geoip \
    virustotal \
    abuseipdb \
    whois \
  --cache-results
```

### 5. Continuous Monitoring

**Real-Time Alerting**:
```bash
# Set up real-time monitors
cosmicsec soc monitor create \
  --name "critical-alerts" \
  --condition "severity='critical'" \
  --notifications slack,pagerduty,email \
  --escalation-after 5m

# Monitor specific assets
cosmicsec soc monitor asset \
  --assets critical-servers.txt \
  --alert-on \
    new-connections \
    process-execution \
    file-modifications \
    registry-changes \
  --baseline-learning 7d
```

---

## 💡 Pro Tips for SOC Analysts

### 1. Reduce Alert Fatigue

```bash
# Tune noisy alerts
cosmicsec soc tune-alerts \
  --analyze-false-positives \
  --suggest-rule-modifications \
  --auto-suppress-known-good \
  --consolidate-similar-alerts

# Create whitelist
cosmicsec soc whitelist add \
  --type process \
  --value "C:\\Windows\\System32\\svchost.exe" \
  --reason "legitimate system process" \
  --approved-by senior-analyst
```

### 2. Leverage AI for Investigation

```bash
# AI-assisted investigation
cosmicsec soc ai investigate \
  --alert-id ALERT-123 \
  --suggest-next-steps \
  --find-related-alerts \
  --recommend-containment \
  --draft-report

# Ask security questions
cosmicsec soc ai ask \
  "Is this PowerShell command malicious?" \
  --context alert-ALERT-123.json
```

### 3. Collaboration & Knowledge Sharing

```bash
# Share investigation notes
cosmicsec soc collaborate \
  --incident INC-2024-001 \
  --share-with tier2-analysts \
  --add-note "Pivot to check other DCs for same IOCs" \
  --attach evidence/memory-dump.dmp

# Create playbook from investigation
cosmicsec soc playbook create-from-incident \
  --incident INC-2024-001 \
  --extract-steps \
  --name "dc-ransomware-response"
```

### 4. Continuous Learning

```bash
# Practice with simulations
cosmicsec soc training simulate \
  --scenario ransomware-attack \
  --difficulty advanced \
  --team-mode \
  --time-limited 60m

# Review past incidents
cosmicsec soc review \
  --incident-id INC-2023-156 \
  --analyze-response-time \
  --identify-improvements \
  --update-playbook
```

---

## 📚 Integration Examples

### SIEM Integration (Splunk)

```python
# Python integration example
import requests

# Connect to SOC platform
base = "http://localhost:8000"

# Forward Splunk alerts to CosmicSec
def forward_alert(alert):
    requests.post(
        f"{base}/api/webhooks/events",
        json={
            "event_type": "splunk.alert",
            "title": alert["title"],
            "severity": alert["severity"],
            "source": "splunk",
            "raw_data": alert,
            "auto_enrich": True,
            "auto_triage": True,
        },
        timeout=10,
    )

# Query Splunk from CosmicSec
results = requests.get(
    f"{base}/api/threat-intel/ip",
    params={"indicator": "8.8.8.8"},
    timeout=10,
).json()
```

### SOAR Integration (Palo Alto Cortex XSOAR)

```python
# Trigger XSOAR playbook from CosmicSec
soc.soar.trigger_playbook(
    platform='xsoar',
    playbook='Phishing Investigation',
    incident_id='INC-2024-001',
    parameters={
        'email_id': '123456',
        'auto_remediate': True
    }
)
```

### Ticketing Integration (ServiceNow)

```python
# Auto-create ServiceNow tickets
soc.integrations.servicenow.create_incident(
    short_description=f"Security Alert: {alert.title}",
    description=alert.detailed_description,
    priority=alert.severity,
    assignment_group='Security Operations',
    category='Security Incident'
)
```

---

## 🎓 SOC Analyst Training

### Learning Path

1. **Level 1: Fundamentals**
   - Alert triage and classification
   - Basic log analysis
   - Using SIEM effectively
   - Incident documentation

2. **Level 2: Intermediate**
   - Threat hunting basics
   - Malware analysis fundamentals
   - Network traffic analysis
   - Playbook execution

3. **Level 3: Advanced**
   - Advanced threat hunting
   - Forensics and incident response
   - Threat intelligence analysis
   - Playbook creation and automation

```bash
# Start training
cosmicsec soc training start \
  --level intermediate \
  --focus threat-hunting,malware-analysis

# Track progress
cosmicsec soc training progress
```

---

## 📊 Sample Queries & Use Cases

### Detect Lateral Movement

```sql
-- KQL Query
SecurityEvent
| where EventID == 4624  // Successful logon
| where LogonType == 3   // Network logon
| where AccountName != "SYSTEM"
| summarize LogonCount = count() by AccountName, SourceIP, Computer
| where LogonCount > 5
| where Computer != SourceIP
```

### Find Privilege Escalation

```sql
-- KQL Query
SecurityEvent
| where EventID in (4672, 4673)  // Special privileges assigned
| where TargetUserName !endswith "$"
| summarize PrivEscCount = count() by TargetUserName, Computer
| where PrivEscCount > 3
```

### Detect Data Exfiltration

```sql
-- KQL Query
CommonSecurityLog
| where DeviceAction == "allowed"
| where BytesOut > 100000000  // 100 MB
| where DestinationIP !in (internal_ips)
| summarize TotalBytesOut = sum(BytesOut) by SourceIP, DestinationIP
```

---

## 🔗 Quick Reference

### Essential Commands

```bash
# Dashboard
cosmicsec soc dashboard

# Alerts
cosmicsec soc alerts --filter <filter>
cosmicsec soc alerts prioritize
cosmicsec soc alerts correlate

# Incidents
cosmicsec soc incident create
cosmicsec soc incident update --id <id>
cosmicsec soc incident escalate --id <id>

# Threat Hunting
cosmicsec soc hunt create --hypothesis <text>
cosmicsec soc hunt ioc --ioc-file <file>
cosmicsec soc hunt behavioral

# SOAR
cosmicsec soc playbook run --name <name>
cosmicsec soc contain --type <type>

# Metrics
cosmicsec soc metrics
cosmicsec soc report --type <type>
```

---

**Stay Vigilant! 🛡️📊**

For more information, visit our [SOC documentation](https://docs.hacker-ai.com/soc) or join our [SOC Analyst Community](https://community.hacker-ai.com/soc).
