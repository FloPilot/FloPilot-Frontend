"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTask as apiCreateTask,
  deleteTask as apiDeleteTask,
  listStaffMembers,
  listTasks as apiListTasks,
  updateTask as apiUpdateTask,
  type AssignableStaffMember,
  type ManualTask,
  type ManualTaskInput,
  type ManualTaskPriority,
  type ManualTaskStatus,
} from "@/lib/api";
import {
  dashboardCardClass,
  dashboardControlClass,
  dashboardPrimaryButtonClass,
} from "@/lib/dashboard-styles";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  ManualTaskStatus,
  { label: string; badge: string; dot: string }
> = {
  todo: {
    label: "To do",
    badge: "border-[#e3e3e3] bg-[#f6f6f7] text-[#616161]",
    dot: "bg-[#8a8a8a]",
  },
  in_progress: {
    label: "In progress",
    badge: "border-[#c4d7f2] bg-[#f4f7fd] text-[#2c6ecb]",
    dot: "bg-[#2c6ecb]",
  },
  blocked: {
    label: "Blocked",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
    dot: "bg-[#d72c2c]",
  },
  done: {
    label: "Done",
    badge: "border-[#86d4a8] bg-[#e8f5ee] text-[#0d5c2e]",
    dot: "bg-[#0d8a45]",
  },
};

const STATUS_ORDER: ManualTaskStatus[] = [
  "todo",
  "in_progress",
  "blocked",
  "done",
];

const PRIORITY_META: Record<
  ManualTaskPriority,
  { label: string; badge: string }
> = {
  low: { label: "Low", badge: "border-[#e3e3e3] bg-[#f6f6f7] text-[#8a8a8a]" },
  normal: {
    label: "Normal",
    badge: "border-[#e3e3e3] bg-white text-[#616161]",
  },
  high: {
    label: "High",
    badge: "border-[#f0d9a8] bg-[#fff8eb] text-[#8a6116]",
  },
  urgent: {
    label: "Urgent",
    badge: "border-[#f5b5b5] bg-[#fff1f1] text-[#8f1f1f]",
  },
};

const PRIORITY_ORDER: ManualTaskPriority[] = [
  "urgent",
  "high",
  "normal",
  "low",
];

const ASSIGNEE_COLORS = [
  "bg-[#e8f0fb] text-[#2c6ecb]",
  "bg-[#e8f5ee] text-[#0d5c2e]",
  "bg-[#f6f2fd] text-[#6b3fb5]",
  "bg-[#fff1d6] text-[#8a6116]",
  "bg-[#fde8ef] text-[#a3306a]",
  "bg-[#e4f4f4] text-[#0f6b6b]",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function avatarColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ASSIGNEE_COLORS[hash % ASSIGNEE_COLORS.length]!;
}

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isOverdue(task: ManualTask): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function Avatar({ name }: { name: string | null }) {
  if (!name) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-[#c9cccf] text-[#8a8a8a]">
        <UserIcon className="size-3" strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        avatarColor(name)
      )}
    >
      {initials(name)}
    </span>
  );
}

type AssigneeFilter = "all" | "me" | "unassigned" | string;

