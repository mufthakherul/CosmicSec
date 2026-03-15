export async function fetchPhase5RiskPosture() {
  const response = await fetch("/api/phase5/executive/risk-posture");
  if (!response.ok) {
    throw new Error("Failed to fetch risk posture");
  }
  return response.json();
}

export async function fetchPhase5SocDashboard() {
  const response = await fetch("/api/phase5/soc/alerts/dashboard");
  if (!response.ok) {
    throw new Error("Failed to fetch SOC dashboard");
  }
  return response.json();
}

export async function fetchBugBountyEarnings() {
  const response = await fetch("/api/bugbounty/dashboard/earnings");
  if (!response.ok) {
    throw new Error("Failed to fetch bug bounty earnings");
  }
  return response.json();
}
