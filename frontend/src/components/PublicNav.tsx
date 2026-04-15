import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

interface PublicNavLink {
  label: string;
  to: string;
  external?: boolean;
}

interface PublicNavAction {
  label: string;
  to: string;
  external?: boolean;
  variant?: "ghost" | "primary";
}

interface PublicNavProps {
  brand: ReactNode;
  links: PublicNavLink[];
  actions: PublicNavAction[];
  sticky?: boolean;
}

function NavAnchor({ to, label, external, onClick }: PublicNavLink & { onClick?: () => void }) {
  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="hover:text-white transition-colors"
      >
        {label}
      </a>
    );
  }

  return (
    <Link to={to} onClick={onClick} className="hover:text-white transition-colors">
      {label}
    </Link>
  );
}

function ActionLink({ to, label, external, variant, onClick }: PublicNavAction & { onClick?: () => void }) {
  const className =
    variant === "primary"
      ? "rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
      : "text-sm text-slate-300 hover:text-white transition-colors";

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={className}>
      {label}
    </Link>
  );
}

export function PublicNav({ brand, links, actions, sticky = true }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <nav className={`${sticky ? "sticky top-0" : ""} z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">{brand}</div>

        <div className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
          {links.map((link) => (
            <NavAnchor key={`${link.label}-${link.to}`} {...link} />
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {actions.map((action) => (
            <ActionLink key={`${action.label}-${action.to}`} {...action} />
          ))}
        </div>

        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close navigation backdrop"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed right-0 top-0 z-50 h-full w-72 transform border-l border-slate-800 bg-slate-950 p-5 shadow-2xl transition-transform duration-300 ease-out md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-200">Navigation</div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              {links.map((link) => (
                <div key={`mobile-${link.label}-${link.to}`}>
                  <NavAnchor {...link} onClick={() => setMobileOpen(false)} />
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
              {actions.map((action) => (
                <div key={`mobile-action-${action.label}-${action.to}`}>
                  <ActionLink {...action} onClick={() => setMobileOpen(false)} />
                </div>
              ))}
            </div>
          </aside>
        </>
      ) : null}
    </nav>
  );
}
