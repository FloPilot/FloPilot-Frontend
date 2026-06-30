"use client";

import { TeamSettingsPanel } from "@/components/settings/team-settings-panel";
import {
  AdminLockNotice,
  SettingsHeader,
  SettingsMain,
  SettingsPanel,
} from "@/components/settings/settings-kit";
import { useShopSettings } from "@/components/providers/shop-settings-provider";

export function TeamSection() {
  const { isAdmin } = useShopSettings();

  return (
    <SettingsMain>
      <SettingsHeader
        title="Users & roles"
        description="Invite staff, assign roles, and control what each person can access."
      />

      {!isAdmin && <AdminLockNotice />}

      <SettingsPanel
        title="Team members"
        description="Add teammates and tune their workspace permissions."
      >
        <TeamSettingsPanel disabled={!isAdmin} />
      </SettingsPanel>
    </SettingsMain>
  );
}
