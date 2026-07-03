/**
 * Thin wrapper over posthog-js. Safe on server — noop until the module
 * initialises client-side via <AnalyticsProvider>.
 */
import type { PostHog } from "posthog-js";

let client: PostHog | null = null;

export function bindPostHog(instance: PostHog) {
  client = instance;
}

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: Props) {
  if (typeof window === "undefined") return;
  client?.capture(event, properties);
}

export function identify(userId: string, properties?: Props) {
  if (typeof window === "undefined") return;
  client?.identify(userId, properties);
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  client?.reset();
}

/** Central catalog of events — keep in sync between call sites. */
export const EVT = {
  ANALYZE_CV_START: "analyze_cv.start",
  ANALYZE_CV_DONE: "analyze_cv.done",
  DEEP_REPORT_START: "cv_deep_report.start",
  DEEP_REPORT_DONE: "cv_deep_report.done",
  DEEP_REPORT_UPSELL_CLICK: "cv_deep_report.upsell_click",
  COVER_LETTER_GEN: "cover_letter.generated",
  COVER_LETTER_REPORT: "cover_letter.report_generated",
  CV_WIZARD_STEP: "cv_wizard.step",
  CV_WIZARD_PDF: "cv_wizard.pdf_downloaded",
  CV_WIZARD_POLISH: "cv_wizard.polish_used",
  HUMANIZER_RUN: "humanizer.run",
  AI_DETECT_RUN: "ai_detect.run",
  PHOTO_PRO_RUN: "photo_pro.run",
  TOKENS_UPSELL_OPEN: "tokens.upsell_open",
  TOKENS_PURCHASE_CLICK: "tokens.purchase_click",
} as const;
