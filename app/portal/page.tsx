import Link from "next/link";
import { FloPilotWatermark } from "@/components/branding/flopilot-watermark";

export default function PortalLandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f7]">
      <main className="mx-auto flex min-h-0 flex-1 max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          Customer portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#303030]">
          Sign in to review your work
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#616161]">
          When your print shop sends an estimate or invoice, open the link in
          that email to create your portal account. After that, come back here
          anytime to review artwork, approve estimates, and check invoices.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/portal/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-black px-5 text-[14px] font-semibold text-white"
          >
            Sign in
          </Link>
          <Link
            href="/portal/login?mode=signup"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white px-5 text-[14px] font-semibold text-[#303030]"
          >
            Create account
          </Link>
        </div>
        <Link
          href="/login"
          className="mt-6 text-[13px] font-medium text-[#2c6ecb] underline"
        >
          Staff sign in
        </Link>
      </main>
      <FloPilotWatermark />
    </div>
  );
}
