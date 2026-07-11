"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { ReportPreviewTable } from "@/components/reports/report-preview-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCustomReportId,
  getDataSourceDef,
  REPORT_DATA_SOURCES,
  runCustomReport,
  type CustomReportFilter,
  type ReportDataSourceId,
  type SavedCustomReport,
} from "@/lib/reports/custom-report-builder";
import {
  CUSTOM_REPORT_TEMPLATES,
} from "@/lib/reports/custom-report-templates";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import { saveCustomReport } from "@/lib/reports/custom-report-storage";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

export function CustomReportBuilderDialog({
  open,
  onOpenChange,
  data,
  initialReport,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShopReportData;
  initialReport?: SavedCustomReport | null;
  onSaved: (reports: SavedCustomReport[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceId, setSourceId] = useState<ReportDataSourceId>("orders");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<CustomReportFilter[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialReport?.title ?? "");
    setDescription(initialReport?.description ?? "");
    setSourceId(initialReport?.sourceId ?? "orders");
    setSelectedColumns(initialReport?.columns ?? []);
    setFilters(initialReport?.filters ?? []);
  }, [open, initialReport]);

  const source = useMemo(() => getDataSourceDef(sourceId), [sourceId]);

  const previewResult = useMemo(
    () =>
      runCustomReport(
        {
          title: title.trim() || "Preview",
          description: description.trim(),
          sourceId,
          columns: selectedColumns,
          filters,
        },
        data
      ),
    [title, description, sourceId, selectedColumns, filters, data]
  );

  const toggleColumn = (key: string) => {
    setSelectedColumns((current) => {
      if (current.length === 0) {
        return source.fields
          .map((field) => field.key)
          .filter((entry) => entry !== key);
      }
      return current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key];
    });
  };

  const addFilter = () => {
    const firstField = source.fields[0]?.key ?? "";
    setFilters((current) => [
      ...current,
      { field: firstField, operator: "contains", value: "" },
    ]);
  };

  const applyTemplate = (templateId: string) => {
    const template = CUSTOM_REPORT_TEMPLATES.find(
      (entry) => entry.id === templateId
    );
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description);
    setSourceId(template.sourceId);
    setSelectedColumns(template.columns);
    setFilters(template.filters);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const now = new Date().toISOString();
    const report: SavedCustomReport = {
      id: initialReport?.id ?? createCustomReportId(),
      title: title.trim(),
      description:
        description.trim() ||
        `Custom report from ${source.label.toLowerCase()}`,
      sourceId,
      columns:
        selectedColumns.length > 0
          ? selectedColumns
          : source.fields.map((field) => field.key),
      filters,
      createdAt: initialReport?.createdAt ?? now,
      updatedAt: now,
    };

    onSaved(saveCustomReport(report));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] px-5 py-4">
          <DialogTitle className={dashboardTaskTitleClass}>
            {initialReport ? "Edit custom report" : "Create custom report"}
          </DialogTitle>
          <DialogDescription className={dashboardTaskDetailClass}>
            Pick a data source, choose columns, filter rows, and save to your
            library.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_340px]">
          <div className="space-y-5 border-b border-[#ebebeb] p-5 lg:border-b-0 lg:border-r">
            {!initialReport && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Wand2 className="size-3.5 text-[#6b3fb5]" />
                  Quick start templates
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_REPORT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplate(template.id)}
                      className="rounded-full border border-[#e3e3e3] bg-white px-3 py-1 text-xs font-medium text-[#616161] transition-colors hover:border-[#d5c2f0] hover:bg-[#f7f3fd] hover:text-[#6b3fb5]"
                    >
                      {template.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-report-title">Report name</Label>
                <Input
                  id="custom-report-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Rush orders this month"
                />
              </div>
              <div className="space-y-2">
                <Label>Data source</Label>
                <Select
                  value={sourceId}
                  onValueChange={(value) => {
                    setSourceId(value as ReportDataSourceId);
                    setSelectedColumns([]);
                    setFilters([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_DATA_SOURCES.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-[#616161]">{source.description}</p>

            <div className="space-y-2">
              <Label htmlFor="custom-report-description">Description</Label>
              <Input
                id="custom-report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={source.description}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Columns</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-[#2c6ecb]"
                  onClick={() =>
                    setSelectedColumns(source.fields.map((field) => field.key))
                  }
                >
                  Select all
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {source.fields.map((field) => {
                  const checked =
                    selectedColumns.length === 0 ||
                    selectedColumns.includes(field.key);
                  return (
                    <label
                      key={field.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        checked
                          ? "border-[#c4d7f2] bg-[#f4f7fd]"
                          : "border-[#e3e3e3] bg-white"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleColumn(field.key)}
                        className="size-4 rounded border-[#c4c4c4]"
                      />
                      <span className="text-[#303030]">{field.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Filters</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[#2c6ecb]"
                  onClick={addFilter}
                >
                  <Plus className="size-3.5" />
                  Add filter
                </Button>
              </div>

              {filters.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#e3e3e3] px-3 py-4 text-sm text-[#616161]">
                  No filters — all rows from this data source will be included.
                </p>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <div
                      key={`${filter.field}-${index}`}
                      className="grid gap-2 rounded-lg border border-[#ebebeb] bg-[#fafafa] p-3 sm:grid-cols-[1fr_120px_1fr_auto]"
                    >
                      <Select
                        value={filter.field}
                        onValueChange={(value) => {
                          if (!value) return;
                          setFilters((current) =>
                            current.map((entry, i) =>
                              i === index ? { ...entry, field: value } : entry
                            )
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {source.fields.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          setFilters((current) =>
                            current.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    operator:
                                      value as CustomReportFilter["operator"],
                                  }
                                : entry
                            )
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="gte">On or after</SelectItem>
                          <SelectItem value="lte">On or before</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        value={filter.value}
                        onChange={(event) =>
                          setFilters((current) =>
                            current.map((entry, i) =>
                              i === index
                                ? { ...entry, value: event.target.value }
                                : entry
                            )
                          )
                        }
                        placeholder="Value"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-[#8f1f1f]"
                        onClick={() =>
                          setFilters((current) =>
                            current.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col bg-[#fafafa] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8a8a]">
              Live preview
            </p>
            <p className="mt-1 text-sm text-[#616161]">
              <span className="font-medium tabular-nums text-[#303030]">
                {previewResult.rows.length.toLocaleString()}
              </span>{" "}
              rows match
            </p>
            <div className="mt-3 min-h-0 flex-1 overflow-auto">
              <ReportPreviewTable result={previewResult} limit={8} compact />
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-[#ebebeb] bg-white px-5 py-4">
          <Button
            type="button"
            className={dashboardControlClass}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={dashboardPrimaryButtonClass}
            disabled={!title.trim()}
            onClick={handleSave}
          >
            Save report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
