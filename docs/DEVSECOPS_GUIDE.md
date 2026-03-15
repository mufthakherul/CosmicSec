# 👨‍💻 Security Developer & DevSecOps Guide to CosmicSec

## Introduction

CosmicSec provides comprehensive tools for integrating security into the software development lifecycle (SDLC) through the **GuardAxisSphere** platform. Powered by **Helix AI** for intelligent code analysis and automated security fixes, this guide covers secure code analysis, dependency scanning, CI/CD integration, IDE plugins, and DevSecOps automation.

---

## 🎯 Key Features for Security Developers

### 1. AI-Powered Code Security Analysis (SAST)

**Analyze Code for Vulnerabilities**:
```bash
# Scan entire repository
cosmicsec devsec scan \
  --path /path/to/repo \
  --languages python,javascript,java \
  --include-dependencies \
  --fix-suggestions \
  --output report.html

# Scan specific files
cosmicsec devsec scan-file \
  --file src/auth/login.py \
  --ai-analysis \
  --show-dataflow \
  --suggest-remediation
```

**AI-Powered Fix Suggestions**:
```bash
# Get AI-powered fix for vulnerability
cosmicsec devsec fix \
  --vulnerability-id VULN-001 \
  --use-llm gpt-4 \
  --generate-patch \
  --explain-fix \
  --test-fix

# Auto-fix common vulnerabilities
cosmicsec devsec auto-fix \
  --path src/ \
  --types sqli,xss,path-traversal \
  --create-pr \
  --run-tests
```

### 2. Dependency Security (SCA - Software Composition Analysis)

**Scan Dependencies**:
```bash
# Scan package dependencies
cosmicsec devsec deps scan \
  --manifest package.json \
  --check-cve \
  --check-licenses \
  --check-malware \
  --output deps-report.json

# Multi-language support
cosmicsec devsec deps scan \
  --manifests \
    package.json \
    requirements.txt \
    pom.xml \
    go.mod \
  --severity-threshold medium
```

**Auto-Update Dependencies**:
```bash
# Create PR for dependency updates
cosmicsec devsec deps update \
  --manifest package.json \
  --update-vulnerable-only \
  --run-tests \
  --create-pr \
  --pr-title "Security: Update vulnerable dependencies"

# Continuous monitoring
cosmicsec devsec deps monitor \
  --manifests requirements.txt,package.json \
  --alert-on-new-cve \
  --notify-slack \
  --auto-create-issue
```

### 3. IDE Integration

**VS Code Extension**:
```bash
# Install VS Code extension
code --install-extension hacker-ai.security-assistant

# Configure extension
cosmicsec devsec ide config-vscode \
  --api-key $CosmicSec_API_KEY \
  --enable-realtime-scan \
  --enable-ai-suggestions \
  --enable-inline-docs
```

**Features**:
- Real-time vulnerability highlighting
- Inline fix suggestions
- Security documentation tooltips
- Dependency vulnerability warnings
- Secret detection
- Code quality checks

**JetBrains Plugin** (IntelliJ IDEA, PyCharm, WebStorm):
```bash
# Install JetBrains plugin
cosmicsec devsec ide install-jetbrains \
  --products intellij,pycharm,webstorm

# Features:
# - Context-aware security analysis
# - Quick-fix suggestions (Alt+Enter)
# - Security inspection profiles
# - Integration with IDE test runner
```

**Vim/Neovim Plugin**:
```vim
" Add to .vimrc / init.vim
Plug 'hacker-ai/vim-security'

" Configure
let g:cosmicsec_api_key = 'your-api-key'
let g:cosmicsec_auto_scan = 1
let g:cosmicsec_inline_warnings = 1

" Commands:
:HackerAIScan          " Scan current file
:HackerAIFix           " Fix vulnerability under cursor
:HackerAIDeps          " Check dependencies
```

### 4. CI/CD Pipeline Integration

**GitHub Actions**:
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: CosmicSec Security Scan
        uses: hacker-ai/security-scan@v1
        with:
          api-key: ${{ secrets.CosmicSec_API_KEY }}
          scan-type: full
          fail-on-severity: high
          create-github-issues: true

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: hacker-ai-results.sarif
```

**GitLab CI**:
```yaml
# .gitlab-ci.yml
security_scan:
  image: hackerai/scanner:latest
  stage: test
  script:
    - cosmicsec devsec scan --path . --output-format gitlab
  artifacts:
    reports:
      sast: hacker-ai-sast.json
      dependency_scanning: hacker-ai-deps.json
  only:
    - merge_requests
    - main
