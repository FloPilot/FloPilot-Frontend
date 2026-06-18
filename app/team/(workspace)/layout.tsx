import { TeamAuthGate } from "@/components/team/team-auth-gate";
import { TeamFooter } from "@/components/team/team-footer";
import { TeamNav } from "@/components/team/team-nav";
import { TeamShell } from "@/components/team/team-shell";

export default function TeamWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeamAuthGate>
      <TeamShell>
        <TeamNav />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <TeamFooter />
      </TeamShell>
    </TeamAuthGate>
  );
}
