export function LegalDocument({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/40 bg-white">
      <div className="container-marketing px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto max-w-3xl space-y-8 text-[15px] leading-relaxed text-brand-muted [&_a]:font-medium [&_a]:text-brand-primary [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-brand-ink [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-brand-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </article>
      </div>
    </div>
  );
}
