"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addTaskComment as apiAddTaskComment,
  deleteTask as apiDeleteTask,
  updateTask as apiUpdateTask,
  type AssignableStaffMember,
  type ManualTask,
  type ManualTaskStatus,
} from "@/lib/api";
import {
  dashboardControlClass,
  dashboardGhostButtonClass,
  dashboardInsetSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
} from "@/lib/dashboard-styles";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  MANUAL_TASK_PRIORITY_META,
  MANUAL_TASK_STATUS_META,
  MANUAL_TASK_STATUS_ORDER,
  isManualTaskOverdue,
} from "@/lib/manual-tasks-board";
import { cn } from "@/lib/utils";

function MetaPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-[#8a8a8a]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-[13px] font-medium text-[#303030]",
          accent && "text-[#8f1f1f]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CommentBubble({
  authorName,
  body,
  createdAt,
}: {
  authorName: string;
  body: string;
  createdAt: string;
}) {
  return (
    <div className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-[#303030]">{authorName}</p>
        <p className="shrink-0 text-[11px] tabular-nums text-[#8a8a8a]">
          {formatDateTime(createdAt)}
        </p>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[#303030]">
        {body}
      </p>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  members,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onEdit,
}: {
  task: ManualTask | null;
  members: AssignableStaffMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (task: ManualTask) => void;
  onDeleted: (taskId: string) => void;
  onEdit: (task: ManualTask) => void;
}) {
  const { getIdToken, profile } = useAuth();
  const currentUser = profile?.type === "staff" ? profile.user : null;

  const [status, setStatus] = useState<ManualTaskStatus>("todo");
  const [comment, setComment] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task || !open) return;
    setStatus(task.status);
    setComment("");
    setError(null);
  }, [task, open]);

  const assigneeName = useMemo(() => {
    if (!task) return "";
    if (task.assigneeName?.trim()) return task.assigneeName.trim();
    const member = task.assigneeId
      ? members.find((entry) => entry.id === task.assigneeId)
      : undefined;
    return member?.name || "Unassigned";
  }, [task, members]);

  if (!task) return null;

  const overdue = isManualTaskOverdue(task);
  const comments = task.comments ?? [];

  const handleStatusChange = async (next: ManualTaskStatus) => {
    if (next === status) return;
    const token = await getIdToken();
    if (!token) return;

    setSavingStatus(true);
    setError(null);
    setStatus(next);
    try {
      const { task: saved } = await apiUpdateTask(token, task.id, {
        status: next,
      });
      onUpdated(saved);
    } catch (err) {
      setStatus(task.status);
      setError(
        err instanceof Error ? err.message : "Could not update status."
      );
    } finally {
      setSavingStatus(false);
    }
  };

  const handlePostComment = async () => {
    const text = comment.trim();
    if (!text) return;
    const token = await getIdToken();
    if (!token) return;

    setPostingComment(true);
    setError(null);
    try {
      const { task: saved } = await apiAddTaskComment(token, task.id, text);
      onUpdated(saved);
      setComment("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not post your update."
      );
    } finally {
      setPostingComment(false);
    }
  };

  const handleDelete = async () => {
    const token = await getIdToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiDeleteTask(token, task.id);
      onDeleted(task.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,780px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-[#ebebeb] bg-[#fafafa] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold text-[#303030]">
                {task.title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px] text-[#616161]">
                {task.createdByName
                  ? `Created by ${task.createdByName}`
                  : "Team task"}
                {task.updatedAt ? ` · Updated ${formatDate(task.updatedAt)}` : ""}
              </DialogDescription>
            </div>
            <Button
              type="button"
              className={cn(dashboardControlClass, "h-8 px-2.5 text-[12px]")}
              onClick={() => onEdit(task)}
            >
              <Pencil className="size-3.5" />
              Edit details
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
          {error ? (
            <div className="rounded-lg border border-[#f5b5b5] bg-[#fff1f1] px-3 py-2 text-[13px] text-[#8f1f1f]">
              {error}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <MetaPill label="Assignee" value={assigneeName} />
            <MetaPill
              label="Due date"
              value={task.dueDate ? formatDate(task.dueDate) : "No deadline"}
              accent={overdue}
            />
            <MetaPill
              label="Priority"
              value={MANUAL_TASK_PRIORITY_META[task.priority].label}
            />
            <MetaPill label="Created" value={formatDate(task.createdAt)} />
          </div>

          {task.description ? (
            <div className={cn(dashboardInsetSurfaceClass, "px-3 py-2.5")}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                Description
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#303030]">
                {task.description}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
              Status
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MANUAL_TASK_STATUS_ORDER.map((option) => {
                const meta = MANUAL_TASK_STATUS_META[option];
                const active = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={savingStatus}
                    onClick={() => void handleStatusChange(option)}
                    className={cn(
                      dashboardControlClass,
                      "h-8 gap-1.5 px-2.5 text-[12px]",
                      active && "border-[#2c6ecb] bg-[#f4f7fd] text-[#2c6ecb]"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
                <MessageSquare className="size-3.5" />
                Updates
              </p>
              <span className="text-[11px] tabular-nums text-[#8a8a8a]">
                {comments.length}
              </span>
            </div>

            <div className="space-y-2">
              {comments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#e3e3e3] bg-[#fafafa] px-4 py-8 text-center">
                  <p className={dashboardTaskDetailClass}>
                    No updates yet. Add a comment to log progress or blockers.
                  </p>
                </div>
              ) : (
                comments.map((entry) => (
                  <CommentBubble
                    key={entry.id}
                    authorName={entry.authorName}
                    body={entry.body}
                    createdAt={entry.createdAt}
                  />
                ))
              )}
            </div>

            <div className="mt-3 space-y-2">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={3}
                placeholder="Add an update — e.g. blanks ordered, waiting on customer approval…"
                className="w-full rounded-lg border-[#e3e3e3] text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void handlePostComment();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#8a8a8a]">
                  {currentUser?.name ? (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="size-3" />
                      Posting as {currentUser.name}
                    </span>
                  ) : (
                    "Post an update for the team"
                  )}
                </p>
                <Button
                  type="button"
                  className={cn(dashboardPrimaryButtonClass, "h-9")}
                  onClick={() => void handlePostComment()}
                  disabled={postingComment || !comment.trim()}
                >
                  <Send className="size-3.5" />
                  {postingComment ? "Posting…" : "Post update"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#ebebeb] bg-[#fafafa] px-5 py-3 sm:px-6">
          <Button
            type="button"
            className={cn(
              dashboardControlClass,
              "h-9 border-[#f5b5b5] text-[#8f1f1f] hover:bg-[#fff1f1]"
            )}
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            <Trash2 className="size-3.5" />
            Delete task
          </Button>
          <Button
            type="button"
            className={cn(dashboardGhostButtonClass, "h-9")}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
