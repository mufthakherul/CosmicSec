import { Button } from "../components/ui/button";

export function ForgotPasswordPage() {
    return (
        <section className="max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Forgot Password</h2>
            <input className="w-full rounded border border-slate-700 bg-slate-950 p-2" placeholder="Email" />
            <Button className="w-full">Send reset link</Button>
        </section>
    );
}
