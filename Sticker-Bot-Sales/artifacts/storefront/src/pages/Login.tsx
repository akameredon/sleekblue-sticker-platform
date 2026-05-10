/**
 * Login.tsx — Customer login page.
 * On success: stores JWT + user, redirects to /account or previous page.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/paths";
import { setAuth } from "@/lib/auth";
import { Loader2, LogIn, Sparkles } from "lucide-react";

export function LoginPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      setAuth(data.token, data.user);
      navigate("/account");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to track your orders and reorder easily</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover-elevate"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
