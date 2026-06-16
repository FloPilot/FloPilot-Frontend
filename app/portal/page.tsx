import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PortalHomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Customer portal
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your shop&apos;s customer portal will live here — order tracking,
          proof approvals, and payments.
        </p>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Portal access is not wired to live customer data yet. Staff can
            manage orders, events, and scheduling from the main app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/login" />}>
            Staff sign in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
