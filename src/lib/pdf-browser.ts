import type { Browser } from "puppeteer-core";

const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar";

export async function launchBrowser(): Promise<Browser> {
  const puppeteer = await import("puppeteer-core");

  const localChrome = process.env.CHROME_EXECUTABLE_PATH;
  if (localChrome) {
    return puppeteer.default.launch({
      executablePath: localChrome,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }

  const chromium = await import("@sparticuz/chromium-min");
  const executablePath = await chromium.default.executablePath(CHROMIUM_PACK_URL);
  return puppeteer.default.launch({
    executablePath,
    headless: true,
    args: [...chromium.default.args, "--disable-dev-shm-usage"],
  });
}
