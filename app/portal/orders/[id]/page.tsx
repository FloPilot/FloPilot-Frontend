import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PortalOrderPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Customer portal order view</CardTitle>
          <CardDescription>
            This page will show live order details for your customers once the
            portal is connected to the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" nativeButton={false} render={<Link href="/portal" />}>
            Back to portal
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
