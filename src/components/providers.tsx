"use client";

import { SessionProvider } from "next-auth/react";
import { AuthModalProvider } from "./auth/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthModalProvider>{children}</AuthModalProvider>
    </SessionProvider>
  );
}
