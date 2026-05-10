/**
 * Register.tsx — Customer account creation.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { apiUrl } from "@/lib/paths";
import { setAuth } from "@/lib/auth";
import { Loader2, UserPlus, Sparkles } from "lucide-react";

export function RegisterPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed"); return; }
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
          <h1 className="mt-4 font-serif text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track orders, reorder fast, get exclusive deals</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          {(["name", "email", "phone", "password"] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                {field === "phone" ? "Phone number" : field}
              </label>
              <input
                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                value={form[field]}
                onChange={set(field)}
                required
                autoComplete={field === "password" ? "new-password" : field}
                placeholder={
                  field === "name" ? "Full name" :
                  field === "email" ? "you@example.com" :
                  field === "phone" ? "08012345678" :
                  "Min 8 characters"
                }
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          {error && (
            <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover-elevate"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
