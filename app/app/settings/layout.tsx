import { SettingsSecondaryNav } from "@/components/settings/settings-secondary-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <SettingsSecondaryNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
