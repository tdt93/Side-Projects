"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = "Błąd logowania";
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string };
            message = parsed.error ?? message;
          } catch {
            // Keep generic message if response is not JSON.
          }
        }
        setErr(message);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErr("Błąd sieci. Spróbuj ponownie.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-[#b9e9f5] bg-white px-4 py-2.5 text-sm font-semibold text-[#003C79] shadow-sm transition hover:border-[#37B3D6] hover:bg-[#F3FAFC]"
      >
        <ChevronLeftIcon className="shrink-0 text-[#37B3D6]" />
        Wróć do strony głównej
      </Link>

      <div className="rounded-2xl border border-[#b9e9f5] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-[#003C79]">Logowanie</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2.5 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2.5 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-[#37B3D6] py-3 text-sm font-semibold text-white shadow-sm hover:brightness-95"
          >
            Zaloguj
          </button>
        </form>
      </div>
    </div>
  );
}
