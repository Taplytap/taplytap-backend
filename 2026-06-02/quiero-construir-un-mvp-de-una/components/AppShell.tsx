"use client";

import { HeartHandshake, Home, MessageCircle, PackagePlus, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "landing" | "login" | "onboarding" | "feed" | "publish" | "matches" | "profile" | "my-items" | "report";

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "feed", label: "Feed", icon: Home },
  { id: "publish", label: "Subir", icon: PackagePlus },
  { id: "matches", label: "Matches", icon: HeartHandshake },
  { id: "profile", label: "Perfil", icon: User }
];

export function AppFrame({
  children,
  activeView,
  onNavigate
}: {
  children: React.ReactNode;
  activeView: View;
  onNavigate: (view: View) => void;
}) {
  const showNav = !["landing", "login", "onboarding"].includes(activeView);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-[#fffdfa]/80 shadow-2xl shadow-slate-900/10">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {showNav ? (
        <nav className="safe-bottom sticky bottom-0 z-30 border-t border-[#eadfd1] bg-[#fffdfa]/95 px-4 pt-2 backdrop-blur">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition",
                    active ? "bg-[#13212f] text-white" : "text-slate-500 hover:bg-slate-100"
                  )}
                  aria-label={item.label}
                >
                  <Icon size={20} strokeWidth={2.2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

export function Header({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ff5a5f]">Trok</p>
        <h1 className="mt-1 text-2xl font-black text-[#13212f]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function SafetyNotice() {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <div className="flex items-start gap-2">
        <MessageCircle className="mt-0.5 shrink-0" size={17} />
        <p>Haz intercambios en lugares publicos. No compartas datos sensibles.</p>
      </div>
    </div>
  );
}
