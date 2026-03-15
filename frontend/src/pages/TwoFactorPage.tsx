import { Button } from "../components/ui/button";

export function TwoFactorPage() {
    return (
        <section className="max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Two-Factor Verification</h2>
            <input className="w-full rounded border border-slate-700 bg-slate-950 p-2" placeholder="6-digit code" />
            <Button className="w-full">Verify</Button>
        </section>
    );
}
