"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  BookmarkPlus,
  Clock3,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ReportPreviewTable } from "@/components/reports/report-preview-table";
import { downloadReportCsv } from "@/lib/reports/csv";
import type { ShopReportData } from "@/lib/reports/shop-report-data";
import {
  buildAssistantMessageFromApi,
  createUserMessage,
  getAiStarterSuggestions,
  hydrateChatMessages,
  isSaveToLibraryRequest,
  type AiChatMessage,
} from "@/lib/reports/report-ai-assistant";
import type { SavedCustomReport } from "@/lib/reports/custom-report-builder";
import { saveCustomReport } from "@/lib/reports/custom-report-storage";
import type { ReportDateRange } from "@/lib/reports/report-date-range";
import {
  createEmptySession,
  createWelcomeMessage,
  deleteChatSession,
  loadChatSessions,
  saveChatSession,
  type ReportAiChatSession,
} from "@/lib/reports/report-ai-chat-storage";
import { askReportAssistant } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dashboardControlClass,
  dashboardPrimaryButtonClass,
  dashboardTaskDetailClass,
  dashboardTaskTitleClass,
} from "@/lib/dashboard-styles";
import { cn } from "@/lib/utils";

type PanelView = "chat" | "history";

function formatSessionDate(iso: string) {
  try {
    return format(parseISO(iso), "MMM d, h:mm a");
  } catch {
    return "";
  }
}

function countUserMessages(messages: AiChatMessage[]) {
  return messages.filter((message) => message.role === "user").length;
}