```

**Jenkins Pipeline**:
```groovy
// Jenkinsfile
pipeline {
    agent any

    stages {
        stage('Security Scan') {
            steps {
                script {
                    def scanResult = sh(
                        script: """
                            cosmicsec devsec scan \
                              --path . \
                              --format jenkins \
                              --fail-on-critical
                        """,
                        returnStatus: true
                    )

                    if (scanResult != 0) {
                        error("Security vulnerabilities found!")
                    }
                }
            }
        }

        stage('Dependency Check') {
            steps {
                sh 'cosmicsec devsec deps scan --manifest pom.xml'
            }
        }
    }

    post {
        always {
            publishHTML([
                reportDir: 'security-reports',
                reportFiles: 'index.html',
                reportName: 'Security Report'
            ])
        }
    }
}
```

### 5. Pre-Commit Hooks

**Secret Scanning**:
```bash
# Install pre-commit hook
cosmicsec devsec install-hooks \
  --hooks secret-scan,sast,linting \
  --fail-on-secrets true

# .git/hooks/pre-commit
#!/bin/bash
cosmicsec devsec pre-commit \
  --scan-secrets \
  --scan-vulnerabilities \
  --auto-fix-linting \
  --block-on-critical
```

**Custom Hook Configuration**:
```yaml
# .hacker-ai-pre-commit.yml
hooks:
  secret-scan:
    enabled: true
    patterns:
      - api_key
      - password
      - private_key
      - token
    exclude-files:
      - "**/*.md"
      - "**/test/**"

  vulnerability-scan:
    enabled: true
    languages: [ python, javascript, java ]
    severity-threshold: medium

  dependency-check:
    enabled: true
    fail-on-outdated: false
    fail-on-vulnerable: true
```

### 6. Container Security

**Docker Image Scanning**:
```bash
# Scan Docker image
cosmicsec devsec container scan \
  --image myapp:latest \
  --check-cve \
  --check-secrets \
  --check-misconfig \
  --output-format json

# Scan during build
docker build -t myapp:latest . && \
  cosmicsec devsec container scan --image myapp:latest --fail-on-high

# Continuous monitoring
cosmicsec devsec container monitor \
  --registry docker.io/mycompany \
  --scan-interval 24h \
  --alert-on-new-cve
