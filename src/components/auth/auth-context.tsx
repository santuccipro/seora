"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { AuthModal } from "./auth-modal";

export type AuthModalContext = "cv" | "photo" | "detect" | "humanize" | "default";

interface AuthModalContextType {
  openAuthModal: (onSuccess?: () => void, context?: AuthModalContext) => void;
  closeAuthModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType>({
  openAuthModal: () => {},
  closeAuthModal: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | undefined>();
  const [modalContext, setModalContext] = useState<AuthModalContext>("default");

  const openAuthModal = useCallback((onSuccess?: () => void, context: AuthModalContext = "default") => {
    setOnSuccessCallback(() => onSuccess);
    setModalContext(context);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setOnSuccessCallback(undefined);
    setModalContext("default");
  }, []);

  return (
    <AuthModalContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      <AuthModal
        isOpen={isOpen}
        onClose={closeAuthModal}
        onSuccess={onSuccessCallback}
        context={modalContext}
      />
    </AuthModalContext.Provider>
  );
}
