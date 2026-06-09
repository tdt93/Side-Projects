"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }
      router.push("/platform/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1c1410] p-6 shadow-xl">
        <h1 className="mb-1 font-serif text-2xl">RestoHub Management</h1>
        <p className="mb-6 text-sm text-[#8a7060]">Platform admin — all subscribed restaurants</p>
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs uppercase text-[#6b5b50]">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#120d09] px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="mb-5 block text-sm">
          <span className="mb-1 block text-xs uppercase text-[#6b5b50]">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#120d09] px-3 py-2 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #c4622d, #f59e0b)" }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