export function ReportAiPanel({
  data,
  dateRange,
  getIdToken,
  tenantId,
  onOpenReport,
  onCustomReportSaved,
  className,
  compactHeader = false,
}: {
  data: ShopReportData;
  dateRange: ReportDateRange;
  getIdToken: () => Promise<string | null>;
  tenantId: string;
  onOpenReport?: (reportId: string) => void;
  onCustomReportSaved?: (reports: SavedCustomReport[]) => void;
  className?: string;
  compactHeader?: boolean;
}) {
  const [view, setView] = useState<PanelView>("chat");
  const [sessions, setSessions] = useState<ReportAiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<AiChatMessage[]>([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [lastDraft, setLastDraft] = useState<SavedCustomReport | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const persistSession = useCallback(
    (nextMessages: AiChatMessage[], sessionId = activeSessionId) => {
      if (!tenantId || !sessionId) return;
      if (countUserMessages(nextMessages) === 0) return;

      const existing =
        sessions.find((session) => session.id === sessionId) ??
        createEmptySession();
      const updated: ReportAiChatSession = {
        ...existing,
        id: sessionId,
        messages: nextMessages,
        updatedAt: new Date().toISOString(),
      };
      const nextSessions = saveChatSession(tenantId, updated);
      setSessions(nextSessions);
    },
    [activeSessionId, sessions, tenantId]
  );

  useEffect(() => {
    if (!tenantId) return;
    const stored = loadChatSessions(tenantId);
    setSessions(stored);

    const session = stored[0] ?? createEmptySession();
    setActiveSessionId(session.id);
    setMessages(session.messages);
  }, [tenantId]);

  useEffect(() => {
    setMessages((prev) => hydrateChatMessages(prev, data));
  }, [data]);

  useEffect(() => {
    if (!stickToBottomRef.current || view !== "chat") return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, view]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 96;
  };

  const startNewChat = () => {
    const fresh = createEmptySession();
    setActiveSessionId(fresh.id);
    setMessages(fresh.messages);
    setLastDraft(null);
    setInput("");
    setView("chat");
    stickToBottomRef.current = true;
  };

  const openSession = (session: ReportAiChatSession) => {
    setActiveSessionId(session.id);
    setMessages(hydrateChatMessages(session.messages, data));
    setLastDraft(null);
    setView("chat");
    stickToBottomRef.current = true;
  };

  const removeSession = (sessionId: string) => {
    if (!tenantId) return;
    const nextSessions = deleteChatSession(tenantId, sessionId);
    setSessions(nextSessions);

    if (sessionId === activeSessionId) {
      if (nextSessions.length > 0) {
        openSession(nextSessions[0]);
      } else {
        startNewChat();
      }
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    if (isSaveToLibraryRequest(trimmed) && lastDraft) {
      setInput("");
      const nextMessages = [...messages, createUserMessage(trimmed)];
      setMessages(nextMessages);
      const next = saveCustomReport(lastDraft);
      onCustomReportSaved?.(next);
      const withReply = [
        ...nextMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant" as const,
          content: `Saved "${lastDraft.title}" to your custom report library. You can preview, edit, or export it anytime.`,
          suggestions: getAiStarterSuggestions().slice(0, 3),
        },
      ];
      setMessages(withReply);
      persistSession(withReply);
      return;
    }

    setInput("");
    const userMessage = createUserMessage(trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setThinking(true);
    stickToBottomRef.current = true;

    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error("You must be signed in to use the insights assistant.");
      }

      const history = messages
        .filter((entry) => entry.id !== "welcome")
        .slice(-8)
        .map((entry) => ({
          role: entry.role,
          content: entry.content,
        }));

      const apiResponse = await askReportAssistant(token, {
        message: trimmed,
        dateRange,
        history,
      });

      if (apiResponse.customReport) {
        setLastDraft(apiResponse.customReport);
      }

      const response = buildAssistantMessageFromApi(apiResponse, data);
      const withReply = [...nextMessages, response];
      setMessages(withReply);
      persistSession(withReply);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      const withReply = [
        ...nextMessages,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant" as const,
          content: message,
          suggestions: getAiStarterSuggestions().slice(0, 3),
        },
      ];
      setMessages(withReply);
      persistSession(withReply);
    } finally {
      setThinking(false);
    }
  };

  const saveDraft = (draft: SavedCustomReport) => {
    const next = saveCustomReport(draft);
    onCustomReportSaved?.(next);
    const withReply = [
      ...messages,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant" as const,
        content: `Saved "${draft.title}" to your library.`,
        suggestions: ["Show employee productivity", "Export rush orders"],
      },
    ];
    setMessages(withReply);
    persistSession(withReply);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div
        className={cn(
          "shrink-0 border-b border-[#ebebeb] bg-white",
          compactHeader ? "px-3.5 py-3 pr-12" : "px-4 py-3.5 sm:px-5"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            {view === "history" ? (
              <button
                type="button"
                onClick={() => setView("chat")}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#616161] transition-colors hover:bg-[#f1f1f1]"
                title="Back to chat"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#efe7fb] to-[#e8f0fb] text-[#6b3fb5]">
                <Sparkles className="size-4" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className={cn(dashboardTaskTitleClass, "truncate text-sm sm:text-[15px]")}>
                {view === "history" ? "Chat history" : "Insights assistant"}
              </h2>
              <p className={cn(dashboardTaskDetailClass, "truncate text-[12px]")}>
                {view === "history"
                  ? `${sessions.length} saved conversation${sessions.length === 1 ? "" : "s"}`
                  : "Ask anything — get answers & reports"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            {view === "chat" && (
              <>
                <button
                  type="button"
                  title="Chat history"
                  onClick={() => setView("history")}
                  className="rounded-lg p-2 text-[#616161] transition-colors hover:bg-[#f1f1f1]"
                >
                  <Clock3 className="size-4" />
                </button>
                <button
                  type="button"
                  title="New conversation"
                  onClick={startNewChat}
                  className="rounded-lg p-2 text-[#616161] transition-colors hover:bg-[#f1f1f1]"
                >
                  <MessageSquarePlus className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {view === "history" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {sessions.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#f4f7fd] text-[#2c6ecb]">
                <Clock3 className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-[#303030]">No saved chats yet</p>
              <p className="mt-1 max-w-[240px] text-[13px] text-[#616161]">
                Conversations are saved automatically after you send a message.
              </p>
              <Button
                type="button"
                className={cn(dashboardPrimaryButtonClass, "mt-4 h-9")}
                onClick={startNewChat}
              >
                Start a conversation
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const userCount = countUserMessages(session.messages);
                return (
                  <li key={session.id}>
                    <div
                      className={cn(
                        "group flex items-start gap-2 rounded-lg border p-3 transition-colors",
                        isActive
                          ? "border-[#c4d7f2] bg-[#f4f7fd]"
                          : "border-[#ebebeb] bg-[#fafafa] hover:border-[#d9d9d9] hover:bg-white"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openSession(session)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-[13px] font-semibold text-[#303030]">
                          {session.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#616161]">
                          {formatSessionDate(session.updatedAt)}
                          {userCount > 0 ? ` · ${userCount} message${userCount === 1 ? "" : "s"}` : ""}
                        </p>
                      </button>
                      <button
                        type="button"
                        title="Delete conversation"
                        onClick={() => removeSession(session.id)}
                        className="rounded-md p-1.5 text-[#8a8a8a] opacity-0 transition-all hover:bg-[#fff1f1] hover:text-[#8f1f1f] group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain scroll-smooth p-3.5 sm:p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "bg-[#2c6ecb] text-white"
                      : "border border-[#ebebeb] bg-[#fafafa] text-[#303030]"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>

                  {message.reportResult && message.reportResult.rows.length > 0 && (
                    <div className="mt-3 space-y-2 rounded-lg border border-[#e3e3e3] bg-white p-3">
                      <div>
                        <p className="text-xs font-semibold text-[#303030]">
                          {message.reportResult.title}
                        </p>
                        <p className="text-[11px] text-[#616161]">
                          {message.reportResult.rows.length.toLocaleString()} rows
                        </p>
                      </div>

                      <ReportPreviewTable
                        result={message.reportResult}
                        limit={3}
                        compact
                      />

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          className={cn(dashboardPrimaryButtonClass, "h-8")}
                          onClick={() =>
                            message.reportResult &&
                            downloadReportCsv(message.reportResult)
                          }
                        >
                          Export CSV
                        </Button>
                        {message.reportId && onOpenReport && (
                          <Button
                            type="button"
                            size="sm"
                            className={cn(dashboardControlClass, "h-8")}
                            onClick={() => onOpenReport(message.reportId!)}
                          >
                            Full preview
                          </Button>
                        )}
                        {message.customReportDraft && (
                          <Button
                            type="button"
                            size="sm"
                            className={cn(dashboardControlClass, "h-8 gap-1")}
                            onClick={() => saveDraft(message.customReportDraft!)}
                          >
                            <BookmarkPlus className="size-3.5" />
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => sendMessage(suggestion)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            message.role === "user"
                              ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                              : "border-[#e3e3e3] bg-white text-[#616161] hover:border-[#c4d7f2] hover:text-[#2c6ecb]"
                          )}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex items-center gap-2 px-1 text-sm text-[#616161]">
                <Loader2 className="size-4 animate-spin text-[#6b3fb5]" />
                Analyzing your shop data…
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-[#ebebeb] bg-white p-3.5 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about revenue, machines, team…"
                className="h-10 border-[#e3e3e3] bg-[#fafafa] focus:bg-white"
              />
              <Button
                type="submit"
                className={cn(dashboardPrimaryButtonClass, "h-10 shrink-0 px-3")}
                disabled={!input.trim() || thinking}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
