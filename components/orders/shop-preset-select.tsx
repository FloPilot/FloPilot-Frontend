"use client";

import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function slugifyPresetValue(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `custom-${slug}` : `custom-${Date.now()}`;
}

export const ShopPresetSelect = memo(function ShopPresetSelect({
  value,
  options,
  onChange,
  disabled,
  className,
  size = "default",
  placeholder,
  canAddCustom,
  onAddCustom,
  addingCustom,
  addLabel,
  addPlaceholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default";
  placeholder?: string;
  canAddCustom?: boolean;
  onAddCustom?: (label: string) => Promise<string | null>;
  addingCustom?: boolean;
  addLabel?: string;
  addPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAddForm) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [showAddForm]);

  const handleAdd = async () => {
    const label = draftLabel.trim();
    if (!label || !onAddCustom) return;
    const nextValue = await onAddCustom(label);
    if (nextValue) {
      onChange(nextValue);
      setDraftLabel("");
      setShowAddForm(false);
    }
  };

  const openAddForm = () => {
    setOpen(false);
    setShowAddForm(true);
    setDraftLabel("");
  };

  return (
    <div className="min-w-0 space-y-1">
      <Select
        open={open}
        onOpenChange={setOpen}
        value={value ?? ""}
        onValueChange={(next) => {
          onChange(next ?? "");
        }}
        disabled={disabled}
      >
        <SelectTrigger size={size} className={cn(className, "w-full")}>
          <SelectValue placeholder={placeholder ?? "Select"}>
            {options.find((option) => option.value === value)?.label ??
              placeholder ??
              "Select"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          side="bottom"
          sideOffset={4}
          className="max-h-72"
        >
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          {canAddCustom && !showAddForm ? (
            <div
              className="border-t border-border/70 p-1.5"
              onPointerDown={(event) => event.preventDefault()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-[#2c6ecb] hover:bg-[#f4f7fd]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openAddForm();
                }}
              >
                <Plus className="size-3.5" />
                {addLabel ?? "Add option"}
              </button>
            </div>
          ) : null}
        </SelectContent>
      </Select>

      {canAddCustom && showAddForm ? (
        <div className="rounded-lg border border-border/80 bg-white p-2 shadow-sm">
          <Input
            ref={inputRef}
            value={draftLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            placeholder={addPlaceholder ?? "Custom value"}
            className="h-8 text-[13px]"
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAdd();
              }
              if (event.key === "Escape") {
                setShowAddForm(false);
                setDraftLabel("");
              }
            }}
          />
          <div className="mt-2 flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 flex-1 text-[12px]"
              disabled={!draftLabel.trim() || addingCustom}
              onClick={() => void handleAdd()}
            >
              {addingCustom ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[12px]"
              onClick={() => {
                setShowAddForm(false);
                setDraftLabel("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
});
