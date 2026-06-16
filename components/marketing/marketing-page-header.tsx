export function MarketingPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border/40 bg-white">
      <div className="container-marketing px-6 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow && (
            <p className="text-sm font-medium text-brand-primary">{eyebrow}</p>
          )}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-ink sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-brand-muted sm:text-lg">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
