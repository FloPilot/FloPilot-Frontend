"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  FileText,
  Home,
  Loader2,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createStorePage,
  isSystemPageHandle,
  slugifyPageHandle,
  updateThemePage,
  type ClientStoreTheme,
} from "@/lib/client-store-theme";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function StorePagesPanel({
  theme,
  onThemeChange,
  onCustomizePage,
  onSave,
  saving,
  showSave = true,
}: {
  theme: ClientStoreTheme;
  onThemeChange: (theme: ClientStoreTheme) => void;
  onCustomizePage: (pageId: string) => void;
  onSave: () => void;
  saving: boolean;
  showSave?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    theme.pages[0]?.id || null
  );
  const [newTitle, setNewTitle] = useState("");

  const selected = theme.pages.find((page) => page.id === selectedId) || null;
  const isSystemPage = selected ? isSystemPageHandle(selected.handle) : false;

  const addPage = () => {
    const title = newTitle.trim() || "New page";
    const { theme: next, page } = createStorePage(theme, { title });
    onThemeChange(next);
    setSelectedId(page.id);
    setNewTitle("");
  };

  const removePage = (pageId: string) => {
    const page = theme.pages.find((row) => row.id === pageId);
    if (!page || isSystemPageHandle(page.handle)) return;
    const pages = theme.pages
      .filter((row) => row.id !== pageId)
      .map((row, index) => ({ ...row, sortOrder: index }));
    const home = pages.find((row) => row.handle === "home") || pages[0];
    onThemeChange({
      ...theme,
      pages,
      sections: home?.sections || [],
      navigation: theme.navigation,
    });
    setSelectedId(pages[0]?.id || null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-[#121a2e]">Pages</p>
          <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
            Manage storefront pages, then open Customize to edit their layout.
          </p>
        </div>
        {showSave ? (
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={saving}
            onClick={onSave}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className={cn(dashboardCardClass, "overflow-hidden p-0")}>
          <div className="border-b border-[#ebebeb] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Store pages
            </p>
          </div>
          <div className="max-h-[480px] space-y-1 overflow-y-auto p-2">
            {theme.pages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setSelectedId(page.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left",
                  selectedId === page.id
                    ? "border-brand-primary/30 bg-[#f6f8ff]"
                    : "border-transparent hover:bg-[#f6f6f7]"
                )}
              >
                {page.handle === "home" ? (
                  <Home className="size-3.5 shrink-0 text-[#8a8a8a]" />
                ) : page.handle === "product" ? (
                  <ShoppingBag className="size-3.5 shrink-0 text-[#8a8a8a]" />
                ) : (
                  <FileText className="size-3.5 shrink-0 text-[#8a8a8a]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#303030]">
                    {page.title}
                  </p>
                  <p className="text-[11px] text-[#8a8a8a]">
                    /{page.handle}
                    {" · "}
                    {page.sections.length} section
                    {page.sections.length === 1 ? "" : "s"}
                    {!page.enabled ? " · Hidden" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-2 border-t border-[#ebebeb] p-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New page title"
              className="h-9 border-[#e3e3e3] text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") addPage();
              }}
            />
            <Button
              type="button"
              className={cn(dashboardControlClass, "w-full justify-center")}
              onClick={addPage}
            >
              <Plus className="size-3.5" />
              Add page
            </Button>
          </div>
        </div>

        <div className={cn(dashboardCardClass, "p-4 sm:p-5")}>
          {!selected ? (
            <p className="py-16 text-center text-[13px] text-[#8a8a8a]">
              Select a page to manage.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold text-[#121a2e]">
                    {selected.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#8a8a8a]">
                    {selected.handle === "home"
                      ? "Primary storefront landing page"
                      : selected.handle === "product"
                        ? "Template shown when a shopper opens a product"
                        : "Additional storefront page"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isSystemPage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[12px] text-[#616161]"
                      onClick={() =>
                        onThemeChange(
                          updateThemePage(theme, selected.id, {
                            enabled: !selected.enabled,
                          })
                        )
                      }
                    >
                      {selected.enabled ? (
                        <Eye className="size-3.5" />
                      ) : (
                        <EyeOff className="size-3.5" />
                      )}
                      {selected.enabled ? "Hide" : "Show"}
                    </Button>
                  ) : null}
                  {!isSystemPage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-[12px] text-red-700 hover:bg-red-50"
                      onClick={() => removePage(selected.id)}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    className={dashboardPrimaryButtonClass}
                    onClick={() => onCustomizePage(selected.id)}
                  >
                    <Pencil className="size-3.5" />
                    Customize page
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-[12px]">Title</Label>
                <Input
                  value={selected.title}
                  onChange={(e) =>
                    onThemeChange(
                      updateThemePage(theme, selected.id, {
                        title: e.target.value,
                      })
                    )
                  }
                  className="mt-1.5 h-9 border-[#e3e3e3] text-[13px]"
                />
              </div>

              <div>
                <Label className="text-[12px]">URL handle</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[12px] text-[#8a8a8a]">/</span>
                  <Input
                    value={selected.handle}
                    disabled={isSystemPage}
                    onChange={(e) => {
                      if (isSystemPage) return;
                      const handle = slugifyPageHandle(e.target.value);
                      onThemeChange(
                        updateThemePage(theme, selected.id, { handle })
                      );
                    }}
                    className="h-9 border-[#e3e3e3] text-[13px]"
                  />
                </div>
                {isSystemPage ? (
                  <p className="mt-1.5 text-[11px] text-[#8a8a8a]">
                    System page handles can’t be changed.
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-[#e3e3e3] bg-[#fafafa] px-4 py-3">
                <p className="text-[12px] font-medium text-[#303030]">
                  {selected.sections.length} section
                  {selected.sections.length === 1 ? "" : "s"} on this page
                </p>
                <p className="mt-1 text-[12px] text-[#8a8a8a]">
                  Use Customize to add widgets, reorder sections, and edit
                  styles for this page.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
