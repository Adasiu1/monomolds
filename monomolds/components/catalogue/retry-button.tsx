"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      loading={pending}
      loadingLabel="Wczytujemy ponownie..."
      onClick={() => startTransition(() => router.refresh())}
    >
      Spróbuj ponownie
    </Button>
  );
}
