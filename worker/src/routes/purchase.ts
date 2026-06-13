import { Hono } from "hono";
import { EWALLET_FORM_METHODS, isAsyncPurchaseMethod } from "../clients/purchase/types";
import { htmlResponse, renderErrorPage } from "../ssr";
import { executeOptionPurchase } from "../myxl/purchase-executor";
import { formatPurchaseResult } from "../myxl/purchase";
import { renderActivePage, requireActiveSession } from "../myxl/require";
import { createPurchaseJob, newJobId, readJobStatus, type PurchaseJobPayload } from "../queue/purchase-jobs";
import { processPurchaseJob } from "../queue/purchase-consumer";
import type { AppEnv } from "../types";

export const purchase = new Hono<AppEnv>();

function parseFormInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function validateDanaNumber(walletNumber: string): string | null {
  if (walletNumber.startsWith("08") && /^\d+$/.test(walletNumber) && walletNumber.length >= 10 && walletNumber.length <= 13) {
    return null;
  }
  return "Format harus 08xxxxxxxxx";
}

async function enqueueOrRun(
  c: import("hono").Context<AppEnv>,
  payload: PurchaseJobPayload,
): Promise<{ jobId: string; pending: boolean }> {
  const storage = c.get("storage");
  await createPurchaseJob(storage, payload);

  const queue = c.env.PURCHASE_QUEUE;
  if (queue) {
    await queue.send(payload);
    return { jobId: payload.id, pending: true };
  }

  await processPurchaseJob(c.env, payload);
  return { jobId: payload.id, pending: false };
}

function renderPurchaseResult(
  c: import("hono").Context<AppEnv>,
  session: Awaited<ReturnType<typeof requireActiveSession>>,
  title: string,
  result: unknown,
  qrisCode?: string | null,
  job?: { jobId: string; pending: boolean },
) {
  if (session instanceof Response) return session;
  const ctx = formatPurchaseResult(title, result, qrisCode, {
    jobPending: job?.pending,
    jobId: job?.jobId,
  });
  return renderActivePage(c, session, "purchase_result", {
    page_title: `${title} · WebUI-XL`,
    ...ctx,
  });
}

purchase.post("/purchase/:option_code", async (c) => {
  const session = await requireActiveSession(c);
  if (session instanceof Response) return session;

  const optionCode = c.req.param("option_code");
  const body = await c.req.parseBody();
  const method = String(body.method ?? "");
  const paymentFor = String(body.payment_for ?? "BUY_PACKAGE");
  const walletNumber = String(body.wallet_number ?? "");
  const qrisAmount = parseFormInt(String(body.qris_amount ?? ""), -1);

  if (method === "ewallet_dana") {
    const err = validateDanaNumber(walletNumber);
    if (err) {
      const html = renderErrorPage(c.req.raw, { title: "Nomor DANA invalid", message: err });
      return htmlResponse(html, 400);
    }
  }

  const rt = {
    config: session.clients.config,
    engsel: session.clients.engsel,
    tokens: session.activeUser.tokens,
  };

  if (method === "balance") {
    try {
      const out = await executeOptionPurchase(
        rt,
        c.get("storage"),
        session.webuiUser.username,
        session.activeUser.subscription_type,
        session.clients.engsel,
        optionCode,
        method,
        paymentFor,
        walletNumber,
        qrisAmount,
      );
      return renderPurchaseResult(c, session, out.title, out.result, out.qrisCode);
    } catch (e) {
      const html = renderErrorPage(c.req.raw, { title: "Pembelian gagal", message: String(e) });
      return htmlResponse(html, 500);
    }
  }

  if (isAsyncPurchaseMethod(method) || method in EWALLET_FORM_METHODS) {
    const jobId = newJobId();
    const { jobId: id, pending } = await enqueueOrRun(c, {
      id: jobId,
      kind: "option",
      username: session.webuiUser.username,
      method,
      paymentFor,
      walletNumber,
      qrisAmount,
      optionCode,
      createdAt: Math.floor(Date.now() / 1000),
    });

    if (!pending) {
      const job = await readJobStatus(c.get("storage"), id);
      return renderPurchaseResult(c, session, job?.title ?? "Pembelian", job?.result, job?.qrisCode);
    }

    return renderPurchaseResult(c, session, "Memproses pembelian…", { status: "PENDING" }, null, {
      jobId: id,
      pending: true,
    });
  }

  const html = renderErrorPage(c.req.raw, {
    title: "Metode invalid",
    message: `Method '${method}' tidak dikenal.`,
  });
  return htmlResponse(html, 400);
});

purchase.post("/purchase/hot2", async (c) => {
  const session = await requireActiveSession(c);
  if (session instanceof Response) return session;

  const body = await c.req.parseBody();
  const hot2Idx = parseFormInt(String(body.hot2_idx ?? ""), -1);
  const method = String(body.method ?? "");
  const walletNumber = String(body.wallet_number ?? "");

  if (!["balance", "qris", ...Object.keys(EWALLET_FORM_METHODS)].includes(method)) {
    const html = renderErrorPage(c.req.raw, { title: "Metode invalid", message: method });
    return htmlResponse(html, 400);
  }

  if (method === "balance") {
    const jobId = newJobId();
    const payload: PurchaseJobPayload = {
      id: jobId,
      kind: "hot2",
      username: session.webuiUser.username,
      method,
      paymentFor: "BUY_PACKAGE",
      walletNumber,
      qrisAmount: -1,
      hot2Idx,
      createdAt: Math.floor(Date.now() / 1000),
    };
    await createPurchaseJob(c.get("storage"), payload);
    await processPurchaseJob(c.env, payload);
    const job = await readJobStatus(c.get("storage"), jobId);
    return renderPurchaseResult(c, session, job?.title ?? "Hot-2", job?.result, job?.qrisCode);
  }

  const jobId = newJobId();
  const { pending } = await enqueueOrRun(c, {
    id: jobId,
    kind: "hot2",
    username: session.webuiUser.username,
    method,
    paymentFor: "BUY_PACKAGE",
    walletNumber,
    qrisAmount: -1,
    hot2Idx,
    createdAt: Math.floor(Date.now() / 1000),
  });

  if (!pending) {
    const job = await readJobStatus(c.get("storage"), jobId);
    return renderPurchaseResult(c, session, job?.title ?? "Hot-2", job?.result, job?.qrisCode);
  }

  return renderPurchaseResult(c, session, "Memproses Hot-2…", { status: "PENDING" }, null, {
    jobId,
    pending: true,
  });
});

purchase.get("/internal/jobs/purchase/:id", async (c) => {
  const session = await requireActiveSession(c);
  if (session instanceof Response) return session;

  const job = await readJobStatus(c.get("storage"), c.req.param("id"));
  if (!job) {
    const html = renderErrorPage(c.req.raw, { title: "Job tidak ditemukan", message: "ID invalid atau sudah expired." });
    return htmlResponse(html, 404);
  }

  if (job.status === "pending" || job.status === "running") {
    const ctx = formatPurchaseResult(job.title ?? "Memproses…", { status: job.status }, null, {
      jobPending: true,
      jobId: job.id,
    });
    return renderActivePage(c, session, "purchase_job_status", {
      page_title: "Memproses pembelian · WebUI-XL",
      ...ctx,
    });
  }

  const ctx = formatPurchaseResult(
    job.title ?? "Pembelian",
    job.result ?? { status: job.status, message: job.error },
    job.qrisCode,
  );
  return renderActivePage(c, session, "purchase_job_status", {
    page_title: `${ctx.title} · WebUI-XL`,
    ...ctx,
  });
});