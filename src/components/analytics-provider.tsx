"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { bindPostHog, identify } from "@/lib/analytics";

/**
 * Injects PostHog on mount, tracks pageviews, identifies the auth'd user.
 * If NEXT_PUBLIC_POSTHOG_KEY isn't set, the whole module noops silently.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    if (w.__ph_bound) return;
    w.__ph_bound = true;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
      capture_pageview: false, // handled manually below
      persistence: "localStorage",
      autocapture: false,
    });
    bindPostHog(posthog);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    posthog.capture("$pageview", { $current_url: window.location.href, pathname });
  }, [pathname]);

  useEffect(() => {
    if (!session?.user?.email) return;
    identify(session.user.email, {
      email: session.user.email,
      name: session.user.name ?? undefined,
    });
  }, [session]);

  return null;
}
