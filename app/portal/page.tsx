import Link from "next/link";
import { PlatformBrandMark } from "@/components/branding/shop-brand-mark";

export default function PortalLandingPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <PlatformBrandMark subtitle="Customer portal" />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-[#303030]">
        Your customer portal
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#616161]">
        When your print shop sends proofs or an estimate, you&apos;ll get an
        email with a personal link. That link opens your portal — review artwork,
        approve estimates, and track all your orders in one place.
      </p>
      <p className="mt-4 text-[13px] text-[#8a8a8a]">
        No password needed. The link in your email is your secure access for 90
        days.
      </p>
      <Link
        href="/login"
        className="mt-8 text-[13px] font-medium text-[#2c6ecb] underline"
      >
        Staff sign in
      </Link>
    </main>
  );
}
