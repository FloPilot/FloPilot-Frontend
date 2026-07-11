import type { AiChatMessage } from "@/lib/reports/report-ai-assistant";

export type ReportAiChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiChatMessage[];
};

const STORAGE_PREFIX = "shop-report-ai-sessions-v1";
const MAX_SESSIONS = 40;

function storageKey(tenantId: string) {
  return `${STORAGE_PREFIX}:${tenantId}`;
}

export function createChatSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createWelcomeMessage(): AiChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "I'm your shop insights assistant. I read your orders, production schedule, team, and inventory — then answer questions and generate exportable reports.",
    suggestions: [
      "Give me a shop overview",
      "Show machine productivity",
      "Who are my top customers?",
      "Export rush orders",
    ],
  };
}

export function createEmptySession(now = new Date().toISOString()): ReportAiChatSession {
  return {
    id: createChatSessionId(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage()],
  };
}

/** Strip heavy report rows before persisting — they can be rebuilt from reportId / customReportDraft. */
export function serializeChatMessage(message: AiChatMessage): AiChatMessage {
  const { reportResult: _reportResult, ...rest } = message;
  return rest;
}

export function deriveSessionTitle(messages: AiChatMessage[]): string {
  const firstUser = messages.find(
    (message) => message.role === "user" && message.content.trim()
  );
  if (!firstUser) return "New conversation";
  const text = firstUser.content.trim().replace(/\s+/g, " ");
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}

export function loadChatSessions(tenantId: string): ReportAiChatSession[] {
  if (typeof window === "undefined" || !tenantId) return [];
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReportAiChatSession[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((session) => session?.id && Array.isArray(session.messages))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  } catch {
    return [];
  }
}

export function saveChatSession(
  tenantId: string,
  session: ReportAiChatSession
): ReportAiChatSession[] {
  if (typeof window === "undefined" || !tenantId) return [];

  const serialized: ReportAiChatSession = {
    ...session,
    title: deriveSessionTitle(session.messages),
    messages: session.messages.map(serializeChatMessage),
    updatedAt: new Date().toISOString(),
  };

  const existing = loadChatSessions(tenantId).filter(
    (entry) => entry.id !== serialized.id
  );
  const next = [serialized, ...existing].slice(0, MAX_SESSIONS);
  localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
  return next;
}

export function deleteChatSession(
  tenantId: string,
  sessionId: string
): ReportAiChatSession[] {
  if (typeof window === "undefined" || !tenantId) return [];
  const next = loadChatSessions(tenantId).filter(
    (session) => session.id !== sessionId
  );
  localStorage.setItem(storageKey(tenantId), JSON.stringify(next));
  return next;
}

export function getLatestChatSessionId(tenantId: string): string | null {
  const sessions = loadChatSessions(tenantId);
  return sessions[0]?.id ?? null;
}
