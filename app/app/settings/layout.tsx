import { SettingsSecondaryNav } from "@/components/settings/settings-secondary-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col lg:h-0 lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
      <SettingsSecondaryNav />
      <div className="min-h-0 min-w-0 flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {children}
      </div>
    </div>
  );
}
