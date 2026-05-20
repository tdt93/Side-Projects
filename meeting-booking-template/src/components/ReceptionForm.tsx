"use client";

import { useState } from "react";

export function ReceptionForm({
  profileId,
  introHtml,
}: {
  profileId: string;
  introHtml: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          name,
          email,
          emailRepeat: email2,
          message,
          consent,
          marketingConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Błąd");
        return;
      }
      setStatus("Wiadomość wysłana. Dziękujemy!");
      setName("");
      setEmail("");
      setEmail2("");
      setMessage("");
      setConsent(false);
      setMarketingConsent(false);
    } catch {
      setStatus("Błąd sieci");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {introHtml ? (
        <div
          className="prose-section mb-4 text-sm text-slate-700"
          dangerouslySetInnerHTML={{ __html: introHtml }}
        />
      ) : null}
      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-[#b9e9f5] bg-white p-4 shadow-sm md:p-5"
      >
        <input
          required
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="Twoje imię"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          required
          type="email"
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="Twój adres e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          required
          type="email"
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="Powtórz adres e-mail"
          value={email2}
          onChange={(e) => setEmail2(e.target.value)}
        />
        <textarea
          required
          rows={4}
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="Twoja wiadomość"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span className="text-red-600">*</span>
          Zapoznałem/am się z polityką prywatności i wyrażam zgodę na przekazanie danych
          terapeucie.
        </label>
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
          />
          Wyrażam zgodę na przetwarzanie moich danych osobowych w celu otrzymywania
          od Trzymsie.pl sp. z o.o. informacji handlowej i marketingowej przy
          wykorzystaniu środków komunikacji elektronicznej za pośrednictwem kanału
          komunikacji e-mail.
        </label>
        {status && <p className="text-sm text-[#1d4e5f]">{status}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#37B3D6] py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {loading ? "Wysyłanie…" : "Wyślij"}
        </button>
      </form>
    </div>
  );
}
