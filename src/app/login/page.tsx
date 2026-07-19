import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/login-form";
import { LoginPanelSkeleton } from "@/components/page-skeletons";
import { ThemeToggle } from "@/components/theme-toggle";
import { currentUser } from "@/lib/session";

// Cookie-aware instant validation requires hard-coded session samples; the login panel is
// instead request-streamed behind a local boundary in the Partial Prerendered route.
export const unstable_instant = false;

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-theme"><ThemeToggle /></div>
      <div className="login-art" aria-hidden="true">
        <div className="beam beam-one" /><div className="beam beam-two" />
        <div className="projector"><div /><span /></div>
        <p>PRIVATE SCREENING<br />ROOM 01</p>
      </div>
      <Suspense fallback={<LoginPanelSkeleton />}><LoginPanel /></Suspense>
    </main>
  );
}

async function LoginPanel() {
  if (await currentUser()) redirect("/");
  return (
      <div className="login-panel">
        <div className="login-form-wrap">
          <div className="eyebrow">IDRIVE / PRIVATE MEDIA</div>
          <h1>Welcome back<br />to your <em>archive.</em></h1>
          <p>Sign in to enter your private screening room.</p>
          <LoginForm />
        </div>
      </div>
  );
}
