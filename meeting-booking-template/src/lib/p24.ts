import { createHash } from "crypto";

export type P24PaymentRail = "przelewy24" | "przelew_bankowy";

export const P24_PAYMENT_RAILS: P24PaymentRail[] = ["przelewy24", "przelew_bankowy"];

export function isP24PaymentRail(s: string): s is P24PaymentRail {
  return (P24_PAYMENT_RAILS as readonly string[]).includes(s);
}

type P24Config = {
  merchantId: number;
  posId: number;
  apiKey: string;
  crc: string;
  apiBase: string;
  paymentBase: string;
  bankTransferMethodId: number | null;
};

function p24Sandbox(): boolean {
  return process.env.P24_SANDBOX !== "false";
}

export function getP24Config(): P24Config {
  const merchantId = parseInt(process.env.P24_MERCHANT_ID ?? "", 10);
  const posId = parseInt(process.env.P24_POS_ID ?? process.env.P24_MERCHANT_ID ?? "", 10);
  const apiKey = process.env.P24_API_KEY?.trim() ?? "";
  const crc = process.env.P24_CRC?.trim() ?? "";
  if (!merchantId || !posId || !apiKey || !crc) {
    throw new Error(
      "Brak konfiguracji P24 (P24_MERCHANT_ID, P24_POS_ID, P24_API_KEY, P24_CRC).",
    );
  }
  const sandbox = p24Sandbox();
  const bankRaw = process.env.P24_BANK_TRANSFER_METHOD_ID?.trim();
  const bankTransferMethodId = bankRaw ? parseInt(bankRaw, 10) : null;
  return {
    merchantId,
    posId,
    apiKey,
    crc,
    apiBase: sandbox ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl",
    paymentBase: sandbox ? "https://sandbox.przelewy24.pl" : "https://secure.przelewy24.pl",
    bankTransferMethodId:
      bankTransferMethodId && !Number.isNaN(bankTransferMethodId)
        ? bankTransferMethodId
        : null,
  };
}

function sha384Sign(payload: Record<string, string | number>): string {
  const json = JSON.stringify(payload);
  return createHash("sha384").update(json).digest("hex");
}

export function signRegister(params: {
  sessionId: string;
  merchantId: number;
  amount: number;
  currency: string;
  crc: string;
}): string {
  return sha384Sign({
    sessionId: params.sessionId,
    merchantId: params.merchantId,
    amount: params.amount,
    currency: params.currency,
    crc: params.crc,
  });
}

export function signVerify(params: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: string;
  crc: string;
}): string {
  return sha384Sign({
    sessionId: params.sessionId,
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    crc: params.crc,
  });
}

export function signNotification(params: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  crc: string;
}): string {
  return sha384Sign(params);
}

function basicAuth(cfg: P24Config): string {
  const token = Buffer.from(`${cfg.posId}:${cfg.apiKey}`).toString("base64");
  return `Basic ${token}`;
}

export async function registerP24Transaction(opts: {
  sessionId: string;
  amount: number;
  currency?: string;
  description: string;
  email: string;
  clientName?: string;
  urlReturn: string;
  urlStatus: string;
  paymentRail: P24PaymentRail;
}): Promise<{ token: string; redirectUrl: string }> {
  const cfg = getP24Config();
  const currency = opts.currency ?? "PLN";
  const sign = signRegister({
    sessionId: opts.sessionId,
    merchantId: cfg.merchantId,
    amount: opts.amount,
    currency,
    crc: cfg.crc,
  });

  const body: Record<string, unknown> = {
    merchantId: cfg.merchantId,
    posId: cfg.posId,
    sessionId: opts.sessionId,
    amount: opts.amount,
    currency,
    description: opts.description.slice(0, 250),
    email: opts.email,
    client: opts.clientName?.slice(0, 100) ?? opts.email,
    country: "PL",
    language: "pl",
    urlReturn: opts.urlReturn,
    urlStatus: opts.urlStatus,
    sign,
    encoding: 1,
  };

  if (opts.paymentRail === "przelew_bankowy" && cfg.bankTransferMethodId) {
    body.method = cfg.bankTransferMethodId;
  }

  const res = await fetch(`${cfg.apiBase}/api/v1/transaction/register`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(cfg),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as {
    data?: { token?: string };
    error?: string;
    responseCode?: number;
  } | null;

  if (!res.ok || !json?.data?.token) {
    console.error("[p24] register failed", res.status, json);
    throw new Error(
      json?.error ?? "Nie udało się zarejestrować płatności w Przelewy24.",
    );
  }

  const token = json.data.token;
  return {
    token,
    redirectUrl: `${cfg.paymentBase}/trnRequest/${token}`,
  };
}

export async function verifyP24Transaction(opts: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency?: string;
}): Promise<boolean> {
  const cfg = getP24Config();
  const currency = opts.currency ?? "PLN";
  const sign = signVerify({
    sessionId: opts.sessionId,
    orderId: opts.orderId,
    amount: opts.amount,
    currency,
    crc: cfg.crc,
  });

  const res = await fetch(`${cfg.apiBase}/api/v1/transaction/verify`, {
    method: "PUT",
    headers: {
      Authorization: basicAuth(cfg),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      merchantId: cfg.merchantId,
      posId: cfg.posId,
      sessionId: opts.sessionId,
      amount: opts.amount,
      currency,
      orderId: opts.orderId,
      sign,
    }),
  });

  const json = (await res.json().catch(() => null)) as {
    data?: { status?: string };
    error?: string;
  } | null;

  if (!res.ok) {
    console.error("[p24] verify failed", res.status, json);
    return false;
  }
  return true;
}

/** Amount in grosze (PLN × 100). */
export function resolveSessionPricePlnGrosze(profileGrosze: number | null | undefined): number {
  const fromProfile = profileGrosze ?? 0;
  if (fromProfile > 0) return fromProfile;
  const fromEnv = parseInt(process.env.P24_DEFAULT_PRICE_PLN_GROSZE ?? "", 10);
  if (fromEnv > 0) return fromEnv;
  return 0;
}

export function formatPlnFromGrosze(grosze: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(grosze / 100);
}