export function ManualTasksBoard() {
  const { getIdToken, profile } = useAuth();
  const currentUser = profile?.type === "staff" ? profile.user : null;
  const myId = currentUser?.id ?? null;

  const [tasks, setTasks] = useState<ManualTask[]>([]);
  const [members, setMembers] = useState<AssignableStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ManualTaskStatus | "all">(
    "all"
  );
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ManualTask | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [taskRes, memberRes] = await Promise.all([
        apiListTasks(token),
        listStaffMembers(token).catch(() => ({
          members: [] as AssignableStaffMember[],
        })),
      ]);
      setTasks(taskRes.tasks);
      setMembers(memberRes.members);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load tasks. Try again."
      );
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusCounts = useMemo(() => {
    const counts: Record<ManualTaskStatus | "all", number> = {
      all: tasks.length,
      todo: 0,
      in_progress: 0,
      blocked: 0,
      done: 0,
    };
    for (const task of tasks) counts[task.status] += 1;
    return counts;
  }, [tasks]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = tasks.filter((task) => {
      if (assigneeFilter === "me" && task.assigneeId !== myId) return false;
      if (assigneeFilter === "unassigned" && task.assigneeId) return false;
      if (
        assigneeFilter !== "all" &&
        assigneeFilter !== "me" &&
        assigneeFilter !== "unassigned" &&
        task.assigneeId !== assigneeFilter
      ) {
        return false;
      }
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (query) {
        const haystack =
          `${task.title} ${task.description} ${task.assigneeName}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const statusRank = (status: ManualTaskStatus) =>
      status === "done" ? 1 : 0;
    return result.sort((a, b) => {
      const doneDiff = statusRank(a.status) - statusRank(b.status);
      if (doneDiff !== 0) return doneDiff;
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (aDue !== bDue) return aDue - bDue;
      return (
        PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
      );
    });
  }, [tasks, assigneeFilter, statusFilter, search, myId]);

  const applyTask = useCallback((task: ManualTask) => {
    setTasks((current) => {
      const exists = current.some((entry) => entry.id === task.id);
      return exists
        ? current.map((entry) => (entry.id === task.id ? task : entry))
        : [task, ...current];
    });
  }, []);

  const handleToggleDone = useCallback(
    async (task: ManualTask) => {
      const token = await getIdToken();
      if (!token) return;
      const nextStatus: ManualTaskStatus =
        task.status === "done" ? "todo" : "done";
      // Optimistic update
      applyTask({ ...task, status: nextStatus });
      try {
        const { task: saved } = await apiUpdateTask(token, task.id, {
          status: nextStatus,
        });
        applyTask(saved);
      } catch {
        applyTask(task);
      }
    },
    [getIdToken, applyTask]
  );

  const handleDelete = useCallback(
    async (task: ManualTask) => {
      const token = await getIdToken();
      if (!token) return;
      const snapshot = tasks;
      setTasks((current) => current.filter((entry) => entry.id !== task.id));
      try {
        await apiDeleteTask(token, task.id);
      } catch {
        setTasks(snapshot);
      }
    },
    [getIdToken, tasks]
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (task: ManualTask) => {
    setEditing(task);
    setDialogOpen(true);
  };

  const hasFilters =
    assigneeFilter !== "all" || statusFilter !== "all" || search.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={assigneeFilter}
            onValueChange={(value) => setAssigneeFilter(value as AssigneeFilter)}
          >
            <SelectTrigger
              className={cn(dashboardControlClass, "h-9 w-[200px] px-3 text-[13px]")}
            >
              <SelectValue placeholder="All tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              {myId ? <SelectItem value="me">Assigned to me</SelectItem> : null}
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.length > 0 ? (
                <div className="my-1 border-t border-[#ebebeb]" />
              ) : null}
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                  {member.id === myId ? " (me)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks"
              className={cn(dashboardControlClass, "h-9 w-56 pl-8")}
            />
          </div>
        </div>

        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "h-9")}
          onClick={openCreate}
        >
          <Plus className="size-4" strokeWidth={2} />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusChip
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
          label="All"
          count={statusCounts.all}
        />
        {STATUS_ORDER.map((status) => (
          <StatusChip
            key={status}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            label={STATUS_META[status].label}
            count={statusCounts[status]}
            dot={STATUS_META[status].dot}
          />
        ))}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <section className={dashboardCardClass}>
        {loading ? (
          <div className="px-6 py-16 text-center text-[13px] text-[#616161]">
            Loading tasks…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onCreate={openCreate} />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-[#ebebeb] hover:bg-transparent">
                  <TableHead className="h-9 w-10 bg-[#fafafa] pl-4 sm:pl-5" />
                  <TableHead className="h-9 min-w-[280px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Task
                  </TableHead>
                  <TableHead className="h-9 min-w-[160px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Assignee
                  </TableHead>
                  <TableHead className="h-9 min-w-[130px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Due
                  </TableHead>
                  <TableHead className="h-9 min-w-[100px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Priority
                  </TableHead>
                  <TableHead className="h-9 min-w-[110px] bg-[#fafafa] text-[12px] font-medium text-[#616161]">
                    Status
                  </TableHead>
                  <TableHead className="h-9 w-[80px] bg-[#fafafa] pr-4 text-right sm:pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <TableRow
                      key={task.id}
                      className="group cursor-pointer border-[#ebebeb] transition-colors hover:bg-[#f6f6f7]"
                      onClick={() => openEdit(task)}
                    >
                      <TableCell className="py-2.5 pl-4 sm:pl-5">
                        <button
                          type="button"
                          aria-label={
                            task.status === "done"
                              ? "Mark as not done"
                              : "Mark as done"
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleDone(task);
                          }}
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border transition-colors",
                            task.status === "done"
                              ? "border-[#0d8a45] bg-[#0d8a45] text-white"
                              : "border-[#c9cccf] text-transparent hover:border-[#0d8a45] hover:text-[#0d8a45]/40"
                          )}
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </button>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <p
                          className={cn(
                            "text-[13px] font-medium text-[#303030] group-hover:text-[#2c6ecb]",
                            task.status === "done" &&
                              "text-[#8a8a8a] line-through group-hover:text-[#8a8a8a]"
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description ? (
                          <p className="mt-0.5 max-w-[420px] truncate text-[12px] text-[#8a8a8a]">
                            {task.description}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assigneeName || null} />
                          <span className="truncate text-[13px] text-[#303030]">
                            {task.assigneeName || (
                              <span className="text-[#8a8a8a]">Unassigned</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        {task.dueDate ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-[13px] tabular-nums",
                              overdue
                                ? "font-medium text-[#8f1f1f]"
                                : "text-[#616161]"
                            )}
                          >
                            {overdue ? (
                              <CalendarClock className="size-3.5" />
                            ) : null}
                            {formatDate(task.dueDate)}
                          </span>
                        ) : (
                          <span className="text-[13px] text-[#c9cccf]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            PRIORITY_META[task.priority].badge
                          )}
                        >
                          {PRIORITY_META[task.priority].label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
                            STATUS_META[task.status].badge
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              STATUS_META[task.status].dot
                            )}
                          />
                          {STATUS_META[task.status].label}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 pr-4 text-right sm:pr-5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label="Edit task"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEdit(task);
                            }}
                            className="rounded-md p-1.5 text-[#616161] hover:bg-[#ebebeb] hover:text-[#303030]"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete task"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDelete(task);
                            }}
                            className="rounded-md p-1.5 text-[#616161] hover:bg-[#fff1f1] hover:text-[#8f1f1f]"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <TaskDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        task={editing}
        members={members}
        currentUser={currentUser}
        onOpenChange={setDialogOpen}
        onSaved={(task) => {
          applyTask(task);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

function StatusChip({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        dashboardControlClass,
        "h-8 gap-1.5 px-2.5 text-[12px]",
        active && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dot)} /> : null}
      {label}
      <span className="tabular-nums text-[10px] opacity-70">{count}</span>
    </button>
  );
}

function EmptyState({
  hasFilters,
  onCreate,
}: {
  hasFilters: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f4f7fd] text-[#2c6ecb]">
        <ListChecks className="size-6" />
      </div>
      <p className="text-sm font-medium text-[#303030]">
        {hasFilters ? "No tasks match your filters" : "No tasks yet"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#616161]">
        {hasFilters
          ? "Try a different assignee, status, or search term."
          : "Create a task like “Order blanks”, assign it to a teammate, and set a deadline to keep the shop on track."}
      </p>
      {!hasFilters ? (
        <Button
          type="button"
          className={cn(dashboardPrimaryButtonClass, "mt-5 h-9")}
          onClick={onCreate}
        >
          <Plus className="size-4" strokeWidth={2} />
          New task
        </Button>
      ) : null}
    </div>
  );
}

const UNASSIGNED_VALUE = "__unassigned__";

function TaskDialog({
  open,
  task,
  members,
  currentUser,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  task: ManualTask | null;
  members: AssignableStaffMember[];
  currentUser: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (task: ManualTask) => void;
}) {
  const { getIdToken } = useAuth();
  const isEdit = task !== null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>(UNASSIGNED_VALUE);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<ManualTaskPriority>("normal");
  const [status, setStatus] = useState<ManualTaskStatus>("todo");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setAssigneeId(task.assigneeId ?? UNASSIGNED_VALUE);
      setDueDate(toDateInput(task.dueDate));
      setPriority(task.priority);
      setStatus(task.status);
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId(currentUser?.id ?? UNASSIGNED_VALUE);
      setDueDate("");
      setPriority("normal");
      setStatus("todo");
    }
    setError(null);
  }, [open, task, currentUser]);

  const resolveAssigneeName = (id: string): string => {
    if (id === UNASSIGNED_VALUE) return "";
    const member = members.find((entry) => entry.id === id);
    if (member) return member.name;
    if (currentUser?.id === id) return currentUser.name;
    return task?.assigneeId === id ? task.assigneeName : "";
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a task title.");
      return;
    }
    const token = await getIdToken();
    if (!token) {
      setError("You need to be signed in.");
      return;
    }

    const payload: ManualTaskInput = {
      title: trimmed,
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId === UNASSIGNED_VALUE ? null : assigneeId,
      assigneeName: resolveAssigneeName(assigneeId),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    };

    setSaving(true);
    setError(null);
    try {
      const result = isEdit
        ? await apiUpdateTask(token, task!.id, payload)
        : await apiCreateTask(token, payload);
      onSaved(result.task);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the task. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details, assignee, or deadline."
              : "Add a task, assign it to a teammate, and set a deadline."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-[#616161]">
              Title
            </Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Order blanks for Acme tee run"
              className={cn(dashboardControlClass, "h-9")}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-[#616161]">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Optional details, links, or context"
              className="w-full rounded-lg border-[#e3e3e3] text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#616161]">
                Assignee
              </Label>
              <Select
                value={assigneeId}
                onValueChange={(value) =>
                  setAssigneeId(value ?? UNASSIGNED_VALUE)
                }
              >
                <SelectTrigger className={cn(dashboardControlClass, "h-9 px-3")}>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                      {currentUser?.id === member.id ? " (me)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#616161]">
                Due date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={cn(dashboardControlClass, "h-9")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#616161]">
                Priority
              </Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setPriority(value as ManualTaskPriority)
                }
              >
                <SelectTrigger className={cn(dashboardControlClass, "h-9 px-3")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>
                      {PRIORITY_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-[#616161]">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ManualTaskStatus)}
              >
                <SelectTrigger className={cn(dashboardControlClass, "h-9 px-3")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((value) => (
                    <SelectItem key={value} value={value}>
                      {STATUS_META[value].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className={cn(dashboardControlClass, "h-9")}
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
          <Button
            type="button"
            className={cn(dashboardPrimaryButtonClass, "h-9")}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
