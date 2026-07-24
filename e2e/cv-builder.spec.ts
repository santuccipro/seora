import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const TEST_EMAIL = "thomas-test@seora.test";
const BASE = "http://localhost:3000";

// Dual cookie: same token sent as both next-auth.session-token (for session API)
// and __Secure-next-auth.session-token (for middleware).
const { authCookie } = JSON.parse(
  fs.readFileSync(path.join(__dirname, ".auth/token.txt"), "utf8")
) as { authCookie: string };

async function setupAuth(page: import("@playwright/test").Page) {
  await page.setExtraHTTPHeaders({ Cookie: authCookie });
}

async function waitForBuilder(page: import("@playwright/test").Page) {
  await page.waitForSelector('input[placeholder="Marie"]', { timeout: 20_000 });
}

test.describe("CV Builder — happy path", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.goto(`${BASE}/cv-builder`);
    await waitForBuilder(page);
  });

  test("Step 1 loads — personal info fields visible", async ({ page }) => {
    await expect(page.getByPlaceholder("Marie", { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder("Martin", { exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("Can fill step 1 and advance to step 2", async ({ page }) => {
    await page.getByPlaceholder("Marie", { exact: true }).fill("Sophie");
    await page.getByPlaceholder("Martin", { exact: true }).fill("Dupont");
    await page.locator('input[type="email"]').first().fill("sophie@test.fr");
    await page.locator('button:text-is("Continuer")').click();
    // Step 2: photo step
    await page.waitForSelector('button:text-is("Continuer")', { timeout: 8_000 });
    await expect(page.locator("h1")).not.toContainText("Tes coordonnées", { timeout: 3_000 });
  });

  test("Can navigate through all 9 steps with minimal data", async ({ page }) => {
    test.setTimeout(120_000);

    await page.getByPlaceholder("Marie", { exact: true }).fill("Playwright");
    await page.getByPlaceholder("Martin", { exact: true }).fill("Test");
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('button:text-is("Continuer")').click();

    for (let step = 2; step <= 8; step++) {
      await page.waitForSelector('button:text-is("Continuer")', { timeout: 8_000 });
      if (step === 3) {
        const sectorBtn = page.locator("button").filter({ hasText: /Généraliste|Banque|Tech/ }).first();
        if (await sectorBtn.isVisible({ timeout: 2_000 }).catch(() => false)) await sectorBtn.click();
        const roleInput = page.getByPlaceholder(/Analyste|Développeur|Manager/);
        if (await roleInput.isVisible({ timeout: 1_000 }).catch(() => false)) await roleInput.fill("Développeur");
      }
      await page.locator('button:text-is("Continuer")').click();
    }

    await page.waitForSelector('button:has-text("Télécharger"), a:has-text("Télécharger")', { timeout: 10_000 });
    await expect(page.locator('a[href="/cv-editor?from=builder"]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("CV Build PDF — API", () => {
  test("POST /api/cv-build/pdf returns valid PDF (>20kb)", async ({ request }) => {
    test.setTimeout(90_000);

    const resp = await request.post(`${BASE}/api/cv-build/pdf`, {
      data: {
        firstName: "Playwright", lastName: "Test",
        email: TEST_EMAIL, phone: "0612345678", city: "Paris",
        linkedIn: "linkedin.com/in/test", portfolio: "", photoUrl: null,
        sector: "generique", targetRole: "Développeur", summary: "Test.",
        experiences: [{ id: "1", title: "Dev", company: "Corp", location: "Paris", startDate: "2020", endDate: "", current: true, bullets: ["Built things"] }],
        educations: [], skills: ["JavaScript"], languages: [{ id: "1", name: "Français", level: "Natif" }], interests: [],
      },
      headers: { Cookie: authCookie },
      timeout: 80_000,
    });

    expect(resp.status()).toBe(200);
    expect(resp.headers()["content-type"]).toContain("application/pdf");
    expect((await resp.body()).length).toBeGreaterThan(20_000);
  });
});

test.describe("CV Builder — sector templates", () => {
  test("Key sectors render valid PDFs", async ({ request }) => {
    test.setTimeout(120_000);

    for (const sector of ["generique", "tech-dev", "rh-recrutement", "commerce-vente", "luxe-mode"]) {
      const resp = await request.post(`${BASE}/api/cv-build/pdf`, {
        data: {
          firstName: "Test", lastName: "Secteur", email: TEST_EMAIL, phone: "", city: "Paris",
          linkedIn: "", portfolio: "", photoUrl: null, sector, targetRole: "Test Role", summary: "Test.",
          experiences: [{ id: "1", title: "Dev", company: "Corp", location: "Paris", startDate: "2020", endDate: "", current: true, bullets: ["Built things"] }],
          educations: [], skills: ["Test"], languages: [], interests: [],
        },
        headers: { Cookie: authCookie },
        timeout: 60_000,
      });
      expect(resp.status(), `Sector ${sector} → 200`).toBe(200);
      expect((await resp.body()).length, `Sector ${sector} PDF > 10kb`).toBeGreaterThan(10_000);
    }
  });
});
