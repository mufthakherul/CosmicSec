import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function LoginPage() {
  return (
    <section className="max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">Login</h2>
      <input className="w-full rounded border border-slate-700 bg-slate-950 p-2" placeholder="Email" />
      <input className="w-full rounded border border-slate-700 bg-slate-950 p-2" placeholder="Password" type="password" />
      <Button className="w-full">Sign in</Button>
      <div className="flex justify-between text-sm text-slate-300">
        <Link to="/auth/register">Create account</Link>
        <Link to="/auth/forgot">Forgot password?</Link>
      </div>
    </section>
  );
}
