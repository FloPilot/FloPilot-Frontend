import Link from "next/link";
import { PLATFORM_NAME } from "@/lib/tenant-branding";
import { teamPortalPath } from "@/lib/team-portal";

export function TeamFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/90 backdrop-blur-sm">
      <div className="container-marketing px-6 py-10 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <p className="text-sm font-semibold tracking-tight text-brand-ink">
              FloPilot Team
            </p>
            <p className="mt-2 text-sm leading-relaxed text-brand-muted">
              Internal workspace for triaging customer feedback, coordinating
              product work, and running FloPilot operations.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:gap-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Workspace
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href={teamPortalPath()}
                    className="text-brand-ink/80 transition-colors hover:text-brand-ink"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href={teamPortalPath("/tickets")}
                    className="text-brand-ink/80 transition-colors hover:text-brand-ink"
                  >
                    Feedback inbox
                  </Link>
                </li>
                <li>
                  <Link
                    href={teamPortalPath("/members")}
                    className="text-brand-ink/80 transition-colors hover:text-brand-ink"
                  >
                    Team members
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="https://flopilot.io"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-ink/80 transition-colors hover:text-brand-ink"
                  >
                    flopilot.io
                  </a>
                </li>
                <li>
                  <a
                    href="https://flopilot.io/login"
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-ink/80 transition-colors hover:text-brand-ink"
                  >
                    Customer app login
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200/80 pt-6 text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {PLATFORM_NAME}. Internal use only.
          </p>
          <p>team.flopilot.io · FloPilot employee portal</p>
        </div>
      </div>
    </footer>
  );
}
