"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutGrid,
  Loader2,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteDashboardView,
  fetchDashboardViews,
  saveDashboardView,
  setActiveDashboardView,
} from "@/lib/api";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  missingDashboardWidgets,
  normalizeDashboardLayout,
  type DashboardViewRecord,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type DashboardLayoutControlsProps = {
  layout: DashboardWidgetId[];
  activeViewId: string | null;
  editing: boolean;
  draftLayout: DashboardWidgetId[];
  onLayoutChange: (layout: DashboardWidgetId[]) => void;
  onActiveViewIdChange: (viewId: string | null) => void;
  onEditingChange: (editing: boolean) => void;
  onDraftLayoutChange: (layout: DashboardWidgetId[]) => void;
};

export function DashboardLayoutControls({
  layout,
  activeViewId,
  editing,
  draftLayout,
  onLayoutChange,
  onActiveViewIdChange,
  onEditingChange,
  onDraftLayoutChange,
}: DashboardLayoutControlsProps) {
  const { getIdToken } = useAuth();
  const [views, setViews] = useState<DashboardViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingView, setSwitchingView] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [shareWithTeam, setShareWithTeam] = useState(false);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadViews = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const state = await fetchDashboardViews(token);
        if (cancelled) return;
        setViews(state.views);
        onActiveViewIdChange(state.activeViewId);
        onLayoutChange(normalizeDashboardLayout(state.activeLayout));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load dashboard layouts"
        );
        onLayoutChange([...DEFAULT_DASHBOARD_LAYOUT]);
        onActiveViewIdChange(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadViews();
    return () => {
      cancelled = true;
    };
    // Load once per mount; parent callbacks are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getIdToken]);

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) ?? null,
    [views, activeViewId]
  );

  const myViews = useMemo(
    () => views.filter((view) => view.isOwner),
    [views]
  );
  const teamViews = useMemo(
    () => views.filter((view) => !view.isOwner && view.shared),
    [views]
  );

  const missingWidgets = useMemo(
    () => missingDashboardWidgets(draftLayout),
    [draftLayout]
  );

  const beginEditing = () => {
    setError(null);
    onDraftLayoutChange(normalizeDashboardLayout(layout));
    onEditingChange(true);
  };

  const cancelEditing = () => {
    onDraftLayoutChange(normalizeDashboardLayout(layout));
    onEditingChange(false);
    setSaveOpen(false);
    setError(null);
  };

  const addWidget = (widgetId: DashboardWidgetId) => {
    if (draftLayout.includes(widgetId)) return;
    onDraftLayoutChange(normalizeDashboardLayout([...draftLayout, widgetId]));
  };

  const handleSelectView = async (value: string) => {
    if (switchingView || editing) return;

    const previousViewId = activeViewId;
    const previousLayout = layout;

    setError(null);

    if (value === "default") {
      if (activeViewId === null) {
        // Also reset personal layout to default
        onLayoutChange([...DEFAULT_DASHBOARD_LAYOUT]);
      } else {
        onActiveViewIdChange(null);
        onLayoutChange([...DEFAULT_DASHBOARD_LAYOUT]);
      }
      setSwitchingView(true);
      try {
        const token = await getIdToken();
        if (!token) throw new Error("You must be signed in to switch layouts.");
        const result = await setActiveDashboardView(token, null);
        onActiveViewIdChange(result.activeViewId);
        onLayoutChange(normalizeDashboardLayout(result.activeLayout));
      } catch (err) {
        onActiveViewIdChange(previousViewId);
        onLayoutChange(previousLayout);
        setError(
          err instanceof Error
            ? err.message
            : "Could not switch to the default dashboard"
        );
      } finally {
        setSwitchingView(false);
      }
      return;
    }

    const view = views.find((entry) => entry.id === value);
    if (!view || view.id === activeViewId) return;

    onActiveViewIdChange(view.id);
    onLayoutChange(normalizeDashboardLayout(view.layout));
    setSwitchingView(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in to switch layouts.");
      const result = await setActiveDashboardView(token, view.id);
      onActiveViewIdChange(result.activeViewId);
      onLayoutChange(normalizeDashboardLayout(result.activeLayout));
    } catch (err) {
      onActiveViewIdChange(previousViewId);
      onLayoutChange(previousLayout);
      setError(err instanceof Error ? err.message : "Could not switch layouts");
    } finally {
      setSwitchingView(false);
    }
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in to save your layout.");

      const nextLayout = normalizeDashboardLayout(draftLayout);
      if (activeView?.isOwner) {
        const { view } = await saveDashboardView(token, {
          id: activeView.id,
          name: activeView.name,
          layout: nextLayout,
          shared: activeView.shared,
        });
        setViews((current) => {
          const others = current.filter((entry) => entry.id !== view.id);
          return [...others, view].sort((a, b) => a.name.localeCompare(b.name));
        });
        const active = await setActiveDashboardView(token, view.id);
        onActiveViewIdChange(active.activeViewId);
        onLayoutChange(normalizeDashboardLayout(active.activeLayout));
      } else {
        const result = await setActiveDashboardView(token, null, nextLayout);
        onActiveViewIdChange(result.activeViewId);
        onLayoutChange(normalizeDashboardLayout(result.activeLayout));
      }
      onEditingChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save layout");
    } finally {
      setSaving(false);
    }
  };

  const openSaveDialog = (asNew: boolean) => {
    const base =
      !asNew && activeView?.isOwner
        ? activeView
        : null;
    setEditingViewId(base?.id ?? null);
    setViewName(base?.name ?? "");
    setShareWithTeam(base?.shared ?? false);
    setSaveOpen(true);
  };

  const handleSaveNamedView = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You must be signed in to save a view.");

      const nextLayout = normalizeDashboardLayout(draftLayout);
      const { view } = await saveDashboardView(token, {
        id: editingViewId || undefined,
        name: viewName.trim() || "My dashboard",
        layout: nextLayout,
        shared: shareWithTeam,
      });

      setViews((current) => {
        const others = current.filter((entry) => entry.id !== view.id);
        return [...others, view].sort((a, b) => a.name.localeCompare(b.name));
      });

      const active = await setActiveDashboardView(token, view.id);
      onActiveViewIdChange(active.activeViewId);
      onLayoutChange(normalizeDashboardLayout(active.activeLayout));
      onEditingChange(false);
      setSaveOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save view");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteView = async () => {
    if (!editingViewId) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      await deleteDashboardView(token, editingViewId);
      setViews((current) =>
        current.filter((entry) => entry.id !== editingViewId)
      );
      if (activeViewId === editingViewId) {
        const reset = await setActiveDashboardView(token, null);
        onActiveViewIdChange(null);
        onLayoutChange(normalizeDashboardLayout(reset.activeLayout));
      }
      setSaveOpen(false);
      onEditingChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete view");
    } finally {
      setSaving(false);
    }
  };

  const selectValue = activeViewId ?? "default";
  const selectLabel = activeView?.name ?? "Default dashboard";

  return (
    <>
      {!editing ? (
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select
              value={selectValue}
              onValueChange={(value) => {
                if (value) void handleSelectView(value);
              }}
              disabled={loading || switchingView || saving}
            >
              <SelectTrigger
                className={cn(
                  dashboardControlClass,
                  "h-9 min-w-[180px] justify-between"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  {switchingView ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-[#2c6ecb]" />
                  ) : (
                    <LayoutGrid className="size-3.5 shrink-0 text-[#616161]" />
                  )}
                  <SelectValue placeholder="Select layout">
                    {switchingView
                      ? `Switching to ${selectLabel}…`
                      : selectLabel}
                  </SelectValue>
                </span>
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                sideOffset={4}
              >
                <SelectItem value="default">Default dashboard</SelectItem>
                {myViews.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>My layouts</SelectLabel>
                    {myViews.map((view) => (
                      <SelectItem key={view.id} value={view.id}>
                        {view.name}
                        {view.shared ? " · Shared" : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {teamViews.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Team layouts</SelectLabel>
                    {teamViews.map((view) => (
                      <SelectItem key={view.id} value={view.id}>
                        {view.name}
                        {view.ownerName ? ` · ${view.ownerName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(dashboardControlClass, "h-9")}
              disabled={loading || switchingView}
              onClick={beginEditing}
            >
              <LayoutGrid className="size-3.5" />
              Customize
            </Button>
          </div>
          {error ? (
            <p className="max-w-[280px] text-right text-[12px] text-[#b42318]">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            dashboardInsetSurfaceClass,
            "w-full space-y-3 bg-white p-3 sm:p-4"
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#303030]">
                Editing dashboard
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#616161]">
                Drag sections to rearrange, remove ones you do not need, then
                save for yourself or share with the team.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className={cn(dashboardGhostButtonClass, "h-9")}
                disabled={saving}
                onClick={cancelEditing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                disabled={saving || draftLayout.length === 0}
                onClick={() => openSaveDialog(true)}
              >
                <Share2 className="size-3.5" />
                Save as layout
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9")}
                disabled={saving || draftLayout.length === 0}
                onClick={() => void handleSavePersonal()}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : activeView?.isOwner ? (
                  "Save layout"
                ) : (
                  "Done"
                )}
              </Button>
            </div>
          </div>

          {missingWidgets.length > 0 ? (
            <div className="space-y-2 border-t border-[#ebebeb] pt-3">
              <p className="text-[12px] font-medium text-[#616161]">
                Add widgets
              </p>
              <div className="flex flex-wrap gap-2">
                {missingWidgets.map((widget) => (
                  <button
                    key={widget.id}
                    type="button"
                    onClick={() => addWidget(widget.id)}
                    className={cn(
                      dashboardControlClass,
                      "h-8 border-dashed px-2.5 text-[12px]"
                    )}
                  >
                    <Plus className="size-3" />
                    {widget.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="border-t border-[#ebebeb] pt-3 text-[12px] text-[#616161]">
              All widgets are on your dashboard. Remove one to free space for
              another.
            </p>
          )}

          {error ? (
            <p className="text-[12px] text-[#b42318]">{error}</p>
          ) : null}
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md">
          <DialogHeader className="border-b border-[#ebebeb] px-6 py-5">
            <DialogTitle className="text-[17px] font-semibold text-[#303030]">
              {editingViewId ? "Update saved layout" : "Save dashboard layout"}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-[#616161]">
              Name this arrangement and optionally share it with everyone in
              your shop — same idea as custom order list views.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="dashboard-view-name" className="text-[#303030]">
                Layout name
              </Label>
              <Input
                id="dashboard-view-name"
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="e.g. Production focus"
                className={dashboardControlClass}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3">
              <input
                type="checkbox"
                checked={shareWithTeam}
                onChange={(event) => setShareWithTeam(event.target.checked)}
                className="mt-0.5 size-4 rounded border-[#c9cccf]"
              />
              <span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#303030]">
                  <Share2 className="size-3.5" />
                  Share with team
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-[#616161]">
                  Teammates can pick this layout from their dashboard dropdown.
                </span>
              </span>
            </label>

            {error ? (
              <p className="text-[13px] text-[#b42318]">{error}</p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-h-9">
              {editingViewId ? (
                <Button
                  type="button"
                  className={cn(
                    dashboardGhostButtonClass,
                    "h-9 text-[#b42318] hover:bg-[#fff1f1] hover:text-[#b42318]"
                  )}
                  disabled={saving}
                  onClick={() => void handleDeleteView()}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                className={cn(dashboardControlClass, "h-9")}
                disabled={saving}
                onClick={() => setSaveOpen(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "h-9")}
                disabled={saving || !viewName.trim()}
                onClick={() => void handleSaveNamedView()}
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : editingViewId ? (
                  "Save layout"
                ) : (
                  "Save new layout"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
