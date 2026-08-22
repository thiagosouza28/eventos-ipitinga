"use client";

import { useEffect } from "react";

import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useAuthStore } from "@/lib/stores/auth";
import { useSystemConfigStore } from "@/lib/stores/system-config";
import { setupAutoUppercase } from "@/lib/utils/uppercase";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const initializeSystemConfig = useSystemConfigStore((state) => state.initialize);
  const loadAuthSession = useAuthStore((state) => state.loadFromStorage);

  useEffect(() => {
    loadAuthSession();
    setupAutoUppercase();
    initializeSystemConfig();
  }, [initializeSystemConfig, loadAuthSession]);

  return (
    <>
      {children}
      <LoadingOverlay />
    </>
  );
}
