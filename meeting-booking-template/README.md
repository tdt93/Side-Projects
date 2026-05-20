# Szablon rezerwacji — wielu terapeutów (Next.js + MySQL)

Publiczne profile w stylu portalu terapeutycznego, wyszukiwanie po **mieście** (lista polskich miast), rezerwacja z **e-mailem**, opcjonalnie **Stripe** (płatność przed wizytą vs później w gabinecie — tylko **super-admin**), synchronizacja **Google Calendar** dla grafiku.

## Wymagania

- Node.js 18+
- MySQL 8+ (np. baza u dostawcy **Cyber-Folk**)

## Konfiguracja

1. Skopiuj [`.env.example`](./.env.example) do `.env` i uzupełnij `DATABASE_URL`, `SESSION_SECRET` (≥32 znaki), `APP_URL`.
2. Zastosuj migracje:

   ```bash
   npx prisma migrate deploy
   ```

   Na pierwszym środowisku, jeśli nie masz historii migracji, możesz użyć:

   ```bash
   npx prisma db push
   ```

3. Zasil dane demo:

   ```bash
   npm run db:seed
   ```

   Domyślnie: `admin@example.com` / `Admin123!`, `therapist@example.com` / `Therapist123!`.

4. Uruchom:

   ```bash
   npm run dev
   ```

## Produkcja (Cyber-Folk / VPS)

- Uruchom `npm run build` i `npm run start` pod menedżerem procesów (np. **PM2**).
- Ustaw **HTTPS** i poprawne `APP_URL` (redirecty Stripe i Google OAuth).
- **Stripe:** utwórz endpoint webhooka na `https://twoja-domena/api/webhooks/stripe` (np. zdarzenie `checkout.session.completed`) i ustaw `STRIPE_WEBHOOK_SECRET`.
- **Google Calendar:** w konsoli Google Cloud dodaj OAuth Client (typ Web), redirect URI: `https://twoja-domena/api/google/calendar/callback`.

## Role

- **SUPER_ADMIN** — treści profili, miasta, **polityka płatności**, Stripe Price ID, ustawienia strony, wszystkie wizyty; może edytować grafik dowolnego terapeuty i powiązać mu kalendarz Google.
- **THERAPIST** — tylko **własny grafik** i połączenie z własnym Google Calendar; **Moje wizyty**; bez edycji płatności i treści publicznej.

## Struktura URL

- `/` — lista terapeutów + wyszukiwanie po mieście (`?city=Warszawa`).
- `/t/[slug]` — profil i widget rezerwacji.
- `/admin` — panel.
