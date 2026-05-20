"use client";

import { useState } from "react";

type CheckoutPaymentRail = "przelewy24" | "przelew_bankowy";

export function BookingCheckoutForm({
  profileId,
  meetingTypeId,
  start,
  sessionSummary,
  officeLocation,
  requiresOnlinePayment,
}: {
  profileId: string;
  meetingTypeId: string;
  start: string;
  returnSlug: string;
  sessionSummary: string;
  officeLocation?: string | null;
  requiresOnlinePayment: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [paymentRail, setPaymentRail] = useState<CheckoutPaymentRail | "">("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (requiresOnlinePayment) {
      if (!consentPrivacy) {
        setMessage("Zaznacz wymaganą zgodę, aby kontynuować.");
        setLoading(false);
        return;
      }
      if (!paymentRail) {
        setMessage("Wybierz metodę płatności.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          meetingTypeId,
          start,
          guestName,
          guestEmail,
          notes,
          ...(requiresOnlinePayment
            ? {
                consentPrivacyTherapist: consentPrivacy,
                consentMarketingEmail: consentMarketing,
                paymentRail,
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Błąd rezerwacji");
        return;
      }
      if (data.payLater && typeof data.bookingId === "string") {
        window.location.href = `/book/confirmed?bookingId=${encodeURIComponent(data.bookingId)}`;
        return;
      }
      if (typeof data.redirectUrl === "string") {
        window.location.href = data.redirectUrl;
        return;
      }
      if (typeof data.bookingId === "string") {
        window.location.href = `/book/confirmed?bookingId=${encodeURIComponent(data.bookingId)}`;
        return;
      }
      setMessage("Nieoczekiwana odpowiedź serwera.");
    } catch {
      setMessage("Błąd sieci");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={submitBooking}
      className="space-y-3 rounded-xl border border-[#b9e9f5] bg-white p-5 shadow-sm"
    >
      <div className="rounded-lg border border-[#b9e9f5] bg-[#F3FAFC] px-3 py-2 text-sm text-[#1d4e5f]">
        <p>{sessionSummary}</p>
        {officeLocation ? (
          <p className="mt-2 border-t border-[#b9e9f5]/80 pt-2">
            <strong className="text-[#003C79]">Gabinet:</strong> {officeLocation}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Imię <span className="text-red-600">*</span>
        </label>
        <input
          required
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="Imię"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          E-mail <span className="text-red-600">*</span>
        </label>
        <input
          required
          type="email"
          className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
          placeholder="E-mail"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          disabled={loading}
        />
      </div>
      <textarea
        className="w-full rounded-xl border border-[#9fd6e5] px-3 py-2 text-sm shadow-sm focus:border-[#37B3D6] focus:outline-none focus:ring-1 focus:ring-[#37B3D6]"
        placeholder="Uwagi (opcjonalnie)"
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={loading}
      />

      {requiresOnlinePayment && (
        <>
          <fieldset
            disabled={loading}
            className="space-y-2 rounded-lg border border-[#9fd6e5] bg-[#fafcfd] px-3 py-3 disabled:opacity-70"
          >
            <legend className="px-1 text-sm font-medium text-[#003C79]">
              Metoda płatności <span className="text-red-600">*</span>
            </legend>
            <p className="text-xs text-slate-600">
              Po kliknięciu „Kupuję i płacę” przejdziesz na bezpieczną stronę Przelewy24.
            </p>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="paymentRail"
                className="mt-1"
                checked={paymentRail === "przelewy24"}
                onChange={() => setPaymentRail("przelewy24")}
              />
              <span>Przelewy24 (BLIK, karta, szybki przelew)</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="paymentRail"
                className="mt-1"
                checked={paymentRail === "przelew_bankowy"}
                onChange={() => setPaymentRail("przelew_bankowy")}
              />
              <span>Przelew bankowy (logowanie do banku w Przelewy24)</span>
            </label>
          </fieldset>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={consentPrivacy}
              onChange={(e) => setConsentPrivacy(e.target.checked)}
              disabled={loading}
              className="mt-0.5"
            />
            <span>
              <span className="text-red-600">*</span> Oświadczam, że zapoznałem/am się z{" "}
              <a href="#" className="font-medium text-[#37B3D6] underline underline-offset-2">
                polityką prywatności
              </a>{" "}
              i{" "}
              <a href="#" className="font-medium text-[#37B3D6] underline underline-offset-2">
                regulaminem
              </a>{" "}
              oraz zgadzam się, aby moje dane osobowe udostępnione były do wybranego terapeuty w
              celu umówienia sesji.
            </span>
          </label>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={consentMarketing}
              onChange={(e) => setConsentMarketing(e.target.checked)}
              disabled={loading}
              className="mt-0.5"
            />
            <span>
              Wyrażam zgodę na przetwarzanie moich danych osobowych w celu otrzymywania od
              Trzymsie.pl sp. z o.o. informacji handlowej i marketingowej przy wykorzystaniu
              środków komunikacji elektronicznej za pośrednictwem kanału komunikacji e-mail.
              (opcjonalne)
            </span>
          </label>
        </>
      )}

      {message && <p className="text-sm text-[#003C79]">{message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#37B3D6] py-3 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
      >
        {loading ? "Przetwarzanie..." : "Kupuję i płacę"}
      </button>
    </form>
  );
}
