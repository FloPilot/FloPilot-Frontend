"use client";

import Link from "next/link";
import { ShopTimelineCalendar } from "@/components/calendar/shop-timeline-calendar";
import { StaffHeader } from "@/components/layout/staff-header";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

export default function CalendarPage() {
  return (
    <>
      <StaffHeader
        title="Production Calendar"
        description="Review the scheduling queue, then assign events to machines on the timeline"
        action={
          <Button
            variant="outline"
            className="rounded-full bg-white"
            nativeButton={false}
            render={<Link href="/app/machines" />}
          >
            <Wrench className="size-4" />
            Stations
          </Button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <ShopTimelineCalendar />
      </main>
    </>
  );
}
