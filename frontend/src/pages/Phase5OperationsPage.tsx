import { useQuery } from "@tanstack/react-query";
import { fetchBugBountyEarnings, fetchPhase5RiskPosture, fetchPhase5SocDashboard } from "../services/phase5Api";

export function Phase5OperationsPage() {
  const riskPosture = useQuery({ queryKey: ["phase5-risk-posture"], queryFn: fetchPhase5RiskPosture });
  const socDashboard = useQuery({ queryKey: ["phase5-soc-dashboard"], queryFn: fetchPhase5SocDashboard });
  const bountyEarnings = useQuery({ queryKey: ["phase5-bugbounty-earnings"], queryFn: fetchBugBountyEarnings });

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Phase 5 Advanced Operations</h2>
      <p className="text-sm text-slate-400">
        Unified view for executive risk posture, SOC metrics, and bug bounty program outcomes.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded border border-slate-700 p-4">
          <h3 className="font-medium">Executive Risk Posture</h3>
          {riskPosture.isLoading ? <p>Loading...</p> : null}
          {riskPosture.error ? <p className="text-red-400">Unavailable</p> : null}
          {riskPosture.data ? <p>Security Score: {riskPosture.data.overall_security_score}</p> : null}
        </article>

        <article className="rounded border border-slate-700 p-4">
          <h3 className="font-medium">SOC Alert Dashboard</h3>
          {socDashboard.isLoading ? <p>Loading...</p> : null}
          {socDashboard.error ? <p className="text-red-400">Unavailable</p> : null}
          {socDashboard.data ? (
            <p>
              Alerts: {socDashboard.data.total_alerts} | Critical: {socDashboard.data.critical_alerts}
            </p>
          ) : null}
        </article>

        <article className="rounded border border-slate-700 p-4">
          <h3 className="font-medium">Bug Bounty Earnings</h3>
          {bountyEarnings.isLoading ? <p>Loading...</p> : null}
          {bountyEarnings.error ? <p className="text-red-400">Unavailable</p> : null}
          {bountyEarnings.data ? <p>Total Paid: {bountyEarnings.data.total_paid}</p> : null}
        </article>
      </div>
    </section>
  );
}
