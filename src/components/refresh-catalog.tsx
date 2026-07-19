"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RefreshCatalog({ variant = "default" }: { variant?: "default" | "outline" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function refresh() {
    setPending(true);
    const response = await fetch("/api/catalog/sync", { method: "POST" });
    if (response.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      router.refresh();
    }
    setPending(false);
  }
  return (
    <Button className={variant === "default" ? "rounded-full bg-[var(--signal)] px-6 text-black hover:bg-[var(--signal-bright)]" : ""} disabled={pending} onClick={refresh} size="lg" variant={variant}>
      <RefreshCw className={pending ? "animate-spin" : ""} /> Refresh IDrive
    </Button>
  );
}
