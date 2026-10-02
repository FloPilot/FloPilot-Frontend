"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  ChevronRight,
  Lightbulb,
  ListOrdered,
  Search,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHelpDocs } from "@/components/help/help-docs-provider";
import {
  HELP_DOC_ARTICLES,
  HELP_DOC_SECTIONS,
  getHelpArticle,
  searchHelpDocs,
  type HelpDocArticle,
  type HelpDocSectionId,
} from "@/lib/help-docs/catalog";
import { cn } from "@/lib/utils";

function ArticleBody({ article }: { article: HelpDocArticle }) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#8a8a8a]">
        {HELP_DOC_SECTIONS.find((s) => s.id === article.sectionId)?.label}
      </p>
      <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-[#303030]">
        {article.title}
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-[#616161]">
        {article.summary}
      </p>

      {article.image ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-[#e3e3e3] bg-[#f6f6f7] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Image
            src={article.image}
            alt={article.imageAlt || article.title}
            width={1400}
            height={900}
            className="h-auto w-full object-cover object-top"
            unoptimized
          />
        </div>
      ) : null}

      <div className="mt-8 space-y-4">
        {article.body.map((paragraph) => (
          <p
            key={paragraph.slice(0, 48)}
            className="text-[15px] leading-[1.65] text-[#404040]"
          >
            {paragraph}
          </p>
        ))}
      </div>

      {article.steps && article.steps.length > 0 ? (
        <div className="mt-8 rounded-xl border border-[#ebebeb] bg-[#fafafa] px-5 py-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#303030]">
            <ListOrdered className="size-4 text-[#2c6ecb]" />
            How to
          </div>
          <ol className="mt-3 space-y-2.5">
            {article.steps.map((step, index) => (
              <li
                key={`${article.id}-step-${index}`}
                className="flex gap-3 text-[14px] leading-snug text-[#404040]"
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#2c6ecb] text-[11px] font-semibold text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {article.tips && article.tips.length > 0 ? (
        <div className="mt-5 rounded-xl border border-[#d6e4f7] bg-[#f4f7fd] px-5 py-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[#2c6ecb]">
            <Lightbulb className="size-4" />
            Tips
          </div>
          <ul className="mt-3 space-y-2">
            {article.tips.map((tip) => (
              <li
                key={tip.slice(0, 40)}
                className="text-[14px] leading-snug text-[#3d5a80]"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function StaffHelpDocsModal() {
  const { open, closeDocs, initialArticleId } = useHelpDocs();
  const [query, setQuery] = useState("");
  const [sectionId, setSectionId] = useState<HelpDocSectionId | "all">("all");
  const [activeId, setActiveId] = useState(HELP_DOC_ARTICLES[0]?.id || "welcome");

  useEffect(() => {
    if (!open) return;
    const next = initialArticleId && getHelpArticle(initialArticleId)
      ? initialArticleId
      : "welcome";
    setActiveId(next);
    setQuery("");
    setSectionId("all");
  }, [open, initialArticleId]);

  const searchResults = useMemo(() => searchHelpDocs(query), [query]);

  const visibleArticles = useMemo(() => {
    if (query.trim()) return searchResults;
    if (sectionId === "all") return HELP_DOC_ARTICLES;
    return HELP_DOC_ARTICLES.filter((a) => a.sectionId === sectionId);
  }, [query, searchResults, sectionId]);

  useEffect(() => {
    if (visibleArticles.length === 0) return;
    if (!visibleArticles.some((a) => a.id === activeId)) {
      setActiveId(visibleArticles[0].id);
    }
  }, [visibleArticles, activeId]);

  const activeArticle =
    visibleArticles.find((article) => article.id === activeId) ||
    visibleArticles[0] ||
    HELP_DOC_ARTICLES[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeDocs();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[min(920px,calc(100dvh-1.25rem))] w-[calc(100vw-1.25rem)] max-w-[1280px] flex-col gap-0 overflow-hidden rounded-2xl border border-[#e3e3e3] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.22)] sm:max-w-[1280px]"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#ebebeb] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-[17px] font-semibold text-[#303030]">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#f4f7fd] text-[#2c6ecb]">
                <BookOpen className="size-4" />
              </span>
              FloPilot Docs
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-[#616161]">
              Clear guides for every part of the shop — search or browse by area.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 rounded-lg text-[#616161] hover:bg-[#f1f1f1] hover:text-[#303030]"
            onClick={closeDocs}
            aria-label="Close docs"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="border-b border-[#ebebeb] px-5 py-3 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search docs — orders, proofs, QuickBooks, calendar…"
              className="h-11 rounded-xl border-[#e3e3e3] bg-[#fafafa] pl-10 text-[14px]"
              autoFocus
            />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.35fr)]">
          <aside className="hidden min-h-0 overflow-y-auto border-r border-[#ebebeb] bg-[#fafafa] lg:block">
            <nav className="space-y-0.5 p-3">
              <button
                type="button"
                onClick={() => {
                  setSectionId("all");
                  setQuery("");
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                  sectionId === "all" && !query
                    ? "bg-white font-medium text-[#303030] shadow-sm"
                    : "text-[#616161] hover:bg-white/70 hover:text-[#303030]"
                )}
              >
                All topics
                <ChevronRight className="size-3.5 opacity-40" />
              </button>
              {HELP_DOC_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setSectionId(section.id);
                    setQuery("");
                    const first = HELP_DOC_ARTICLES.find(
                      (a) => a.sectionId === section.id
                    );
                    if (first) setActiveId(first.id);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                    sectionId === section.id && !query
                      ? "bg-white font-medium text-[#303030] shadow-sm"
                      : "text-[#616161] hover:bg-white/70 hover:text-[#303030]"
                  )}
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronRight className="size-3.5 shrink-0 opacity-40" />
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-h-0 overflow-y-auto border-r border-[#ebebeb]">
            <div className="sticky top-0 z-10 border-b border-[#ebebeb] bg-white px-4 py-2.5">
              <p className="text-[12px] font-medium text-[#8a8a8a]">
                {query.trim()
                  ? `${visibleArticles.length} result${visibleArticles.length === 1 ? "" : "s"}`
                  : sectionId === "all"
                    ? "Browse all guides"
                    : HELP_DOC_SECTIONS.find((s) => s.id === sectionId)
                        ?.description}
              </p>
            </div>
            {visibleArticles.length === 0 ? (
              <p className="px-4 py-8 text-[13px] text-[#8a8a8a]">
                No guides match “{query}”. Try orders, estimate, calendar, or
                QuickBooks.
              </p>
            ) : (
              <ul className="p-2">
                {visibleArticles.map((article) => {
                  const active = article.id === activeArticle?.id;
                  return (
                    <li key={article.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(article.id)}
                        className={cn(
                          "w-full rounded-xl px-3 py-3 text-left transition-colors",
                          active
                            ? "bg-[#f4f7fd] ring-1 ring-[#c4d7f2]"
                            : "hover:bg-[#f6f6f7]"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[13px] font-medium",
                            active ? "text-[#2c6ecb]" : "text-[#303030]"
                          )}
                        >
                          {article.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#8a8a8a]">
                          {article.summary}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
            {activeArticle ? <ArticleBody article={activeArticle} /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
