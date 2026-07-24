import path from "path";
import fs from "fs";
import http from "http";

const AUTH_DIR = path.join(__dirname, ".auth");
const TOKEN_FILE = path.join(AUTH_DIR, "token.txt");
const TEST_EMAIL = "thomas-test@seora.test";

function httpRequest(opts: http.RequestOptions, body?: string): Promise<{ status: number; headers: http.IncomingMessage["headers"]; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let b = "";
      res.on("data", (d) => (b += d));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: b }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseCookies(headers: http.IncomingMessage["headers"]): Record<string, string> {
  const raw = (headers["set-cookie"] || []) as string[];
  const result: Record<string, string> = {};
  for (const c of raw) {
    const eqIdx = c.indexOf("=");
    const semIdx = c.indexOf(";", eqIdx);
    const name = c.slice(0, eqIdx).trim();
    const value = c.slice(eqIdx + 1, semIdx === -1 ? undefined : semIdx).trim();
    result[name] = value;
  }
  return result;
}

async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Step 1: get CSRF token
  const csrfResp = await httpRequest({ hostname: "localhost", port: 3000, path: "/api/auth/csrf", method: "GET" });
  const csrfData = JSON.parse(csrfResp.body) as { csrfToken: string };
  const csrfCookies = parseCookies(csrfResp.headers);
  const csrfCookieStr = Object.entries(csrfCookies).map(([k, v]) => `${k}=${v}`).join("; ");

  // Step 2: POST credentials with CSRF cookie → get real session token
  const postBody = new URLSearchParams({ csrfToken: csrfData.csrfToken, email: TEST_EMAIL, redirect: "false", json: "true" }).toString();
  const authResp = await httpRequest(
    { hostname: "localhost", port: 3000, path: "/api/auth/callback/credentials", method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(postBody), Cookie: csrfCookieStr } },
    postBody
  );
  const authCookies = parseCookies(authResp.headers);

  const sessionToken = authCookies["next-auth.session-token"];
  if (!sessionToken) {
    console.error("Auth response:", authResp.body, "Cookies:", JSON.stringify(authCookies));
    throw new Error("Auth setup failed — no session-token in response");
  }

  // We send BOTH cookie names with the same token value because:
  // - Middleware (Edge) uses NEXTAUTH_URL=https → expects __Secure-next-auth.session-token
  // - Session API (Node) uses request URL http://localhost → expects next-auth.session-token
  const authCookie = `next-auth.session-token=${sessionToken}; __Secure-next-auth.session-token=${sessionToken}`;

  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ authCookie }));

  // Minimal storageState (required by playwright.config.ts storageState option)
  fs.writeFileSync(path.join(AUTH_DIR, "user.json"), JSON.stringify({ cookies: [], origins: [] }, null, 2));

  console.log(`[auth.setup] Token saved (${sessionToken.slice(0, 30)}...)`);
}

export default globalSetup;
