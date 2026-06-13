import { Hono } from "hono";
import type { Env } from "./env";
import { htmlResponse, renderErrorPage, renderLayout, renderWebuiLogin } from "./ssr";

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "webui-xl",
    environment: c.env.ENVIRONMENT ?? "unknown",
  }),
);

app.get("/", (c) => {
  const html = renderLayout(
    "error_body",
    c.req.raw,
    {
      title: "WebUI-XL",
      message: "Phase 2 Worker — SSR engine ready. Login di /u/login.",
      message_pre: false,
      page_title: "WebUI-XL",
    },
  );
  return htmlResponse(html);
});

app.get("/u/login", (c) => {
  const url = new URL(c.req.url);
  const html = renderWebuiLogin(c.req.raw, {
    mode: "login",
    username: url.searchParams.get("username") ?? undefined,
    users_count: 0,
    next: url.searchParams.get("next") ?? "/",
  });
  return htmlResponse(html);
});

app.get("/u/register", (c) => {
  const html = renderWebuiLogin(c.req.raw, {
    mode: "register",
    users_count: 0,
  });
  return htmlResponse(html);
});

app.get("/demo/error", (c) => {
  const html = renderErrorPage(c.req.raw, {
    title: "Demo Error",
    message: "Ini halaman error contoh dari SSR engine.",
  });
  return htmlResponse(html);
});

app.notFound((c) => {
  const html = renderErrorPage(c.req.raw, {
    title: "404",
    message: `Path tidak ditemukan: ${c.req.path}`,
  });
  return htmlResponse(html, 404);
});

export default app;