```

**Kubernetes Security**:
```bash
# Scan K8s manifests
cosmicsec devsec k8s scan \
  --manifests k8s/*.yaml \
  --check-policies cis,nsa-cisa,pss \
  --check-misconfig \
  --suggest-fixes

# Runtime security monitoring
cosmicsec devsec k8s monitor \
  --namespace production \
  --detect-anomalies \
  --block-suspicious \
  --alert-webhook https://slack.webhook.url
```

### 7. Infrastructure as Code (IaC) Security

**Terraform Scanning**:
```bash
# Scan Terraform code
cosmicsec devsec iac scan \
  --type terraform \
  --path terraform/ \
  --check-misconfig \
  --check-compliance pci-dss,hipaa \
  --output report.html

# Scan before apply
terraform plan -out=tfplan && \
  terraform show -json tfplan > tfplan.json && \
  cosmicsec devsec iac validate --plan tfplan.json --fail-on-critical
```

**CloudFormation Scanning**:
```bash
# Scan AWS CloudFormation
cosmicsec devsec iac scan \
  --type cloudformation \
  --template template.yaml \
  --check-security-groups \
  --check-iam-policies \
  --check-encryption
```

**Ansible Playbook Security**:
```bash
# Scan Ansible playbooks
cosmicsec devsec iac scan \
  --type ansible \
  --playbooks playbooks/*.yml \
  --check-secrets \
  --check-permissions \
  --check-hardening
```

---

## 🚀 Advanced DevSecOps Workflows

### 1. Shift-Left Security

**Developer-Friendly Security**:
```bash
# Quick security check during development
cosmicsec devsec quick-check \
  --files $(git diff --name-only) \
  --show-only critical,high \
  --inline-suggestions

# Security as Code
cosmicsec devsec policy create \
  --name "company-security-policy" \
  --rules security-policies/*.rego \
  --enforce-on-commit
```

### 2. Security Gates in CI/CD

**Quality Gates**:
```yaml
# security-gates.yml
gates:
  sast:
    critical: 0
    high: 2
    medium: 10

  dependencies:
    critical_cve: 0
    outdated_major: 5

  secrets:
    exposed: 0

  code_coverage:
    min_coverage: 80

  container:
    critical_cve: 0
    high_cve: 3
```

**Enforce Gates**:
```bash
# Run security gates
cosmicsec devsec gates check \
  --config security-gates.yml \
  --scan-results ./reports/ \
  --fail-on-violation \
  --report-to jira
```

### 3. Security Regression Testing

**Security Test Suite**:
```python
# security_tests.py
import requests

class TestAuthentication:
    def test_no_sql_injection(self):
        payload = {"target": "example.com", "scan_types": ["web"], "depth": 1}
        r = requests.post("http://localhost:8000/api/scans", json=payload, timeout=30)
        assert r.status_code in (200, 201)

    def test_password_hashing(self):
        assert True
        self.scan_file("src/auth/password.py")
        self.assert_uses_secure_hash(algorithms=["bcrypt", "argon2"])

    def test_no_hardcoded_secrets(self):
        """Check for hardcoded secrets"""
        self.scan_directory("src/")
        self.assert_no_secrets()
```

**Run Security Tests**:
```bash
# Run security test suite
cosmicsec devsec test \
  --test-dir tests/security/ \
  --parallel \
  --output junit.xml

# Integrate with pytest
pytest tests/security/ --hacker-ai --cov=src
```

### 4. Developer Training & Awareness

**Interactive Secure Coding Labs**:
```bash
# Start a secure coding challenge
cosmicsec devsec training start \
  --language python \
  --topic sql-injection \
  --difficulty intermediate

# Create custom training
cosmicsec devsec training create \
  --from-vulnerabilities ./scan-results.json \
  --generate-exercises \
  --create-quiz
```

### 5. Security Metrics & Dashboards

**Developer Security Scorecard**:
```bash
# View security metrics
cosmicsec devsec metrics \
  --repo mycompany/myapp \
  --period last-quarter \
  --show \
    vulnerability-trends \
    fix-rate \
    time-to-remediate \
    security-debt

# Generate dashboard
cosmicsec devsec dashboard \
  --teams backend,frontend,mobile \
  --export-grafana \
  --live-update
```

---

## 💡 Best Practices for DevSecOps

### 1. Secure by Default

```bash
# Generate secure boilerplate code
cosmicsec devsec scaffold \
  --type rest-api \
  --language python \
  --framework fastapi \
  --security-features auth,rate-limiting,input-validation \
  --compliance pci-dss

# Security templates
cosmicsec devsec template \
  --type secure-login \
  --language javascript \
  --framework react \
  --include-2fa \
  --include-csrf-protection
```

### 2. Least Privilege IAM

```bash
# Analyze IAM policies
cosmicsec devsec iam analyze \
  --cloud aws \
  --check-overprivileged \
  --suggest-least-privilege \
  --export-policies

# Generate minimal IAM policies
cosmicsec devsec iam generate \
  --service s3,dynamodb,lambda \
  --actions read,write \
  --resources-file resources.txt
```

### 3. Secrets Management

**Detect Secrets**:
```bash
# Scan for secrets
cosmicsec devsec secrets scan \
  --path . \
  --types api-key,password,private-key,token \
  --check-git-history \
  --output secrets-report.json

# Rotate leaked secrets
cosmicsec devsec secrets rotate \
  --provider aws-secrets-manager \
  --leaked-secrets secrets-report.json \
  --notify-teams
```

**Integrate with Vault**:
```bash
# Store secrets in HashiCorp Vault
cosmicsec devsec secrets migrate-to-vault \
  --from .env \
  --vault-path secret/myapp \
  --vault-addr https://vault.company.com

# Generate code to retrieve secrets
cosmicsec devsec secrets generate-code \
  --language python \
  --provider vault \
  --secrets-path secret/myapp
```

### 4. Supply Chain Security

**SBOM Generation**:
```bash
# Generate Software Bill of Materials
cosmicsec devsec sbom generate \
  --format cyclonedx \
  --output sbom.json \
  --include-dev-deps \
  --sign-with-cosign

# Verify SBOM
cosmicsec devsec sbom verify \
  --sbom sbom.json \
  --signature sbom.json.sig \
  --public-key cosign.pub
```

**Dependency Provenance**:
```bash
# Verify dependency integrity
cosmicsec devsec deps verify \
  --manifest package-lock.json \
  --check-signatures \
  --check-provenance \
  --block-unsigned
```

---

## 🔗 Integration Examples

### Python Integration

```python
import requests

# Initialize API endpoint
base = "http://localhost:8000"

# Trigger a scan
results = requests.post(
    f"{base}/api/scans",
    json={"target": "example.com", "scan_types": ["web"], "depth": 1},
    timeout=30,
).json()

# Get AI fix suggestions
for vuln in results.vulnerabilities:
    fix = devsec.ai.suggest_fix(
        vulnerability=vuln,
        model="gpt-4"
    )
    print(f"Vulnerability: {vuln.type}")
    print(f"Suggested Fix:\n{fix.code}")
    print(f"Explanation: {fix.explanation}")

# Auto-fix and create PR
if vuln.auto_fixable:
    devsec.fix.apply(
        vulnerability=vuln,
        create_pr=True,
        run_tests=True
    )
```

### JavaScript/TypeScript Integration

```javascript
const { DevSec } = require('@hacker-ai/sdk');

const devsec = new DevSec({ apiKey: process.env.CosmicSec_API_KEY });

// Scan dependencies
async function checkDependencies() {
  const results = await devsec.deps.scan({
    manifest: 'package.json',
    checkCVE: true,
    checkLicenses: true
  });

  if (results.vulnerabilities.length > 0) {
    console.error(`Found ${results.vulnerabilities.length} vulnerabilities`);

    // Create GitHub issues
    for (const vuln of results.critical) {
      await devsec.integrations.github.createIssue({
        title: `[Security] ${vuln.package}: ${vuln.title}`,
        body: vuln.description,
        labels: ['security', 'dependencies']
      });
    }
  }
}

checkDependencies();
```

### Webhook Integration

```python
# Flask webhook receiver
from flask import Flask, request

app = Flask(__name__)

@app.route('/webhook/scan-complete', methods=['POST'])
def handle_scan_complete():
    data = request.json

    if data['severity'] == 'critical':
        # Alert team
        devsec.notifications.send(
            channels=['slack', 'pagerduty'],
            message=f"Critical vulnerability found: {data['title']}",
            urgency='high'
        )

        # Create JIRA ticket
        devsec.integrations.jira.create_issue(
            project='SEC',
            summary=data['title'],
            description=data['description'],
            priority='Highest'
        )

    return {'status': 'ok'}
```

---

## 📚 Security Coding Standards

### Language-Specific Guidelines

**Python**:
```python
# ✅ Good: Parameterized queries
from sqlalchemy import text

def get_user(user_id):
    query = text("SELECT * FROM users WHERE id = :id")
    return db.execute(query, {"id": user_id}).fetchone()

# ❌ Bad: String concatenation
def get_user_bad(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"  # SQL Injection!
    return db.execute(query).fetchone()
```

**JavaScript/Node.js**:
```javascript
// ✅ Good: Input validation
const express = require('express');
const { body, validationResult } = require('express-validator');

app.post('/user', [
  body('email').isEmail().normalizeEmail(),
  body('age').isInt({ min: 0, max: 120 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process validated data
});

// ❌ Bad: No validation
app.post('/user', (req, res) => {
  const { email, age } = req.body;  // Unvalidated input!
  // Process data
});
```

---

## 🎓 Training & Certification

### DevSecOps Learning Path

```bash
# Start DevSecOps training
cosmicsec devsec training \
  --certification devsecops-professional \
  --modules \
    secure-coding \
    ci-cd-security \
    container-security \
    cloud-security \
    compliance
```

### Hands-On Labs

```bash
# Launch interactive lab
cosmicsec devsec lab start \
  --scenario "secure-cicd-pipeline" \
  --difficulty advanced \
  --duration 2h
```

---

## 🔗 Quick Reference

### Essential Commands

```bash
# Code Analysis
cosmicsec devsec scan --path <path>
cosmicsec devsec fix --vulnerability-id <id>

# Dependencies
cosmicsec devsec deps scan --manifest <file>
cosmicsec devsec deps update --create-pr

# IDE
cosmicsec devsec ide config-vscode
cosmicsec devsec ide install-jetbrains

# CI/CD
cosmicsec devsec ci install --platform <platform>
cosmicsec devsec gates check --config <config>

# Container
cosmicsec devsec container scan --image <image>
cosmicsec devsec k8s scan --manifests <path>

# IaC
cosmicsec devsec iac scan --type <type> --path <path>

# Secrets
cosmicsec devsec secrets scan --path <path>
cosmicsec devsec secrets rotate --provider <provider>

# SBOM
cosmicsec devsec sbom generate --format <format>
```

---

**Build Secure Software! 🔒👨‍💻**

For more information, visit our [DevSecOps documentation](https://docs.hacker-ai.com/devsec) or join our [Developer Security Community](https://community.hacker-ai.com/devsec).
