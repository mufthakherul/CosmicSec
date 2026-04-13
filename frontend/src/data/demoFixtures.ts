/**
 * Static demo fixtures shown on the public demo sandbox page.
 * No real backend calls are made — all data is pre-baked.
 */

export const DEMO_SCAN = {
  id: "demo-scan-001",
  target: "demo.example.com",
  status: "completed",
  progress: 100,
  created_at: "2026-04-13T10:00:00Z",
  summary: {
    total_findings: 3,
    critical: 1,
    high: 1,
    medium: 1,
    low: 0,
  },
};

export const DEMO_FINDINGS = [
  {
    id: "f-001",
    title: "SQL Injection in Login Form",
    severity: "critical",
    description:
      "The /auth/login endpoint is vulnerable to SQL injection via the 'username' parameter. An attacker can bypass authentication or extract database contents.",
    evidence: "Payload: ' OR '1'='1'; Response: 200 OK (unexpected login success)",
    tool: "sqlmap",
    target: "demo.example.com/auth/login",
    cve_id: null,
    cvss_score: 9.8,
    mitre_technique: "T1190",
  },
  {
    id: "f-002",
    title: "Reflected XSS in Search Parameter",
    severity: "high",
    description:
      "The 'q' parameter in the search endpoint reflects unsanitised input into the page response, allowing script injection.",
    evidence: "Payload: <script>alert(1)</script> reflected in response body",
    tool: "nikto",
    target: "demo.example.com/search?q=",
    cve_id: null,
    cvss_score: 7.4,
    mitre_technique: "T1059.007",
  },
  {
    id: "f-003",
    title: "Outdated TLS Configuration",
    severity: "medium",
    description:
      "The server accepts TLS 1.0 and 1.1 connections which are considered deprecated. Only TLS 1.2+ should be accepted.",
    evidence: "TLS 1.0 handshake succeeded on port 443",
    tool: "nmap",
    target: "demo.example.com:443",
    cve_id: "CVE-2011-3389",
    cvss_score: 5.9,
    mitre_technique: null,
  },
];

export const DEMO_RECON = {
  target: "demo.example.com",
  dns: {
    a_records: ["93.184.216.34"],
    mx_records: ["mail.demo.example.com"],
    ns_records: ["ns1.demo.example.com", "ns2.demo.example.com"],
  },
  subdomains: ["api.demo.example.com", "admin.demo.example.com", "mail.demo.example.com"],
  shodan: {
    ports: [80, 443, 8080],
    org: "Example Organization",
    country: "US",
  },
  virustotal: {
    malicious: 0,
    suspicious: 1,
    harmless: 68,
  },
};

export const DEMO_AI_ANALYSIS = {
  risk_score: 82,
  risk_level: "critical",
  summary:
    "The target has a critical SQL injection vulnerability that allows authentication bypass and data exfiltration. Combined with the reflected XSS, an attacker could perform account takeover and steal session tokens. Immediate remediation is recommended.",
  recommendations: [
    "Implement parameterized queries / prepared statements for all database interactions",
    "Apply output encoding on all user-controlled data reflected in HTML responses",
    "Upgrade TLS configuration to enforce TLS 1.2+ and disable legacy cipher suites",
    "Deploy a Web Application Firewall (WAF) as a defence-in-depth layer",
  ],
  mitre_mappings: [
    { technique: "T1190", name: "Exploit Public-Facing Application", tactics: ["Initial Access"] },
    { technique: "T1059.007", name: "JavaScript Execution", tactics: ["Execution"] },
  ],
};
