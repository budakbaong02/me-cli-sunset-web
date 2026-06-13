import type { MyXlClientConfig } from "./config";
import { hostFromUrl } from "./config";
import { decryptApiResponse, encryptSignXdata } from "./xdata";
import { javaLikeTimestamp } from "./time";

import type { FetchFn } from "./ciam";

export interface EngselTokens {
  access_token: string;
  id_token: string;
  refresh_token?: string;
}

export interface EngselClientOptions {
  config: MyXlClientConfig;
  fetchFn?: FetchFn;
}

export function createEngselClient(options: EngselClientOptions) {
  const { config } = options;
  const fetchFn = options.fetchFn ?? fetch;
  const apiHost = hostFromUrl(config.baseApiUrl);

  async function sendApiRequest(
    path: string,
    payload: Record<string, unknown>,
    idToken: string,
    method = "POST",
    nowMs?: number,
  ): Promise<Record<string, unknown> | string> {
    const signed = await encryptSignXdata(config.crypto, method, path, idToken, payload, nowMs);
    const xtime = signed.encrypted_body.xtime;
    const sigTimeSec = Math.floor(xtime / 1000);
    const body = signed.encrypted_body;
    const now = new Date();

    const headers: Record<string, string> = {
      host: apiHost,
      "content-type": "application/json; charset=utf-8",
      "user-agent": config.ua,
      "x-api-key": config.apiKey,
      authorization: `Bearer ${idToken}`,
      "x-hv": "v3",
      "x-signature-time": String(sigTimeSec),
      "x-signature": signed.x_signature,
      "x-request-id": crypto.randomUUID(),
      "x-request-at": javaLikeTimestamp(now),
      "x-version-app": "8.9.0",
    };

    const res = await fetchFn(`${config.baseApiUrl}/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return decryptApiResponse(config.crypto, await res.text());
  }

  async function getProfile(accessToken: string, idToken: string) {
    const res = await sendApiRequest(
      "api/v8/profile",
      { access_token: accessToken, app_version: "8.9.0", is_enterprise: false, lang: "en" },
      idToken,
    );
    if (typeof res === "string" || !res.data) return null;
    return res.data as Record<string, unknown>;
  }

  async function getBalance(idToken: string) {
    const res = await sendApiRequest(
      "api/v8/packages/balance-and-credit",
      { is_enterprise: false, lang: "en" },
      idToken,
    );
    if (typeof res === "string") return null;
    const data = res.data as Record<string, unknown> | undefined;
    return (data?.balance as Record<string, unknown>) ?? null;
  }

  async function getQuotaDetails(idToken: string, familyMemberId = "") {
    const res = await sendApiRequest(
      "api/v8/packages/quota-details",
      { is_enterprise: false, lang: "en", family_member_id: familyMemberId },
      idToken,
    );
    if (typeof res === "string" || res.status !== "SUCCESS") return null;
    return res.data as Record<string, unknown>;
  }

  async function getTieringInfo(idToken: string) {
    const res = await sendApiRequest(
      "gamification/api/v8/loyalties/tiering/info",
      { is_enterprise: false, lang: "en" },
      idToken,
    );
    if (typeof res === "string" || !res.data) return null;
    return res.data as Record<string, unknown>;
  }

  async function loginInfo(tokens: EngselTokens, isEnterprise = false) {
    const res = await sendApiRequest(
      "api/v8/auth/login",
      { access_token: tokens.access_token, is_enterprise: isEnterprise, lang: "en" },
      tokens.id_token,
    );
    if (typeof res === "string" || !res.data) return null;
    return res.data as Record<string, unknown>;
  }

  return {
    sendApiRequest,
    getProfile,
    getBalance,
    getQuotaDetails,
    getTieringInfo,
    loginInfo,
  };
}

export type EngselClient = ReturnType<typeof createEngselClient>;