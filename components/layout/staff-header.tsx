"use client";

interface StaffHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function StaffHeader({ title, description, action }: StaffHeaderProps) {
  return (
    <div className="border-b border-[#e3e3e3] bg-[#f6f6f7] px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-[#303030] sm:text-[1.35rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[#616161]">{description}</p>
          )}
        </div>
        {action !== undefined && (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        )}
      </div>
    </div>
  );
}
