"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "Sign in failed" }));
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input autoComplete="email" id="email" name="email" placeholder="you@example.com" required type="email" /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input autoComplete="current-password" id="password" name="password" required type="password" /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button className="h-12 w-full bg-[var(--signal)] text-black hover:bg-[var(--signal-bright)]" disabled={pending} type="submit">
        {pending && <LoaderCircle className="animate-spin" />} Enter archive
      </Button>
    </form>
  );
}
