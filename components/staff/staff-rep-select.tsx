"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  LabeledSelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { listStaffMembers, type AssignableStaffMember } from "@/lib/api";
import { listSalesRepCandidates } from "@/lib/staff-tags";
import { dashboardControlClass } from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

const NONE_VALUE = "none";

export function StaffRepSelect({
  value,
  onChange,
  id,
  className,
  triggerClassName,
  placeholder = "No rep assigned",
  disabled,
}: {
  value?: string | null;
  onChange: (salesRepId: string | null) => void;
  id?: string;
  className?: string;
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { getIdToken } = useAuth();
  const [members, setMembers] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getIdToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const { members: roster } = await listStaffMembers(token);
        if (!cancelled) setMembers(roster);
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  const candidates = useMemo(
    () => listSalesRepCandidates(members),
    [members]
  );

  const selectItems = useMemo(() => {
    const items = [
      { value: NONE_VALUE, label: placeholder },
      ...candidates.map((member) => ({
        value: member.id,
        label: member.name,
      })),
    ];
    if (
      value &&
      value !== NONE_VALUE &&
      !candidates.some((member) => member.id === value)
    ) {
      const fallback = members.find((member) => member.id === value);
      items.push({
        value,
        label: fallback?.name ? `${fallback.name} (inactive)` : "Former rep",
      });
    }
    return items;
  }, [candidates, members, placeholder, value]);

  const currentValue = value || NONE_VALUE;

  return (
    <Select
      value={currentValue}
      onValueChange={(next) =>
        onChange(!next || next === NONE_VALUE ? null : next)
      }
      disabled={disabled || loading}
    >
      <SelectTrigger
        id={id}
        className={cn(
          dashboardControlClass,
          "h-10 w-full",
          triggerClassName,
          className
        )}
      >
        <LabeledSelectValue
          value={currentValue}
          options={selectItems}
          placeholder={placeholder}
        />
      </SelectTrigger>
      <SelectContent>
        {selectItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
