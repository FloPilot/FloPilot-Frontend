import { SettingsSubnav } from "@/components/settings/settings-subnav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SettingsSubnav />
      {children}
    </div>
  );
}
